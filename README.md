<div align="center">

<h1><img src="icon-preview.svg" alt="" width="36" height="36"> HikerScrolls</h1>

### Where trail stories meet living maps.

A scrollytelling journal for [Obsidian](https://obsidian.md) that transforms your adventures into immersive, map-driven narratives.

*Everybody can tell their own story on the road.*

**English** · [中文](README_CN.md)

[Get Started](#-get-started) · [Features](#-what-you-can-do) · [Map Styles](#-map-styles) · [AI](#-ai-powered)

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

### Get a GPX File

Don't have a GPX file yet? Here are two great options:

- **[Geo Tracker](https://play.google.com/store/apps/details?id=com.ilyabogdanovich.geotracker)** — Record your route in real time on your phone
- **[gpx.studio](https://gpx.studio/)** — Create and edit GPX tracks online in your browser

### Configure (optional)

In **Settings -> HikerScrolls**:

| Setting | Why |
|---------|-----|
| **Stadia Maps API Key** | Unlocks Stamen/Stadia map styles. Get one at [stadiamaps.com](https://stadiamaps.com/) (free tier available) |
| **Gemini API Key** | Enables AI features. Get one at [aistudio.google.com](https://aistudio.google.com/) (free tier available) |
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

The scrollytelling design of HikerScrolls is inspired by [Koya Bound](https://walkkumano.com) by Craig Mod — a beautiful digital book about walking the Kumano Kodo pilgrimage trail. Their pioneering work in scroll-driven map narratives showed what's possible when stories and geography move together. All code in HikerScrolls is independently implemented.

## Built With

[Obsidian Plugin API](https://docs.obsidian.md/) · [Leaflet.js](https://leafletjs.com/) · [Google Gemini](https://aistudio.google.com/) · [OpenStreetMap](https://www.openstreetmap.org/) · [Nominatim](https://nominatim.org/)

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**HikerScrolls** is made by [@rickliang-JY](https://github.com/rickliang-JY) [@klxd2000](https://github.com/klxd2000)

</div>

