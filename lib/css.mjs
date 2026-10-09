// CSS pipeline for WebView 83. Modern browsers keep the original rules; fallbacks are additive or @supports-scoped.
import postcss from 'postcss';
import isPseudo from '@csstools/postcss-is-pseudo-class';
import { transform, browserslistToTargets } from 'lightningcss';

const TF = 'translate(var(--tw-translate-x,0),var(--tw-translate-y,0)) rotate(var(--tw-rotate,0deg)) scale(var(--tw-scale-x,1),var(--tw-scale-y,1))';
const sp = v => postcss.list.space(v);

export function processCss(src, stats = {}) {
  const inc = k => (stats[k] = (stats[k] || 0) + 1);
  // 1) lightningcss: lower colors (lab/oklch/color-mix), nesting, media ranges etc. for Chrome 83
  let css = transform({ code: Buffer.from(src), minify: false,
    targets: { chrome: 83 << 16 }, filename: 'x.css', errorRecovery: true }).code.toString();
  const root = postcss.parse(css);
  // 2) unwrap @layer, turn @property initial values into universal defaults (Chrome 83 knows neither)
  const defaults = [];
  root.walkAtRules('property', at => {
    const init = at.nodes?.find(n => n.prop === 'initial-value');
    const inh = at.nodes?.find(n => n.prop === 'inherits');
    if (init && !(inh && inh.value.trim() === 'true')) defaults.push(`${at.params}:${init.value}`);
    at.remove(); inc('@property');
  });
  root.walkAtRules('layer', at => { if (at.nodes) at.replaceWith(at.nodes); else at.remove(); inc('@layer'); });
  // 3) declaration fallbacks equivalent on modern browsers
  root.walkDecls(d => {
    const p = d.prop, v = d.value;
    const two = (a, b) => { const s = sp(v); d.cloneBefore({ prop: a, value: s[0] }); d.cloneBefore({ prop: b, value: s[1] ?? s[0] }); inc(p); };
    if (p === 'padding-inline') return two('padding-left', 'padding-right');
    if (p === 'padding-block') return two('padding-top', 'padding-bottom');
    if (p === 'margin-inline') return two('margin-left', 'margin-right');
    if (p === 'margin-block') return two('margin-top', 'margin-bottom');
    if (p === 'inset-inline') return two('left', 'right');
    if (p === 'inset-block') return two('top', 'bottom');
    if (p === 'inset') { const [t, r = t, b = t, l = r] = sp(v); for (const [k, x] of [['top', t], ['right', r], ['bottom', b], ['left', l]]) d.cloneBefore({ prop: k, value: x }); return inc(p); }
    if (/^--tw-scale-[xyz]$/.test(p) && /%/.test(v)) { d.value = v.replace(/(-?[\d.]+)%/g, (m, n) => String(+n / 100)); return inc('scale%'); }
    if (/\d(dvh|svh|lvh)\b/.test(v)) { d.cloneBefore({ value: v.replace(/(\d)(dvh|svh|lvh)\b/g, '$1vh') }); inc('dvh'); }
  });
  // 4) rule fallbacks inserted right after each original rule (cascade order preserved)
  const rules = []; root.walkRules(r => rules.push(r));
  const conv = c => c.walkDecls(d => { if (['translate', 'scale', 'rotate'].includes(d.prop)) { if (d.prop === 'rotate') d.cloneBefore({ prop: '--tw-rotate', value: d.value }); d.prop = 'transform'; d.value = TF; } });
  for (const r of rules) {
    if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) continue;
    let last = r;
    if (r.nodes.some(n => n.type === 'decl' && ['translate', 'scale', 'rotate'].includes(n.prop))) {
      const c = r.clone(); c.removeAll();
      r.each(n => { if (n.type === 'decl' && ['translate', 'scale', 'rotate'].includes(n.prop)) c.append(n.clone()); });
      conv(c); const at = postcss.atRule({ name: 'supports', params: 'not (translate:0)' }); at.append(c); last.after(at); last = at; inc('transform');
    }
    if (/:(is|where)\(/.test(r.selector)) {
      const c = r.clone();
      c.selectors = r.selectors.map(sel => {
        const m = sel.match(/^(.*?):is\((.+?)\s*([~+>]?)\s*\*\)(.*)$/);
        if (m && !/\*/.test(m[2])) { inc('variant'); return m[2].replace(/:where\(([^()]*)\)/g, '$1') + ' ' + (m[3] ? m[3] + ' ' : '') + m[1] + m[4]; }
        return sel.replace(/:where\(/g, ':is(');
      });
      conv(c);
      const tmp = postcss.root(); tmp.append(c);
      const res = postcss([isPseudo({ preserve: false, onComplexSelector: 'warning' })]).process(tmp, { from: undefined }).root;
      const at = postcss.atRule({ name: 'supports', params: 'not selector(:is(a))' }); res.each(n => at.append(n.clone()));
      last.after(at); inc('isrule');
    }
  }
  // 5) @container -> .cqp-* prefixed copies (classes toggled by the polyfill)
  const conds = {}; const added = [];
  root.walkAtRules('container', at => {
    const m = at.params.match(/^([\w-]+)\s+(not\s+)?\(\s*(?:width\s*>=\s*|min-width:\s*)([\d.]+)(px|rem)\s*\)$/);
    if (!m) { inc('container-skipped'); return; }
    const px = +m[3] * (m[4] === 'rem' ? 16 : 1), cls = `cqp-${m[1]}-${m[2] ? 'not' : ''}min${px}`;
    const list = (conds[m[1]] ||= []); if (!list.some(c => c.cls === cls)) list.push({ cls, min: px, not: !!m[2] });
    at.walkRules(n => { if (n.parent.type === 'atrule' && /keyframes/.test(n.parent.name)) return; const c = n.clone(); c.selectors = n.selectors.map(s => `.${cls} ${s}`); added.push(c); });
    inc('container');
  });
  added.forEach(r => root.append(r));
  const pre = `*,::before,::after{${['--tw-translate-x:0', '--tw-translate-y:0', '--tw-rotate:0deg', '--tw-scale-x:1', '--tw-scale-y:1', ...defaults.filter(d=>!/^--tw-(translate-[xy]|rotate|scale-[xy]):/.test(d))].join(';')}}\n`;
  return { css: pre + root.toString(), conds };
}
