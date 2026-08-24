# 零点笔记

本地优先的便签与笔记工具。数据保存在浏览器 IndexedDB 中，不依赖后端服务；可用于日常便签、Markdown 写作、常用网站管理和周报整理。

## 功能

- **首页便签**：拖拽摆放、双击编辑、拖到完成 / 删除区域归档；支持整理排布、随机动画、导入导出。
- **工具箱**：可保存的 Markdown 笔记（`Ctrl/Cmd + S`）、临时 Markdown 编辑器、JSON 格式化、笔记列表。
- **个人中心**：创建 / 完成 / 删除统计与直方图、操作记录筛选分页、周报生成；可配置 OpenAI 兼容接口用 AI 写周报。
- **常用网站**：分组、搜索、导入导出书签。
- **系统设置**：夜间模式等偏好。
- **数据备份**：首页和个人中心支持完整备份（便签、记录、统计、书签、Markdown 笔记、设置）。

悬浮按钮可在各页面间切换。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建 | Vite 6 |
| 路由 | Vue Router 4（History 模式） |
| 存储 | IndexedDB（库名 `ZeroNotesDB`） |
| 其他 | Chart.js、marked、DOMPurify、Font Awesome |

无后端。AI 周报由浏览器直连你配置的 API 地址。

## 环境要求

- Node.js **18.18+**（建议 20 LTS）
- 现代浏览器（需支持 IndexedDB；部分无痕模式可能不可用，此时数据仅保留在当前会话）

## 快速开始

```bash
cd steno-notebook
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)）。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务 |
| `npm run build` | 生产构建，产物在 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |

部署 `dist/` 时请配置 SPA 回退到 `index.html`（Nginx `try_files`、GitHub Pages 404 重定向等），否则刷新非首页路由会 404。

## 目录结构

```
steno-notebook/
├── index.html
├── vite.config.js
├── eslint.config.js
└── src/
    ├── main.js                 # 启动：打开数据库、迁移旧数据、挂载应用
    ├── App.vue                 # 布局、路由过渡、全局提示
    ├── router/                 # 路由
    ├── views/                  # 页面
    ├── components/             # 通用组件与工具面板
    ├── composables/            # 状态与业务（便签、备份、设置等）
    ├── constants/              # 便签颜色、默认书签等
    ├── utils/                  # IndexedDB、Markdown、通用工具
    └── styles/                 # 全局样式与工具页样式
```

路径别名：`@` → `src/`。实现细节见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 数据说明

数据只存在本机浏览器，键包括：

| 键 | 内容 |
| --- | --- |
| `notes` / `noteRecords` / `noteStats` | 活跃便签、归档记录、按日统计 |
| `md_notes` | Markdown 笔记 |
| `websites` / `websiteGroups` | 书签与分组 |
| `appSettings` | 夜间模式等 |
| `aiConfig` | AI 接口地址、Key、模型、提示词 |

从旧版 `localStorage` 升级时会自动迁移一次。

**备份**：首页或个人中心导出 JSON；导入会覆盖当前对应数据，请先自行备份。换电脑或清站点数据后，只能靠这份 JSON 恢复。

**隐私**：AI Key 存在本地 IndexedDB。备份文件可能包含 Key，请勿发给他人或提交到 Git。

## 浏览器兼容与限制

- 需允许 IndexedDB。不可用时会提示「仅保存在本次会话」，刷新即丢失。
- History 路由不能直接用 `file://` 打开，请用 `npm run dev` 或静态服务器托管 `dist/`。
- Markdown 预览会做 HTML 消毒；外链以 `http/https` 在新标签打开。

## 许可

私有项目，仅供本仓库使用。
