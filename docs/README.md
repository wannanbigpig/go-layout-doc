# Gin Layout 使用教程

这组文档面向正在把 Gin Layout 用到真实后台项目里的开发者。它不只列目录和接口，而是解释管理端要怎么配置、配置最终落到哪些表、后端代码如何读取，以及改完后怎样确认权限和运行时状态已经生效。

> 文档以 `github.com/wannanbigpig/gin-layout` 当前 `master` 为事实来源。接口路径、字段和命令均按当前代码核对；部署到共享环境前，仍应结合目标版本的 Release Notes 与迁移状态确认。

## 推荐阅读路径

| 你的目标 | 建议先读 | 能解决的问题 |
| --- | --- | --- |
| 第一次启动项目 | 本页的“本地启动最短路径” | 启动 MySQL、Redis、迁移和 API 服务 |
| 给普通管理员授权 | [权限配置与代码接入](?guide=permissions) | 接口、菜单、按钮、角色和用户如何串起来 |
| 想把开关或阈值放到后台调整 | [系统参数完整指南](?guide=system-config) | 参数怎么建、代码怎么读、缓存怎么刷新 |
| 新增一个受权限保护的业务接口 | [权限配置与代码接入](?guide=permissions) | 声明路由、同步 API、绑定菜单和前端按钮 |
| 不确定该用系统参数还是字典 | [系统参数完整指南](?guide=system-config) | `sys_config`、`sys_dict`、`config.yaml` 的边界 |
| 接入新的短信供应商 | [短信供应商扩展](?guide=sms-providers) | Provider 注册、模板路由、密钥保护和前端表单 |
| 接入 S3、COS、七牛等对象存储 | [存储供应商扩展](?guide=storage-providers) | Driver 注册、能力接口、直传契约和历史文件兼容 |
| 看懂任务中心、Worker 和 Cron | [任务、Worker 与 Cron](?guide=task-runtime) | 三类进程、定义同步、重试、幂等和多实例限制 |
| 准备生产部署或版本升级 | [部署、升级与回滚](?guide=deployment-upgrades) | 迁移顺序、配置密钥、路由/任务同步和回滚边界 |

## 项目里有哪些能力

Gin Layout 把常见后台基础设施放在一套明确的分层中：

- **认证会话**：JWT Access Token、Refresh Cookie、会话撤销与登录日志。
- **权限体系**：管理员、部门、角色、菜单、按钮、接口权限和数据范围。
- **系统管理**：系统参数、系统字典、文件中心、存储配置、通知与导出记录。
- **任务中心**：Asynq 异步任务、Cron 定时调度、运行记录、重试和取消。
- **审计能力**：请求日志、操作差异、字段脱敏和个人操作记录。
- **工程能力**：声明式路由 Catalog、统一响应、参数校验、i18n、迁移与 CLI。

项目不是把所有逻辑都塞进一个 Gin Handler。普通 JSON 接口遵循以下链路：

```text
Route Catalog
  → Middleware（认证、权限、日志、依赖守卫）
  → Controller（绑定参数）
  → Validator / Form（校验）
  → Service（业务规则、事务、数据范围）
  → Model / GORM（MySQL）
  → Resources（响应字段）
  → Api.Success / Api.Err（统一返回）
```

理解这条链路后，新增功能时就能判断代码应该放在哪一层：controller 不直接查数据库，service 不拼 HTTP 响应，model 不决定页面权限。

## 本地启动最短路径

### 1. 获取代码与依赖

```bash
git clone https://github.com/wannanbigpig/gin-layout.git
cd gin-layout
go mod download
go mod verify
```

当前项目要求 Go 1.27 或更高版本。

### 2. 启动开发依赖

```bash
make dev-up
```

该命令会启动本地 MySQL、Redis 与 MinIO。只想手动准备依赖也可以，但要保证 `config.yaml` 指向真实可用的实例。

### 3. 准备配置并执行迁移

```bash
cp config/config.yaml.example ./config.yaml

go run main.go -c ./config.yaml command migrate check
go run main.go -c ./config.yaml command migrate up
```

至少检查以下配置：

- `mysql.*`：数据库地址、用户、密码和库名。
- `redis.*`：Redis 地址与逻辑库。
- `jwt.secret_key`：建议使用 32 字节随机值（Base64 通常约 44 个字符）。
- `security.credential_encryption_key`：短信、对象存储等凭据的独立 32 字节随机主密钥，不能和 JWT 密钥复用。
- `app.app_env`、`queue.namespace`：同一部署的 service、worker、cron 必须一致。

### 4. 启动进程

```bash
GO_ENV=development go run main.go -c ./config.yaml service
```

如果启用了队列和定时任务，再分别启动：

```bash
GO_ENV=development go run main.go -c ./config.yaml worker
GO_ENV=development go run main.go -c ./config.yaml cron
```

三类进程职责不同：`service` 提供 HTTP API，`worker` 消费 Asynq，`cron` 负责定时调度。它们不是三个 API 副本。

### 5. 检查运行状态

```bash
curl http://127.0.0.1:9001/ping
curl http://127.0.0.1:9001/health/readiness
```

- `/ping` 用于确认 HTTP 进程存活。
- `/health/readiness` 用于确认当前配置要求的 MySQL、Redis 等依赖已经就绪。

## 登录与公共调用约定

初始化环境默认提供超级管理员：

```text
账号：super_admin
密码：123456
```

它只适合本地初始化。第一次登录后应立即修改密码，生产环境不得继续使用默认凭证。

普通登录态和权限接口通过请求头携带 Access Token：

```http
Authorization: Bearer <access_token>
```

普通 JSON 接口统一返回：

```json
{
  "code": 0,
  "msg": "OK",
  "data": {},
  "cost": "2.31ms",
  "request_id": "7d9d6d0e-51a3-4b80-a3b2-6ec759f5cd30"
}
```

`code=0` 表示业务成功，同时 HTTP 状态为 `200`。失败时不要只判断 HTTP 状态，也要读取 `code` 和 `msg`；`request_id` 用于服务端日志追踪。

## 管理端配置的基本顺序

很多“为什么菜单有了但接口还是 403”的问题，都来自配置顺序不完整。建议按以下顺序操作：

1. **路由进入 Catalog**：后端代码声明接口路径与安全策略。
2. **同步接口元数据**：路由变化后执行 `command api-route -y`。
3. **菜单绑定接口**：菜单或按钮节点的 `api_list` 关联 API。
4. **角色选择菜单**：角色的 `menu_list` 选择真实授权节点并设置数据范围。
5. **用户或部门绑定角色**：最终权限会同步到 Casbin。
6. **前端按按钮 Code 控制显示**：服务端 API 权限仍是最终安全边界。

完整操作与代码示例见 [权限配置与代码接入](?guide=permissions)。

## 配置应该放在哪里

| 内容 | 应放位置 | 例子 |
| --- | --- | --- |
| 数据库、Redis、JWT、进程级开关 | `config.yaml` | `mysql.*`、`redis.*`、`jwt.secret_key` |
| 允许后台调整的运行时策略 | `sys_config` | 登录锁定次数、提醒提前量 |
| 页面展示选项、标签和颜色 | `sys_dict` | 通用状态、菜单类型、HTTP 方法 |
| 定时任务启停与 Cron 表达式 | `task_definitions` | 任务状态、`cron_spec` |
| 权限规则、状态机、字段语义 | 代码与 migration | `SecurityPolicy`、validator 枚举 |

不要为了“可配置”把安全边界、路由或状态机放进系统参数。运行时参数也必须由代码提供类型约束、默认值和降级行为。详细接入方式见 [系统参数完整指南](?guide=system-config)。

## 修改后的验证建议

不同变更对应不同验证，不需要每次都重建数据库：

```bash
# Go 代码与共享行为
go test ./...
go vet ./...

# 依赖完整性
go mod verify

# migration 变更
go run main.go -c ./config.yaml command migrate check

# 路由、方法或安全策略变化后，在已授权的目标环境同步
go run main.go -c ./config.yaml command api-route -y
```

`init-system` 会清空目标数据库对象，不是常规验证命令。普通功能开发只运行迁移和相关测试，不要为了“重新初始化一下”误删环境数据。

## 下一步

- [配置一套可用的角色、菜单与接口权限](?guide=permissions)
- [新增一个后台可调整的业务参数，并在 Go 代码中读取](?guide=system-config)
- [新增短信供应商并接入登录验证码或待办提醒](?guide=sms-providers)
- [新增对象存储驱动并声明它支持的上传能力](?guide=storage-providers)
- [部署 worker/cron 并理解当前多实例边界](?guide=task-runtime)
- [按可回滚顺序完成一次版本升级](?guide=deployment-upgrades)
