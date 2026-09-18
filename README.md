# Gin Layout 官网与教程文档

Gin Layout 的官网与独立教程站点。首页提供产品介绍、快速开始和 API 目录；`/docs/` 提供直接由 Markdown 渲染的详细教程。

## 在线访问

- 官网：https://www.wannanbigpig.com
- 教程文档：https://www.wannanbigpig.com/docs/
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
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

- 官网：`http://127.0.0.1:5173/`
- 教程文档：`http://127.0.0.1:5173/docs/`

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
├── docs/
│   ├── index.html       # 教程页面入口
│   ├── README.md        # 文档总览
│   ├── permissions.md   # 权限教程
│   ├── system-config.md # 系统参数教程
│   ├── sms-providers.md # 短信供应商扩展
│   ├── storage-providers.md # 存储供应商扩展
│   ├── task-runtime.md  # Worker/Cron/任务中心
│   └── deployment-upgrades.md # 部署升级与回滚
├── src/
│   ├── App.vue          # 官网首页
│   ├── DocsApp.vue      # 教程文档页面
│   ├── main.js          # 官网入口
│   └── docs-main.js     # 教程入口
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
└── README.md            # 项目说明
```

## 部署

构建后的文件位于 `dist` 目录，可部署到任意静态文件服务器。构建产物同时包含首页 `dist/index.html` 与教程页 `dist/docs/index.html`。

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
