# navet-webview83-compat

Run the [Navet](https://github.com/awesomestvi/navet) Home Assistant panel on **old Android wall
tablets** whose system WebView is stuck at **Chrome 83** — for example the Tuya **TPA08-M3**
(Android 11, WebView 83.0.4103.120) running **Kiosk Satellite**.

Out of the box Navet shows a white screen on these tablets. This kit takes an unmodified Navet
integration folder and produces a patched copy that works on WebView 83 **and** behaves exactly like
the original on modern browsers (every fallback is feature-detected or wrapped in `@supports not`).

> This repository contains only build scripts, polyfills and docs. **Navet itself is not included**
> and belongs to its authors. You need your own copy of the Navet integration.

## What gets fixed

| Symptom on WebView 83 | Cause | Fix |
|---|---|---|
| White screen | Modern JS syntax / APIs (`.at()`, `Object.hasOwn`, `replaceAll`, `toSorted`, `crypto.randomUUID`, dynamic chunks) | Single bundle built with esbuild `--target=chrome83` + small polyfills |
| Unstyled page | `@layer`, `@property`, `lab()`/`color-mix()` | lightningcss for Chrome 83, layers unwrapped, `@property` → defaults |
| Missing padding, items stuck together | `padding-inline`, `inset`, flex `gap` (Chrome 84+) | Physical longhands + runtime flex-gap fallback |
| Hover / spacing utilities ignored | `:is()` / `:where()` selectors (Chrome 88+) | Expanded copies inside `@supports not selector(:is(a))` |
| Elements not offset/rotated | `translate` / `scale` / `rotate` properties (Chrome 104+) | `transform` inside `@supports not (translate:0)` |
| Settings in one column | `@container` queries (Chrome 105+) | `.cqp-*` classes toggled by a ResizeObserver polyfill |
| Collapsed media boxes | `aspect-ratio` (Chrome 88+) | Inline height polyfill |
| No wallpaper | `image-set(... type())` (Chrome 113+) | Falls back to the `.webp` file |
| Dropdowns / Presets menu hidden behind the page | Chrome < 85 reports computed `z-index: auto` for static elements, Radix copies it | `[data-radix-popper-content-wrapper]{z-index:1050}` (only when the bug is detected) |

Verified on 2026-10-09: Tuya TPA08-M3 / WebView 83 (navigation, search, customize, sidebar actions,
add/move/save cards, dropdowns, dialogs, chores wizard, wallpaper, reboot auto-open) and on desktop
Chromium 152 (no fallback active, no console errors, computed styles identical to the original CSS).

## Build

Requires Node.js 18+.

```bash
npm install
node build.mjs /path/to/custom_components/navet ./out/navet
```

Expected output ends with `image-set patch ok`. If it prints `MISSING`, the Navet version changed
that code; everything else still works, only the wallpaper falls back to none on old tablets.

Tested with Navet **0.17.7**.

## Install on a new Home Assistant

1. Copy `out/navet` to `/config/custom_components/navet` on Home Assistant
   (Samba share `\\homeassistant\config\custom_components\navet`, SSH, or the File editor add-on).
2. Restart Home Assistant.
3. **Settings → Devices & services → Add integration → Navet.**
4. Open `http://<home-assistant>/navet` on a PC to check it loads.
5. Give Home Assistant a fixed IP (DHCP reservation in your router).

## Set up the tablet (Kiosk Satellite)

1. Check the WebView version: *Android Settings → Apps → Android System WebView*.
   - **111 or newer:** stock Navet works; this kit is not needed (it is harmless anyway).
   - **83:** this kit is required (tested).
   - **84–110:** not tested; the kit should work because each fix enables itself only when needed.
2. Install Kiosk Satellite and open its settings (*Back* button → *Settings*):
   - **Home Assistant base URL:** `http://<home-assistant-ip>`
   - **Long-lived access token:** create one in Home Assistant → your profile → *Security*.
   - Enable **Log in automatically** and **Secure context proxy** (for plain `http`).
3. **Open Navet automatically on start:** *Web Browsing → Inject JavaScript on the HA dashboard*,
   paste the single line from [`kiosk/autoopen-navet.js`](kiosk/autoopen-navet.js) and save.
   It redirects once per app start from Overview to `/navet`; Overview stays reachable afterwards.
4. Set the tablet's **date and time** correctly (Navet's week number and calendar "Today" use it),
   and give the tablet a fixed IP.
5. In Navet → *Settings* choose theme, accent and wallpaper — these are stored per device.

## Updating Navet later

A Navet update replaces the patched files. Re-run `node build.mjs` on the new version and copy the
result again. Then reload the tablet: Kiosk *Back* button → **Clear web cache** (Kiosk Satellite is the
home app and cannot be force-stopped; a reboot also works).

## Troubleshooting

- **Still the old look after an update:** the tablet cached the old files → *Clear web cache* or reboot.
- **White screen:** connect the tablet with ADB and run `adb logcat | findstr navet-err` — the polyfill
  logs every uncaught error as `[navet-err]`.
- **Tablet boots into its system settings app instead of Kiosk Satellite:** that app was left open;
  close it, press Home.
- Optional remote-testing helper for Windows: [`tools/tablet-bridge`](tools/tablet-bridge).

## How it works

See [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

## License

MIT for the files in this repository. Navet is © its authors and is not covered by this license.
