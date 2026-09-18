# 任务、Worker 与 Cron

Gin Layout 有三种进程角色：

| 进程 | 职责 | 能否多实例 |
| --- | --- | --- |
| `service` | HTTP API、登录、权限、WebSocket | 可以横向扩容 |
| `worker` | 消费 Asynq 异步任务 | 可以多实例竞争消费 |
| `cron` | 按 Cron 表达式触发周期任务 | 当前只能运行一个实例 |

它们应使用相同 MySQL、Redis 逻辑库、`app.app_env`、`queue.namespace`、JWT 密钥和凭据加密主密钥。

## Worker 适合什么任务

Worker 适合耗时、可重试、无需阻塞 HTTP 响应的工作，例如请求日志落库和导出。启动命令：

```bash
GO_ENV=development go run main.go -c ./config.yaml worker
```

`queue.queues` 必须包含任务使用的队列，否则任务能入队但不会被消费。多个 Worker 正常情况下会竞争同一任务，但 Asynq 是至少一次语义，Handler 仍需具备幂等或领取执行权的机制。

不要同时运行 `make dev-worker` 和手动启动另一个开发 Worker，否则会产生多消费者和重复重试现象。

## Cron 适合什么任务

Cron 只负责周期触发：

```bash
GO_ENV=development go run main.go -c ./config.yaml cron
```

内置任务声明位于 `internal/cron/`，运行配置保存于 `task_definitions`。代码定义和运营配置的边界是：

- 代码决定任务 Code、Handler、默认表达式与安全属性。
- 数据库决定当前 `status`、`cron_spec`、是否允许手动触发、重试与记录策略。
- Cron 进程会周期读取变化并更新本机调度。

新增或修改任务定义后执行：

```bash
go run main.go -c ./config.yaml command task sync-definitions
go run main.go -c ./config.yaml command task scan-async
go run main.go -c ./config.yaml command task scan-cron
```

这不是数据库重建场景，不要运行 `init-system`。

## 为什么当前只允许一个 Cron 实例

普通任务只有进程内 `SkipIfStillRunning` 保护。启动多个 Cron 实例后，每个实例都有自己的调度器，同一周期可能重复触发。

高风险任务虽有 Redis 执行锁，但当前锁：

- 只覆盖明确标记为高风险的任务；
- 只保证执行期间互斥，不保证每个调度周期只有一次触发；
- 固定 30 分钟 TTL，没有自动续期；
- 长任务超过 TTL 后仍可能再次并发。

因此当前生产约束是：只运行一个 Cron 实例。若将来需要高可用 Cron，需要按“任务 Code + 调度周期”做唯一触发记录、锁续期和故障接管，不能只多启动一个副本。

## 任务中心怎么理解

任务中心主要展示三类信息：

- **任务定义**：系统有哪些任务、是否启用、能否手动执行或重试。
- **运行明细**：一次具体执行的状态、耗时、错误和重试关系。
- **统计趋势**：在筛选时间段内成功、失败、超时、取消和中断的聚合。

统计卡片用于发现问题，运行明细才是诊断入口。点击失败、超时或中断统计时，应带状态与当前筛选条件跳转到对应明细列表。

## 幂等、重试和通知

- 请求审计使用稳定 `request_id` 避免重复落库。
- 导出任务使用数据库条件更新和稳定 Task ID 领取执行权。
- 待办提醒使用包含待办 ID、截止时间和提醒类型的幂等键。
- WebSocket 只负责实时体验，最终状态以数据库消息、任务记录或导出记录为准。

供应商“已接受”不等于短信已送达。结果未知时默认不自动重试，避免重复通知和重复计费。

## 上线检查

1. 执行 migration。
2. 同步任务定义。
3. 检查 `queue.queues`。
4. 启动一个 Cron 和按容量需要启动的 Worker。
5. 在任务中心确认定义与运行状态。
6. 手动触发一个允许执行的低风险任务。
7. 验证失败明细、重试关系和通知，不只看统计数字。
