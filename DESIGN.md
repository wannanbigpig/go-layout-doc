# Gin-Layout Website Design System

本文档定义 `gin-layout-doc` 官方站点与文档中心的 UI 设计规范与视觉风格。

## 1. 核心定位与原则

- **清晰专注**：以工程文档排版与阅读舒适度为最高优先级，弱化过度装饰，强化文字与代码的可读性。
- **现代化工程感**：采用整洁的几何字体、细边框分割线与高对比度色彩体系。
- **响应式体验**：适配桌面端侧边目录、平板与移动端浮动抽屉导航。

## 2. 色彩系统

- **Primary**: `#1e293b` (主深色), `#0f172a` (页脚/沉浸暗色)
- **Brand Accent**: `#3b82f6` (品牌蓝 / 活跃链接)
- **Success**: `#10b981`
- **Warning**: `#f59e0b`
- **Error**: `#ef4444`
- **Neutral Light**:
  - Canvas: `#ffffff`
  - Surface: `#f8fafc`
  - Border: `#e2e8f0`
  - Text Primary: `#0f172a`
  - Text Muted: `#64748b`

## 3. 字体与排版

- **主体字体**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **等宽代码字体**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
- **字阶规范**:
  - 页面主标题 (H1): 32px / 1.25 / 700
  - 二级标题 (H2): 24px / 1.3 / 600
  - 三级标题 (H3): 18px / 1.4 / 600
  - 正文正文 (Body): 15px / 1.6 / 400
  - 辅助文字 (Caption): 13px / 1.5 / 400

## 4. 组件规范

- **卡片容器**: 圆角 `8px` ~ `12px`，细边框 `1px solid #e2e8f0`，悬浮微阴影。
- **代码块**: 独立暗色/浅色高亮区域，包含一键复制与语言标牌。
- **状态徽标 (Badge)**: 小圆角药丸标签，包含 HTTP 方法 (GET/POST/PUT/DELETE) 标识。
