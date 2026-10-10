# Gin Layout 官网、文档与 API 目录

Gin Layout 的官网、独立文档与 API 目录站点。首页提供产品介绍与快速开始；`/docs/` 提供由 Markdown 渲染的系统文档；`/api/` 提供独立 API 目录工作台，端点数量随目录实时计算。

## 在线访问

- 官网：https://www.wannanbigpig.com
- 文档：https://www.wannanbigpig.com/docs/
- API 目录：https://www.wannanbigpig.com/api/
- 演示环境：https://x-l-admin.wannanbigpig.com
- 后端仓库：https://github.com/wannanbigpig/gin-layout
- 前端仓库：https://github.com/wannanbigpig/go-admin-ui

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- Element Plus - 基于 Vue 3 的组件库
- Marked - Markdown 渲染

## 本地开发

```bash
# 按锁文件安装依赖
npm ci

# 启动开发服务器
npm run dev

# 校验 API 目录与示例、文档加载回归
npm run check:api
npm test

# 使用官方 registry 检查依赖漏洞
npm audit --registry=https://registry.npmjs.org

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

- 官网：`http://127.0.0.1:5173/`
- 文档：`http://127.0.0.1:5173/docs/`
- API 目录：`http://127.0.0.1:5173/api/`

## 文档内容

- [文档总览](./docs/README.md)
- [权限配置与代码接入](./docs/permissions.md)
- [系统参数完整指南](./docs/system-config.md)
- [短信供应商扩展](./docs/sms-providers.md)
- [存储供应商扩展](./docs/storage-providers.md)
- [任务、Worker 与 Cron](./docs/task-runtime.md)
- [部署、升级与回滚](./docs/deployment-upgrades.md)

## 项目结构

```
go-layout-doc/
├── api/
│   └── index.html       # API 目录独立页面入口
├── docs/
│   ├── index.html       # 文档页面入口
│   ├── README.md        # 文档总览
│   ├── permissions.md   # 权限文档
│   ├── system-config.md # 系统参数指南
│   ├── sms-providers.md # 短信供应商扩展
│   ├── storage-providers.md # 存储供应商扩展
│   ├── task-runtime.md  # Worker/Cron/任务中心
│   └── deployment-upgrades.md # 部署升级与回滚
├── src/
│   ├── App.vue          # 官网首页
│   ├── DocsApp.vue      # 文档中心页面
│   ├── ApiApp.vue       # API 目录工作台页面
│   ├── main.js          # 官网入口
│   ├── docs-main.js     # 文档入口
│   ├── api-main.js      # API 目录入口
│   ├── style.css        # 官网样式
│   ├── docs-style.css   # 文档样式
│   └── api-style.css    # API 目录样式
├── index.html           # 官网 HTML 模板
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
└── README.md            # 项目说明
```

## 部署

构建后的文件位于 `dist` 目录，可部署到任意静态文件服务器。构建产物同时包含首页 `dist/index.html`、文档页 `dist/docs/index.html` 与 API 目录页 `dist/api/index.html`。

```bash
# 构建
npm run build

# 复制 dist 目录到服务器
scp -r dist/* user@server:/var/www/go-layout-doc/
```

## 许可证

MIT License

## 作者

wannanbigpig

## API 版本与管理后台 Tag

官网没有独立版本号和 Release。API 页面支持后端正式 Release 版本切换，直接在线阅读 OpenAPI、错误码、升级说明和版本对应信息。首次访问自动发现最新后端，并按双向兼容范围匹配管理后台正式 Tag；页面可见时每 5 分钟检查，也可点击“检查新版本”。分享链接固定版本，例如 `/api/?apiVersion=v0.10.0&adminVersion=v0.10.2&view=upgrade`。

完整 API 业务目录源在后端 `docs/api/`，由 `node scripts/generate-api-documentation.mjs` 生成 `docs/api-documentation.json` 并随后端 Tag 提交。版本切换读取其真实提交中的文档，接口改动不会混用最新示例。首次部署本功能后，后续符合契约的正式 GitHub Release 无需重新部署官网即可被发现；不检测服务器实际部署版本。

```bash
# 同步内置文档；先在后端生成并提交版本文档。
BACKEND_ROOT=../gin-layout FRONTEND_ROOT=../go-admin-ui npm run sync:openapi
npm run check:api
npm test
npm run build

# 可指定真实 Tag 作为内置来源；双方版本号可以不同。
BACKEND_ROOT=../gin-layout FRONTEND_ROOT=../go-admin-ui \
BACKEND_TAG=v0.10.0 FRONTEND_TAG=v0.10.2 npm run sync:openapi
```

GitHub 公开只读查询需要访问 `api.github.com` 和 `raw.githubusercontent.com`，列表缓存 5 分钟，不在浏览器配置 token。网络失败或限流时显示原因；内置开发文档标示“待发布”。指定 Tag 不存在、缺少完整文档或版本声明不一致时显示错误；没有兼容管理后台时明确提示。独立检出使用 `npm run check:api -- --snapshot-only` 仅验证内置快照，CI 对真实 Tag 来源再次核对。业务字段仍需按真实请求和资源结构审查。详见 [部署与版本指南](docs/deployment-upgrades.md)。
