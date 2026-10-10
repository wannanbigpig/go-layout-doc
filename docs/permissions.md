# 权限配置与代码接入

Gin Layout 的权限不是“给用户勾几个接口”这么简单。它把页面可见性、按钮显示、接口鉴权和数据范围分开管理，再通过角色把它们组合起来。正确理解这条关系，可以避免菜单能看到但接口返回 403、按钮被隐藏但接口仍能访问等常见问题。

> 核心原则：数据库关系是权限真相，Casbin 负责最终接口判定；前端按钮权限只改善交互体验，不能替代服务端鉴权。

## 先理解完整权限链

一个普通管理员最终能访问哪些接口，由下面的关系共同决定：

```text
管理员
  ├─ 直接绑定角色
  └─ 所属部门绑定角色
          ↓
       启用的角色
          ↓
     role_menu_map
          ↓
   启用且可授权的菜单 / 按钮
          ↓
     menu_api_map
          ↓
      API 路径 + 方法
          ↓
       Casbin 策略
```

一次权限判断不只看 URL。`GET /admin/v1/product/list` 与 `POST /admin/v1/product/create` 是两个不同权限，因为 HTTP Method 也是权限的一部分。

权限写操作会在事务内更新数据库关系并同步受影响用户的最终策略。多实例部署还会使用 MySQL 权限版本和 Redis 通知协调本机缓存；版本读取或策略重载失败时采用 fail-closed，也就是拒绝而不是放行。

## 五类安全策略

路由的真实安全策略定义在 `internal/routers/catalog.go`，子路由默认继承所属 `RouteGroupDef`：

| 策略 | 含义 | `api.is_auth` 投影 |
| --- | --- | --- |
| `SecurityPublic` | 完全公开 | `0` |
| `SecurityRefreshCookie` | 使用 Refresh Cookie，不使用 Access Token | `0` |
| `SecurityWebSocketTicket` | 使用一次性 WebSocket Ticket | `0` |
| `SecurityAccessToken` | 只要求登录 | `1` |
| `SecurityAccessTokenPermission` | 登录后继续校验接口权限 | `2` |

`api.is_auth` 只是兼容展示字段，不是真实配置入口。特别是 `RefreshCookie` 和 `WebSocketTicket` 虽然投影为 `0`，也不能理解为公开接口。

管理后台的大部分业务接口都在 `adminPermissionGroup` 下，继承 `SecurityAccessTokenPermission`：

```go
func adminPermissionGroup(deps *ControllerDeps) RouteGroupDef {
    return RouteGroupDef{
        Security: SecurityAccessTokenPermission,
        Children: []RouteGroupDef{
            dashboardGroup(deps),
            adminUserGroup(deps),
            permissionGroup(deps),
            menuGroup(deps),
            roleGroup(deps),
            productGroup(deps),
            systemGroup(deps),
        },
    }
}
```

接口权限编辑页只能维护名称、描述和排序，不能直接修改 `is_auth`。要改变认证模式，必须修改路由声明并重新同步 Catalog。

## 管理端从零配置一套权限

下面用“产品查看与新增”作为例子。目标是让一个普通管理员能看到产品菜单、打开产品列表，并且只有部分角色能看到“新增产品”按钮和调用新增接口。

### 第一步：确认接口已经同步

后端新增或修改了路径、Method、安全策略或 API 展示元数据后，在已授权的目标环境执行：

```bash
go run main.go -c ./config.yaml command api-route -y
```

这个命令会根据声明式路由 Catalog 同步 `api` 表，并刷新关联权限。它会写数据库，不应该仅为了本地静态检查而执行。

进入管理端：

```text
权限管理 → 接口
```

按 `product` 或 `/admin/v1/product` 搜索，应看到类似接口：

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/admin/v1/product/list` | 产品列表 |
| `GET` | `/admin/v1/product/detail` | 产品详情 |
| `POST` | `/admin/v1/product/create` | 新增产品 |
| `POST` | `/admin/v1/product/update` | 更新产品 |
| `POST` | `/admin/v1/product/delete` | 删除产品 |

如果这里没有接口，先检查路由是否真的进入 `AdminRouteTree()`，再检查 `api-route` 命令使用的 `config.yaml` 是否指向当前环境。

### 第二步：菜单绑定页面接口

进入：

```text
权限管理 → 菜单 → 编辑“产品管理”
```

菜单有三种类型：

| 类型 | 值 | 用途 |
| --- | --- | --- |
| 目录 | `1` | 组织导航层级，本身通常不对应页面 |
| 菜单 | `2` | 对应一个前端页面和路由 |
| 按钮 | `3` | 对应页面内操作，必须填写权限 Code |

给“产品管理”页面菜单关联至少以下接口：

- `GET /admin/v1/product/list`
- `GET /admin/v1/product/detail`

提交时后端接收的核心字段类似：

```json
{
  "id": 120,
  "type": 2,
  "title_i18n": {
    "zh-CN": "产品管理",
    "en-US": "Products"
  },
  "name": "Product",
  "path": "/business/product",
  "component_key": "product:index",
  "is_show": 1,
  "is_auth": 1,
  "status": 1,
  "api_list": [81, 84]
}
```

`component_key` 使用前端 `src/router/componentMap.ts` 注册的语义标识，例如 `product:index`；不能直接填写组件文件路径。`api_list` 放 API 表的 ID，不是 URL 字符串。菜单标题的 `title_i18n` 是 Replace 语义：编辑时省略已有语言，相当于删除该语言，所以表单应回填完整多语言后再提交。

### 第三步：按钮绑定写接口

在产品菜单下面创建“新增产品”按钮：

```json
{
  "type": 3,
  "pid": 120,
  "title_i18n": {
    "zh-CN": "新增产品",
    "en-US": "Create Product"
  },
  "code": "product:create",
  "is_show": 1,
  "is_auth": 1,
  "status": 1,
  "api_list": [82]
}
```

关键点：

- `code` 是前端按钮权限标识，建议保持 `模块:动作`，例如 `product:create`。
- `api_list` 绑定真正执行该动作的接口，例如 `POST /product/create`。
- 如果一次操作会先读详情再更新，可在对应操作节点绑定多个接口。
- 不要只创建 Code 而不绑定 API；那样按钮可能显示，但服务端没有获得接口授权。

更新、删除按钮同理使用 `product:update`、`product:delete`，并分别绑定对应接口。

### 第四步：角色选择菜单与数据范围

进入：

```text
权限管理 → 角色 → 新增或编辑角色
```

勾选产品页面与允许使用的按钮节点。后端请求示例：

```json
{
  "name": "产品运营",
  "code": "product_operator",
  "description": "查看和维护产品资料",
  "status": 1,
  "menu_list": [120, 121, 122],
  "data_scope": 2,
  "dept_ids": []
}
```

角色数据范围：

| `data_scope` | 含义 | `dept_ids` |
| --- | --- | --- |
| `1` | 全部数据 | 忽略 |
| `2` | 本部门及子部门 | 忽略 |
| `3` | 仅本部门 | 忽略 |
| `4` | 仅本人 | 忽略 |
| `5` | 自定义部门 | 必须填写允许的部门 ID |

角色保存时，后端会校验菜单 ID，并规范化为真实可授权节点。目录节点主要用于展示层级，不要依赖“勾选一个空目录”产生接口权限。

超级管理员角色是受保护角色，不能像普通角色一样修改或删除。

### 第五步：把角色绑定给用户或部门

直接给管理员绑定角色：

```http
POST /admin/v1/admin-user/bind-role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_id": 18,
  "role_ids": [6]
}
```

也可以给部门绑定角色：

```http
POST /admin/v1/department/bind-role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "dept_id": 9,
  "role_ids": [6]
}
```

用户的最终角色由直接绑定角色和部门角色共同组成。正常的角色、菜单、用户、部门写接口会同步受影响用户的 Casbin 策略，不需要每次手动重建。

### 第六步：验证普通账号

不要只用超级管理员验证。使用被授权的普通账号重新登录或刷新权限数据，至少检查：

1. 左侧能否看到“产品管理”。
2. 页面能否正常请求列表与详情。
3. 只有获得 `product:create` 的角色能看到新增按钮。
4. 直接调用未授权的新增接口应返回 `403`。
5. 数据范围是否只返回当前角色允许的数据。

“按钮不显示”与“接口被拒绝”是两种不同证据。前者验证前端权限映射，后者才验证后端安全边界。

## 在代码里新增受保护接口

### 1. 在路由树声明接口

业务接口应放在对应 `RouteGroupDef` 中，而不是只手写 Gin 路由：

```go
func productGroup(deps *ControllerDeps) RouteGroupDef {
    return RouteGroupDef{
        Prefix:    "product",
        GroupCode: "product",
        Routes: []RouteDef{
            GET("list", "产品列表", deps.Product.List),
            GET("detail", "产品详情", deps.Product.Detail),
            POST("create", "新增产品", deps.Product.Create),
            POST("update", "更新产品", deps.Product.Update),
            POST("delete", "删除产品", deps.Product.Delete),
        },
    }
}
```

该组位于 `adminPermissionGroup` 下，所以最终继承 `SecurityAccessTokenPermission`。Catalog 会同时供 Gin 注册、API 同步、OpenAPI 与测试使用。

### 2. 补默认菜单/API 绑定

项目的系统默认绑定维护在：

```text
internal/service/access/menu_api_defaults.go
```

新增权限路由时，应给对应菜单或按钮补默认绑定，例如：

```go
{MenuCode: "product:create", Route: "/admin/v1/product/create", Method: "POST"},
```

这样全新初始化环境和路由同步后能得到一致权限关系。确实不需要菜单绑定的权限路由，应在测试中明确说明豁免原因，而不是默默遗漏。

### 3. 同步并验证

```bash
go test ./internal/routers ./internal/service/access
go run main.go -c ./config.yaml command api-route -y
```

第二条命令只在已授权的目标环境执行。同步后再用普通角色完成一次允许和一次拒绝场景。

## 前端按钮怎么使用 Code

配套 X-L-Admin-Vue3 已提供 `v-permission` 指令。菜单按钮的 `code` 必须和前端使用值一致：

```vue
<xl-action-button
  v-permission="'product:create'"
  code="product:create"
  type="primary"
  @click="openCreateDrawer"
/>
```

普通元素也可以使用：

```vue
<el-button v-permission="'product:delete'" type="danger">
  删除
</el-button>
```

需要在脚本里判断时使用现有 helper：

```ts
import { hasPermission } from '@/utils/auth'

const canCreateProduct = hasPermission('product:create')
```

前端登录后会从用户菜单信息中整理按钮 Code。Code 控制组件是否展示；真正提交请求后，后端仍按用户最终 API 策略判定。

## 权限什么时候会生效

| 变更 | 正常行为 | 是否需要手动处理 |
| --- | --- | --- |
| 编辑角色菜单 | 事务内同步受影响用户 | 不需要 |
| 给用户绑定角色 | 事务内同步该用户 | 不需要 |
| 给部门绑定角色 | 同步受影响部门用户 | 不需要 |
| 编辑菜单绑定 API | 同步受影响角色与用户 | 不需要 |
| 代码新增或修改路由 | 数据库还不知道新 Catalog | 执行 `api-route -y` |
| 手工改数据库或历史数据异常 | 正常写链路被绕过 | 使用修复命令重建 |

全量修复命令：

```bash
go run main.go -c ./config.yaml command rebuild-user-permissions -y
```

管理端“刷新菜单权限缓存”对应 `/admin/v1/menu/update-all-menu-permissions`，会执行全量同步。它适合修复或运维，不应成为每次正常编辑后的固定步骤。

## 常见问题排查

| 现象 | 优先检查 | 常见原因 |
| --- | --- | --- |
| 接口管理里找不到新接口 | Catalog、`api-route` 使用的数据库 | 只写了 Handler，未进入路由树；同步到了别的库 |
| 菜单能看到，接口返回 403 | 菜单 `api_list`、角色菜单、Method | 页面节点没有绑定接口，或绑定了同路径不同 Method |
| 按钮不显示，但接口可调用 | 按钮 `code` 与前端指令 | Code 拼写不一致；前端权限数据未刷新 |
| 按钮显示，接口返回 403 | 按钮的 `api_list` | 只配置了 Code，没有绑定真实 API |
| 用户改了角色仍是旧权限 | 用户直接角色、部门角色、策略版本 | 修改绕过了正常接口；多实例配置不一致 |
| 所有权限接口突然拒绝 | migration、MySQL、Redis 与日志 | 缺少权限版本表或策略加载失败，系统 fail-closed |
| 数据能访问但范围不对 | 角色 `data_scope`、业务查询 | Service 没接入 DataScope，或自定义部门配置错误 |

排查时保留响应中的 `request_id`，再到请求日志或服务日志按该 ID 定位。不要通过临时改成公开路由来“验证功能”，那会绕过正在排查的安全边界。

## 上线前检查清单

- 路由安全策略不是靠 `api.is_auth` 手工修改。
- 每个权限路由都有默认菜单/API 绑定或明确豁免。
- 菜单/按钮 Code 与前端 `v-permission` 完全一致。
- 页面读接口和按钮写接口分别绑定到正确节点。
- 角色数据范围已用非超级管理员账号验证。
- 至少验证一个允许请求和一个拒绝请求。
- 多实例使用相同 MySQL、Redis 逻辑库、`app_env` 与 `queue.namespace`。
- 部署先完成 migration，再执行版本要求的 `api-route -y`。
