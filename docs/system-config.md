# 系统参数完整指南

“系统管理 → 系统参数”用于管理**运行期间允许调整的策略开关和阈值**。例如登录失败多少次锁定、待办提前多少分钟提醒。它不是一个可以替代 `config.yaml`、权限规则或状态机的万能键值表。

本文从管理端新增一个普通参数开始，讲清字段含义、Go 代码读取、缓存刷新、初始化 migration、敏感参数和常见错误。

> 最重要的约束：系统参数是字符串持久化、按 `value_type` 校验的运行时策略。业务代码必须提供常量、类型转换、默认值、允许范围和失败时的降级行为。

## 先分清四种配置

| 需求 | 应放位置 | 原因 |
| --- | --- | --- |
| MySQL、Redis、JWT、进程端口 | `config.yaml` | 启动基础依赖与进程级配置 |
| 登录锁定次数、业务功能开关 | `sys_config` | 允许运行期间调整，有缓存和审计 |
| 页面下拉、标签、颜色、多语言选项 | `sys_dict` | 主要影响展示，不改变核心业务规则 |
| Cron 启停、表达式、任务运营策略 | `task_definitions` | 由任务中心统一调度与记录 |

以下内容不要放入 `sys_config`：

- 路由路径和认证策略。
- 角色、菜单、Casbin 权限判断规则。
- validator 合法枚举和数据库字段含义。
- 核心状态机的允许流转。
- 定时任务 Handler 的安全边界。

后台可调整“阈值和低风险开关”，不能通过改一行参数绕过代码里的安全约束。

## 系统参数字段说明

| 字段 | 含义 | 建议 |
| --- | --- | --- |
| `config_key` | 唯一参数键 | 使用 `领域.名称`，如 `product.export_enabled` |
| `config_name_i18n` | 管理端名称 | 至少提供 `zh-CN` 或 `en-US` |
| `config_value` | 实际值，数据库中是文本 | 必须符合 `value_type` |
| `value_type` | `string`、`number`、`bool`、`json` | 决定写入时的格式校验 |
| `group_code` | 参数分组 | 使用稳定领域名，如 `product` |
| `is_sensitive` | 是否敏感 | 密钥、Token、供应商凭证必须为 `1` |
| `is_visible` | 是否在通用参数页展示 | 专属配置通常设为 `0` |
| `manage_tab` | 专属配置 Tab | 普通参数留空 |
| `status` | 是否启用 | 只有 `status=1` 的参数进入运行时缓存 |
| `sort` | 展示排序 | 数字越大越靠前 |
| `remark` | 运维说明 | 写清单位、范围和生效方式 |

系统配置名称采用 PATCH 语义。更新时只提交 `zh-CN`，不会删除已有 `en-US`；传空字符串会跳过，不代表删除翻译。

## 当前内置参数

初始化 migration 已包含以下参数：

| Key | 类型 | 默认值 | 用途 |
| --- | --- | --- | --- |
| `auth.login_lock_enabled` | `bool` | `true` | 是否启用登录失败锁定 |
| `auth.login_max_failures` | `number` | `5` | 连续失败阈值 |
| `auth.login_lock_minutes` | `number` | `15` | 锁定分钟数 |
| `task.cron_demo_enabled` | `bool` | `false` | 演示定时任务开关 |
| `todo.reminder_enabled` | `bool` | `true` | 待办到期提醒开关 |
| `todo.reminder_lead_minutes` | `number` | `1440` | 提前提醒分钟数 |
| `todo.reminder_catchup_minutes` | `number` | `10080` | Cron 恢复后的补偿窗口 |
| `audit.sensitive_fields` | `json` | JSON 对象 | 请求日志脱敏字段 |
| `storage.active_driver` | `string` | `local` | 当前文件存储驱动 |
| `storage.config` | `json` | JSON 对象 | 文件存储详细配置 |
| `sms.config` | `json` | JSON 对象 | 短信供应商、模板与 OTP 策略 |

`audit.sensitive_fields`、`storage.*`、`sms.config` 是专属管理参数，不能通过通用系统参数写接口修改。它们分别由请求日志脱敏、存储配置和短信配置专用接口维护。

供应商凭据使用 `security.credential_encryption_key` 派生密钥加密，不应作为普通 `sys_config` 明文值维护。短信和存储的配置、测试及二次开发分别见[短信供应商扩展](?guide=sms-providers)和[存储供应商扩展](?guide=storage-providers)。

## 在管理端新增普通参数

假设要控制“是否允许导出产品”，参数 Key 为：

```text
product.export_enabled
```

进入：

```text
系统管理 → 系统参数 → 新增参数
```

填写：

| 字段 | 值 |
| --- | --- |
| 参数名称 | 产品导出开关 |
| 参数键名 | `product.export_enabled` |
| 参数值 | `false` |
| 值类型 | `bool` |
| 参数分组 | `product` |
| 敏感参数 | 否 |
| 是否展示 | 是 |
| 状态 | 启用 |
| 备注 | 是否允许产品列表提交异步导出 |

对应接口请求：

```http
POST /admin/v1/system/config/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "config_key": "product.export_enabled",
  "config_name_i18n": {
    "zh-CN": "产品导出开关",
    "en-US": "Product Export Enabled"
  },
  "config_value": "false",
  "value_type": "bool",
  "group_code": "product",
  "is_sensitive": 0,
  "is_visible": 1,
  "status": 1,
  "sort": 50,
  "remark": "是否允许产品列表提交异步导出"
}
```

创建成功后，Service 会校验值、写入 `sys_config` 与 `sys_config_i18n`，然后立即刷新本进程缓存并通知其他实例。正常通过管理端新增或更新后，不需要再手动点“刷新缓存”。

## 在 Go 代码中读取参数

### 布尔与整数 helper

项目已提供：

```go
sys_config.BoolValue(key, fallback)
sys_config.IntValue(key, fallback)
sys_config.IntValueStrict(key, fallback)
```

`BoolValue` 和 `IntValue` 在参数缺失或解析失败时返回 fallback。`IntValueStrict` 在参数缺失时使用 fallback，但参数已经存在且格式错误时返回 error，适合不能静默改变行为的任务配置。

先在领域代码中声明 Key 常量，不要把字符串散落到多个 Service：

```go
package product

const ProductExportEnabledConfigKey = "product.export_enabled"
```

然后在 Service 中读取，并保留业务兜底：

```go
package product

import (
    e "github.com/wannanbigpig/gin-layout/internal/pkg/errors"
    "github.com/wannanbigpig/gin-layout/internal/service/sys_config"
)

func (s *ProductService) SubmitExport(userID uint) error {
    enabled := sys_config.BoolValue(ProductExportEnabledConfigKey, false)
    if !enabled {
        return e.NewBusinessError(e.InvalidParameter)
    }

    // 继续执行权限、数据范围、参数校验与任务提交。
    return s.enqueueExport(userID)
}
```

这里的 fallback 是 `false`，因为配置读取失败时关闭导出比意外放开功能更安全。不同业务应根据风险选择 fallback，不能统一写成 `true`。

### 直接读取缓存项

需要同时检查类型或分组时，可以读取完整缓存项：

```go
item, err := sys_config.NewSysConfigService().Value("product.export_enabled")
if err != nil {
    // 参数缺失或缓存刷新失败，按业务策略处理。
    return err
}

if item.ValueType != model.SysConfigValueTypeBool {
    return fmt.Errorf("product.export_enabled 必须是 bool")
}
```

`Value()` 返回的字段包括：

```go
type ConfigCacheItem struct {
    ConfigKey   string
    ConfigValue string
    ValueType   string
    GroupCode   string
    IsSensitive uint8
}
```

业务代码不要每次直接查询 `sys_config` 表。统一走 Service/cache 才能获得启动预热、变更通知与多实例补偿行为。

### 数字参数要再做范围校验

`value_type=number` 只保证它能解析为数字，不知道业务允许范围。比如导出最大行数：

```go
const ProductExportMaxRowsConfigKey = "product.export_max_rows"

func productExportMaxRows() int {
    rows := sys_config.IntValue(ProductExportMaxRowsConfigKey, 10_000)
    if rows < 100 {
        return 100
    }
    if rows > 100_000 {
        return 100_000
    }
    return rows
}
```

后台参数仍是不可信输入。Service 必须限制最小值、最大值或允许集合。

## 项目内置参数的完整接入方式

如果参数是代码功能的一部分，而不是某个环境临时创建的运营参数，应通过 migration 提供默认值，确保全新环境和升级环境一致。

### 1. 创建 migration

```bash
go run main.go -c ./config.yaml command migrate create add_product_export_config
```

示例 `up.sql`：

```sql
INSERT INTO `sys_config`
  (`config_key`, `config_value`, `value_type`, `group_code`, `is_system`,
   `is_sensitive`, `is_visible`, `manage_tab`, `status`, `sort`, `remark`,
   `created_at`, `updated_at`, `deleted_at`)
VALUES
  ('product.export_enabled', 'false', 'bool', 'product', 1,
   0, 1, '', 1, 50, '是否允许提交产品导出任务', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);

INSERT INTO `sys_config_i18n`
  (`config_id`, `locale`, `config_name`, `created_at`, `updated_at`)
SELECT `id`, 'zh-CN', '产品导出开关', NOW(), NOW()
FROM `sys_config`
WHERE `config_key` = 'product.export_enabled' AND `deleted_at` = 0
ON DUPLICATE KEY UPDATE `config_name` = VALUES(`config_name`), `updated_at` = VALUES(`updated_at`);
```

示例 `down.sql`：

```sql
DELETE FROM `sys_config_i18n`
WHERE `config_id` IN (
  SELECT `id` FROM `sys_config`
  WHERE `config_key` = 'product.export_enabled'
);

DELETE FROM `sys_config`
WHERE `config_key` = 'product.export_enabled';
```

`is_system=1` 表示项目内置保护参数。后台仍可修改值、状态、排序等允许字段，但不能修改 Key、值类型和分组等稳定字段。

### 2. 声明常量与领域 helper

```go
const ProductExportEnabledConfigKey = "product.export_enabled"

func ProductExportEnabled() bool {
    return sys_config.BoolValue(ProductExportEnabledConfigKey, false)
}
```

领域 helper 可以进一步完成范围、默认值和错误处理，调用方不需要重复理解底层字符串格式。

### 3. 在业务入口使用

把检查放在真正产生副作用的 Service，而不是只在前端隐藏按钮：

```go
func (s *ProductService) Export(params *form.ProductExport, userID uint) error {
    if !ProductExportEnabled() {
        return e.NewBusinessError(e.AuthorizationErr)
    }
    // 校验接口权限、DataScope、导出字段与任务参数……
    return s.enqueueExport(params, userID)
}
```

### 4. 补测试

至少覆盖：

- 参数为 `true` 时允许进入目标流程。
- 参数为 `false` 时拒绝。
- 参数缺失时使用预期 fallback。
- 参数格式错误时是降级还是报错，与 helper 约定一致。
- 数字参数的上下界。
- migration 的 up/down 文件配对。

```bash
go test ./internal/service/product ./internal/service/sys_config
go run main.go -c ./config.yaml command migrate check
```

## 前端或外部调用读取参数值

受权用户可以调用：

```http
GET /admin/v1/system/config/value?config_key=product.export_enabled
Authorization: Bearer <access_token>
```

成功响应：

```json
{
  "code": 0,
  "msg": "OK",
  "data": {
    "config_key": "product.export_enabled",
    "config_value": "false",
    "value_type": "bool",
    "group_code": "product",
    "is_sensitive": 0
  },
  "cost": "1.13ms",
  "request_id": "0fc5f3ca-4f08-4e82-9ee6-03e6fcb3e1ec"
}
```

这个接口位于权限路由组，仍需要 `sysConfig:value` 对应的接口权限。Service 方法名 `PublicValue` 表示输出前执行敏感值脱敏，不表示匿名公开。

前端不要把字符串 `"false"` 当作 JavaScript 真值：

```ts
const enabled = response.data.config_value === 'true'
```

如果一个参数只服务于后端业务判断，就不要为了方便额外开放给前端。

## 缓存与生效时机

系统参数读取使用进程内缓存：

1. 第一次读取发现缓存未加载时，从 MySQL 查询全部启用参数。
2. 创建、更新、删除参数后，当前进程立即刷新缓存。
3. 当前进程通过 Redis Pub/Sub 通知其他实例刷新。
4. 订阅异常时仍有周期 reconcile 回源补偿。
5. 新缓存加载失败时保留旧缓存，不用半成品覆盖当前运行状态。

管理端“刷新缓存”接口：

```http
POST /admin/v1/system/config/refresh
Authorization: Bearer <access_token>
Content-Type: application/json

{}
```

它适合以下场景：

- 历史环境曾手工修改数据库。
- Redis 通知故障后做运维确认。
- 排查缓存与数据库值是否一致。

正常通过系统参数新增/更新接口保存后会自动刷新，不必重复调用。

多实例必须使用相同的 MySQL、Redis 逻辑库、`app.app_env` 与 `queue.namespace`。这些值共同决定内部通知通道的隔离范围。

## 敏感参数与专属配置

### 敏感值如何处理

`is_sensitive=1` 后：

- 列表返回 `******`。
- 详情同样返回 `******`。
- `value` 接口返回 `******`。
- 更新时把未改动的 `******` 原样提交，后端会保留数据库原值。
- 审计请求体与变更差异不会记录真实密钥。

不要把敏感值读取接口交给通用参数页面。确实需要查看或测试凭证时，应建立独立权限、专用接口和明确审计，例如存储配置的 `/admin/v1/system/storage/secret`。

### 为什么有些参数看不到

`is_visible=0` 的参数默认不会出现在通用系统参数列表。`manage_tab` 不为空的参数由专属 Tab 管理，例如：

- `storage.active_driver` / `storage.config` → 存储配置。
- `audit.sensitive_fields` → 请求日志脱敏配置。
- `sms.config` → 短信配置。

这些 Key 被通用写接口显式拒绝，防止绕过专属接口的权限和字段校验。

## 值类型与常见错误

| 类型 | 合法示例 | 非法示例 | 读取建议 |
| --- | --- | --- | --- |
| `string` | `local`、`standard` | 无格式限制 | 业务代码校验允许集合 |
| `number` | `5`、`1.5` | `5分钟` | 整数用 `IntValue`，再校验范围 |
| `bool` | `true`、`false` | `0`、`yes` | 使用 `BoolValue` |
| `json` | `{"days":30}` | `{days:30}` | 定义结构体并 `json.Unmarshal` |

常见问题：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 保存返回参数错误 | 值不符合 `value_type` | 检查 bool、number、JSON 格式 |
| 代码总是走 fallback | Key 拼写错误、参数禁用或不存在 | 声明常量，确认 `status=1` |
| 修改后本实例生效，其他实例未生效 | 多实例 Redis/namespace 不一致 | 对齐部署配置并检查订阅日志 |
| `value` 接口返回 `******` | 参数标记为敏感 | 使用专属受权接口，不要取消敏感标记 |
| 修改内置参数 Key 被拒绝 | `is_system=1` 保护稳定字段 | 只修改允许字段；契约变化走 migration |
| 前端把 `false` 当成开启 | 返回的是字符串 | 按 `value_type` 显式转换 |
| JSON 参数读出来但业务异常 | 只校验了 JSON 语法 | Unmarshal 到结构体并做字段级验证 |

## 系统参数接入检查清单

- 该值确实是运行时策略，而不是权限、路由、状态机或展示字典。
- Key 使用领域前缀，并在代码中声明常量。
- 选择了正确的 `value_type`。
- Service 提供默认值、范围和失败降级策略。
- 敏感值设置 `is_sensitive=1`，且没有通用明文读取路径。
- 专属复杂配置使用独立接口和权限，不复用通用写接口。
- 项目内置参数有成对 migration 和 i18n 名称。
- 新增或更新后确认缓存生效，多实例配置一致。
- 单元测试覆盖正常值、缺失值、错误值和边界值。
