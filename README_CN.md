<div align="center">

<h1><img src="icon-preview.svg" alt="" width="36" height="36"> HikerScrolls</h1>

### 让足迹与故事同行

一个为 [Obsidian](https://obsidian.md) 打造的滚动叙事旅行日志插件，将你的冒险转化为沉浸式的地图驱动叙事。

*每个人都可以在路上讲述自己的故事。*

[English](README.md) · **中文**

</div>

---

## 它解决什么问题

旅行归来，你有几百张照片、一条 GPX 轨迹，和值得被记录的回忆。但把这些拼成一个完整的故事 — 路线、瞬间、地点 — 太繁琐了。照片在一个文件夹，GPX 在另一个，故事还留在脑子里。

**HikerScrolls** 在 Obsidian 里把你的原始旅行数据变成一份活的文档。上传 GPX，拖入照片，写下你的故事。插件完成剩下的工作 — 将叙事同步到一张随你滚动的动画等高线地图上。

---

## 核心功能

### 个人地图集

每本日志都会作为一个标记点出现在你的个人世界地图上。随着时间推移，你会建立起一个走过的每个地方的全球地图集。

- 交互式世界地图，带动画旅行标记
- 从时间线侧边栏一键飞到任何旅程
- 放大时在地图上绘制你的 GPX 轨迹
- 追踪你的统计数据：旅行次数、步行公里数、探索的地区

### 滚动叙事日志

打开任何日志，你的旅程变成一个滚动驱动的故事：

- **左侧面板** — 你的叙事：地点卡片、照片、描述和文字
- **右侧面板** — 真实的等高线地图和你的路线
- 滚动时，红点沿着 GPX 轨迹追踪你的路径，路线实时绘制
- 多段路线旅行独立动画每个路段 — 断开路径之间不会出现假线

### 5 步创建向导

1. **基本信息** — 命名、日期、上传 GPX、选择地图风格
2. **选择地点** — 手动在地图上标记，或让 AI 从照片中检测位置
3. **照片** — 在交互式地图上拖拽照片到各个地点
4. **博客结构** — 创建章节，用勾选框分配地点（按路线顺序排列）
5. **生成** — 一键生成，日志即刻可用

### 时间线侧边栏

所有日志的时间线索引，始终显示在 Obsidian 右侧边栏：

- 按年分组，最新的在前
- 封面照片缩略图
- 按名称、地区或日期搜索
- 创建或删除日志后自动刷新

---

## 地图风格

可选择 **14 种地图风格** 来匹配每次旅行的氛围：

| 风格 | 氛围 |
|------|------|
| **OpenTopoMap** | 等高线和海拔 — 徒步者的默认选择 |
| **CARTO Voyager** | 干净多彩 — 适合城市 |
| **CARTO Positron** | 安静的浅色底图 |
| **CARTO Dark Matter** | 深色模式 |
| **Esri Satellite** | 真实卫星影像 |
| **OpenStreetMap** | 经典款 |
| **Stamen Toner** | 高对比度黑白 |
| **Stamen Watercolor** | 手绘水彩风 |
| **Stamen Terrain** | 带自然色彩的山体阴影 |
| **Alidade Smooth** | 柔和淡雅 |
| **Esri NatGeo** | 国家地理暖色调 |
| **Esri World Topo** | 详细地形参考 |
| **Antique Map** | 水彩 + 复古 — 老探险家风格 |

> Stamen 和 Stadia 风格需要 [stadiamaps.com](https://stadiamaps.com/) 的免费 API 密钥。

---

## AI 功能

集成 **Google Gemini**，帮助你更快地创建日志：

| 功能 | 说明 |
|------|------|
| **照片位置检测** | 没有 GPS？Gemini 分析图像并估计拍摄地点 |
| **智能地名** | GPS 坐标自动转换为可读的地名 |
| **地点丰富** | 获取 AI 生成的描述、分类和亮点 |
| **旅程摘要** | 从地图集生成旅程的 2-3 句精彩摘要 |

> AI 功能是可选的。没有 API 密钥一切照常工作。

---

## 快速开始

### 安装

1. 下载最新版本 — 你需要三个文件：`main.js`、`styles.css`、`manifest.json`
2. 在你的 Obsidian 库中创建 `.obsidian/plugins/hiker-scrolls/`
3. 放入文件
4. 重启 Obsidian -> **设置 -> 第三方插件 -> 启用 HikerScrolls**

### 获取 GPX 文件

还没有 GPX 文件？推荐两个工具：

- **[Geo Tracker](https://play.google.com/store/apps/details?id=com.ilyabogdanovich.geotracker)** — 手机端实时记录你的路线轨迹
- **[gpx.studio](https://gpx.studio/)** — 在浏览器中在线创建和编辑 GPX 轨迹

### 配置（可选）

在 **设置 -> HikerScrolls** 中：

| 设置 | 用途 |
|------|------|
| **Stadia Maps API Key** | 解锁 Stamen/Stadia 地图风格。在 [stadiamaps.com](https://stadiamaps.com/) 获取（有免费额度） |
| **Gemini API Key** | 启用 AI 功能。在 [aistudio.google.com](https://aistudio.google.com/) 获取（有免费额度） |
| **Gemini Model** | 使用的模型（默认：`gemini-2.0-flash`） |

---

## 数据存储

所有内容存储为 Obsidian 库中的**纯 Markdown 文件**：

```
your-vault/
  hiking-journal/
    miami-downtown-trip/
      miami-downtown-trip.md    <- 日志（YAML frontmatter + 内容）
      track.gpx                 <- 你的 GPX 文件
      photo-001.jpg             <- 你的照片
      photo-002.jpg
```

- 没有专有格式，没有云同步，没有锁定
- 你的日志是你永远拥有的 Markdown 文件
- 换库、换设备、停用插件 — 你的数据完好无损

---

## 致谢

HikerScrolls 的滚动叙事设计受到 Craig Mod 的 [Koya Bound](https://walkkumano.com) 启发 — 一本关于行走熊野古道朝圣之路的精美数字书籍。HikerScrolls 的所有代码均为独立实现。

## 构建技术

[Obsidian Plugin API](https://docs.obsidian.md/) · [Leaflet.js](https://leafletjs.com/) · [Google Gemini](https://aistudio.google.com/) · [OpenStreetMap](https://www.openstreetmap.org/) · [Nominatim](https://nominatim.org/)

## 许可证

MIT 许可证 — 详见 [LICENSE](LICENSE)

---

<div align="center">

**HikerScrolls** 由 [@rickliang-JY](https://github.com/rickliang-JY) [@klxd2000](https://github.com/klxd2000) 制作

</div>
