// Personnage en SVG : genre, peau, coiffure, couleurs, tenues typiques, accessoires, visage + décors illustrés.
import { state } from './state.js';

export const GENDERS = [['f', 'Femme'], ['m', 'Homme'], ['n', 'Neutre']];
export const SKINS = ['#ffe0c8', '#f6cfa8', '#e4b58a', '#c68e62', '#9a6a45', '#6f4a31'];
export const HAIR_COLORS = [
  ['#2b2b33', 'Noir'], ['#4a3326', 'Brun foncé'], ['#7a5a3c', 'Brun'], ['#a77b4f', 'Châtain clair'],
  ['#e6c26b', 'Blond'], ['#c8683a', 'Roux'], ['#d6d6dc', 'Gris'], ['#f08bb2', 'Rose'], ['#5aa0e0', 'Bleu'],
];
export const EYE_COLORS = [['#5b3a24', 'Marron'], ['#4a7fb5', 'Bleu'], ['#4f9a6a', 'Vert'], ['#8a98a8', 'Gris'], ['#8a6b2f', 'Noisette']];
export const HAIR_STYLES = [
  ['court', 'Court'], ['carre', 'Carré'], ['long', 'Long'], ['tresses', 'Tresses'],
  ['queue', 'Queue de cheval'], ['chignon', 'Chignon'], ['boucles', 'Bouclés'], ['rase', 'Rasé'],
];
export const DEFAULT_LOOK = { gender: 'm', skin: 1, hair: 'court', hairColor: 2, eyes: 0 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shade(hex, amt) { // amt -1..1
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
}
let uid = 0;

const TORSO = {
  m: 'M26 59 Q26 52 35 52 H65 Q74 52 74 59 V92 H26 Z',
  n: 'M28 59 Q28 52 36 52 H64 Q72 52 72 59 V92 H28 Z',
  f: 'M31 59 Q31 52 38 52 H62 Q69 52 69 59 L67 76 L71 92 H29 L33 76 Z',
};

// ---------- Cheveux : { back (derrière le corps), mid (devant le corps, derrière le visage), front } ----------
function hairParts(style, c) {
  const d = shade(c, -0.18);
  const cap = `<path d="M33 38 Q31 17 50 17 Q69 17 67 38 Q63 27 50 26 Q37 27 33 38Z" fill="${c}"/><path d="M41 22 Q50 18 59 22" stroke="${shade(c, 0.25)}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const P = {
    court: { front: cap },
    rase: { front: `<path d="M34 34 Q50 16 66 34 Q50 25 34 34Z" fill="${c}" opacity=".55"/>` },
    carre: {
      back: `<path d="M30 40 Q29 15 50 15 Q71 15 70 40 V55 Q66 58 62 55 V41 H38 V55 Q34 58 30 55Z" fill="${d}"/>`,
      front: `<path d="M32 38 Q31 16 50 16 Q69 16 68 38 Q62 25 50 28 Q38 25 32 38Z" fill="${c}"/>`,
    },
    long: {
      mid: `<path d="M29 40 Q28 14 50 14 Q72 14 71 40 V72 Q66 76 62 72 V44 H38 V72 Q34 76 29 72Z" fill="${d}"/>`,
      front: `<path d="M32 40 Q31 16 50 16 Q69 16 68 40 Q61 24 50 27 Q39 24 32 40Z" fill="${c}"/>`,
    },
    tresses: {
      back: [0, 1, 2].map((i) => `<ellipse cx="32" cy="${45 + i * 7}" rx="3.2" ry="4.2" fill="${d}"/><ellipse cx="68" cy="${45 + i * 7}" rx="3.2" ry="4.2" fill="${d}"/>`).join('')
        + '<circle cx="32" cy="67" r="1.9" fill="#d94b5c"/><circle cx="68" cy="67" r="1.9" fill="#d94b5c"/>',
      front: cap,
    },
    queue: {
      back: `<path d="M64 28 Q86 26 82 50 Q80 66 70 62 Q77 48 65 38Z" fill="${d}"/><circle cx="66" cy="30" r="2.3" fill="#d94b5c"/>`,
      front: cap,
    },
    chignon: { back: `<circle cx="50" cy="11" r="7.5" fill="${d}"/>`, front: cap },
    boucles: {
      back: [[33, 31], [40, 22], [50, 19], [60, 22], [67, 31], [31, 42], [69, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${d}"/>`).join(''),
      front: [[41, 27], [50, 25], [59, 27], [35, 33], [65, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}"/>`).join(''),
    },
  };
  return P[style] || P.court;
}

// ---------- Tenues ----------
function topParts(id, gender, g) {
  const uidc = `c${++uid}`;
  const torso = TORSO[gender] || TORSO.n;
  const clip = `<clipPath id="${uidc}"><path d="${torso}"/></clipPath>`;
  const body = (fill, deco = '') => `<defs>${clip}</defs><path d="${torso}" fill="${fill}"/><g clip-path="url(#${uidc})">${deco}</g>`;
  const isF = gender === 'f';
  switch (id) {
    case 'top_pull': return body('#f3e9d9',
      '<rect x="20" y="64" width="60" height="4" fill="#c8577f"/><rect x="20" y="75" width="60" height="4" fill="#c8577f"/><path d="M20 71.5l4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3" stroke="#5a9bc4" stroke-width="1.6" fill="none"/><path d="M20 83h60M20 88h60" stroke="#5a9bc4" stroke-width="1.2"/><path d="M42 52 Q50 60 58 52" fill="#e3d6c0"/>');
    case 'top_cire': return body('#ffd54f',
      '<path d="M50 52v42" stroke="#e0a800" stroke-width="1.6"/><circle cx="46" cy="66" r="1.7" fill="#e0a800"/><circle cx="46" cy="76" r="1.7" fill="#e0a800"/><circle cx="46" cy="86" r="1.7" fill="#e0a800"/><path d="M36 52 Q50 64 64 52" fill="#f0b400"/>');
    case 'top_echarpe': return body('#8ec5e8',
      '<path d="M32 54 Q50 68 68 54 V62 Q50 76 32 62Z" fill="#e57373"/><rect x="58" y="62" width="9" height="24" rx="3" fill="#d85f5f"/><path d="M60 80h5M60 84h5" stroke="#fff" stroke-width="1.2"/>');
    case 'top_lusekofte': {
      const row = (y) => Array.from({ length: 8 }, (_, i) => `<path d="M${24 + i * 7} ${y}l3 -3 3 3 -3 3z" fill="#fff"/>`).join('');
      const dots = (y) => Array.from({ length: 12 }, (_, i) => `<circle cx="${22 + i * 5}" cy="${y}" r="1" fill="#fff"/>`).join('');
      return body('#2d2f3a',
        `${row(62)}${dots(68)}${row(74)}${dots(80)}${row(86)}<path d="M50 52v42" stroke="#c0392b" stroke-width="2"/><path d="M38 52 Q50 62 62 52" fill="#c0392b"/>`);
    }
    case 'top_bunad':
      if (isF) {
        return `<defs>${clip}</defs>
          <path d="M33 74 L67 74 L76 95 L24 95Z" fill="#7a1f2b"/>
          <path d="M26 91 L24 95 H76 L74 91Z" fill="#2f6f4e"/><path d="M25 88.5 H75" stroke="#d4a63a" stroke-width="1.4"/>
          <path d="M43 74 L57 74 L61 94 L39 94Z" fill="#f5ecd8"/>
          <circle cx="48" cy="82" r="1.4" fill="#e57373"/><circle cx="52" cy="86" r="1.4" fill="#5aa0e0"/><circle cx="46" cy="89" r="1.2" fill="#e6c26b"/><circle cx="54" cy="80" r="1.2" fill="#4f9a6a"/>
          <path d="${torso}" fill="#7a1f2b"/><g clip-path="url(#${uidc})"><path d="M44 54 L50 74 L56 54Z" fill="#1d1d24"/><path d="M45 58 L55 58 M46 63 L54 63 M47 68 L53 68" stroke="#d4a63a" stroke-width="1"/></g>
          <circle cx="31" cy="58" r="5.2" fill="#fff"/><circle cx="69" cy="58" r="5.2" fill="#fff"/><path d="M42 52 Q50 60 58 52" fill="#fff"/>
          <circle cx="50" cy="58" r="2.4" fill="#cfd5dc"/><circle cx="49.3" cy="57.3" r=".8" fill="#fff"/>`;
      }
      return body('#1f3b73',
        '<path d="M42 52 L50 72 L58 52Z" fill="#f5ecd8"/><path d="M44 56 L50 74 L56 56Z" fill="#b3262f"/><circle cx="50" cy="62" r="1.2" fill="#cfd5dc"/><circle cx="50" cy="68" r="1.2" fill="#cfd5dc"/><circle cx="50" cy="74" r="1.2" fill="#cfd5dc"/><path d="M26 86 H74" stroke="#d4a63a" stroke-width="2"/><circle cx="50" cy="86" r="2.6" fill="#cfd5dc"/>')
        + '<circle cx="50" cy="56" r="1.8" fill="#cfd5dc"/>';
    case 'top_ski': return body('#ff8a3d',
      '<path d="M20 74 L80 62 V68 L20 80Z" fill="#fff"/><path d="M50 52v42" stroke="#c4601c" stroke-width="1.4"/><path d="M20 58h8M72 58h8" stroke="#e8e8ee" stroke-width="2"/><path d="M38 52 Q50 62 62 52" fill="#2d3748"/>');
    case 'top_viking': return body('#8b5a2b',
      '<circle cx="36" cy="66" r="1.2" fill="#b8bfc9"/><circle cx="44" cy="66" r="1.2" fill="#b8bfc9"/><circle cx="56" cy="66" r="1.2" fill="#b8bfc9"/><circle cx="64" cy="66" r="1.2" fill="#b8bfc9"/><rect x="20" y="78" width="60" height="5" fill="#3b2a1a"/><rect x="46" y="77" width="8" height="7" rx="1.5" fill="#d4a63a"/><path d="M32 54 Q36 62 42 58 Q46 66 50 58 Q54 66 58 58 Q64 62 68 54 V50 H32Z" fill="#f1e7d3"/>');
    default: return body('#8ec5e8', '<path d="M40 52 Q50 60 60 52" fill="#7ab5da"/><path d="M50 56v36" stroke="#7ab5da" stroke-width="1.2"/>');
  }
}

function hatPart(id, hairColor) {
  switch (id) {
    case 'hat_bonnet': return '<path d="M33 31 Q33 11 50 11 T67 31Z" fill="#e57373"/><rect x="32" y="27" width="36" height="7" rx="3" fill="#fff"/><circle cx="50" cy="9" r="5" fill="#fff"/>';
    case 'hat_viking': return '<path d="M33 32 Q33 12 50 12 T67 32Z" fill="#9aa5b1"/><rect x="32" y="28" width="36" height="5" rx="2" fill="#6b7686"/><path d="M33 23 Q20 21 21 8 Q27 16 35 18ZM67 23 Q80 21 79 8 Q73 16 65 18Z" fill="#f3e9d9"/>';
    case 'hat_chapeau': return '<ellipse cx="50" cy="30" rx="27" ry="6" fill="#c9a26b"/><path d="M36 30 Q36 14 50 14 T64 30Z" fill="#d8b47e"/><rect x="36" y="25" width="28" height="4" fill="#8b6b3d"/>';
    case 'hat_nordique': return '<path d="M33 32 Q33 12 50 12 T67 32Z" fill="#264d8f"/><rect x="32" y="27" width="36" height="7" rx="2" fill="#f3e9d9"/><path d="M33 31l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3" stroke="#c0392b" stroke-width="1.4" fill="none"/><circle cx="50" cy="10" r="4.5" fill="#f3e9d9"/>';
    case 'hat_couronne': return '<path d="M33 27 Q50 15 67 27" stroke="#4f9a6a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="38" cy="24" r="3" fill="#f08bb2"/><circle cx="46" cy="20" r="3" fill="#fff"/><circle cx="54" cy="20" r="3" fill="#ffd54f"/><circle cx="62" cy="24" r="3" fill="#f08bb2"/><circle cx="38" cy="24" r="1" fill="#ffd54f"/><circle cx="62" cy="24" r="1" fill="#ffd54f"/>';
    default: return '';
  }
}

function facePart(id, hairColor) {
  switch (id) {
    case 'face_lunettes': return '<circle cx="44" cy="40" r="5.2" fill="rgba(255,255,255,.25)" stroke="#2f3a4a" stroke-width="1.3"/><circle cx="56" cy="40" r="5.2" fill="rgba(255,255,255,.25)" stroke="#2f3a4a" stroke-width="1.3"/><path d="M49.2 40h1.6" stroke="#2f3a4a" stroke-width="1.3"/>';
    case 'face_soleil': return '<rect x="38" y="36" width="11" height="8" rx="3.5" fill="#1d1d24"/><rect x="51" y="36" width="11" height="8" rx="3.5" fill="#1d1d24"/><path d="M49 39h2" stroke="#1d1d24" stroke-width="1.4"/><path d="M40 38l3 0" stroke="#fff" stroke-width="1" opacity=".5"/>';
    case 'face_barbe': return `<path d="M35 42 Q35 66 50 68 Q65 66 65 42 Q60 54 50 53 Q40 54 35 42Z" fill="${hairColor}"/><path d="M46 48 Q50 50 54 48" stroke="#a8554a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    default: return '';
  }
}

function accBack(id) {
  if (id === 'acc_skis') return '<g transform="rotate(8 50 50)"><rect x="21" y="8" width="3.4" height="88" rx="1.7" fill="#d94b5c"/><rect x="76" y="8" width="3.4" height="88" rx="1.7" fill="#264d8f"/></g>';
  if (id === 'acc_drapeau') return '<rect x="83" y="22" width="2.2" height="72" fill="#8b6b3d"/><circle cx="84" cy="21" r="2" fill="#d4a63a"/><rect x="85" y="23" width="14" height="10" fill="#c0392b"/><path d="M89 23v10M85 28h14" stroke="#fff" stroke-width="3"/><path d="M89 23v10M85 28h14" stroke="#264d8f" stroke-width="1.3"/>';
  if (id === 'acc_sac') return '<rect x="66" y="56" width="15" height="31" rx="6" fill="#c9783f"/><rect x="66" y="64" width="15" height="5" fill="#a85f2c"/>';
  return '';
}
function accFront(id) {
  switch (id) {
    case 'acc_jumelles': return '<rect x="38" y="68" width="10" height="14" rx="4" fill="#4a5568"/><rect x="52" y="68" width="10" height="14" rx="4" fill="#4a5568"/><rect x="46" y="72" width="8" height="4" fill="#4a5568"/>';
    case 'acc_appareil': return '<rect x="56" y="72" width="18" height="12" rx="3" fill="#4a5568"/><circle cx="65" cy="78" r="4" fill="#cbd5e0"/>';
    case 'acc_orque': return '<ellipse cx="22" cy="82" rx="10" ry="6.5" fill="#1d1d24"/><path d="M14 82 Q22 90 30 82 Q22 86 14 82Z" fill="#fff"/><ellipse cx="18" cy="79" rx="2" ry="1.3" fill="#fff"/><path d="M26 76 L31 70 L31 79Z" fill="#1d1d24"/><path d="M12 84 L7 88 L12 89Z" fill="#1d1d24"/>';
    case 'acc_cafe': return '<rect x="14" y="76" width="13" height="11" rx="2" fill="#fff" stroke="#c9c2b7" stroke-width="1"/><path d="M27 79 q5 1 0 6" stroke="#c9c2b7" stroke-width="1.4" fill="none"/><path d="M18 72 q-2 -3 0 -5 M22 72 q-2 -3 0 -5" stroke="#cfd5dc" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    default: return '';
  }
}

export function avatarSVG(eq = {}, size = 64, look = state?.look, crop = false) {
  const L = { ...DEFAULT_LOOK, ...(look || {}) };
  const gender = L.gender;
  const skin = SKINS[clamp(L.skin, 0, SKINS.length - 1)];
  const hairC = HAIR_COLORS[clamp(L.hairColor, 0, HAIR_COLORS.length - 1)][0];
  const eyeC = EYE_COLORS[clamp(L.eyes, 0, EYE_COLORS.length - 1)][0];
  const hair = hairParts(L.hair, hairC);
  const skinD = shade(skin, -0.14);
  const top = topParts(eq.top, gender, gender);
  const isDress = eq.top === 'top_bunad' && gender === 'f';
  const legs = isDress ? '' : `<rect x="34" y="88" width="13" height="8" rx="2" fill="#4a5568"/><rect x="53" y="88" width="13" height="8" rx="2" fill="#4a5568"/>`;
  const lash = gender === 'f' ? `<path d="M41 37.5 l-1.4-1.2 M59 37.5 l1.4-1.2" stroke="#2b2b33" stroke-width="1" stroke-linecap="round"/>` : '';
  const brow = (x1, x2, y) => `<path d="M${x1} ${y} Q${(x1 + x2) / 2} ${y - 1.6} ${x2} ${y}" stroke="${shade(hairC, -0.25)}" stroke-width="${gender === 'm' ? 1.7 : 1.2}" fill="none" stroke-linecap="round"/>`;
  const vb = crop ? '22 6 56 56' : '0 0 100 100';
  return `<svg viewBox="${vb}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${crop ? '' : '<ellipse cx="50" cy="97" rx="24" ry="3.6" fill="rgba(0,0,0,.10)"/>'}
    ${accBack(eq.acc)}
    ${hair.back || ''}
    ${legs}
    <rect x="34" y="94" width="13" height="4" rx="2" fill="#5b6b7c"/><rect x="53" y="94" width="13" height="4" rx="2" fill="#5b6b7c"/>
    <rect x="45.5" y="50" width="9" height="8" fill="${skinD}"/>
    ${top}
    ${hair.mid || ''}
    <circle cx="33.5" cy="40" r="3.2" fill="${skin}"/><circle cx="66.5" cy="40" r="3.2" fill="${skin}"/>
    <circle cx="50" cy="38" r="17" fill="${skin}"/>
    <circle cx="40" cy="44" r="3" fill="#f08bb2" opacity=".22"/><circle cx="60" cy="44" r="3" fill="#f08bb2" opacity=".22"/>
    ${brow(40, 47.5, 34.5)}${brow(52.5, 60, 34.5)}
    <circle cx="44" cy="40" r="2.9" fill="#fff"/><circle cx="56" cy="40" r="2.9" fill="#fff"/>
    <circle cx="44" cy="40.2" r="2.15" fill="${eyeC}"/><circle cx="56" cy="40.2" r="2.15" fill="${eyeC}"/>
    <circle cx="44" cy="40.2" r="1" fill="#16161c"/><circle cx="56" cy="40.2" r="1" fill="#16161c"/>
    <circle cx="44.7" cy="39.4" r=".6" fill="#fff"/><circle cx="56.7" cy="39.4" r=".6" fill="#fff"/>
    ${lash}
    <path d="M49.3 44 q.7 .9 1.4 0" stroke="${skinD}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M45.5 47.5 Q50 51 54.5 47.5" stroke="${gender === 'f' ? '#c2566a' : '#a8554a'}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    ${facePart(eq.face, hairC)}
    ${hair.front || ''}
    ${hatPart(eq.hat, hairC)}
    ${accFront(eq.acc)}
  </svg>`;
}

// ---------- Décors illustrés (viewBox 400 x 240) ----------
const sky = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const spruce = (x, y, s, c = '#2f6b52', snow = false) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -46 L12 -22 H5 L16 -4 H4 L18 16 H-18 L-4 -4 H-16 L-5 -22 H-12Z" fill="${c}"/>${snow ? '<path d="M0 -46 L6 -33 Q0 -30 -6 -33Z M-9 -14 Q0 -10 9 -14 L10 -10 Q0 -6 -10 -10Z" fill="#fff" opacity=".9"/>' : ''}<rect x="-2.5" y="16" width="5" height="7" fill="#5b3b25"/></g>`;
const cabin = (x, y, s = 1, roof = '#7a3b2e', wall = '#b3262f') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-16" y="-14" width="32" height="20" fill="${wall}"/><path d="M-19 -14 L0 -30 L19 -14Z" fill="${roof}"/><rect x="-10" y="-8" width="7" height="7" fill="#fff6d6"/><rect x="3" y="-8" width="7" height="7" fill="#fff6d6"/><path d="M-6.5 -8v7M-10 -4.5h7M6.5 -8v7M3 -4.5h7" stroke="#fff" stroke-width=".8"/></g>`;
const stars = (n, seed = 7) => Array.from({ length: n }, (_, i) => { const a = Math.sin(seed * (i + 1) * 12.9898) * 43758.5453; const r = a - Math.floor(a); const b = Math.sin(seed * (i + 3) * 78.233) * 12345.6; const q = b - Math.floor(b); return `<circle cx="${(r * 400).toFixed(0)}" cy="${(q * 130).toFixed(0)}" r="${(0.6 + r * 1.1).toFixed(1)}" fill="#fff" opacity="${(0.4 + q * 0.6).toFixed(2)}"/>`; }).join('');
const flakes = (n) => Array.from({ length: n }, (_, i) => { const x = (i * 97) % 400, y = (i * 53) % 220; return `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity=".85"/>`; }).join('');

const SCENES = {
  plaine: () => `<defs>${sky('s1', [[0, '#cfeaff'], [1, '#f1fbe8']])}</defs><rect width="400" height="240" fill="url(#s1)"/>
    <circle cx="330" cy="50" r="22" fill="#fff3b0"/><circle cx="330" cy="50" r="30" fill="#fff3b0" opacity=".35"/>
    <ellipse cx="90" cy="48" rx="34" ry="10" fill="#fff"/><ellipse cx="112" cy="40" rx="22" ry="9" fill="#fff"/><ellipse cx="270" cy="70" rx="28" ry="8" fill="#fff" opacity=".9"/>
    <path d="M0 150 Q70 110 150 140 T300 130 T400 140 V240 H0Z" fill="#bfe3b0"/><path d="M0 180 Q90 150 190 175 T400 170 V240 H0Z" fill="#9ed08c"/>
    ${cabin(320, 168, 1)}${spruce(60, 175, .9)}${spruce(95, 182, .7)}${spruce(365, 190, .8)}
    <path d="M0 205 Q100 190 200 205 T400 200 V240 H0Z" fill="#86c274"/>
    ${[40, 120, 190, 250, 300].map((x, i) => `<circle cx="${x}" cy="${215 + (i % 2) * 8}" r="2.4" fill="${['#f08bb2', '#fff', '#ffd54f'][i % 3]}"/>`).join('')}`,
  aurore: () => `<defs>${sky('s2', [[0, '#050c24'], [.55, '#143a5a'], [1, '#2a6a78']])}<filter id="bl"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="400" height="240" fill="url(#s2)"/>${stars(60)}
    <g filter="url(#bl)"><path d="M0 110 Q90 20 190 70 T400 40 V90 Q300 120 200 100 T0 150Z" fill="#3ee89a" opacity=".55"/><path d="M60 120 Q160 40 260 90 T400 80 V110 Q300 140 200 120 T60 150Z" fill="#7affd0" opacity=".4"/><path d="M0 90 Q120 10 220 50 T400 20 V50 Q300 80 220 70 T0 120Z" fill="#a78bfa" opacity=".3"/></g>
    <path d="M0 175 L60 110 L100 150 L160 90 L230 160 L290 105 L350 150 L400 120 V240 H0Z" fill="#1c2f4a"/><path d="M60 110 L45 128 L60 124 L72 132Z M160 90 L142 118 L158 112 L172 122Z M290 105 L274 128 L290 122 L304 130Z" fill="#e8f2ff"/>
    <rect y="190" width="400" height="50" fill="#0f2a44"/><path d="M40 200 Q200 214 360 200" stroke="#3ee89a" stroke-width="3" opacity=".35" fill="none"/>${spruce(30, 195, .8, '#0b1f2f')}${spruce(370, 198, .9, '#0b1f2f')}${spruce(345, 205, .6, '#0b1f2f')}`,
  fjord: () => `<defs>${sky('s3', [[0, '#9fd6ff'], [1, '#e7f5ff']])}${sky('w3', [[0, '#5fb0e0'], [1, '#2d77b0']])}</defs><rect width="400" height="240" fill="url(#s3)"/>
    <circle cx="300" cy="46" r="20" fill="#fff6c8"/>
    <path d="M0 40 L40 20 L85 60 L120 40 L150 120 L130 240 H0Z" fill="#6c8a78"/><path d="M400 30 L355 10 L310 70 L280 50 L255 130 L275 240 H400Z" fill="#5f7d6b"/>
    <path d="M40 20 L26 42 L42 38 L56 48Z M355 10 L340 34 L356 30 L368 40Z" fill="#fff"/>
    <path d="M120 140 L200 100 L280 140 V240 H120Z" fill="#9bb7a6" opacity=".7"/>
    <rect y="150" width="400" height="90" fill="url(#w3)"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${20 + i * 70} ${175 + (i % 2) * 18} q15 -6 30 0 t30 0" stroke="#bfe5ff" stroke-width="2" fill="none" opacity=".7"/>`).join('')}
    <path d="M205 150 l22 0 -4 10 h-14z" fill="#b3262f"/><path d="M216 120 v30 M216 122 l14 24 h-14z" stroke="#fff" fill="#fff"/>`,
  neige: () => `<defs>${sky('s4', [[0, '#cfe3f5'], [1, '#f7fbff']])}</defs><rect width="400" height="240" fill="url(#s4)"/>
    <path d="M0 150 L70 70 L120 120 L190 40 L260 125 L320 85 L400 150 V240 H0Z" fill="#dfe9f5"/><path d="M190 40 L160 85 L182 78 L196 92 L214 76 L240 96Z M70 70 L48 100 L70 94 L86 104Z" fill="#fff"/><path d="M0 170 Q100 140 200 165 T400 160 V240 H0Z" fill="#fff"/>
    ${spruce(50, 190, 1, '#2f6b52', true)}${spruce(90, 196, .75, '#2f6b52', true)}${spruce(340, 192, .95, '#2f6b52', true)}${spruce(375, 200, .7, '#2f6b52', true)}${cabin(285, 188, .9, '#fff', '#b3262f')}
    <path d="M0 215 Q100 200 200 214 T400 210 V240 H0Z" fill="#eef5fc"/>${flakes(40)}`,
  coucher: () => `<defs>${sky('s5', [[0, '#5a4bb5'], [.45, '#e0629a'], [.8, '#ffb27a'], [1, '#ffe2a8']])}${sky('w5', [[0, '#e68aa3'], [1, '#6a5acd']])}</defs><rect width="400" height="240" fill="url(#s5)"/>
    <circle cx="200" cy="150" r="46" fill="#fff1c2"/><circle cx="200" cy="150" r="64" fill="#fff1c2" opacity=".25"/>
    <path d="M0 150 L50 110 L95 140 L150 100 L210 150 L270 105 L330 140 L400 115 V170 H0Z" fill="#6a4f9c" opacity=".85"/><path d="M0 165 L70 135 L130 160 L200 140 L280 165 L350 145 L400 160 V180 H0Z" fill="#493a7c"/>
    <rect y="170" width="400" height="70" fill="url(#w5)"/><path d="M150 176 H250 M165 186 H235 M178 198 H222" stroke="#fff1c2" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <path d="M60 60 l5 -3 5 3 M90 40 l4 -2 4 2" stroke="#2d2145" stroke-width="1.4" fill="none"/>`,
  lofoten: () => `<defs>${sky('s6', [[0, '#a9d4f5'], [1, '#e9f4fb']])}${sky('w6', [[0, '#4b9fcf'], [1, '#235f8f']])}</defs><rect width="400" height="240" fill="url(#s6)"/>
    <ellipse cx="80" cy="45" rx="40" ry="9" fill="#fff" opacity=".9"/><ellipse cx="300" cy="60" rx="34" ry="8" fill="#fff" opacity=".8"/>
    <path d="M0 150 L30 90 L50 120 L80 60 L110 130 L150 80 L190 135 L230 70 L270 130 L310 85 L350 125 L400 95 V170 H0Z" fill="#6f8fb0"/><path d="M80 60 L68 84 L80 80 L92 90Z M230 70 L218 94 L230 88 L242 98Z M150 80 L140 100 L150 96 L160 104Z" fill="#fff" opacity=".95"/>
    <path d="M0 150 L30 100 L60 150 L100 110 L140 150 L190 112 L240 150 L300 110 L350 150 L400 125 V175 H0Z" fill="#8fa8c2" opacity=".6"/>
    <rect y="165" width="400" height="75" fill="url(#w6)"/>
    <rect x="30" y="176" width="270" height="5" fill="#6b4a2f"/>${[50, 100, 150, 200, 250].map((x) => `<rect x="${x}" y="181" width="3" height="14" fill="#6b4a2f"/>`).join('')}
    ${[60, 130, 200, 270].map((x, i) => cabin(x, 176, .55 + (i % 2) * .08, '#4a3a33', '#b3262f')).join('')}
    <path d="M300 60 q6 -6 12 0 q6 -6 12 0 M340 80 q5 -5 10 0 q5 -5 10 0" stroke="#fff" stroke-width="1.6" fill="none"/>${[0, 1, 2, 3].map((i) => `<path d="M${20 + i * 100} ${205 + (i % 2) * 14} q14 -5 28 0 t28 0" stroke="#a7d9f5" stroke-width="2" fill="none" opacity=".7"/>`).join('')}`,
  foret: () => `<defs>${sky('s7', [[0, '#e9f6d8'], [1, '#bde0a3']])}</defs><rect width="400" height="240" fill="url(#s7)"/>
    <path d="M110 0 L170 240 H90Z M230 0 L300 240 H210Z" fill="#fff" opacity=".18"/>
    ${[20, 80, 150, 240, 320, 380].map((x, i) => spruce(x, 130 + (i % 3) * 8, 1.25 - (i % 3) * 0.1, '#5f9b6c')).join('')}
    ${[0, 60, 130, 200, 270, 340, 400].map((x, i) => spruce(x, 175 + (i % 2) * 8, 1.4 - (i % 3) * 0.12, '#2f6b52')).join('')}
    <rect y="200" width="400" height="40" fill="#3e7d4f"/>${spruce(30, 215, 1.5, '#1f4f3a')}${spruce(360, 218, 1.6, '#1f4f3a')}
    ${[70, 150, 230, 300].map((x, i) => `<circle cx="${x}" cy="${222 + (i % 2) * 6}" r="3" fill="${['#e57373', '#fff', '#ffd54f', '#f08bb2'][i]}"/>`).join('')}<rect width="400" height="240" fill="#fff" opacity=".07"/>`,
  mer: () => `<defs>${sky('s8', [[0, '#8fc8f0'], [1, '#e4f4ff']])}${sky('w8', [[0, '#3f93c8'], [1, '#1b4f7d']])}</defs><rect width="400" height="240" fill="url(#s8)"/>
    <path d="M0 125 L45 85 L85 115 L130 80 L190 125 L250 90 L310 120 L370 85 L400 105 V140 H0Z" fill="#7f9db8" opacity=".85"/><path d="M45 85 L35 100 L46 97 L56 104Z M130 80 L120 98 L130 94 L140 100Z" fill="#fff"/>
    <rect y="130" width="400" height="110" fill="url(#w8)"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${10 + i * 70} ${150 + (i % 3) * 22} q14 -7 28 0 t28 0" stroke="#bfe5ff" stroke-width="2.2" fill="none" opacity=".7"/>`).join('')}
    <g transform="translate(250 118) rotate(-18)"><path d="M0 40 Q10 0 50 -2 Q92 0 96 34 Q70 22 50 26 Q22 30 0 40Z" fill="#1d1d24"/><path d="M36 34 Q60 22 92 36 Q64 44 36 34Z" fill="#fff"/><ellipse cx="62" cy="9" rx="9" ry="4.5" fill="#fff"/><path d="M42 0 L52 -26 L62 -2Z" fill="#1d1d24"/></g>
    <path d="M205 168 q14 -6 28 0 t28 0 M260 160 q10 -4 20 0" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/><circle cx="244" cy="150" r="3" fill="#fff" opacity=".8"/><circle cx="276" cy="158" r="2.2" fill="#fff" opacity=".8"/>`,
};

export function decorSVG(key) {
  const f = SCENES[key] || SCENES.plaine;
  return `<svg class="bg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${f()}</svg>`;
}
export const DECOR_KEYS = Object.keys(SCENES);

// Scène complète : décor + personnage au premier plan.
export function sceneHTML(eq = {}, look = state?.look, avatarSize = 150) {
  return `<div class="scene">${decorSVG(eq.decor)}<div class="av">${avatarSVG(eq, avatarSize, look)}</div></div>`;
}
