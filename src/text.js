// Comparaison de réponses : tolérance aux accents spéciaux et aux petites fautes de frappe.
export function strip(s) {
  return s.toLowerCase().replace(/[.,!?;:"«»()…]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function fold(s) { // sans caractères spéciaux norvégiens ni accents
  return strip(s)
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/aa/g, 'a')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
const tol = (len) => (len >= 15 ? 2 : len >= 5 ? 1 : 0);

// expected : "en kaffe" ; renvoie { ok, note }
export function checkTyped(input, expected) {
  const raw = strip(input);
  if (!raw) return { ok: false, note: '' };
  const exp = strip(expected);
  if (raw === exp) return { ok: true, note: '', exact: true };
  const fi = fold(input), fe = fold(expected);
  if (fi === fe) return { ok: true, note: 'Attention aux lettres spéciales : ', fix: true };
  const em = /^(en|ei|et) (.+)$/.exec(fe);
  if (em) {
    const [, art, stem] = em;
    if (fi === stem || lev(fi, stem) <= tol(stem.length) && !/^(en|ei|et) /.test(fi)) {
      return { ok: true, note: 'Article oublié : ', fix: true };
    }
    const im = /^(en|ei|et) (.+)$/.exec(fi);
    if (im && im[1] !== art && lev(im[2], stem) <= tol(stem.length)) {
      return { ok: false, note: 'Mauvais article : ', fix: true };
    }
  }
  if (lev(fi, fe) <= tol(fe.length)) return { ok: true, note: 'Petite faute de frappe : ', fix: true };
  return { ok: false, note: '' };
}

// Similarité de mots pour la reconnaissance vocale (0..1).
export function speechScore(said, expected) {
  const a = fold(said).split(' ').filter(Boolean);
  const e = fold(expected).split(' ').filter(Boolean);
  if (!e.length) return 0;
  let hit = 0;
  const pool = a.slice();
  for (const w of e) {
    const i = pool.findIndex((x) => x === w || lev(x, w) <= (w.length > 4 ? 1 : 0));
    if (i >= 0) { hit++; pool.splice(i, 1); }
  }
  return hit / e.length;
}
