# 部署说明（GitHub Pages / Netlify / Vercel）

本项目是 **纯静态单页应用**：`npm run build` 产出 `dist/`（`index.html` + `assets/*`），无需服务端。
推荐用 GitHub Pages 托管（`.github/workflows/deploy.yml` 已配置自动构建发布）。

- 仓库：`z24531/lifestyle-evolution-3d`
- 生产地址（项目页）：`https://z24531.github.io/lifestyle-evolution-3d/`
- 构建命令：`npm run build`
- 产物目录：`dist/`

---

## 0.0 ⚠️ 私有仓库限制(先看这条)

> **已完成(2026-10-25)**:仓库已设为 **Public**,Pages 已通过 GitHub Actions 自动启用并成功上线:
> **https://z24531.github.io/lifestyle-evolution-3d/**
>
> 以下为「若仓库仍是 Private」时的参考说明,保留备查:

GitHub 只在 **公开仓库** 或 **付费套餐(GitHub Pro/Team/Enterprise)** 下提供 Pages。
如果打开 **Settings → Pages** 看不到可选的 Source,说明受此限制,二选一:

- **方案 A(推荐,免费)**:仓库 Settings → General → Danger Zone → **Change visibility → Public**,然后回到 Settings → Pages,Source 选 **GitHub Actions**;
- **方案 B(保持私有)**:用 Netlify / Vercel 免费额度托管(见 §2),它们支持私有仓库自动构建,但需要你把仓库授权给对应平台。

> 已用本地静态服务器模拟 Pages 项目页子路径(`/lifestyle-evolution-3d/`)验证:构建产物在子路径下 0 资源失败、0 控制台错误,页面与交互正常,部署后不会白屏。

---

## 0. 前置：vite base 必须是相对路径（重要）

GitHub Pages 项目页的路径是 `https://<user>.github.io/<repo>/`，资源必须按相对路径解析。
`vite.config.ts` 需设置：

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // GitHub Pages 项目页必需；否则 dist/assets/*.js 会 404
  server: { port: 5173 },
  build: { target: 'es2022' },
});
```

> 该文件由 **Lead** 维护，工具链（T）不修改。若部署后页面白屏 / 控制台 `assets/index-*.js 404`，
> 首先检查 `vite.config.ts` 是否漏了 `base: './'`，或构建产物 `dist/index.html` 里引用的是 `/assets/...` 还是 `./assets/...`。

`base` 只影响构建产物；本地 `npm run dev` / `npm run preview` 不受影响。

---

## 1. GitHub Pages（默认方案）

### 1.1 一次性仓库设置

1. 把仓库推到 GitHub：`https://github.com/z24531/lifestyle-evolution-3d`（默认分支 `main`）。
2. 打开仓库 **Settings → Pages**。
3. **Build and deployment → Source** 选择 **GitHub Actions**（不要选 "Deploy from a branch"）。
   - 首次推送后如未出现该选项，先让 workflow 跑一次或刷新页面。

### 1.2 自动部署流程

`.github/workflows/deploy.yml` 在以下时机触发：

- push 到 `main` 分支；
- 在 Actions 页手动 **Run workflow**（`workflow_dispatch`）。

Workflow 步骤：`actions/checkout` → `actions/setup-node`（Node 20 + npm cache）→ `npm ci` → `npm run build` → `actions/upload-pages-artifact`（上传 `dist/`）→ `actions/deploy-pages`。
所需权限已声明：`pages: write`、`id-token: write`（`contents: read`）。

### 1.3 部署完成后

- 在 **Actions** 里等 `Deploy to GitHub Pages` 变绿；
- 打开 `https://z24531.github.io/lifestyle-evolution-3d/` 验证：页面可滚动、7 层平台逐层出现、热点可点开数据卡；
- 首次部署可能有 1–2 分钟 CDN 延迟。

### 1.4 常见问题

| 现象                                        | 原因 / 处理                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 页面白屏，控制台 `assets/index-*.js 404`    | `vite.config.ts` 缺少 `base: './'`（见第 0 节）                                                       |
| Actions 报 `Get Pages site failed` / 无权限 | Settings → Pages → Source 未选择 **GitHub Actions**                                                   |
| `deploy-pages` 报 environment 未授权        | Settings → Environments 中允许 `github-pages`（一般默认已允许）                                       |
| `npm ci` 失败                               | 本地 `package-lock.json` 未提交或与 `package.json` 不一致；本地跑 `npm install` 后提交 lockfile       |
| 构建失败                                    | 本地先跑 `npm run build` 复现；CI 用 Node 20（与本地 Node 24 可能有差异，但 Vite 8 要求 Node ≥20.19） |

### 1.5 回滚

在 Actions 里对某个历史成功构建点 **Re-run all jobs**，或 revert 到上一个提交再 push `main`。

---

## 2. 备选：Netlify

1. 登录 Netlify → **Add new site → Import an existing project** → 选择 GitHub 仓库。
2. 构建设置：
   - **Build command**：`npm run build`
   - **Publish directory**：`dist`
   - **Node version**：20（在站点 Settings → Build & deploy → Environment 里加 `NODE_VERSION=20`，或提交 `.nvmrc`）
3. 部署即可，之后每次 push `main` 自动重建。
   - 本项目是单页、无前端路由，**不需要** SPA fallback 重写规则。
   - Netlify 部署在域名根路径，`base: './'` 同样适用且不影响本地预览。

## 3. 备选：Vercel

1. 登录 Vercel → **Add New → Project** → 导入 GitHub 仓库。
2. Framework Preset 选 **Vite**，自动得到：
   - Build Command：`npm run build`
   - Output Directory：`dist`
   - Node.js Version：20.x（Project Settings → General 可改）
3. Deploy。之后 push `main` 自动部署。
   - 同样无需 rewrite / 单页路由配置。

## 4. 本地验证生产产物

```powershell
npm run build
npm run preview          # http://localhost:4173
# 注意：preview 是根路径服务，不能完全模拟 GitHub Pages 的子路径；
#      若担心 base 问题，可检查 dist/index.html 中资源是否为 ./assets/ 开头。
```

自动化截图回归（接口 `window.__DEV__` 已由 `src/main.ts` 暴露）：

```powershell
npm run preview                     # 另开终端
npm run shots                       # 产物在 artifacts/shots/
```

## 5. 自定义域名（可选）

- GitHub Pages：仓库 Settings → Pages → Custom domain 填写域名，并在 DNS 加 `CNAME` 记录指向 `z24531.github.io`；
- Netlify / Vercel：在各自面板 Domains 里添加并按其提示配置 DNS；
- 自定义域名后无需改动构建配置（`base: './'` 依旧适用）。
