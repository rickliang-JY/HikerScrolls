<div align="center">

# HikerScrolls

### Where trail stories meet living maps.

A scrollytelling journal for [Obsidian](https://obsidian.md) that transforms your adventures into immersive, map-driven narratives.

*Everybody can tell their own story on the road.*

[Get Started](#-get-started) · [Features](#-what-you-can-do) · [Map Styles](#-map-styles) · [AI](#-ai-powered) · [中文版](#-中文说明)

</div>

---

## The Problem

You come back from an incredible trip with hundreds of photos, a GPX track, and memories that deserve more than a photo album. But stitching together the story — the route, the moments, the places — is tedious. The photos sit in a folder. The GPX file sits in another. The story stays in your head.

## The Solution

**HikerScrolls** lives inside Obsidian and turns your raw trip data into a living document. Upload your GPX, drop in your photos, and write your story. The plugin does the rest — syncing your narrative to an animated topographic map that scrolls with you.

Your journal. Your map. Moving together.

---

## What You Can Do

### Your Personal Atlas

Every journal you create appears as a pin on your personal world map. Over time, you build a global atlas of everywhere you've been — with one-click access to any trip.

- Interactive world map with animated trip markers
- Fly to any trip instantly from the Timeline sidebar
- See your GPX tracks drawn on the map as you zoom in
- Track your stats: trips taken, kilometers walked, regions explored

### Scrollytelling Journals

This is the core experience. Open any journal and your trip becomes a scroll-driven story:

- **The left panel** shows your narrative — location cards with photos, descriptions, and your writing
- **The right panel** shows a real topographic map with your route
- As you scroll, a red dot traces your path along the GPX track
- The route line draws itself in real time as you move through the story
- Multi-route trips animate each segment independently — no fake lines between disconnected paths

### 5-Step Creation Wizard

Creating a journal takes minutes, not hours:

1. **Info** — Name your trip, set the dates, upload your GPX file, pick a map style
2. **Locations** — Place pins manually on the map, or let AI detect locations from your photos
3. **Photos** — Drag and drop photos between locations on an interactive map
4. **Sections** — Create blog sections and assign locations with checkboxes, sorted by route order
5. **Generate** — One click, and your journal is ready to explore

### Timeline Sidebar

A chronological index of all your journals, always visible in Obsidian's right sidebar:

- Grouped by year, sorted newest-first
- Cover photo thumbnails for quick recognition
- Search by name, region, or date
- Click any trip to fly to it on the atlas
- Auto-refreshes when you create or delete journals

---

## Map Styles

Choose from **14 map styles** to match the mood of each trip:

| Style | Vibe |
|-------|------|
| **OpenTopoMap** | Contour lines and elevation — the hiker's default |
| **CARTO Voyager** | Clean and colorful — great for cities |
| **CARTO Positron** | Whisper-quiet light basemap |
| **CARTO Dark Matter** | Moody dark mode |
| **Esri Satellite** | Real satellite imagery |
| **OpenStreetMap** | The classic |
| **Stamen Toner** | High-contrast black and white |
| **Stamen Watercolor** | Painted, hand-drawn aesthetic |
| **Stamen Terrain** | Hill shading with natural colors |
| **Alidade Smooth** | Soft and muted |
| **Esri NatGeo** | National Geographic warm tones |
| **Esri World Topo** | Detailed topographic reference |
| **Antique Map** | Watercolor + sepia — old explorer vibes |

> Stamen and Stadia styles require a free API key from [stadiamaps.com](https://stadiamaps.com/).

---

## AI-Powered

HikerScrolls integrates with **Google Gemini** to help you build journals faster:

| Feature | What it does |
|---------|-------------|
| **Photo Location Detection** | No GPS in your photo? Gemini Vision analyzes the image and estimates where it was taken |
| **Smart Place Naming** | GPS coordinates are automatically resolved to human-readable place names |
| **Location Enrichment** | Get AI-written descriptions, categories, and highlights for any waypoint |
| **Trip Summary** | Generate a vivid 2-3 sentence summary of your entire journey from the atlas |

> AI features are optional. Everything works without an API key — you just do the tagging manually.

---

## Get Started

### Install

1. Download the latest release — you need three files: `main.js`, `styles.css`, `manifest.json`
2. In your Obsidian vault, create `.obsidian/plugins/hiker-scrolls/`
3. Drop the files in
4. Restart Obsidian -> **Settings -> Community Plugins -> Enable HikerScrolls**

### Try the Demo

Open the included `HikerScrolls Demo/` folder as an Obsidian vault to see the plugin in action immediately.

### Configure (optional)

In **Settings -> HikerScrolls**:

| Setting | Why |
|---------|-----|
| **Stadia Maps API Key** | Unlocks Stamen/Stadia map styles. Free at [stadiamaps.com](https://stadiamaps.com/) |
| **Gemini API Key** | Enables AI features. Free at [aistudio.google.com](https://aistudio.google.com/) |
| **Gemini Model** | Which model to use (default: `gemini-2.0-flash`) |

---

## How Your Data Works

HikerScrolls stores everything as **plain Markdown files** in your vault:

```
your-vault/
  hiking-journal/
    miami-downtown-trip/
      miami-downtown-trip.md    <- journal (YAML frontmatter + content)
      track.gpx                 <- your GPX file
      photo-001.jpg             <- your photos
      photo-002.jpg
```

- No proprietary formats. No cloud sync. No lock-in.
- Your journals are Markdown files you own forever.
- Move vaults, switch devices, or stop using the plugin — your data stays intact.

---

## Acknowledgements

The scrollytelling concept in HikerScrolls is inspired by [Koya Bound](https://walkkumano.com) by Craig Mod — a beautiful digital book about walking the Kumano Kodo pilgrimage trail. Their pioneering work in scroll-driven map narratives showed what's possible when stories and geography move together.

## Built With

[Obsidian Plugin API](https://docs.obsidian.md/) · [Leaflet.js](https://leafletjs.com/) · [Google Gemini](https://aistudio.google.com/) · [OpenStreetMap](https://www.openstreetmap.org/) · [Nominatim](https://nominatim.org/)

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**HikerScrolls** is made by [@rickliang-JY](https://github.com/rickliang-JY) [@klxd2000](https://github.com/klxd2000)

</div>

---

# 中文说明

## HikerScrolls — 让足迹与故事同行

一个为 [Obsidian](https://obsidian.md) 打造的滚动叙事旅行日志插件，将你的冒险转化为沉浸式的地图驱动叙事。

*每个人都可以在路上讲述自己的故事。*

---

## 它解决什么问题

旅行归来，你有几百张照片、一条 GPX 轨迹，和值得被记录的回忆。但把这些拼成一个完整的故事 — 路线、瞬间、地点 — 太繁琐了。照片在一个文件夹，GPX 在另一个，故事还留在脑子里。

**HikerScrolls** 在 Obsidian 里把你的原始旅行数据变成一份活的文档。上传 GPX，拖入照片，写下你的故事。插件完成剩下的工作 — 将叙事同步到一张随你滚动的动画等高线地图上。

---

## 核心功能

### 个人地图集

每本日志都会作为一个标记点出现在你的个人世界地图上。随着时间推移，你会建立起一个走过的每个地方的全球地图集。

### 滚动叙事日志

打开任何日志，你的旅程变成一个滚动驱动的故事：
- **左侧面板** — 你的叙事：地点卡片、照片、描述和文字
- **右侧面板** — 真实的等高线地图和你的路线
- 滚动时，红点沿着 GPX 轨迹追踪你的路径，路线实时绘制

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

## 数据存储

所有内容存储为 Obsidian 库中的**纯 Markdown 文件**：
- 没有专有格式，没有云同步，没有锁定
- 你的日志是你永远拥有的 Markdown 文件

---

## 致谢

HikerScrolls 的滚动叙事概念受到 Craig Mod 的 [Koya Bound](https://walkkumano.com) 启发 — 一本关于行走熊野古道朝圣之路的精美数字书籍。他们在滚动驱动地图叙事方面的开创性工作展示了当故事与地理一起移动时的可能性。

---

<div align="center">

**HikerScrolls** 由 [@rickliang-JY](https://github.com/rickliang-JY) 制作

MIT 许可证

</div>
