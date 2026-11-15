<div align="center">

# ✦ Perler Beads Generator ✦

### 任意图片 → 拼豆底稿，一键生成

[![Mobile](https://img.shields.io/badge/移动端-perlerbeadsold.zippland.com-ff69b4?style=for-the-badge)](https://perlerbeadsold.zippland.com)
[![Desktop](https://img.shields.io/badge/桌面端-perlerbeads.zippland.com-8b5cf6?style=for-the-badge)](https://perlerbeads.zippland.com)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/Zippland/perler-beads/pulls)

开源的智能拼豆图纸生成器 — 自动颜色映射 · 多品牌色号适配 · 杂色清理 · 一键导出图纸与采购清单

**移动端**（竖屏）：快速生成图纸，适合手机使用 · **桌面端**（横屏）：完整工作台，适合电脑精细编辑

</div>

---

## 功能

- **智能像素化** — 基于主导色提取的像素化算法，消除传统均值池化导致的灰色毛边
- **多色板适配** — 内置 5 大品牌色号体系（MARD / COCO / 漫漫 / 盼盼 / 咪小窝），支持 168 / 144 / 96 等多种色板规格
- **自动颜色合并** — BFS 连通区域检测 + 可调相似度阈值，自动清理杂色
- **背景智能移除** — 边界洪水填充算法自动识别并剥离外部背景
- **颜色排除与重映射** — 一键排除不想要的颜色，自动重映射到最近似可用色
- **手动精修** — 支持对单个像素格进行手动着色和修改
- **导出图纸** — 下载带色号标注和网格线的 PNG 图纸，可直接打印使用
- **导出采购清单** — 自动统计各颜色用量，生成采购清单图

## 快速开始

需要 Node.js 22 或更新版本。

```bash
git clone https://github.com/Zippland/perler-beads.git
cd perler-beads
npm ci
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 开发检查

```bash
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

端到端测试会在本机 3100 端口启动生产服务器，检查图片转换、编辑撤销、PNG/CSV 导出与重新导入、专心拼豆模式、移动端布局、图片优化和离线使用。请先完成生产构建；开发模式会禁用 Service Worker。若要测试已经启动的服务器，可以设置 `PLAYWRIGHT_BASE_URL`。

PWA 由 Serwist 生成 `/sw.js`。`package.json` 中的定向依赖覆盖为 Next.js、Serwist 和 ESLint 工具链提供安全更新版本，同时保留旧版消费者所需的接口。升级这些直接依赖时，应重新检查是否仍需要对应覆盖。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js (React) + TypeScript |
| 样式 | Tailwind CSS |
| 图像处理 | Canvas API（浏览器端） |
| 部署 | Vercel |

## 核心算法

### 1. 初始颜色映射

对每个网格单元，提取原图对应区域内出现频率最高的像素 RGB 值（主导色），通过欧氏距离映射到当前色板中最接近的颜色。相比均值池化，主导色提取有效避免了色块边界处的灰色毛边问题。

### 2. 区域颜色合并

使用 BFS 从未访问单元格出发，将欧氏距离小于阈值的邻近单元格聚合为连通区域，统一设置为区域内出现次数最多的色号。该步骤显著减少杂色，提升色块纯净度。

### 3. 背景移除

定义背景色号列表，从所有边界单元格执行洪水填充，标记与边界连通且属于背景色的单元格为"外部"。统计和导出时忽略外部单元格，实现自动背景剥离。

### 4. 颜色排除与重映射

当用户排除某颜色时，在当前存在且未被排除的颜色子集中寻找最近似替代色进行重映射。恢复颜色时触发完整的重处理流程。

### 调色板数据

色板数据定义在 [`src/app/colorSystemMapping.json`](src/app/colorSystemMapping.json)，包含 291 种标准颜色到 5 个品牌色号体系的完整映射。色板组合在 [`src/app/page.tsx`](src/app/page.tsx) 的 `paletteOptions` 中配置。

## Roadmap

- [ ] CIEDE2000 (Delta E) 颜色距离算法，替代 RGB 欧氏距离
- [ ] Floyd-Steinberg 抖动，在有限色板下模拟更丰富的颜色过渡
- [ ] Web Workers 后台计算，优化大图性能
- [ ] 用户自定义调色板上传
- [ ] 微信小程序版本

## 参与贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

## 共创声明

本项目永久开源，由维护者无偿运营 [perlerbeadsold.zippland.com](https://perlerbeadsold.zippland.com) 供所有拼豆爱好者免费使用。

我们公开全部算法细节和源代码，目的是推动拼豆工具生态的共同进步。欢迎所有人学习、使用、改进。

**但请勿将本项目代码恶意抄袭后包装为闭源商业产品。** 这一行为违反开源协议，也伤害每一位贡献者的热情。使用本项目代码的衍生作品须遵守许可证条款，保留原始版权声明，并以相同协议开源。

## 许可证

[AGPL-3.0](./LICENSE) &copy; [Zippland](https://github.com/Zippland)
