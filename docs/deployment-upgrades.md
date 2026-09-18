# 部署、升级与回滚

这份指南描述当前 Gin Layout 的安全升级顺序。项目仍处于早期版本时可以重置环境，但一旦发布给真实用户或存在生产数据，所有结构和默认数据变化都必须使用独立 migration 与版本说明。

## 生产配置基线

至少通过环境变量提供两把互不相同的随机密钥：

```yaml
jwt:
  secret_key: ${JWT_SECRET_KEY}
security:
  credential_encryption_key: ${CREDENTIAL_ENCRYPTION_KEY}
```

推荐分别生成 32 字节随机值，Base64 后通常约 44 个字符：

```bash
openssl rand -base64 32
openssl rand -base64 32
```

- `JWT_SECRET_KEY` 用于 Token 签名。
- `CREDENTIAL_ENCRYPTION_KEY` 用于派生短信、对象存储等凭据保护密钥。
- 两者不能复用。
- 同一部署所有 `service`、`worker`、`cron` 副本必须一致。
- 凭据主密钥只在启动时读取，修改后需要协调重启。

不要把真实密钥提交到 Git、镜像层或示例配置。

## 标准升级顺序

### 1. 记录目标版本并备份

- 记录当前 Git Tag/Commit、二进制版本和前端构建版本。
- 备份 MySQL。
- 备份部署配置与密钥引用，不能把明文密钥写进普通工单。
- 确认对象存储版本控制、生命周期或备份策略。

### 2. 检查 migration

```bash
go run main.go -c ./config.yaml command migrate check
go run main.go -c ./config.yaml command migrate version
```

先在预发布环境验证，再执行：

```bash
go run main.go -c ./config.yaml command migrate up
```

Migration 先于新版本服务启动。缺少权限版本表等关键结构时，系统会 fail-closed，而不是绕过安全检查继续运行。

### 3. 同步声明式元数据

路由代码变化后先在源码构建阶段重新生成并审查 OpenAPI：

```bash
go run main.go -c ./config.yaml command gen-openapi
git diff -- docs/openapi.yaml
```

生成 OpenAPI 不写业务数据库，可以放进 CI；生成文件应随同本次代码版本提交。随后只在已授权的目标环境执行会写库的同步命令：

```bash
# 路径、Method、安全策略或 API 展示元数据变化
go run main.go -c ./config.yaml command api-route -y

# 新增或修改内置异步/Cron 任务定义
go run main.go -c ./config.yaml command task sync-definitions
```

`api-route` 和任务同步都会写数据库。只改 Service 内部实现时不需要机械执行。生成 OpenAPI 不能替代目标环境的 API 路由同步，反过来同步数据库也不会自动更新仓库里的 `docs/openapi.yaml`。

### 4. 协调发布进程

推荐顺序：

1. 发布兼容旧任务载荷的 Worker。
2. 发布 Service。
3. 发布唯一 Cron 实例。
4. 发布前端静态资源。

如果版本修改了 Redis namespace、消息格式、任务载荷或密钥派生规则，不要让新旧版本长时间混跑。应在 Release Notes 中明确停机或协调重启窗口。

### 5. 验证

```bash
curl https://example.com/ping
curl https://example.com/health/readiness
```

还应使用普通管理员和超级管理员分别验证：

- 登录、刷新、退出与会话撤销。
- 菜单、按钮、API 和数据权限。
- 文件上传、下载、私有签名链接与删除。
- Worker 消费、导出与任务明细。
- Cron 只存在一个调度实例。
- 短信测试使用当前草稿，正式发送使用已保存配置。

## 回滚边界

代码回滚不等于数据库回滚。发布前应判断 migration 是否向后兼容：

- 新增可空字段、索引和独立表通常可以先迁移后发布。
- 删除、重命名、收紧约束和不可逆数据转换不能直接依赖代码回滚。
- `down` 文件存在不代表生产环境一定可以安全执行。

如果新旧版本不能共享数据库结构或消息格式，回滚方案必须包含数据恢复或双写/兼容窗口。

`init-system` 会清空目标数据库对象，只用于已授权的环境重建，不是升级或回滚命令。

## 凭据主密钥轮换

当前 `enc:v1` 凭据需要原主密钥解密。直接替换 `CREDENTIAL_ENCRYPTION_KEY` 会导致旧短信和存储凭据无法读取。

轮换步骤必须是：

1. 保留旧密钥并停止配置写入。
2. 使用旧密钥离线解密已有凭据。
3. 使用新密钥重新加密并核对数量。
4. 协调更新全部进程的环境变量。
5. 同时重启 Service、Worker 和 Cron。
6. 测试短信、存储和任务。
7. 确认无需回滚后再销毁旧密钥。

当前没有在线多 Key Version 自动轮换。高安全场景可后续接入 KMS/RAM Role，但不要在没有迁移工具时直接替换主密钥。

## Release Notes 至少写什么

- 版本号和 Git Commit。
- Go、Node、MySQL、Redis 版本要求。
- Migration 列表与是否可逆。
- 是否需要执行 `api-route` 或 `task sync-definitions`。
- OpenAPI 是否重新生成，以及对外契约是否兼容。
- 新增或删除的环境变量。
- API/任务载荷兼容性。
- 数据修复或人工步骤。
- 已知风险、监控指标和回滚条件。

开源项目从第一个公开版本开始就应使用语义化版本和变更日志。不要修改已经发布版本所依赖的 migration；开发期未发布的初版可以收敛原 migration，但发布后必须新增版本化 migration。
