# 短信供应商扩展

Gin Layout 的短信模块按“业务场景 → 模板路由 → 供应商”发送消息。登录、待办等业务只关心场景和变量，不直接调用阿里云 SDK。二次开发接入腾讯云、华为云或自建网关时，应新增供应商实现并注册，而不是在登录 Service 里增加 `switch`。

> 当前采用编译期注册，不支持运行时上传 Go 插件。新增供应商需要重新编译和部署，这能让依赖、权限、密钥字段和测试都留在版本控制中。

## 先理解短信配置

`sms.config` 的核心结构分为四部分：

```json
{
  "enabled": true,
  "providers": {
    "aliyun": {}
  },
  "templates": {
    "aliyun": {
      "login_otp": {
        "sign_name": "示例签名",
        "template_code": "SMS_123",
        "variables": ["code"]
      }
    }
  },
  "routes": {
    "login_otp": {
      "provider": "aliyun",
      "template": "login_otp"
    }
  },
  "otp": {}
}
```

- `providers` 保存每个供应商自己的连接配置。
- `templates` 使用供应商模板编号、签名和变量列表。
- `routes` 决定某个业务场景实际走哪个供应商和模板。
- `otp` 是登录验证码的有效期、重发间隔和发送限额，不属于某个供应商。

因此可以让 `login_otp` 使用阿里云，让 `todo_due` 使用另一家供应商，而不修改业务调用方。

## 后端扩展边界

供应商实现位于 `internal/sms/`，核心接口是：

```go
type Provider interface {
    Send(ctx context.Context, input SendInput) (SendResult, error)
}
```

`SendInput` 已经包含手机号、签名、模板编号和模板变量。实现方应把本供应商响应映射为统一状态：

| 状态 | 使用条件 | 后续行为 |
| --- | --- | --- |
| `accepted` | 供应商明确接受请求 | 记录供应商请求号或消息号 |
| `failed` | 供应商明确拒绝，确定未接受 | 可按业务策略进入有限重试 |
| `unknown` | 超时、连接中断、响应无法解析，无法确认是否已发送 | 默认不自动重试，避免重复短信和重复计费 |

错误不能包含手机号、验证码、AccessKey、签名串或供应商原始响应。供应商错误码可放在结构化结果中用于服务端诊断，但对客户端只返回安全业务文案。

## 新增一个供应商

### 1. 定义强类型配置

在新的供应商文件中定义配置，不要在业务 Service 中读取任意 map：

```go
type ExampleConfig struct {
    Enabled   bool   `json:"enabled"`
    AppID     string `json:"app_id"`
    SecretKey string `json:"secret_key"`
    Endpoint  string `json:"endpoint"`
}
```

工厂负责 JSON 解析、必填项和 Endpoint 白名单校验。这里的校验不能只依赖前端。

### 2. 实现 Provider

```go
type ExampleProvider struct {
    config ExampleConfig
    client *http.Client
}

func (p *ExampleProvider) Send(ctx context.Context, input sms.SendInput) (sms.SendResult, error) {
    // 组装供应商请求，设置超时并发送。
    // 将响应映射为 accepted / failed / unknown。
}
```

网络请求必须使用传入的 `context.Context`，设置合理超时，并限制响应体大小。不要把含敏感参数的 URL 或原始错误直接向上返回。

### 3. 注册 ProviderDefinition

在 `internal/sms/config.go` 的 `builtinProviderDefinitions` 中登记：

```go
var builtinProviderDefinitions = []ProviderDefinition{
  {
    Name:            "example",
    Factory:         NewExampleProvider,
    SensitiveFields: []string{"secret_key"},
  },
}
```

供应商 ID 使用稳定的小写标识，例如 `tencent`、`huawei`，发布后不要随意改名。重复注册应在启动或测试中报错，不能静默覆盖已有实现。

`SensitiveFields` 非常重要。注册表声明的字段会统一参与：

- 保存前加密；
- 查询时返回掩码；
- `********` 表示保留已保存值；
- 空字符串表示明确清除；
- 操作日志与配置差异不记录明文；
- “测试当前草稿”只在内存中使用新密钥，不提前入库。

供应商凭据由 `security.credential_encryption_key` 派生密钥保护。该主密钥推荐使用独立的 32 字节随机值，不能和 `jwt.secret_key` 复用：

```bash
openssl rand -base64 32
```

同一部署的 `service`、`worker`、`cron` 及所有副本必须使用相同主密钥。

### 4. 配置模板和场景路由

新增供应商后，需要在管理端配置对应模板，并让目标场景路由到它。业务模块仍按场景调用：

```go
dispatcher.Send(ctx, sms.SceneLoginOTP, phone, map[string]string{
    "code": code,
})
```

不要在登录、待办 Service 中判断供应商名称。新增业务场景时，需要同时定义允许的模板变量，避免把任意变量传给模板。

### 5. 增加前端配置面板

前端不使用通用 JSON 表单生成器。每个供应商应提供一个清晰、强类型的配置组件，并在应用初始化前调用 `registerSmsProviderForm`。主面板负责公共开关、场景路由、模板和保存；供应商组件只负责自身字段。

```ts
const unregister = registerSmsProviderForm({
  key: 'example',
  label: 'Example SMS',
  component: ExampleSmsProviderForm,
  createDefaultConfig: () => ({ enabled: false, app_id: '', secret_key: '' }),
  createDefaultTemplates: () => ({
    login_otp: { sign_name: '', template_code: '', variables: ['code'] },
    todo_due: { sign_name: '', template_code: '', variables: ['title', 'due_at'] },
  }),
})
```

`key` 必须和后端 `ProviderDefinition.Name`、`routes.*.provider` 完全一致。`createDefaultTemplates` 必须使用后端允许的变量集合：登录验证码为 `code`，待办提醒为 `title`、`due_at`。注册后主面板会自动把供应商加入路由选项，并按当前 `route.provider + route.template` 编辑对应模板，不需要再给 `SmsConfigPanel.vue` 增加供应商分支。返回的 `unregister` 主要供测试或可卸载模块清理注册使用。

必须遵守两条兼容规则：

1. 管理员打开并保存页面时，未识别供应商的 `providers/templates/routes` 数据必须原样保留。
2. 密钥输入框收到掩码时保持原值，主动清空时提交空字符串；不要在前端恢复旧密钥。

如果只需要后端发送、暂时不需要管理端配置，可以通过 migration 写入配置并注册 Provider，但仍需保证密钥使用统一保护链路。

## 如何选择不同供应商

路由是按场景选择，不是全局只能选一个供应商：

```json
{
  "routes": {
    "login_otp": { "provider": "aliyun", "template": "login_otp" },
    "todo_due": { "provider": "example", "template": "todo_due" }
  }
}
```

这样可以实现“验证码使用阿里云，待办通知使用其他供应商”。当前不自动故障切换供应商；自动降级涉及重复发送、计费与回执一致性，应在有明确业务规则后单独设计。

## 测试清单

新增供应商至少覆盖：

- 工厂拒绝缺失配置和不安全 Endpoint。
- 请求方法、签名、模板变量及响应状态映射正确。
- 传输错误和供应商拒绝不会泄露敏感信息。
- 默认 Dispatcher 能从注册表构建供应商。
- 敏感字段的新值加密、掩码保留、空值清除、查询掩码和审计脱敏。
- `login_otp` 与 `todo_due` 场景能路由到目标供应商。
- 前端保存不会删除未知供应商配置。

```bash
go test ./internal/sms ./internal/service ./internal/service/auth ./internal/service/todo
go vet ./...
```

真实供应商联调需要单独的测试账号、已审核签名和模板。单元测试通过不代表运营商已实际送达。
