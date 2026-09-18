<template>
  <div ref="siteShell" class="site-shell">
    <header class="site-header">
      <div class="nav-container">
        <a class="brand" href="#top" aria-label="Gin Layout 首页" @click="closeMenu">
          <img class="brand-mark" src="/gin-layout-mark.svg" alt="" />
          <span>Gin Layout</span>
        </a>
        <nav :class="['main-nav', { open: mobileMenuOpen }]" aria-label="主导航">
          <a v-for="item in navItems" :key="item.id" :href="`#${item.id}`" @click="closeMenu">{{ item.label }}</a>
          <a href="/docs/" @click="closeMenu">教程文档</a>
        </nav>
        <div class="header-actions">
          <a
            class="github-link"
            href="https://github.com/wannanbigpig/gin-layout"
            target="_blank"
            rel="noreferrer"
            :aria-label="githubStars === null ? 'GitHub 仓库' : `GitHub 仓库，${githubStars} 个 Star`"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
            <span>GitHub</span>
            <span class="github-stars" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m12 2.8 2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3-4.58-4.46 6.33-.92L12 2.8Z" /></svg>
              <b>{{ formatGithubStars(githubStars) }}</b>
            </span>
          </a>
          <a class="button button-small button-primary" href="https://x-l-admin.wannanbigpig.com" target="_blank" rel="noreferrer">在线演示</a>
          <button class="menu-toggle" type="button" :aria-expanded="mobileMenuOpen" aria-label="切换导航" @click="mobileMenuOpen = !mobileMenuOpen"><span></span><span></span></button>
        </div>
      </div>
    </header>

    <main id="top">
      <section class="hero">
        <div class="container hero-layout">
          <div class="hero-copy" data-reveal="left">
            <div class="project-badge"><span>开源</span> Gin + Vue 3 后台管理系统</div>
            <h1><span>开箱即用的</span><em>Go 后台基础设施</em></h1>
            <p class="hero-lead">集成认证权限、动态菜单、文件中心、日志审计与任务调度。保留清晰的工程边界，让你从业务开发开始，而不是重复搭建后台底座。</p>
            <div class="hero-actions">
              <a class="button button-primary" href="#quickstart">快速开始<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 5l4 4-4 4" /></svg></a>
              <a class="button button-secondary" href="/docs/">教程文档</a>
            </div>
            <div class="hero-meta">
              <span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v16M2 10h16" /></svg>MIT License</span>
              <span>Go 1.27+</span><span>{{ apiCatalog.length }} 个接口</span>
            </div>
          </div>
          <div class="hero-preview" data-reveal="right">
            <div class="browser-frame">
              <div class="browser-bar"><i></i><i></i><i></i><span>x-l-admin.wannanbigpig.com</span></div>
              <img src="/screenshots/x-l-admin-super-admin-home.jpg" alt="X-L-Admin 超级管理员工作台截图" />
            </div>
            <div class="preview-caption"><span>真实管理端界面</span><p>个人工作台 · 权限菜单 · 操作审计</p></div>
          </div>
        </div>
      </section>

      <section class="stack-strip" aria-label="技术栈" data-reveal><div class="container"><span>Gin</span><span>GORM</span><span>Casbin</span><span>MySQL</span><span>Redis</span><span>Asynq</span><span>Vue 3</span><span>Element Plus</span></div></section>

      <section id="preview" class="section product-section">
        <div class="container">
          <div class="section-heading centered-heading" data-reveal><span class="eyebrow">PRODUCT PREVIEW</span><h2>不是概念图，是已经可以使用的管理端。</h2><p>配套 X-L-Admin 前端直接消费 Gin Layout 的菜单、权限与业务接口，覆盖后台系统最常见的操作路径。</p></div>
          <div class="product-showcase" data-reveal>
            <div class="showcase-stage">
              <img ref="showcaseImage" :key="activePreviewSlide.id" :class="{ 'preview-image-hidden': isPreviewHidden(activePreviewSlide.id) }" :src="activePreviewSlide.image" :alt="activePreviewSlide.alt" />
            </div>
            <div class="showcase-label"><span class="status-dot"></span> X-L-Admin / {{ activePreviewSlide.label }}</div>
          </div>
          <div class="preview-grid" aria-label="管理端界面预览">
            <button v-for="(slide, index) in previewCards" :key="`preview-slot-${index}`" class="preview-card" :data-swap-target="previewTargetIndex === index" type="button" :aria-label="`将${slide.title}展开到主视图`" data-reveal :style="{ '--reveal-order': index }" @click="selectPreview(index)">
              <div class="preview-crop"><img :ref="(element) => setPreviewImageRef(element, index)" :class="{ 'preview-image-hidden': isPreviewHidden(slide.id) }" :src="slide.image" :alt="slide.alt" /><span class="preview-action">点击展开</span></div>
              <div><span>0{{ index + 1 }}</span><h3>{{ slide.title }}</h3><p>{{ slide.description }}</p></div>
            </button>
          </div>
          <article class="frontend-project" data-reveal>
            <div class="frontend-project-copy">
              <span class="eyebrow">PAIRED FRONTEND</span>
              <div class="frontend-project-title"><img class="frontend-logo" src="/gin-layout-mark.svg" alt="" /><div><h3>X-L-Admin-Vue3</h3><code>github.com/wannanbigpig/go-admin-ui</code></div></div>
              <p>与 Gin Layout 配套的 Vue 3 管理端。基于后端菜单动态生成路由，覆盖登录与 Token 静默刷新、路由和按钮权限、文件与任务中心、操作日志以及 WebSocket 实时通知。</p>
              <div class="frontend-tags"><span>Vue 3.5</span><span>TypeScript 6</span><span>Vite 8</span><span>Element Plus 2.14</span><span>Pinia 4</span></div>
              <div class="frontend-actions"><a class="button button-primary" href="https://github.com/wannanbigpig/go-admin-ui" target="_blank" rel="noreferrer">前端 GitHub<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 5l4 4-4 4" /></svg></a><a class="button button-secondary" href="https://x-l-admin.wannanbigpig.com/" target="_blank" rel="noreferrer">在线演示</a></div>
            </div>
            <div class="frontend-project-grid" aria-label="X-L-Admin 前端能力">
              <div><b>01</b><strong>动态路由</strong><span>后端菜单驱动页面与导航</span></div>
              <div><b>02</b><strong>权限体系</strong><span>路由、菜单与按钮级控制</span></div>
              <div><b>03</b><strong>实时协作</strong><span>WebSocket 通知与导出联动</span></div>
              <div><b>04</b><strong>工程底座</strong><span>Axios、i18n、主题与测试</span></div>
            </div>
          </article>
        </div>
      </section>

      <section id="features" class="section capabilities-section">
        <div class="container">
          <div class="section-heading split-heading" data-reveal>
            <div><span class="eyebrow">CORE CAPABILITIES</span><h2>后台项目需要的基础能力，已经准备好。</h2></div>
            <p>不制造过度抽象，只把身份、权限、文件、任务和审计这些高频基础设施组织成可读、可扩展的工程结构。</p>
          </div>
          <div class="capability-grid">
            <article v-for="(item, index) in capabilities" :key="item.title" class="capability-card" data-reveal :style="{ '--reveal-order': index }">
              <div class="capability-top"><svg viewBox="0 0 28 28" aria-hidden="true"><path :d="item.icon" /></svg><span>0{{ index + 1 }}</span></div>
              <h3>{{ item.title }}</h3><p>{{ item.description }}</p><ul><li v-for="tag in item.tags" :key="tag">{{ tag }}</li></ul>
            </article>
          </div>
          <div class="backend-architecture" data-reveal>
            <div class="architecture-header">
              <div><span class="eyebrow">BACKEND ARCHITECTURE</span><h3>一套契约，三类进程，完整承接后台业务。</h3><p>请求链路保持职责清晰；异步消费与定时调度独立运行，数据、权限和接口文档仍由同一套工程约定串联。</p></div>
              <div class="process-legend" aria-label="后端进程图例"><span><i class="legend-service"></i>service · HTTP API</span><span><i class="legend-worker"></i>worker · 异步消费</span><span><i class="legend-cron"></i>cron · 定时调度</span></div>
            </div>
            <div class="architecture-canvas">
              <section class="contract-plane" aria-label="路由契约平面">
                <div class="architecture-index"><b>01</b><span>CONTRACT PLANE</span></div>
                <div class="contract-source"><small>DECLARATION</small><strong>AdminRouteTree()</strong><code>path · method · security · metadata</code></div>
                <span class="architecture-connector" aria-hidden="true">→</span>
                <div class="contract-compiler"><small>COMPILE</small><strong>Catalog</strong><code>CompileRouteTree()</code></div>
                <span class="architecture-connector" aria-hidden="true">→</span>
                <div class="contract-outputs"><div><b>RUNTIME</b><span>Gin Router</span></div><div><b>ACCESS</b><span>API / 权限同步</span></div><div><b>SPEC</b><span>OpenAPI</span></div><div><b>VERIFY</b><span>契约测试</span></div></div>
              </section>

              <section class="runtime-plane" aria-label="运行时进程">
                <div class="architecture-index"><b>02</b><span>RUNTIME PLANE</span></div>
                <article class="runtime-process service-process">
                  <header><div><i class="legend-service"></i><small>SERVICE PROCESS</small></div><strong>HTTP 请求主链路</strong><span>同步响应 · 端口 9001</span></header>
                  <div class="service-flow">
                    <div><b>01</b><small>ENTRY</small><strong>Gin Router</strong><span>Catalog 注册路由</span></div>
                    <div><b>02</b><small>GUARD</small><strong>Middleware</strong><span>限流 · JWT · RBAC · 日志</span></div>
                    <div><b>03</b><small>INPUT</small><strong>Controller + Validator</strong><span>绑定、校验与调用</span></div>
                    <div><b>04</b><small>DOMAIN</small><strong>Service</strong><span>业务规则与事务</span></div>
                    <div><b>05</b><small>DATA</small><strong>Model / GORM</strong><span>MySQL 数据访问</span></div>
                    <div><b>06</b><small>OUTPUT</small><strong>Resources + Response</strong><span>code · data · request_id</span></div>
                  </div>
                  <div class="service-integrations"><span>Redis 缓存 / 权限版本</span><span>Local / Aliyun OSS</span><span>Asynq Producer</span><span>Pub/Sub · WebSocket</span></div>
                </article>

                <div class="background-processes">
                  <article class="runtime-process worker-process">
                    <header><div><i class="legend-worker"></i><small>WORKER PROCESS</small></div><strong>Asynq 异步消费</strong><span>独立扩缩容</span></header>
                    <div class="compact-flow"><div><small>QUEUE</small><strong>Redis / Asynq</strong><span>service 投递任务</span></div><b>→</b><div><small>REGISTRY</small><strong>Job Registry</strong><span>任务类型与处理器</span></div><b>→</b><div><small>EXECUTE</small><strong>Handler</strong><span>重试 · 留存 · 运行记录</span></div></div>
                  </article>
                  <article class="runtime-process cron-process">
                    <header><div><i class="legend-cron"></i><small>CRON PROCESS</small></div><strong>动态定时调度</strong><span>默认直接执行</span></header>
                    <div class="cron-sources"><span>MySQL · task_definitions</span><span>Redis Pub/Sub · 配置刷新</span></div>
                    <div class="compact-flow"><div><small>SCHEDULE</small><strong>robfig/cron</strong><span>秒级表达式 · 防重叠</span></div><b>→</b><div><small>EXECUTE</small><strong>ExecuteHandler</strong><span>直接调用注册处理器</span></div><b>→</b><div><small>STATE</small><strong>MySQL</strong><span>运行记录与调度状态</span></div></div>
                  </article>
                </div>
              </section>

              <section class="infrastructure-plane" aria-label="共享基础设施">
                <div class="architecture-index"><b>03</b><span>STATE &amp; INFRASTRUCTURE</span></div>
                <div class="infrastructure-items"><div><small>RELATIONAL DATA</small><strong>MySQL</strong><span>业务、权限、任务与审计</span></div><div><small>CACHE / QUEUE / BUS</small><strong>Redis</strong><span>缓存、Asynq、Pub/Sub</span></div><div><small>OBJECT STORAGE</small><strong>Local / Aliyun OSS</strong><span>直传、分片与文件对象</span></div></div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="quickstart" class="section quickstart-section">
        <div class="container quickstart-layout">
          <div class="quickstart-intro" data-reveal="left"><span class="eyebrow eyebrow-dark">GET IT RUNNING</span><h2>现在，启动你的<br />第一个后台服务。</h2><p>按当前仓库要求准备 Go、MySQL 与 Redis。每一步都给出可直接执行的命令和成功标志。</p>
            <div class="requirements"><span>Go <b>≥ 1.27</b></span><span>MySQL <b>≥ 8.0</b></span><span>Redis <b>≥ 6.2</b> <small>可选</small></span></div>
          </div>
          <div class="setup-panel" data-reveal="right">
            <div class="setup-tabs" role="tablist" aria-label="快速开始步骤">
              <button v-for="(stage, index) in setupStages" :key="stage.id" :class="{ active: activeSetup === index }" type="button" role="tab" :aria-selected="activeSetup === index" @click="activeSetup = index"><span>0{{ index + 1 }}</span>{{ stage.label }}</button>
            </div>
            <div class="setup-body">
              <div class="setup-copy"><span>STEP 0{{ activeSetup + 1 }}</span><h3>{{ currentSetup.title }}</h3><p>{{ currentSetup.description }}</p><ul><li v-for="note in currentSetup.notes" :key="note">{{ note }}</li></ul></div>
              <div class="code-card"><div class="code-card-head"><span>terminal</span><button type="button" @click="copyText(currentSetup.code, `setup-${activeSetup}`)">{{ copiedKey === `setup-${activeSetup}` ? '已复制' : '复制' }}</button></div><pre><code>{{ currentSetup.code }}</code></pre></div>
            </div>
          </div>
        </div>
      </section>

      <section id="tutorial" class="section tutorial-section">
        <div class="container">
          <div class="section-heading tutorial-heading" data-reveal><span class="eyebrow">LEARN THE SYSTEM</span><h2>沿着一次真实请求，<br />看懂项目怎么工作。</h2><p>教程不复述目录树，而是从你真正会修改的四个场景出发。</p></div>
          <div class="tutorial-workbench" data-reveal>
            <div class="tutorial-nav" role="tablist" aria-label="教程章节">
              <button v-for="(item, index) in tutorials" :key="item.id" :class="{ active: activeTutorial === index }" type="button" role="tab" :aria-selected="activeTutorial === index" @click="activeTutorial = index"><span>0{{ index + 1 }}</span><div><b>{{ item.title }}</b><small>{{ item.subtitle }}</small></div><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 5l4 4-4 4" /></svg></button>
            </div>
            <article class="tutorial-content">
              <div class="tutorial-meta"><span>CHAPTER 0{{ activeTutorial + 1 }}</span><span>{{ currentTutorial.duration }}</span></div>
              <h3>{{ currentTutorial.heading }}</h3><p class="tutorial-summary">{{ currentTutorial.summary }}</p>
              <div class="tutorial-points"><div v-for="(point, index) in currentTutorial.points" :key="point.title"><span>{{ index + 1 }}</span><p><b>{{ point.title }}</b>{{ point.text }}</p></div></div>
              <div class="tutorial-code"><div><span>{{ currentTutorial.file }}</span><button type="button" @click="copyText(currentTutorial.code, `tutorial-${activeTutorial}`)">{{ copiedKey === `tutorial-${activeTutorial}` ? '已复制' : '复制' }}</button></div><pre><code>{{ currentTutorial.code }}</code></pre></div>
            </article>
          </div>
        </div>
      </section>

      <section id="api" class="section api-section">
        <div class="container">
        <div class="api-section-head" data-reveal><div><span class="eyebrow">API CATALOG</span><h2>直接浏览项目现有接口。</h2><p>按业务分组、HTTP 方法或关键词筛选，快速确认路径、认证方式与请求示例。</p></div><div class="api-count"><strong>{{ apiCatalog.length }}</strong><span>个当前接口<br />{{ apiGroups.length - 1 }} 个业务分组</span></div></div>
        <section class="api-conventions" aria-labelledby="api-conventions-title" data-reveal>
          <div class="conventions-intro">
            <span class="eyebrow">COMMON CONVENTIONS</span>
            <h3 id="api-conventions-title">公共调用约定</h3>
            <p>接口详情只描述业务参数；鉴权、响应外壳、分页与 HTTP 状态遵循以下统一规则。</p>
            <div class="base-url"><span>BASE URL</span><code>http://127.0.0.1:9001</code></div>
          </div>
          <article class="convention-card auth-convention">
            <div class="convention-title"><span>01</span><div><h4>Token 与凭证</h4><p>普通登录态和权限接口共用 Bearer Token。</p></div></div>
            <div class="convention-code"><code>Authorization: Bearer &lt;access_token&gt;</code><button type="button" @click="copyText(authHeaderExample, 'auth-header')">{{ copiedKey === 'auth-header' ? '已复制' : '复制' }}</button></div>
            <ul class="convention-list">
              <li><b>公开</b><span>无需凭证。</span></li>
              <li><b>Access Token</b><span>只校验登录身份。</span></li>
              <li><b>接口权限</b><span>校验身份后继续执行 Casbin 权限判定。</span></li>
              <li><b>Refresh Cookie</b><span>浏览器携带 HttpOnly <code>refresh_token</code>，并发送 <code>X-Requested-With: XMLHttpRequest</code>。</span></li>
              <li><b>WebSocket Ticket</b><span>先申请一次性 ticket，再通过 Query 参数建立连接。</span></li>
            </ul>
          </article>
          <article class="convention-card response-convention">
            <div class="convention-title"><span>02</span><div><h4>统一响应</h4><p><code>code=0</code> 表示业务成功，同时 HTTP 状态为 200。</p></div></div>
            <div class="convention-json"><div><span>SUCCESS</span><button type="button" @click="copyText(commonSuccessExample, 'common-response')">{{ copiedKey === 'common-response' ? '已复制' : '复制' }}</button></div><pre><code>{{ commonSuccessExample }}</code></pre></div>
            <p class="convention-note"><code>data</code> 是业务数据；无返回数据时为 <code>{}</code>。数组或标量会包装为 <code>data.result</code>，<code>request_id</code> 用于日志追踪。</p>
          </article>
          <article class="convention-card status-convention">
            <div class="convention-title"><span>03</span><div><h4>分页与错误</h4><p>列表分页字段统一位于 <code>data</code> 内。</p></div></div>
            <div class="pagination-contract"><code>total</code><code>per_page</code><code>current_page</code><code>last_page</code><code>data[]</code></div>
            <div class="status-list">
              <div><b>400</b><span>参数错误或业务冲突</span></div>
              <div><b>401</b><span>未登录、Token 失效或登录凭证错误</span></div>
              <div><b>403</b><span>已登录但没有接口权限</span></div>
              <div><b>404</b><span>资源不存在</span></div>
              <div><b>500 / 503</b><span>服务内部错误或依赖未就绪</span></div>
            </div>
            <p class="convention-note">失败时 <code>code != 0</code>，不要只判断 HTTP 200；前端应同时读取 HTTP 状态、<code>code</code> 和 <code>msg</code>。</p>
          </article>
        </section>
        <div class="api-explorer">
          <div class="api-toolbar">
            <label class="api-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input v-model="apiQuery" type="search" placeholder="搜索路径或接口名称" /><kbd>/</kbd></label>
            <div class="method-filters"><button v-for="method in ['ALL', 'GET', 'POST']" :key="method" :class="{ active: apiMethod === method }" type="button" @click="apiMethod = method">{{ method }}</button></div>
            <div class="api-result-count">{{ filteredApis.length }} RESULTS</div>
          </div>
          <div class="api-groups"><button v-for="group in apiGroups" :key="group" :class="{ active: apiGroup === group }" type="button" @click="apiGroup = group">{{ group }}</button></div>
        <div class="api-browser" data-reveal>
            <div class="api-list" aria-label="接口列表">
              <button v-for="endpoint in filteredApis" :key="`${endpoint.method}-${endpoint.path}`" :class="['api-row', { active: activeEndpoint === endpoint }]" type="button" @click="selectEndpoint(endpoint)"><span :class="['method', `method-${endpoint.method.toLowerCase()}`]">{{ endpoint.method }}</span><span class="api-row-main"><code>{{ endpoint.path }}</code><small>{{ endpoint.title }}</small></span><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 5l4 4-4 4" /></svg></button>
              <div v-if="filteredApis.length === 0" class="api-empty">没有匹配的接口，换个关键词试试。</div>
            </div>
            <article v-if="activeEndpoint" class="api-detail">
              <div class="api-detail-top"><span>{{ activeEndpoint.group }}</span><button type="button" @click="copyText(activeEndpoint.path, 'api-path')">{{ copiedKey === 'api-path' ? '已复制' : '复制路径' }}</button></div>
              <div class="api-detail-title"><span :class="['method', `method-${activeEndpoint.method.toLowerCase()}`]">{{ activeEndpoint.method }}</span><code>{{ activeEndpoint.path }}</code></div>
              <h3>{{ activeEndpoint.title }}</h3><p>{{ activeEndpoint.description || '该接口遵循统一响应结构，由对应业务控制器处理参数并调用 service。' }}</p>
              <div class="api-auth"><span>AUTH</span><div><b>{{ activeEndpoint.auth }}</b><p>{{ authDescription[activeEndpoint.auth] }}</p></div></div>
              <section class="parameter-section">
                <div class="api-block-heading"><span>请求参数</span><small>{{ activeEndpoint.parameters.length ? `${activeEndpoint.parameters.length} FIELDS` : 'NO PARAMETERS' }}</small></div>
                <div v-if="activeEndpoint.parameters.length" class="parameter-table-wrap">
                  <table class="parameter-table">
                    <thead><tr><th>参数</th><th>位置</th><th>类型</th><th>必填</th><th>说明 / 示例</th></tr></thead>
                    <tbody><tr v-for="item in activeEndpoint.parameters" :key="`${item.location}-${item.name}`"><td><code>{{ item.name }}</code></td><td><span class="location-tag">{{ item.location }}</span></td><td>{{ item.type }}</td><td><span :class="['required-tag', { required: item.required }]">{{ item.required ? '是' : '否' }}</span></td><td><p>{{ item.description }}</p><code v-if="item.example !== undefined">{{ formatParameterExample(item.example) }}</code></td></tr></tbody>
                  </table>
                </div>
                <div v-else class="parameter-empty">该接口没有业务请求参数；认证凭证仍按上方 AUTH 说明携带。</div>
              </section>
              <div class="request-example"><div><span>请求示例</span><button type="button" @click="copyText(curlExample, 'curl')">{{ copiedKey === 'curl' ? '已复制' : '复制 cURL' }}</button></div><pre><code>{{ curlExample }}</code></pre></div>
              <div class="response-schema"><div class="api-block-heading"><span>成功响应示例</span><button type="button" @click="copyText(responseExampleText, 'response')">{{ copiedKey === 'response' ? '已复制' : '复制响应' }}</button></div><pre><code>{{ responseExampleText }}</code></pre></div>
            </article>
          </div>
        </div>
        </div>
      </section>

      <section class="closing-section"><div class="container closing-content" data-reveal><div><span class="eyebrow">OPEN SOURCE · MIT</span><h2>从可靠的基础开始，<br />专注构建你的业务。</h2><p>后端 Gin Layout 与前端 X-L-Admin 配套使用，也可以按自己的技术选型独立接入。</p></div><div class="closing-actions"><a class="button button-white" href="/docs/">阅读教程</a><a class="button button-outline" href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer">GitHub 仓库</a></div></div></section>
    </main>

    <footer class="site-footer"><div class="container footer-layout"><div><a class="brand footer-brand" href="#top"><img class="brand-mark" src="/gin-layout-mark.svg" alt="" /><span>Gin Layout</span></a><p>面向真实后台业务的 Go 工程骨架。</p></div><div class="footer-links"><a href="/docs/">教程文档</a><a href="#preview">产品预览</a><a href="#quickstart">快速开始</a><a href="#api">API 目录</a><a href="https://github.com/wannanbigpig/gin-layout" target="_blank" rel="noreferrer">后端仓库</a><a href="https://github.com/wannanbigpig/go-admin-ui" target="_blank" rel="noreferrer">前端仓库</a></div><small>© 2026 Gin Layout · MIT License</small></div></footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { apiCatalog, apiGroups, authDescription } from './data/api-catalog'

const mobileMenuOpen = ref(false)
const githubStars = ref(158)
const siteShell = ref(null)
const showcaseImage = ref(null)
const previewImageElements = ref([])
const activePreviewId = ref('workspace')
const previewCardIds = ref(['permissions', 'audit', 'permissions-wide'])
const hiddenPreviewIds = ref([])
const previewSwapping = ref(false)
const previewTargetIndex = ref(-1)
const activeSetup = ref(0)
const activeTutorial = ref(0)
const copiedKey = ref('')
const apiQuery = ref('')
const apiMethod = ref('ALL')
const apiGroup = ref('全部')
const selectedApiKey = ref('GET-/ping')
const authHeaderExample = 'Authorization: Bearer <access_token>'
const commonSuccessExample = `{
  "code": 0,
  "msg": "OK",
  "data": {},
  "cost": "2.31ms",
  "request_id": "7d9d6d0e-51a3-4b80-a3b2-6ec759f5cd30"
}`
let copyTimer
let revealObserver
let pointerFrame
let pointerPosition
let githubStarsController
const previewFlightNodes = new Set()

function formatGithubStars(value) {
  if (!Number.isFinite(value)) return '—'
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`
}

async function loadGithubStars() {
  githubStarsController?.abort()
  githubStarsController = new AbortController()
  const controller = githubStarsController
  const timeoutId = window.setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch('https://api.github.com/repos/wannanbigpig/gin-layout', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
    if (!response.ok) return

    const repository = await response.json()
    if (Number.isInteger(repository.stargazers_count)) {
      githubStars.value = repository.stargazers_count
    }
  } catch {
    // GitHub 不可用时保留占位符，不影响导航与页面其余内容。
  } finally {
    window.clearTimeout(timeoutId)
    if (githubStarsController === controller) githubStarsController = undefined
  }
}

const navItems = [
  { id: 'preview', label: '产品预览' }, { id: 'features', label: '核心能力' }, { id: 'quickstart', label: '快速开始' },
  { id: 'tutorial', label: '使用教程' }, { id: 'api', label: 'API 目录' }
]

const capabilities = [
  { title: '身份与权限', description: '双 Token 会话、Casbin 接口鉴权与菜单按钮权限共用一套数据关系。', tags: ['JWT', 'RBAC', 'Session'], icon: 'M4 24V10l10-6 10 6v14M9 24v-8h10v8M14 4v7' },
  { title: '声明式路由', description: '路由、认证策略、API 元数据与测试契约从同一个 Catalog 生成。', tags: ['Route Tree', 'Catalog', 'OpenAPI'], icon: 'M5 6h7M16 6h7M9 6v8h10v8M15 18l4 4 4-4' },
  { title: '文件与存储', description: '覆盖本地上传、直传、分片、目录、回收站和可切换对象存储配置。', tags: ['Local', 'OSS', 'Multipart'], icon: 'M4 9h8l2 3h10v11H4zM7 9V5h7l3 4' },
  { title: '任务与审计', description: 'service、worker、cron 进程解耦，请求日志与任务记录完整留痕。', tags: ['Asynq', 'Cron', 'Audit'], icon: 'M14 4a10 10 0 1 0 10 10M14 8v7l5 3M20 4h4v4' }
]

const previewSlides = [
  { id: 'permissions', image: '/screenshots/x-l-admin-super-admin-users.jpg', alt: '超级管理员用户与权限管理截图', label: '权限与组织管理', title: '动态菜单与权限', description: '管理员、部门、角色、菜单和接口权限形成完整的后台授权链路。' },
  { id: 'workspace', image: '/screenshots/x-l-admin-super-admin-home.jpg', alt: '超级管理员工作台截图', label: '超级管理员工作台', title: '角色化工作台', description: '根据当前用户展示快捷入口、登录信息与可访问的运营数据。' },
  { id: 'audit', image: '/screenshots/x-l-admin-super-admin-logs.jpg', alt: '超级管理员请求日志截图', label: '请求日志与风险标记', title: '审计与风险标记', description: '集中展示最近操作、风险级别与数据变更，便于日常追溯。' },
  { id: 'permissions-wide', image: '/screenshots/x-l-admin-super-admin-wide-users.png', alt: '超级管理员全宽权限管理截图', label: '全宽权限管理', title: '完整数据视图', description: '在宽屏布局中完整展示筛选、权限数据和操作列，适合复杂管理场景。' }
]
const previewSlideMap = new Map(previewSlides.map((slide) => [slide.id, slide]))

const setupStages = [
  { id: 'clone', label: '获取代码', title: '克隆仓库并安装依赖', description: '先确认本地 Go 版本满足 go.mod，再下载项目依赖。', notes: ['推荐使用 Go 1.27 或更高版本', '命令应在项目根目录执行'], code: `git clone https://github.com/wannanbigpig/gin-layout.git
cd gin-layout
go mod download
go mod verify` },
  { id: 'config', label: '准备配置', title: '创建本地配置', description: '开发模式会自动准备示例配置，也可以显式复制后再填写数据库与 JWT。', notes: ['jwt.secret_key 不能为空', '只启动 API 时可关闭 queue.enable'], code: `cp config/config.yaml.example ./config.yaml

# 编辑 config.yaml
# mysql.database: go_layout
# jwt.secret_key: <random-secret>` },
  { id: 'migrate', label: '初始化数据', title: '执行并校验数据库迁移', description: '迁移会创建结构与默认基础数据。默认账号仅用于本地初始化。', notes: ['默认管理员：super_admin / 123456', '首次登录后请立即修改密码'], code: `go run main.go -c ./config.yaml command migrate
go run main.go -c ./config.yaml command migrate check` },
  { id: 'run', label: '启动验证', title: '启动 service 并检查就绪状态', description: 'service 提供 HTTP API；启用队列时，在另一个终端单独启动 worker。', notes: ['/ping 验证进程存活', '/health/readiness 验证依赖就绪'], code: `GO_ENV=development go run main.go -c ./config.yaml service

# 新终端：queue.enable=true 时启动
GO_ENV=development go run main.go -c ./config.yaml worker

curl http://127.0.0.1:9001/ping
curl http://127.0.0.1:9001/health/readiness` }
]

const tutorials = [
  { id: 'request', title: '新增业务接口', subtitle: '从 route 到 response', duration: '约 8 分钟', heading: '沿着既有分层，新增一个可授权的接口', summary: '先定义输入和业务规则，再把 handler 挂到声明式路由树。不要让 controller 直接承担查询与事务。', points: [{ title: '定义契约', text: '在 form 与 resources 中明确输入输出。' }, { title: '实现业务', text: 'service 组织规则，model 负责数据访问。' }, { title: '声明路由', text: '在对应 RouteGroupDef 中注册，并继承安全策略。' }], file: 'internal/routers/admin_router.go', code: `func productGroup(deps *ControllerDeps) RouteGroupDef {
  return RouteGroupDef{
    Prefix: "product",
    GroupCode: "product",
    Routes: []RouteDef{
      GET("list", "产品列表", deps.Product.List),
      POST("create", "新增产品", deps.Product.Create),
    },
  }
}` },
  { id: 'auth', title: '理解认证权限', subtitle: '五类安全策略', duration: '约 6 分钟', heading: '先区分“已登录”和“有权访问”', summary: 'Access Token 只确认身份；AccessTokenPermission 还会进入 Casbin 判定。Refresh Cookie 与 WebSocket ticket 则有各自凭证边界。', points: [{ title: '公开接口', text: '登录、验证码与公开文件不要求会话。' }, { title: '登录接口', text: '个人资料、个人工作台只要求有效登录。' }, { title: '权限接口', text: '后台管理写操作需要接口权限。' }], file: 'internal/routers/catalog.go', code: `const (
  SecurityPublic SecurityPolicy = iota
  SecurityAccessToken
  SecurityAccessTokenPermission
  SecurityRefreshCookie
  SecurityWebSocketTicket
)` },
  { id: 'task', title: '接入异步任务', subtitle: 'worker 与 cron', duration: '约 10 分钟', heading: '把耗时工作交给独立进程', summary: 'service 负责 API，worker 消费 Asynq，cron 只负责按时间触发。一个周期任务只保留一个调度入口。', points: [{ title: '定义任务', text: '声明 payload、队列和处理器。' }, { title: '配置队列', text: '确保 queue.queues 包含目标队列。' }, { title: '同步定义', text: '内置任务更新后执行 sync-definitions。' }], file: 'terminal', code: `# 启动消费进程
GO_ENV=development go run main.go -c ./config.yaml worker

# 同步内置任务定义
go run main.go -c ./config.yaml command task sync-definitions

# 启动定时调度
GO_ENV=development go run main.go -c ./config.yaml cron` },
  { id: 'verify', title: '验证与交付', subtitle: '测试、同步、构建', duration: '约 5 分钟', heading: '把静态检查与真实环境验证分开', summary: '代码测试通过不等于目标环境已同步。路由契约变化后，还要在获授权环境更新 API 表与权限缓存。', points: [{ title: '代码验证', text: '运行相关测试，跨模块变更运行全量测试。' }, { title: '迁移校验', text: '检查命名、版本与 up/down 配对。' }, { title: '环境同步', text: '只在明确目标环境执行写入命令。' }], file: 'terminal', code: `gofmt -w <changed-go-files>
go test ./...
go vet ./...
go run main.go -c ./config.yaml command migrate check

# 路由契约变化时，在目标环境执行
go run main.go -c ./config.yaml command api-route -y` }
]

const currentSetup = computed(() => setupStages[activeSetup.value])
const currentTutorial = computed(() => tutorials[activeTutorial.value])
const activePreviewSlide = computed(() => previewSlideMap.get(activePreviewId.value))
const previewCards = computed(() => previewCardIds.value.map((id) => previewSlideMap.get(id)))
const filteredApis = computed(() => {
  const keyword = apiQuery.value.trim().toLowerCase()
  return apiCatalog.filter((endpoint) => (apiGroup.value === '全部' || endpoint.group === apiGroup.value) && (apiMethod.value === 'ALL' || endpoint.method === apiMethod.value) && (!keyword || `${endpoint.path} ${endpoint.title} ${endpoint.group}`.toLowerCase().includes(keyword)))
})
const activeEndpoint = computed(() => filteredApis.value.find((endpoint) => `${endpoint.method}-${endpoint.path}` === selectedApiKey.value) || filteredApis.value[0])
const responseExampleText = computed(() => formatExample(activeEndpoint.value?.responseExample))
const curlExample = computed(() => {
  if (!activeEndpoint.value) return ''
  const endpoint = activeEndpoint.value
  let requestPath = endpoint.path
  endpoint.parameters.filter((item) => item.location === 'Path').forEach((item) => { requestPath = requestPath.replace(`:${item.name}`, String(item.example)) })
  const queryString = endpoint.parameters
    .filter((item) => item.location === 'Query' && item.example !== undefined && item.example !== '')
    .map((item) => `${encodeURIComponent(item.name)}=${encodeURIComponent(typeof item.example === 'object' ? JSON.stringify(item.example) : item.example)}`)
    .join('&')
  const url = `http://127.0.0.1:9001${requestPath}${queryString ? `?${queryString}` : ''}`
  const lines = [`curl -X ${endpoint.method} \\`]
  if (['Access Token', '接口权限'].includes(endpoint.auth)) lines.push(`  -H 'Authorization: Bearer <access_token>' \\`)
  if (endpoint.auth === 'Refresh Cookie') lines.push(`  --cookie 'refresh_token=<refresh_token>' \\`)
  endpoint.parameters.filter((item) => item.location === 'Header').forEach((item) => lines.push(`  -H '${item.name}: ${formatParameterExample(item.example)}' \\`))
  if (endpoint.contentType === 'multipart/form-data') {
    endpoint.parameters.filter((item) => item.location === 'Body').forEach((item) => lines.push(`  -F '${item.name}=${formatParameterExample(item.example)}' \\`))
  } else if (endpoint.requestBody && Object.keys(endpoint.requestBody).length) {
    lines.push(`  -H 'Content-Type: application/json' \\`)
    lines.push(`  -d '${JSON.stringify(endpoint.requestBody, null, 2)}' \\`)
  }
  lines.push(`  '${url}'`)
  return lines.join('\n')
})

function formatExample(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? {}, null, 2)
}
function formatParameterExample(value) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
async function selectEndpoint(endpoint) {
  selectedApiKey.value = `${endpoint.method}-${endpoint.path}`
  if (window.matchMedia('(max-width: 820px)').matches) {
    await nextTick()
    document.querySelector('.api-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function closeMenu() { mobileMenuOpen.value = false }
function setPreviewImageRef(element, index) {
  previewImageElements.value[index] = element
}
function isPreviewHidden(slideId) {
  return hiddenPreviewIds.value.includes(slideId)
}
function createPreviewFlight(image, rect, zIndex) {
  const flight = image.cloneNode()
  const imageStyle = window.getComputedStyle(image)
  flight.className = 'preview-flight'
  Object.assign(flight.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: String(zIndex),
    objectFit: imageStyle.objectFit,
    objectPosition: imageStyle.objectPosition
  })
  document.body.appendChild(flight)
  previewFlightNodes.add(flight)
  return flight
}
function animatePreviewFlight(flight, from, to, direction) {
  const deltaX = to.left - from.left
  const deltaY = to.top - from.top
  const scaleX = to.width / from.width
  const scaleY = to.height / from.height
  const frame = (travel, scale) => `translate3d(${deltaX * travel}px, ${deltaY * travel}px, 0) scale(${1 + ((scaleX - 1) * scale)}, ${1 + ((scaleY - 1) * scale)})`
  const down = direction === 'down'
  const keyframes = down
    ? [
        { transform: frame(0, 0), borderRadius: '0px', boxShadow: '0 24px 64px rgba(27,47,76,.22)' },
        { offset: .72, transform: frame(.8, .86), borderRadius: '8px', boxShadow: '0 14px 34px rgba(27,47,76,.16)' },
        { transform: frame(1, 1), borderRadius: '10px', boxShadow: '0 8px 20px rgba(27,47,76,.12)' }
      ]
    : [
        { transform: frame(0, 0), borderRadius: '10px', boxShadow: '0 8px 20px rgba(27,47,76,.12)' },
        { offset: .68, transform: frame(.82, .78), borderRadius: '3px', boxShadow: '0 22px 58px rgba(27,47,76,.2)' },
        { offset: .92, transform: frame(.985, .985), borderRadius: '0px', boxShadow: '0 8px 26px rgba(27,47,76,.08)' },
        { transform: frame(1, 1), borderRadius: '0px', boxShadow: '0 0 0 rgba(27,47,76,0)' }
      ]
  return flight.animate(keyframes, {
    duration: down ? 440 : 620,
    easing: down ? 'cubic-bezier(.22,.68,.28,1)' : 'cubic-bezier(.18,.82,.25,1)',
    fill: 'forwards'
  })
}
async function selectPreview(index) {
  if (previewSwapping.value) return
  const incomingId = previewCardIds.value[index]
  const outgoingId = activePreviewId.value
  if (!incomingId || incomingId === outgoingId) return

  previewSwapping.value = true
  previewTargetIndex.value = index
  const commitSwap = () => {
    activePreviewId.value = incomingId
    const nextCards = [...previewCardIds.value]
    nextCards[index] = outgoingId
    previewCardIds.value = nextCards
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const topImage = showcaseImage.value
  const cardImage = previewImageElements.value[index]
  if (reduceMotion || !topImage || !cardImage || typeof topImage.animate !== 'function') {
    commitSwap()
    await nextTick()
    previewSwapping.value = false
    previewTargetIndex.value = -1
    return
  }

  const topRect = topImage.getBoundingClientRect()
  const cardRect = cardImage.getBoundingClientRect()
  const outgoingFlight = createPreviewFlight(topImage, topRect, 102)
  const incomingFlight = createPreviewFlight(cardImage, cardRect, 101)
  hiddenPreviewIds.value = [outgoingId, incomingId]
  await nextTick()
  let swapCommitted = false

  try {
    await animatePreviewFlight(outgoingFlight, topRect, cardRect, 'down').finished
    commitSwap()
    await nextTick()
    swapCommitted = true
    hiddenPreviewIds.value = [incomingId]
    await nextTick()
    outgoingFlight.remove()
    previewFlightNodes.delete(outgoingFlight)
    await new Promise((resolve) => window.setTimeout(resolve, 55))
    await animatePreviewFlight(incomingFlight, cardRect, topRect, 'up').finished
    hiddenPreviewIds.value = []
    await nextTick()
    await incomingFlight.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: 'ease-out', fill: 'forwards' }).finished
  } finally {
    if (!swapCommitted) {
      commitSwap()
      await nextTick()
    }
    hiddenPreviewIds.value = []
    previewSwapping.value = false
    previewTargetIndex.value = -1
    previewFlightNodes.forEach((node) => node.remove())
    previewFlightNodes.clear()
  }
}
async function copyText(value, key) {
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = key
    window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => (copiedKey.value = ''), 1600)
  } catch { copiedKey.value = '' }
}
function focusApiSearch(event) {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { event.preventDefault(); document.querySelector('.api-search input')?.focus() }
}
function initMotion() {
  const shell = siteShell.value
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!shell || reduceMotion) return

  const revealItems = shell.querySelectorAll('[data-reveal]')
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        revealObserver?.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 })
    revealItems.forEach((item) => revealObserver.observe(item))
    shell.classList.add('motion-ready')
  }

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerleave', resetPointerMotion)
}
function handlePointerMove(event) {
  pointerPosition = { x: event.clientX, y: event.clientY }
  if (pointerFrame) return
  pointerFrame = window.requestAnimationFrame(() => {
    const shell = siteShell.value
    if (!shell || !pointerPosition) return
    const xRatio = pointerPosition.x / window.innerWidth
    const yRatio = pointerPosition.y / window.innerHeight
    shell.style.setProperty('--pointer-x', `${(xRatio * 100).toFixed(2)}%`)
    shell.style.setProperty('--pointer-y', `${(yRatio * 100).toFixed(2)}%`)
    shell.style.setProperty('--parallax-x', `${((xRatio - 0.5) * 24).toFixed(2)}px`)
    shell.style.setProperty('--parallax-y', `${((yRatio - 0.5) * 18).toFixed(2)}px`)
    shell.style.setProperty('--tilt-x', `${((0.5 - yRatio) * 2.2).toFixed(2)}deg`)
    shell.style.setProperty('--tilt-y', `${((xRatio - 0.5) * 2.8).toFixed(2)}deg`)
    pointerFrame = undefined
  })
}
function resetPointerMotion() {
  const shell = siteShell.value
  shell?.style.setProperty('--parallax-x', '0px')
  shell?.style.setProperty('--parallax-y', '0px')
  shell?.style.setProperty('--tilt-x', '0deg')
  shell?.style.setProperty('--tilt-y', '0deg')
}
onMounted(() => {
  window.addEventListener('keydown', focusApiSearch)
  loadGithubStars()
  initMotion()
})
onUnmounted(() => {
  window.removeEventListener('keydown', focusApiSearch)
  githubStarsController?.abort()
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerleave', resetPointerMotion)
  window.clearTimeout(copyTimer)
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
  previewFlightNodes.forEach((node) => node.remove())
  previewFlightNodes.clear()
  revealObserver?.disconnect()
})
</script>
