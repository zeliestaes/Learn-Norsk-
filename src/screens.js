// Écrans : accueil/carte, chapitre, révisions, lexique, profil, boutique, réglages.
import { h, toast, frDate, today, dayDiff } from './util.js';
import { state, save, exportJSON, importJSON, resetAll } from './state.js';
import { C, chapterById, unitById, chapterWords, FOCUS_LABEL } from './content.js';
import { unitStatus, todayInfo, paceIndicator, unlockBonus, currentChapter, chapterProgress, isDone, doneCourse, totalCourse, daysSince } from './schedule.js';
import { dueCount, dueWords, level5, learnedCount } from './leitner.js';
import { levelInfo, todayQuests, BADGES, SHOP, owns, buy, equip, skillRate, a2Progress, checkBadges } from './game.js';
import { avatarSVG, DECORS } from './avatar.js';
import { speak, norwegianVoices, hasVoice, hasSynth } from './audio.js';
import { runSession } from './engine.js';
import { buildLesson, buildSynth, buildReview, buildDrill } from './exercises.js';
import { fold } from './text.js';
import { canRecognize } from './speech.js';
import { downloadChapterPdf } from './pdf.js';

const go = (hash) => { location.hash = hash; };
const dots = (n) => h('span', { class: 'dots', 'aria-label': `Maîtrise ${n} sur 5` }, [0, 1, 2, 3, 4].map((i) => h('i', { class: i < n ? 'on' : '' })));

// ======================================================================
// CARTE
// ======================================================================
const MAP = { W: 360, STEP: 104, TOP: 70, BOT: 70 };
function mapPoints(n) {
  const H = MAP.TOP + MAP.BOT + n * MAP.STEP;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const y = H - MAP.BOT - k * MAP.STEP;
    const x = k === 0 ? 180 : 180 + 100 * Math.sin(k * 0.9 + 0.5);
    pts.push({ x, y });
  }
  return { H, pts };
}
const bez = (a, b, t) => {
  const c1 = { x: a.x, y: a.y - MAP.STEP / 2 }, c2 = { x: b.x, y: b.y + MAP.STEP / 2 };
  const u = 1 - t;
  const f = (p0, p1, p2, p3) => u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  return { x: f(a.x, c1.x, c2.x, b.x), y: f(a.y, c1.y, c2.y, b.y) };
};

export function heroPosition(pts) {
  const cur = currentChapter();
  const a = pts[cur.id - 1], b = pts[cur.id];
  const allDone = C.chapters.every((c) => state.chapters[c.id]?.validated);
  if (allDone) return pts[pts.length - 1];
  return bez(a, b, Math.max(0.04, chapterProgress(cur).t));
}

function mapSVG() {
  const n = C.chapters.length;
  const { H, pts } = mapPoints(n);
  const cur = currentChapter();
  const W = MAP.W;
  let path = `M${pts[0].x} ${pts[0].y}`;
  for (let k = 1; k <= n; k++) {
    const a = pts[k - 1], b = pts[k];
    path += ` C${a.x} ${a.y - MAP.STEP / 2} ${b.x} ${b.y + MAP.STEP / 2} ${b.x} ${b.y}`;
  }
  // Côte : on décale le chemin vers la gauche. À gauche la mer, à droite la terre.
  let coast = `M${pts[0].x - 80} ${H}`;
  coast = `M-10 ${H + 10} L${pts[0].x - 80} ${H + 10}`;
  for (let k = 0; k <= n; k++) {
    const b = pts[k];
    coast += ` L${b.x - 85} ${b.y}`;
    if (k < n) { const m = bez(b, pts[k + 1], 0.5); coast += ` L${m.x - 85 + Math.sin(k * 2) * 12} ${m.y}`; }
  }
  coast += ` L${pts[n].x - 85} -10 L${W + 10} -10 L${W + 10} ${H + 10} Z`;
  const deco = [];
  for (let k = 1; k <= n; k++) {
    const p = pts[k];
    const right = p.x + 95 < W - 10;
    if (k % 3 === 0 && right) deco.push(`<text x="${p.x + 95}" y="${p.y + 30}" font-size="26" opacity=".85">${k > 15 ? '🏔️' : '⛰️'}</text>`);
    if (k % 3 === 1) deco.push(`<text x="${Math.min(W - 30, p.x + 62)}" y="${p.y - 22}" font-size="20" opacity=".8">🌲</text>`);
    if (k % 4 === 2) deco.push(`<text x="${Math.max(4, p.x - 125)}" y="${p.y + 8}" font-size="22" opacity=".8">⛵</text>`);
  }
  const whale = pts[23] ? `<text x="${Math.max(6, pts[23].x - 130)}" y="${pts[23].y + 40}" font-size="30">🐋</text>` : '';
  const nodes = C.chapters.map((ch, i) => {
    const p = pts[i + 1];
    const done = !!state.chapters[ch.id]?.validated;
    const isCur = ch.id === cur.id;
    const known = ch.id <= cur.id + 1;
    const fill = done ? '#c6ebd9' : isCur ? '#ffdcc4' : known ? '#ffffff' : '#e8e4dd';
    const stroke = done ? '#3f8f6b' : isCur ? '#c9783f' : '#c9c2b7';
    const left = p.x > 200;
    const lx = left ? p.x - 30 : p.x + 30, anchor = left ? 'end' : 'start';
    const label = known ? ch.etape : '???';
    const sub = known ? ch.titre : '';
    return `<g class="node" data-ch="${ch.id}" role="button" aria-label="Étape ${ch.id}">
      ${isCur ? `<circle class="pulse" cx="${p.x}" cy="${p.y}" r="26" fill="#ffdcc4"/>` : ''}
      <circle class="base" cx="${p.x}" cy="${p.y}" r="21" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
      <text x="${p.x}" y="${p.y + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="#2f3a4a">${done ? '✓' : ch.id}</text>
      <text class="lbl" x="${lx}" y="${p.y - 1}" text-anchor="${anchor}">${label}</text>
      ${sub ? `<text class="lbl sub" x="${lx}" y="${p.y + 14}" text-anchor="${anchor}">${sub.length > 26 ? sub.slice(0, 25) + '…' : sub}</text>` : ''}
    </g>`;
  }).join('');
  const hp = heroPosition(pts);
  const foggyFrom = pts[Math.min(n, cur.id + 1)].y - 40;
  return `<svg class="map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carte de la Norvège, d'Oslo aux Lofoten">
    <defs>
      <linearGradient id="sea" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d7ecf8"/><stop offset="1" stop-color="#b9dcf0"/></linearGradient>
      <linearGradient id="land" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e6f4dc"/><stop offset="1" stop-color="#eef3f6"/></linearGradient>
      <linearGradient id="fog" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fbf8f4" stop-opacity="0"/><stop offset="0.12" stop-color="#fbf8f4" stop-opacity=".6"/><stop offset="1" stop-color="#fbf8f4" stop-opacity=".93"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sea)"/>
    <path d="${coast}" fill="url(#land)" stroke="#cfe3c4" stroke-width="3"/>
    ${deco.join('')}${whale}
    <path d="${path}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".9"/>
    <path d="${path}" fill="none" stroke="#e5cfae" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 11"/>
    ${nodes}
    <g class="hero" id="hero" transform="translate(${hp.x - 24},${hp.y - 62})">${avatarSVG(state.equipped, 48)}</g>
    <rect x="0" y="0" width="${W}" height="${foggyFrom}" fill="url(#fog)" pointer-events="none"/>
    <text x="180" y="40" text-anchor="middle" font-size="13" font-weight="800" fill="#6b7686">Lofoten ✨</text>
  </svg>`;
}

function exportReminder() {
  const last = state.lastExport;
  const age = last ? dayDiff(last, today()) : daysSince();
  if (age < 7 || (!last && daysSince() < 3)) return null;
  return h('div', { class: 'card tint-peach' },
    h('b', null, 'Pense à sauvegarder 💾'),
    h('p', { class: 'muted' }, 'Exporte ta progression de temps en temps (Réglages) pour ne rien perdre.'),
    h('button', { class: 'btn small secondary', onclick: () => go('#/reglages') }, 'Ouvrir les réglages'));
}

export function Home(app) {
  const li = levelInfo();
  const pace = paceIndicator();
  const info = todayInfo();
  const due = dueCount();
  const quests = todayQuests();
  const questsDone = quests.filter((q) => q.done).length;

  let todayCard;
  if (info.kind === 'play') {
    const u = info.unit, ch = chapterById(u.ch);
    todayCard = h('div', { class: 'card tint-mint today' },
      h('small', null, 'Leçon du jour'),
      h('h2', null, `${ch.etape} · ${u.kind === 'synth' ? 'Synthèse' : u.kind === 'drill' ? 'Entraînement' : 'Leçon ' + u.n}`),
      h('p', { class: 'muted' }, `Chapitre ${ch.id} : ${ch.titre}`),
      h('button', { class: 'btn', onclick: () => go('#/jouer/' + u.id) }, 'Commencer'));
  } else if (info.kind === 'rest') {
    todayCard = h('div', { class: 'card tint-mint today' },
      h('small', null, 'Leçon du jour'),
      h('h2', null, 'Bravo, c\'est fait ! 🎉'),
      h('p', { class: 'muted' }, `Prochaine leçon le ${frDate(info.date)}.`),
      h('button', { class: 'btn secondary', onclick: () => { unlockBonus(); Home(app); toast('Une leçon de plus est débloquée !'); } }, 'Une leçon de plus aujourd\'hui'));
  } else if (info.kind === 'soon') {
    todayCard = h('div', { class: 'card tint-blue today' }, h('h2', null, 'Bientôt ✨'), h('p', { class: 'muted' }, 'Le contenu de la prochaine leçon est en préparation. Fais une révision en attendant !'));
  } else if (info.kind === 'finished') {
    todayCard = h('div', { class: 'card tint-yellow today' }, h('h2', null, 'Voyage terminé 🏆'), h('p', { class: 'muted' }, 'Tu as atteint les Lofoten. Continue à réviser !'));
  } else todayCard = h('div', { class: 'card today' }, h('p', null, 'Termine d\'abord la leçon précédente.'));

  const screen = h('div', { class: 'screen' },
    h('div', { class: 'topbar' },
      h('span', { class: 'pill' }, '🔥 ' + state.streak),
      h('span', { class: 'pill' }, '🪙 ' + state.coins + ' kr'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'tag ' + pace.cls }, pace.text)),
    h('div', { class: 'card' },
      h('div', { class: 'level-line' }, h('span', { style: { fontSize: '1.6rem' } }, li.emoji),
        h('div', { style: { flex: 1 } }, h('b', null, li.name), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(li.pct * 100) + '%' } }))),
        h('small', null, li.next ? `${li.toNext} XP` : 'Max'))),
    todayCard,
    due > 0 ? h('div', { class: 'card tint-lilac' },
      h('div', { class: 'statusline' }, h('div', null, h('b', null, `${due} mot${due > 1 ? 's' : ''} à réviser`), h('div', { class: 'muted', style: { fontSize: '.9rem' } }, 'Quelques minutes suffisent')),
        h('button', { class: 'btn small', onclick: () => go('#/revision') }, 'Réviser'))) : null,
    exportReminder(),
    h('details', { class: 'card' },
      h('summary', null, `Défis du jour (${questsDone}/3)`),
      ...quests.map((q) => h('div', { class: 'quest' }, h('span', null, q.done ? '✅' : '🎯'),
        h('div', { class: 'q' }, q.t, h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, (100 * q.value) / q.n) + '%' } }))),
        h('small', null, `+${q.coins} kr`)))),
    h('h2', { style: { margin: '18px 0 8px' } }, 'Mon voyage'),
    h('div', { class: 'mapwrap', html: mapSVG() }));
  app.replaceChildren(screen);
  screen.querySelector('.mapwrap').addEventListener('click', (e) => {
    const g = e.target.closest('.node');
    if (!g) return;
    const id = +g.dataset.ch, cur = currentChapter();
    if (id > cur.id + 1) return toast('Cette étape est encore dans le brouillard… 🌫️');
    go('#/chapitre/' + id);
  });
  requestAnimationFrame(() => {
    const wrap = screen.querySelector('.mapwrap'), hero = document.getElementById('hero');
    if (wrap && hero) {
      const y = hero.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop - wrap.clientHeight * 0.55;
      wrap.scrollTop = Math.max(0, y);
    }
  });
}

// ======================================================================
// CHAPITRE
// ======================================================================
export function Chapter(app, id) {
  const ch = chapterById(+id);
  if (!ch) return go('#/');
  const p = chapterProgress(ch);
  const items = ch.units.map((u) => {
    const st = unitStatus(u);
    const done = st.done;
    const next = !done && st.open && ch.units.find((x) => !isDone(x) && unitStatus(x).open) === u;
    let sub = '';
    if (done) sub = u.kind === 'synth' ? `Validée · meilleur score ${state.chapters[ch.id].best} %` : `Terminée · ${state.units[u.id].best} %`;
    else if (st.reason === 'soon') sub = 'Contenu en préparation';
    else if (st.reason === 'date') sub = `Disponible le ${frDate(st.date)}`;
    else if (st.reason === 'order') sub = 'Termine d\'abord la leçon précédente';
    else if (st.reason === 'lessons') sub = 'Termine d\'abord les leçons du chapitre';
    else sub = u.kind === 'synth' ? 'Il faut 70 % pour valider' : u.kind === 'drill' ? 'Révision active des mots du chapitre' : '8 nouveaux mots';
    const title = u.kind === 'synth' ? 'Synthèse' : u.kind === 'drill' ? u.titre : `Leçon ${u.n}${u.lesson ? ' · ' + u.lesson.titre : ''}`;
    return h('button', {
      class: 'item' + (st.open ? '' : ' locked') + (next ? ' now' : ''),
      onclick: () => {
        if (st.open) return go('#/jouer/' + u.id);
        toast(st.reason === 'date' ? `Cette leçon se débloque le ${frDate(st.date)}.` : sub);
      },
    }, h('span', { class: 'badge' }, done ? '✓' : st.open ? (u.kind === 'synth' ? '🏁' : u.kind === 'drill' ? '🏋️' : u.n) : '🔒'),
      h('span', { class: 't' }, h('b', null, title), h('small', null, sub)));
  });
  const words = [...C.words.values()].filter((w) => w.ch === ch.id);
  app.replaceChildren(h('div', { class: 'screen' },
    h('button', { class: 'back', onclick: () => go('#/') }, '← Carte'),
    h('div', { class: 'card tint-blue' },
      h('small', null, `Étape ${ch.id} · ${ch.etape}`),
      h('h1', null, ch.titre),
      h('div', { class: 'bar', style: { marginTop: '10px' } }, h('i', { style: { width: Math.round(p.t * 100) + '%' } })),
      h('small', null, `${p.done}/${p.total} · ${words.length} mots`)),
    h('div', { class: 'list' }, items),
    practiceCard(ch),
    ch.ready ? h('button', {
      class: 'btn secondary', style: { marginTop: '16px' },
      onclick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        toast('Création du PDF…');
        try { await downloadChapterPdf(ch); }
        catch (err) { console.error(err); toast('Impossible de créer le PDF : ' + err.message); }
        b.disabled = false;
      },
    }, '📄 Télécharger le PDF du chapitre') : null));
}

const FOCI = [['vocab', '🔤 Vocabulaire'], ['write', '✍️ Écrire'], ['listen', '👂 Écouter'], ['sentences', '💬 Phrases']];
function practiceCard(ch) {
  const seen = chapterWords(ch.id).filter((w) => state.words[w.id]).length;
  if (!ch.ready || seen < 4) return null;
  return h('div', { class: 'card', style: { marginTop: '16px' } },
    h('h3', null, '🏋️ Entraînement libre'),
    h('p', { class: 'muted' }, `Autant de fois que tu veux, sur les ${seen} mots déjà vus de ce chapitre.`),
    h('div', { class: 'grid2' }, FOCI.map(([f, label]) => h('button', { class: 'btn ghost small', style: { width: '100%' }, onclick: () => go(`#/entrainement/${ch.id}/${f}`) }, label))));
}

export function Practice(app, chId, focus) {
  if (chId === 'all') {
    const all = [...C.words.values()].filter((w) => state.words[w.id]);
    if (all.length < 5) { toast('Fais d\'abord quelques leçons.'); return go('#/revision'); }
    // priorité aux mots les moins bien connus
    const words = all.sort((a, b) => level5(a.id) - level5(b.id)).slice(0, 40);
    return runSession(app, { kind: 'drill', exercises: buildDrill(words, focus), onClose: () => go('#/revision'), onRetry: () => Practice(app, 'all', focus) });
  }
  const ch = chapterById(+chId);
  const words = ch ? chapterWords(ch.id).filter((w) => state.words[w.id]) : [];
  if (!ch || words.length < 4) { toast('Fais d\'abord quelques leçons de ce chapitre.'); return go('#/chapitre/' + chId); }
  runSession(app, {
    kind: 'drill', chapter: ch, exercises: buildDrill(words, focus),
    onClose: () => go('#/chapitre/' + ch.id),
    onRetry: () => Practice(app, chId, focus),
  });
}

// ======================================================================
// SÉANCES
// ======================================================================
export function Play(app, id) {
  const unit = unitById(id);
  if (!unit) return go('#/');
  const st = unitStatus(unit);
  if (!st.open) { toast('Cette leçon n\'est pas disponible.'); return go('#/chapitre/' + unit.ch); }
  const ch = chapterById(unit.ch);
  const exercises = unit.kind === 'synth' ? buildSynth(ch) : unit.kind === 'drill' ? buildDrill(chapterWords(ch.id), unit.focus) : buildLesson(unit);
  runSession(app, {
    kind: unit.kind, unit, chapter: ch, exercises,
    onClose: () => go('#/'),
    onRetry: () => Play(app, id),
  });
}

export function Review(app, mode) {
  const n = dueCount();
  if (mode === 'go' || mode === 'free') {
    let words = dueWords(15);
    if (mode === 'free' || !words.length) {
      const learned = [...C.words.values()].filter((w) => state.words[w.id]).sort((a, b) => level5(a.id) - level5(b.id)).slice(0, 12);
      words = learned;
    }
    if (!words.length) { toast('Aucun mot à réviser pour l\'instant.'); return go('#/revision'); }
    return runSession(app, { kind: 'review', title: 'Révisions', exercises: buildReview(words), onClose: () => go('#/revision') });
  }
  const upcoming = Object.values(state.words).filter((w) => w.d > today()).map((w) => w.d).sort()[0];
  app.replaceChildren(h('div', { class: 'screen' },
    h('h1', { style: { marginBottom: '12px' } }, 'Révisions du jour'),
    h('div', { class: 'card tint-lilac' },
      h('div', { class: 'bigword' }, n > 15 ? '15' : String(n)),
      h('p', null, n === 0 ? 'Rien à réviser aujourd\'hui, bravo !' : n > 15 ? `${n} mots attendent ; on en révise 15 à la fois.` : `mot${n > 1 ? 's' : ''} à réviser`),
      upcoming && n === 0 ? h('p', { class: 'muted' }, `Prochaine révision : ${frDate(upcoming)}.`) : null,
      n ? h('button', { class: 'btn', onclick: () => go('#/revision/go') }, 'Commencer') : null),
    h('div', { class: 'card' },
      h('h3', null, 'Entraînement ciblé'),
      h('p', { class: 'muted' }, 'Plus d\'exercices sur tous les mots déjà appris, pour mieux les retenir.'),
      h('div', { class: 'grid2' }, [['write', '✍️ Écrire'], ['listen', '👂 Écouter'], ['sentences', '💬 Phrases'], ['vocab', '🔤 Vocabulaire']].map(([f, label]) =>
        h('button', { class: 'btn ghost small', style: { width: '100%' }, onclick: () => go('#/entrainement/all/' + f) }, label)))),
    h('div', { class: 'card' },
      h('h3', null, 'Pratique libre'),
      h('p', { class: 'muted' }, 'Envie de t\'entraîner encore ? On reprend les mots les moins bien connus.'),
      h('button', { class: 'btn ghost', onclick: () => go('#/revision/free') }, 'S\'entraîner')),
    h('div', { class: 'card' },
      h('h3', null, 'Comment ça marche ?'),
      h('p', { class: 'muted' }, 'Chaque mot a une boîte de 0 à 6. Réussi : il monte et revient plus tard (1, 2, 4, 7, 15, 30 jours). Raté : il revient demain.'))));
}

// ======================================================================
// LEXIQUE
// ======================================================================
export function Lexicon(app) {
  const list = h('div', { class: 'list' });
  const q = h('input', { class: 'search', type: 'search', placeholder: 'Chercher (norvégien ou français)', autocapitalize: 'off' });
  const sel = h('select', { class: 'search' }, h('option', { value: '' }, 'Tous les chapitres'),
    C.chapters.filter((c) => c.ready).map((c) => h('option', { value: c.id }, `${c.id}. ${c.titre}`)));
  const count = h('small', { class: 'muted' });
  let limit = 60;
  const draw = () => {
    const t = fold(q.value);
    const rows = [...C.words.values()].filter((w) => (!sel.value || w.ch === +sel.value) && (!t || fold(w.no).includes(t) || fold(w.fr).includes(t)));
    count.textContent = `${rows.length} mot${rows.length > 1 ? 's' : ''}`;
    list.replaceChildren(...rows.slice(0, limit).map((w) => h('div', { class: 'word' },
      h('div', { class: 'top' },
        h('div', { class: 'w' }, h('div', { class: 'no' }, w.no), h('div', { class: 'pron' }, w.pron), h('div', null, w.fr)),
        dots(level5(w.id)),
        h('button', { class: 'icon-btn', 'aria-label': 'Écouter', onclick: () => speak(w.no) }, '🔊')),
      h('div', { class: 'ex2' }, h('i', null, w.ex), ' — ', w.ex_fr))),
      rows.length > limit ? h('button', { class: 'btn ghost', onclick: () => { limit += 60; draw(); } }, 'Afficher plus') : null);
  };
  q.oninput = () => { limit = 60; draw(); }; sel.onchange = () => { limit = 60; draw(); };
  app.replaceChildren(h('div', { class: 'screen' }, h('h1', { style: { marginBottom: '12px' } }, 'Lexique'), q, sel, count, h('div', { style: { height: '8px' } }), list));
  draw();
}

// ======================================================================
// PROFIL / MON VOYAGE
// ======================================================================
export function Profile(app) {
  const li = levelInfo();
  const hours = state.stats.seconds / 3600;
  const timeTxt = hours < 1 ? `${Math.round(state.stats.seconds / 60)} min` : `${hours.toFixed(1).replace('.', ',')} h`;
  const a2 = a2Progress();
  const skill = (label, k) => {
    const r = skillRate(k);
    return h('div', { class: 'skill' }, h('span', null, label), h('div', { class: 'bar blue' }, h('i', { style: { width: (r || 0) + '%' } })), h('span', null, r == null ? '–' : r + ' %'));
  };
  const nBadges = Object.keys(state.badges).length;
  app.replaceChildren(h('div', { class: 'screen' },
    h('div', { class: 'card', style: { background: DECORS[state.equipped.decor] || DECORS.plaine, textAlign: 'center', border: 0 } },
      h('div', { html: avatarSVG(state.equipped, 110) }),
      h('h1', { style: { color: state.equipped.decor === 'aurore' ? '#fff' : 'inherit' } }, `${li.emoji} ${li.name}`),
      h('div', { style: { margin: '8px 20px 0' } }, h('div', { class: 'bar' }, h('i', { style: { width: Math.round(li.pct * 100) + '%' } }))),
      h('small', { style: { color: state.equipped.decor === 'aurore' ? '#fff' : undefined } }, li.next ? `${state.xp} XP · encore ${li.toNext} XP pour ${li.next.name}` : `${state.xp} XP`)),
    h('div', { class: 'card' },
      h('div', { class: 'statusline' }, h('h3', null, 'Vers le niveau A2'), h('b', null, a2 + ' %')),
      h('div', { class: 'bar', style: { margin: '8px 0' } }, h('i', { style: { width: a2 + '%' } })),
      h('small', null, `Objectif : 30 juin 2027 · ${doneCourse()}/${totalCourse()} leçons du programme`)),
    h('div', { class: 'grid2', style: { marginBottom: '14px' } },
      h('div', { class: 'stat' }, h('b', null, learnedCount()), h('small', null, 'mots appris')),
      h('div', { class: 'stat' }, h('b', null, timeTxt), h('small', null, 'd\'étude')),
      h('div', { class: 'stat' }, h('b', null, '🔥 ' + state.streak), h('small', null, `série · record ${state.bestStreak} · ❄️ ${state.freezes}`)),
      h('div', { class: 'stat' }, h('b', null, state.stats.lessons), h('small', null, 'leçons terminées'))),
    h('div', { class: 'card' }, h('h3', null, 'Taux de réussite'),
      skill('Lire', 'read'), skill('Écrire', 'write'), skill('Écouter', 'listen'), skill('Parler', 'speak')),
    h('div', { class: 'card' }, h('div', { class: 'statusline' }, h('h3', null, `Badges (${nBadges}/${BADGES.length})`)),
      h('div', { class: 'badges', style: { marginTop: '10px' } }, BADGES.map((b) => h('div', { class: 'bdg' + (state.badges[b.id] ? '' : ' off') }, h('span', { class: 'e' }, b.e), b.name)))),
    h('button', { class: 'btn secondary', onclick: () => go('#/boutique') }, '🛍️ Boutique du personnage')));
}

// ======================================================================
// BOUTIQUE
// ======================================================================
export function Shop(app) {
  const draw = () => {
    const slots = { hat: 'Couvre-chefs', top: 'Tenues', acc: 'Accessoires', decor: 'Décors' };
    const isOn = (it) => (it.slot === 'decor' ? state.equipped.decor === it.id.replace('decor_', '') : state.equipped[it.slot] === it.id);
    app.replaceChildren(h('div', { class: 'screen' },
      h('button', { class: 'back', onclick: () => go('#/profil') }, '← Mon voyage'),
      h('div', { class: 'card', style: { background: DECORS[state.equipped.decor] || DECORS.plaine, textAlign: 'center', border: 0 } },
        h('div', { html: avatarSVG(state.equipped, 120) }),
        h('span', { class: 'pill' }, '🪙 ' + state.coins + ' kr')),
      ...Object.entries(slots).map(([slot, name]) => h('div', { style: { marginBottom: '16px' } },
        h('h3', { style: { margin: '6px 0 8px' } }, name),
        h('div', { class: 'list' }, SHOP.filter((s) => s.slot === slot).map((it) => {
          const have = owns(it.id);
          return h('div', { class: 'shop-item' },
            h('span', { class: 'e' }, it.e),
            h('div', { class: 't' }, h('b', null, it.name), h('small', null, have ? (isOn(it) ? 'Porté' : 'Possédé') : `${it.price} kr`)),
            have
              ? h('button', { class: 'btn small ' + (isOn(it) ? 'ghost' : 'secondary'), onclick: () => { equip(it.id); draw(); } }, isOn(it) ? (it.slot === 'decor' ? 'Actif' : 'Retirer') : 'Porter')
              : h('button', { class: 'btn small', disabled: state.coins < it.price, onclick: () => { if (buy(it.id)) { toast(`${it.name} acheté !`); checkBadges(); draw(); } } }, 'Acheter'));
        }))))));
  };
  draw();
}

// ======================================================================
// RÉGLAGES
// ======================================================================
export function Settings(app) {
  const s = state.settings;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  const voices = norwegianVoices();
  const sw = (label, key, after) => h('label', { class: 'switch' }, h('span', null, label),
    h('input', { type: 'checkbox', checked: s[key] ? true : null, onchange: (e) => { s[key] = e.target.checked; save(); if (after) after(); document.body.classList.toggle('no-anim', !s.anim); } }));
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { await importJSON(await f.text()); toast('Progression importée ✅'); setTimeout(() => location.reload(), 600); }
    catch { toast('Fichier invalide ❌'); }
  } });
  const voiceSel = h('select', { class: 'search', onchange: (e) => { s.voice = e.target.value; save(); } },
    h('option', { value: '' }, voices.length ? 'Voix automatique' : 'Aucune voix norvégienne trouvée'),
    voices.map((v) => h('option', { value: v.name, selected: s.voice === v.name ? true : null }, `${v.name} (${v.lang})`)));

  app.replaceChildren(h('div', { class: 'screen' },
    h('h1', { style: { marginBottom: '12px' } }, 'Réglages'),
    h('div', { class: 'card' },
      sw('Sons de réussite', 'sound'),
      sw('Animations et confettis', 'anim')),
    h('div', { class: 'card' },
      h('h3', null, '🔊 Voix norvégienne'),
      voiceSel,
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', { class: 'btn small secondary', onclick: () => speak('Hei! Jeg heter Nora. Hyggelig å møte deg.') }, 'Tester la voix'),
        h('button', { class: 'btn small ghost', onclick: () => speak('Hei! Jeg heter Nora. Hyggelig å møte deg.', { slow: true }) }, '🐢 Lent')),
      !hasSynth() ? h('p', { class: 'muted' }, 'Ton navigateur ne propose pas de synthèse vocale.') : null,
      !voices.length ? h('div', { class: 'feedback', style: { marginTop: '10px', background: 'var(--yellow)' } }, h('b', null, 'Installer la voix « Nora » sur iPhone'),
        h('ol', { style: { paddingLeft: '20px', margin: '6px 0 0' } },
          h('li', null, 'Ouvre Réglages › Accessibilité › Contenu énoncé › Voix.'),
          h('li', null, 'Choisis « Norvégien (Norvège) », puis « Nora » et touche ☁️ pour la télécharger.'),
          h('li', null, 'Reviens ici et recharge l\'application.')),
        h('p', { style: { margin: '6px 0 0' } }, 'Sans voix, les exercices d\'écoute sont remplacés par d\'autres exercices.'),
        sw('Forcer l\'audio malgré tout', 'forceAudio')) : null,
      h('p', { class: 'muted', style: { marginTop: '8px' } }, canRecognize() ? '🎤 Reconnaissance vocale disponible (nécessite internet).' : '🎤 Pas de reconnaissance vocale : mode « écoute, répète, auto-évalue-toi ».')),
    h('div', { class: 'card' },
      h('h3', null, '💾 Sauvegarde'),
      h('p', { class: 'muted' }, state.lastExport ? `Dernier export : ${frDate(state.lastExport)}` : 'Aucun export pour l\'instant.'),
      h('div', { class: 'stack' },
        h('button', { class: 'btn', onclick: () => {
          const blob = new Blob([exportJSON()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `norsk-reisen-${today()}.json` });
          document.body.append(a); a.click(); a.remove(); toast('Fichier exporté');
        } }, 'Exporter ma progression'),
        h('button', { class: 'btn secondary', onclick: () => fileIn.click() }, 'Importer une sauvegarde'), fileIn)),
    h('div', { class: 'card' },
      h('h3', null, '📅 Rythme'),
      h('p', { class: 'muted' }, `Premier lancement : ${frDate(state.startDate)}. Une leçon se débloque chaque jour.`),
      h('label', { class: 'switch' }, h('span', null, 'Date de départ'),
        h('input', { type: 'date', class: 'search', style: { width: 'auto', margin: 0 }, value: state.startDate, onchange: (e) => { if (e.target.value) { state.startDate = e.target.value; save(); toast('Date mise à jour'); } } }))),
    !isStandalone ? h('div', { class: 'card tint-blue' }, h('h3', null, '📲 Installer sur l\'iPhone'),
      h('p', null, 'Dans Safari : touche Partager ⬆️ puis « Sur l\'écran d\'accueil ». L\'appli fonctionnera aussi hors ligne.')) : null,
    h('details', { class: 'card' }, h('summary', null, 'Guide de prononciation'),
      h('ul', { style: { paddingLeft: '20px' } },
        h('li', null, 'Les MAJUSCULES indiquent la syllabe accentuée.'),
        h('li', null, 'æ ≈ « è » ouvert · ø ≈ « eu » · å ≈ « o » fermé.'),
        h('li', null, 'sj, skj, sk(i/y/ø) et parfois kj ≈ « ch » · j ≈ « y » · hj, gj ≈ « y ».'),
        h('li', null, 'u ≈ un « u/ou » avancé, entre les deux · y ≈ « u » français.'),
        h('li', null, 'ei ≈ « aï » · au ≈ « æu » · le r se roule ou se frappe.'),
        h('li', null, 'Le d final et le g final après n sont souvent muets (« og » = « o »).'))),
    h('div', { class: 'card' }, h('h3', null, '⚠️ Zone sensible'),
      h('button', { class: 'btn warn', onclick: async () => { if (confirm('Effacer toute ta progression ? Cette action est définitive.')) { await resetAll(); location.hash = '#/'; location.reload(); } } }, 'Effacer ma progression'))));
}
