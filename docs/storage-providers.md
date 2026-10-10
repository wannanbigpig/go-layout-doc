# 存储供应商扩展

Gin Layout 的文件记录会保存创建它的 `storage_driver`、Bucket 和 Object Key。读取、删除和导出时应按文件原驱动解析，而不是永远使用当前活动驱动。这让系统可以切换新存储，同时继续访问历史文件。

> 存储扩展采用编译期 Driver 注册，不使用 Go `.so` 动态插件。驱动 ID 会进入数据库，发布后不能随意改名或停止注册，否则历史对象将无法读取或删除。

## 基础 Driver 与可选能力

所有驱动实现基础对象操作：

```go
type Driver interface {
    Name() string
    Put(ctx context.Context, input PutInput) (PutResult, error)
    Open(ctx context.Context, bucket, objectKey string) (io.ReadCloser, error)
    Exists(ctx context.Context, bucket, objectKey string) (bool, error)
    Delete(ctx context.Context, bucket, objectKey string) error
    URL(bucket, objectKey string, isPublic bool) string
    SignedURL(ctx context.Context, bucket, objectKey string, ttl time.Duration) (string, error)
}
```

不是每个存储都必须支持浏览器直传、分片上传或图片缩略图。这些能力通过可选接口声明：

- `DirectUploadCapable`：返回 URL、HTTP Method、Headers 和可选 Form Data。
- `MultipartCapable`：初始化分片、签名分片、完成和中止上传。
- `StatCapable`：读取服务端对象大小与 Content-Type。
- `ImageThumbnailCapable`：生成供应商图片处理链接。

运行时调用方通过类型断言判断能力；请求参数校验使用注册表的 `Capabilities` 声明，两者必须一致，不能用“不是 local”或具体驱动名称推断。

## DriverDefinition 与注册表

存储注册表集中维护驱动实例化和安全元数据：

```go
type DriverDefinition struct {
    Name            string
    Build           func(context.Context, Config) (Driver, error)
    Validate        func(Config) error
    ResolveBucket   func(Config, bool) string
    Capabilities    DriverCapabilities
    SensitiveFields []SensitiveField
}

type DriverCapabilities struct {
    DirectUpload    bool
    MultipartUpload bool
    ImageThumbnail  bool
}
```

内置 `local` 和 `aliyun_oss` 使用同一注册入口。新增供应商时，业务 Service 不再增加新的 `switch`。

驱动 ID 建议满足 `[a-z0-9_]{1,20}`，例如 `s3`、`tencent_cos`、`qiniu`。ID 会写入文件对象和上传会话，必须长期稳定。

## 新增一个存储供应商

### 1. 定义配置

每个供应商保留强类型配置：

```go
type ExampleConfig struct {
    Endpoint  string `json:"endpoint"`
    Bucket    string `json:"bucket"`
    SecretKey string `json:"secret_key"`
}
```

本例统一使用 `secret_key` 保存供应商凭据。配置校验至少覆盖 Endpoint、Bucket 和凭据；需要 Region 或 Access Key ID 的供应商应按自身协议补充字段。活动驱动的配置必须在保存时验证，不能等第一次上传才报错。

### 2. 实现基础 Driver

服务端上传、下载、存在性检查和删除应始终可用。所有 SDK 调用都使用传入的 Context。公开 URL 只对明确标记为公开的文件返回；私有文件使用短期 Signed URL。

### 3. 按实际能力实现可选接口

浏览器直传不能假定永远是 PUT。项目使用的通用返回结果是：

```go
type PresignedUpload struct {
    URL      string
    Method   string
    Headers  map[string]string
    FormData map[string]string
}
```

- OSS/S3 类服务通常使用预签名 PUT 和特定 Header。
- 部分供应商使用表单 POST，需要返回 `FormData`。
- 不支持直传的远程驱动不实现 `DirectUploadCapable`，前端自动走服务端上传。

当前直传完成流程会读取对象大小和 MIME，驱动还必须实现 `StatCapable`。不能信任客户端回传的 Bucket、Object Key、Hash、Size 或 MIME。

### 4. 注册驱动

```go
err := filestorage.RegisterDriver(filestorage.DriverDefinition{
    Name: "example",
    // 本例假设 NewExampleDriver 已实现直传、分片和 Stat 能力。
    Capabilities: filestorage.DriverCapabilities{
        DirectUpload:    true,
        MultipartUpload: true,
    },
    Build: func(ctx context.Context, config filestorage.Config) (filestorage.Driver, error) {
        var provider ExampleConfig
        if err := config.DecodeProviderConfig("example", &provider); err != nil {
            return nil, err
        }
        return NewExampleDriver(ctx, provider)
    },
    Validate: func(config filestorage.Config) error {
        var provider ExampleConfig
        if err := config.DecodeProviderConfig("example", &provider); err != nil {
            return err
        }
        if strings.TrimSpace(provider.Endpoint) == "" || strings.TrimSpace(provider.Bucket) == "" || strings.TrimSpace(provider.SecretKey) == "" {
            return errors.New("example storage config is incomplete")
        }
        return nil
    },
    ResolveBucket: func(config filestorage.Config, _ bool) string {
        var provider ExampleConfig
        _ = config.DecodeProviderConfig("example", &provider)
        return provider.Bucket
    },
    SensitiveFields: []filestorage.SensitiveField{{
        Name:  "secret_key",
        Label: "Example Secret Key",
        Get:   func(config filestorage.Config) string { return config.ProviderString("example", "secret_key") },
        Set:   func(config *filestorage.Config, value string) { config.SetProviderString("example", "secret_key", value) },
    }},
})
if err != nil {
    panic(err)
}
```

`RegisterDriver` 必须在服务开始接收请求前完成，通常由二开模块的初始化代码调用。注册表会拒绝空名称、非法名称、不完整 Definition 和重复 ID，避免后注册实现静默覆盖原驱动。

`Capabilities.DirectUpload`、`MultipartUpload` 和 `ImageThumbnail` 分别与相应可选接口实现保持一致。不支持的能力保留 `false`。如果只实现接口却遗漏注册声明，`storage_direct_driver` / `storage_multipart_driver` 校验会拒绝携带该 `driver` 的直传或分片请求；反过来，只设置为 `true` 而未实现接口也无法完成上传。

为保持既有 `config.local` / `config.aliyun_oss` API 不变，`filestorage.Config` 会把未知顶层键保存在 `Extra` 并按原位置序列化。自定义驱动不需要给公共 `Config` 再加字段，而是定义自己的强类型配置并通过 helper 读写：

```go
var provider ExampleConfig
if err := config.DecodeProviderConfig("example", &provider); err != nil {
    return nil, err
}

// 初始化默认配置或测试夹具时：
if err := config.SetProviderConfig("example", provider); err != nil {
    return err
}
```

敏感字段回调可使用 `ProviderString` / `SetProviderString` 操作自定义配置中的顶层字符串字段。这样 `config.example` 能经过查询、保存、测试和切换完整 round-trip，也不会借用 `local` 或 `aliyun_oss` 的字段存放二开参数。

敏感字段声明用于统一完成加密、解密、掩码、清空、按权限查看和操作日志脱敏。不要在新驱动的 Service 分支里复制一套密钥逻辑。

密钥规则：

- 掩码占位符表示保持原值；
- 空字符串表示明确清除；
- 新值保存时必须加密；
- 活动驱动缺少必需密钥时拒绝保存；
- 切换到其他驱动后，可以清理停用驱动的旧密钥。

### 5. 增加前端供应商表单

前端使用轻量 `storageProviderForms` 注册表：每个供应商一个强类型 Vue 组件，主面板只负责驱动选择、公共上传策略、保存和测试。不要建设复杂的 JSON Schema 表单引擎。

```ts
const unregister = registerStorageProviderForm({
  key: 'example',
  label: 'Example Storage',
  component: ExampleStorageProviderForm,
  createDefaultConfig: () => ({ endpoint: '', bucket: '', secret_key: '' }),
})
```

`key` 必须与后端 `DriverDefinition.Name`、数据库文件记录中的 `storage_driver` 一致。组件通过 `v-model` 维护本供应商配置，并在自己的 `el-form-item` 上声明字段规则；注册后不需要修改 `StorageConfigPanel.vue`。返回的 `unregister` 主要供测试或可卸载模块清理注册使用。

当前内置 OSS 表单额外接入了“查看已保存密钥”交互。二开供应商不需要依赖查看明文才能完成配置：掩码可保留、空值可清除、新值可替换；若确实要增加明文查看入口，必须同时复用后端 `storage:secret` 权限和 Registry 的 `SensitiveFields` 校验，不能在普通配置查询里返回明文。

后端返回的未知驱动配置必须原样保留。若当前前端没有对应组件，应展示“此驱动需要扩展配置面板”，而不是把配置静默删除或回退为 local。

## 前端直传链路

当前安全边界是：

```text
前端请求上传凭证
  → 服务端生成可信 object_key、bucket、upload session、complete_token
  → 前端按 URL/Method/Headers/FormData 直传对象存储
  → 前端提交 complete_token
  → 服务端按 session 读取真实元数据并校验对象
  → 写入文件对象与资源记录
```

前端不得自行生成可信 Object Key，也不能用表单字段覆盖服务端 session。完成阶段必须以 `complete_token` 中的服务端元数据为准。

## 切换活动驱动

修改 `storage.active_driver` 只影响新文件写入。历史文件仍使用其记录的 `storage_driver`。因此升级时要保证：

1. 新旧驱动实现同时保留在二进制中。
2. 先保存并测试新驱动配置。
3. 再切换活动驱动。
4. 验证上传、下载、私有签名链接、删除、导出和缩略图。
5. 在迁移完历史对象前，不删除旧驱动注册和凭据。

项目当前不提供跨存储自动搬迁。批量迁移需要单独任务、校验 Hash、可重试记录和回滚策略。

## 测试端点与部署边界

存储测试会使用当前表单中的草稿配置，向指定端点实际上传随机命名的测试对象，并尝试删除；测试不是只校验配置格式。存储配置和测试权限应仅授予可信运维人员，使用独立测试 Bucket，避免将未知端点和生产凭据组合用于测试。

合法的内网对象存储端点是受支持的配置。生产部署应通过防火墙、出站代理或网络策略，将服务可访问的存储端点限制在批准的域名或网段，并隔离无关的内部服务和云元数据地址；按实际存储拓扑设置规则，不要一律禁止私网地址。

## 稳定性要求

- 存储测试对象使用随机 UUID，不能只精确到秒。
- 测试任一步失败后也要 best-effort 删除测试对象。
- 对象上传成功但数据库事务失败时，应补偿删除远端对象。
- 删除失败需要落库为可重试状态，不能假装成功。
- 对象存储与 MySQL 不是同一事务；生产环境仍应配置 Bucket 生命周期和对象对账。

## 测试清单

- Registry 注册、重复 ID、未知 ID和自定义驱动构建。
- `Capabilities` 声明与可选接口一致，显式指定自定义 `driver` 的直传和分片参数可通过校验。
- 活动配置的必填项校验。
- Secret 新增、替换、掩码保留、空值清除、密文入库和审计脱敏。
- 直传 PUT/Header/FormData 契约。
- 不支持直传/分片/缩略图时的降级路径。
- 测试对象成功和失败清理。
- 远端 Put 成功后数据库失败的补偿删除。
- 切换活动驱动后历史文件仍使用原驱动。

```bash
go test ./internal/filestorage ./internal/service ./internal/validator/form
go vet ./...
```

真实 OSS、COS、S3 或七牛联调需要独立测试 Bucket。Mock 或预签名单元测试通过不代表 RAM Policy、Bucket Policy、CORS 和公网域名已经正确。
