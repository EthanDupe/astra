# Astra

Welcome to Astra, where unblocked games meet reality.

A static, dependency-free site: open `index.html` in a browser, or serve the
folder with anything (`python3 -m http.server`). There is no build step.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Landing page — animated title and the main nav |
| `games.html` | Games library, opened in a frosted window |
| `tools.html` | Calculator, notepad, unit converter, tab cloaker, stealth window |
| `apps.html` | Proxied web apps, plus tab-cloak presets |
| `gallery.html` | Masonry gallery with a live colour-grading panel |
| `weathermap.html` | Live NOAA severe-weather alerts on a Leaflet map |
| `fluidcam.html` | Camera with a canvas-drawn fluid interface and filters |
| `admin.html` | Broadcast console (unlisted — see the security note) |

## How it fits together

Two shared files carry everything the pages have in common:

- **`style.css`** — the design system. All colour, spacing, radius, motion and
  type values are CSS custom properties defined once at the top, with a light
  and a dark set. Shared components (`.nav-bar`, `.page-title`, `.glass-panel`,
  `.btn`, `.input`, `.tile`, `.segmented`, `.toast`, `.frame-overlay`) live here
  so a page only styles what is genuinely unique to it.
- **`astra.js`** — the runtime. One implementation of the theme switch, the
  navigation, the custom cursor, the starfield, toasts, tab cloaking, the panic
  key, update checks, broadcasts and the fullscreen app window.

Every page follows the same shape:

```html
<html lang="en" class="no-js" data-theme="dark">
  <head>
    <!-- boot snippet: applies the saved theme before first paint -->
    <link rel="stylesheet" href="style.css" />
  </head>
  <body data-layout="scroll">
    <canvas id="bg-canvas"></canvas>
    <div data-astra-nav-mount></div>
    <main class="page">…</main>
    <script src="astra.js"></script>
  </body>
</html>
```

`data-layout` picks the page shape: `center` (one centred screenful),
`scroll` (normal document) or `fixed` (full-bleed, no page scroll).

Features can be switched off per page with body attributes:

```html
<body data-astra-stars="off" data-astra-cursor="off" data-astra-broadcast="off">
```

Valid names: `cursor`, `stars`, `panic`, `updates`, `broadcast`.

### Adding a page to the nav

Add one entry to `NAV` at the top of `astra.js`. Every page renders its nav from
that list, so it appears everywhere at once.

### Adding an app or a game

Both grids are data-driven. Edit the `APPS` array in `apps.html` or the `GAMES`
array in `games.html`:

```js
{ label: "Name", url: "https://…", icon: "https://…/logo.svg", external: false }
```

Set `external: true` for sites that refuse to be embedded — the tile opens a new
tab instead of an empty window.

## Behaviour worth knowing

- **Theme** — remembered in `localStorage` under `astra-theme` and applied by an
  inline snippet in `<head>`, so there is no flash of the wrong colours.
- **Panic key** — `]` leaves the site immediately, from any page. It is ignored
  while you are typing in a field.
- **Tab cloak** — set on the Apps page or the Tools cloaker; it persists across
  pages until reset.
- **Custom cursor** — only on devices with a fine pointer (mouse/trackpad) and
  only when the visitor has not asked for reduced motion. Everywhere else the
  normal cursor is left alone.
- **Accessibility** — keyboard focus is visible everywhere, every page has a
  skip link, and all animation respects `prefers-reduced-motion`.

## Security notes

This is a static site, so anything it needs at runtime is readable by anyone who
views source. Two things follow from that:

1. **The admin passcode in `admin.html` is not access control.** It is a speed
   bump that hides the console from casual visitors. Anyone who opens the file
   can read it.
2. **The jsonbin key in `astra.js` is public and can write to the bin.** It ships
   to every visitor. Treat that bin as public data and do not put anything in it
   you would not publish.

To reduce the exposure:

- Rotate the key (it is in this repository's git history, so the current one
  should be considered burned).
- Make the broadcast bin publicly readable in jsonbin. Astra tries the
  unauthenticated read first, so a public bin means the key is never sent from
  the public pages at all — only `admin.html` needs it, to write.
- For real access control, the broadcast write has to move behind a small server
  or serverless function that holds the key. There is no way to keep a secret in
  a static page.

## Browser support

Modern evergreen browsers. The site uses `backdrop-filter`, CSS custom
properties, `aspect-ratio` and canvas — all widely available. Older Safari falls
back gracefully where a feature is missing.
