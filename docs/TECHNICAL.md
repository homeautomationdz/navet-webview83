# Technical notes

## Build pipeline (`build.mjs`)

1. Copies the Navet folder (skips `__pycache__` and `*.bak*`, `*.pre-*`, `*.backup*`).
2. CSS (`lib/css.mjs`), for every `frontend/assets/*.css`:
   - lightningcss with target Chrome 83 (colors, nesting, media ranges).
   - `@layer` blocks unwrapped; `@property` removed and its `initial-value`s emitted as
     `*,::before,::after{…}` defaults (only for non-inherited properties).
   - Logical properties (`padding/margin/inset-inline|block`, `inset`) get physical longhands
     *before* the original declaration, so modern browsers still use the logical one.
   - `--tw-scale-*: N%` → `N/100` (percentages are not valid inside `scale()` on Chrome 83).
   - `dvh/svh/lvh` get a `vh` fallback declaration.
   - Rules using `translate`/`scale`/`rotate` get a copy with an equivalent `transform` inside
     `@supports not (translate:0)`, inserted directly after the original (cascade order kept).
   - Rules using `:is()`/`:where()` get an expanded copy inside `@supports not selector(:is(a))`;
     Tailwind variants such as `X:is(:where(.group):hover *)` become `.group:hover X`.
   - `@container NAME (width>=N)` rules are duplicated as `.cqp-NAME-minN X` rules.
3. JS: `frontend/navet-panel.js` and all its chunks are bundled into one ESM file with esbuild,
   `--target=chrome83`.
4. Bundle patches: wallpaper `image-set(... type())` gets a `CSS.supports` guard with a plain
   `url(.webp)` fallback; CSS URLs get `?v=<hash>` so tablets fetch the new CSS.
5. Output `navet-panel.js` = `polyfills.js` + CSS loader + bundle.

## Runtime polyfills (`polyfills.js`) — all guarded

| Polyfill | Active when |
|---|---|
| `Array/String/TypedArray.at`, `Object.hasOwn`, `String.replaceAll`, `Array.toSorted/toReversed/findLast/findLastIndex`, `crypto.randomUUID` | method missing |
| Flex `gap` → child margins (MutationObserver, ~120 ms debounce) | flex gap unsupported |
| Container queries → toggles `.cqp-*` classes on `@container/NAME` elements via ResizeObserver | `CSS.supports('container-type','inline-size')` is false |
| `aspect-ratio` → inline height for `aspect-square`, `aspect-video`, `aspect-[16/7]`, `sm:aspect-[16/5]` | `aspect-ratio` unsupported |
| `[data-radix-popper-content-wrapper]{z-index:1050 !important}` | a static element with `z-index:7` reports computed `auto` |
| `[navet-err]` / `[navet-rej]` console logging | always |

## Kiosk Satellite notes (2026.10.5)

- Its *Dashboard* list only offers Lovelace dashboards, so Navet is opened with the injected script.
- It is the Android home app and survives `am force-stop`; use *Clear web cache* (kiosk menu) or a
  reboot to reload pages.
- Without cache headers the WebView keeps old JS/CSS; the `?v=` hash on CSS and a cache clear solve it.

## Test log (2026-10-09, Navet 0.17.7)

Tablet: Tuya TPA08-M3, Android 11, WebView 83.0.4103.120, Kiosk Satellite 2026.10.5, 1280×800.

Deployment status: the tablet is currently running the Navet copy produced by this kit.

| Test | Result |
|---|---|
| Boot → Navet opens automatically, no white screen | pass |
| Sidebar navigation (all sections) | pass |
| Search: open, type, clear (✕) | pass |
| Customize mode, Presets menu, Add sidebar action dialog | pass |
| Add Card, drag to reorder (press-hold), Done, persists after reload, remove | pass |
| Dropdowns (Role select, Presets), dialogs, toasts | pass |
| Chores wizard: add person, add chore, delete chore | pass (editing only exists after finishing the wizard; not tested) |
| Settings: two-column layout, 4-column theme picker, wallpaper | pass |
| HA calendar page: month/week navigation, Today | pass |
| Desktop Chromium 152: no fallbacks active, no console errors, identical computed styles | pass |
