/* navet-webview83-compat polyfills (Array/String/TypedArray .at, Object.hasOwn, String.replaceAll, Array.toSorted/toReversed/findLast, crypto.randomUUID). Guarded: no effect on modern browsers. */
(function () {
  function def(o, k, v) { if (o && !(k in o)) try { Object.defineProperty(o, k, { value: v, writable: true, configurable: true, enumerable: false }); } catch (e) {} }
  function at(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; if (n < 0 || n >= this.length) return undefined; return this[n]; }
  def(Array.prototype, 'at', at);
  def(String.prototype, 'at', function (n) { return at.call(String(this), n); });
  try { def(Object.getPrototypeOf(Int8Array.prototype), 'at', at); } catch (e) {}
  def(Object, 'hasOwn', function (o, k) { return Object.prototype.hasOwnProperty.call(Object(o), k); });
  def(String.prototype, 'replaceAll', function (s, r) {
    if (s instanceof RegExp) { if (!s.global) throw new TypeError('replaceAll must be called with a global RegExp'); return this.replace(s, r); }
    return this.replace(new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), typeof r === 'function' ? r : String(r).replace(/\$/g, '$$$$'));
  });
  def(Array.prototype, 'toSorted', function (c) { return Array.prototype.slice.call(this).sort(c); });
  def(Array.prototype, 'toReversed', function () { return Array.prototype.slice.call(this).reverse(); });
  def(Array.prototype, 'findLast', function (f, t) { for (var i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return this[i]; });
  def(Array.prototype, 'findLastIndex', function (f, t) { for (var i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return i; return -1; });
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) def(crypto, 'randomUUID', function () {
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  });
  window.addEventListener('error', function (e) { try { console.error('[navet-err] ' + e.message + ' @' + e.filename + ':' + e.lineno); } catch (x) {} });
  window.addEventListener('unhandledrejection', function (e) { try { console.error('[navet-rej] ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); } catch (x) {} });

  /* Flex gap fallback (flex `gap` arrived in Chrome 84; WebView 83 ignores it -> items stuck together). */
  (function () {
    var d = document, t = d.createElement('div');
    t.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    t.appendChild(d.createElement('div')); t.appendChild(d.createElement('div'));
    function supported() { d.documentElement.appendChild(t); var ok = t.scrollHeight === 1; t.remove(); return ok; }
    function run() {
      if (supported()) return;
      var roots = [d], seen = new Set(), pending = 0;
      function px(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
      function fix(el) {
        var cs = getComputedStyle(el), disp = cs.display;
        var flex = disp === 'flex' || disp === 'inline-flex';
        var cg = flex ? px(cs.columnGap) : 0, rg = flex ? px(cs.rowGap) : 0;
        var dir = cs.flexDirection, col = dir.indexOf('column') === 0, rev = dir.indexOf('reverse') > 0;
        var wrap = cs.flexWrap !== 'nowrap', kids = el.children, first = true;
        var key = flex ? [cg, rg, dir, wrap].join('|') : '';
        if (el.__ngk === key && el.__ngn === kids.length) return;
        el.__ngk = key; el.__ngn = kids.length;
        for (var i = 0; i < kids.length; i++) {
          var c = kids[i], st = c.style;
          if (c.__ng) { st.marginLeft = c.__ng[0]; st.marginTop = c.__ng[1]; st.marginRight = c.__ng[2]; st.marginBottom = c.__ng[3]; c.__ng = null; }
          if (!flex || (!cg && !rg)) continue;
          var ccs = getComputedStyle(c);
          if (ccs.display === 'none' || ccs.position === 'absolute' || ccs.position === 'fixed') continue;
          c.__ng = [st.marginLeft, st.marginTop, st.marginRight, st.marginBottom];
          if (col) { if (!first && rg) st[rev ? 'marginBottom' : 'marginTop'] = 'calc(' + (px(ccs[rev ? 'marginBottom' : 'marginTop'])) + 'px + ' + rg + 'px)'; }
          else {
            var rtl = cs.direction === 'rtl' ? !rev : rev;
            if (!first && cg) st[rtl ? 'marginRight' : 'marginLeft'] = 'calc(' + px(ccs[rtl ? 'marginRight' : 'marginLeft']) + 'px + ' + cg + 'px)';
            if (wrap && rg) st.marginBottom = 'calc(' + px(ccs.marginBottom) + 'px + ' + rg + 'px)';
          }
          first = false;
        }
      }
      function scan(root) {
        var els = root.querySelectorAll('[class*="gap"]');
        for (var i = 0; i < els.length; i++) fix(els[i]);
        var all = root.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) { var sr = all[j].shadowRoot; if (sr && !seen.has(sr)) { seen.add(sr); roots.push(sr); obs.observe(sr, opts); } }
      }
      function tick() { pending = 0; for (var i = 0; i < roots.length; i++) try { scan(roots[i]); } catch (e) {} }
      function sched() { if (!pending) pending = setTimeout(tick, 120); }
      var opts = { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] };
      var obs = new MutationObserver(sched);
      obs.observe(d.documentElement, opts);
      window.addEventListener('resize', function () { var all = d.querySelectorAll('[class*="gap"]'); for (var i = 0; i < all.length; i++) all[i].__ngk = null; sched(); });
      sched();
    }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', run); else run();
  })();

  /* Container-query + aspect-ratio fallback (Chrome 105 / 88). Only active when unsupported. */
  (function () {
    var S = window.CSS && CSS.supports;
    var noCQ = !(S && CSS.supports('container-type', 'inline-size'));
    var noAR = !(S && CSS.supports('aspect-ratio', '1'));
    if (!noCQ && !noAR) return;
    var CONDS = /*__CQ_CONDS__*/{};
    var AR = { 'aspect-square': 1, 'aspect-video': 16 / 9, 'aspect-[16/7]': 16 / 7 };
    var ro = new ResizeObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) apply(entries[i].target, entries[i].contentRect.width);
    });
    function apply(el, w) {
      var cl = el.classList;
      if (noCQ) for (var k = 0; k < cl.length; k++) {
        var m = /^@container\/([\w-]+)$/.exec(cl[k]); if (!m || !CONDS[m[1]]) continue;
        CONDS[m[1]].forEach(function (c) { var on = c.not ? w < c.min : w >= c.min; el.classList.toggle(c.cls, on); });
      }
      if (noAR) {
        var r = 0;
        for (var j = 0; j < cl.length; j++) { if (AR[cl[j]]) r = AR[cl[j]]; if (cl[j] === 'sm:aspect-[16/5]' && innerWidth >= 640) { r = 16 / 5; break; } }
        if (r && w) { var h = Math.round(w / r) + 'px'; if (el.style.height !== h) el.style.height = h; }
      }
    }
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null, roots = [document];
    function scan() {
      for (var r = 0; r < roots.length; r++) {
        var root = roots[r], els = root.querySelectorAll('[class*="@container/"],[class*="aspect-"]');
        for (var i = 0; i < els.length; i++) if (!seen.has(els[i])) { seen.add(els[i]); ro.observe(els[i]); }
        var all = root.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) { var sr = all[j].shadowRoot; if (sr && roots.indexOf(sr) < 0) { roots.push(sr); mo.observe(sr, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); } }
      }
    }
    var t = 0, mo = new MutationObserver(function () { if (!t) t = setTimeout(function () { t = 0; scan(); }, 150); });
    function start() { mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); scan(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();

  /* Popper z-index fix: Chrome <~84 reports computed z-index "auto" for non-positioned elements,
     so Radix copies z-index:auto onto [data-radix-popper-content-wrapper] and menus render under the page. */
  (function () {
    function run() {
      var t = document.createElement('div'); t.style.zIndex = '7'; document.documentElement.appendChild(t);
      var bug = getComputedStyle(t).zIndex === 'auto'; t.remove();
      if (!bug) return;
      var st = document.createElement('style'); st.setAttribute('data-navet-compat', 'popper-z');
      st.textContent = '[data-radix-popper-content-wrapper]{z-index:1050 !important}';
      document.head.appendChild(st);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  })();
})();
