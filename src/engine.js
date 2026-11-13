// Déroulement d'une séance (leçon, synthèse, révision) + écran de fin.
import { h, shuffle, toast, today } from './util.js';
import { state, save } from './state.js';
import { renderExercise } from './exercises.js';
import { recordWord, introduce } from './leitner.js';
import { addXp, addCoins, bump, touchStreak, checkBadges, openChest, levelInfo, SHOP } from './game.js';
import { sfx, stop as stopAudio } from './audio.js';
import { avatarSVG } from './avatar.js';
import { chapterById } from './content.js';
import { chapterProgress } from './schedule.js';

const PRAISE = ['Bravo !', 'Excellent !', 'Parfait !', 'Super !', 'Très bien !', 'Joli !'];

export function confetti() {
  if (!state.settings.anim) return;
  const colors = ['#8ec5e8', '#7cc6a4', '#ffb998', '#d9ccf5', '#f7b6cf', '#ffe38a'];
  for (let i = 0; i < 46; i++) {
    const c = h('i', { class: 'confetti' });
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    document.body.append(c);
    setTimeout(() => c.remove(), 4000);
  }
}

// opts : { kind, title, exercises, unit?, chapter?, onClose() }
export function runSession(app, opts) {
  const queue = opts.exercises.slice();
  const scoredTotal = queue.filter((e) => !e.info).length;
  let answered = 0, correctFirst = 0, mistakes = 0, xpGain = 0, coinGain = 0, dictPerfect = false;
  const recorded = new Set();
  const t0 = Date.now();
  let skipped = 0;

  const bar = h('i'), barWrap = h('div', { class: 'bar' }, bar);
  const stage = h('div', { class: 'stage' });
  const footer = h('div', { class: 'footer' });
  const quit = h('button', { class: 'x', 'aria-label': 'Quitter', onclick: () => {
    if (confirm('Quitter la séance ? Ta progression de cette séance sera perdue.')) { stopAudio(); addTime(); opts.onClose(); }
  } }, '✕');
  const root = h('div', { class: 'session' }, h('div', { class: 'session-top' }, quit, barWrap), stage, footer);
  app.replaceChildren(root);
  window.scrollTo(0, 0);

  function addTime() {
    state.stats.seconds += Math.min(Math.round((Date.now() - t0) / 1000), 3600);
    save();
  }
  const setBar = () => {
    const remaining = queue.length;
    const doneN = total() - remaining;
    bar.style.width = Math.min(100, Math.round((100 * doneN) / total())) + '%';
  };
  let added = 0;
  const total = () => opts.exercises.length + added;

  function next() {
    stopAudio();
    footer.replaceChildren();
    stage.replaceChildren();
    setBar();
    if (!queue.length) return finish();
    show(queue.shift());
  }

  function show(ex) {
    let checkFn = null, resolved = false;
    const btn = h('button', { class: 'btn', disabled: true }, ex.info ? 'Continuer' : 'Vérifier');
    const feedback = h('div');
    footer.append(feedback, btn);
    const api = {
      enable: (v) => { btn.disabled = !v; },
      setCheck: (fn) => { checkFn = fn; },
      submit: () => { if (!btn.disabled) btn.click(); },
      auto: () => { btn.classList.add('hidden'); },
      finish: (res) => resolve(res),
    };
    function resolve(res) {
      if (resolved) return; resolved = true;
      btn.classList.remove('hidden');
      const first = !ex.retry;
      const ok = !!res.ok;
      if (res.skipped) { skipped++; answered++; }
      else {
        answered++;
        if (first) {
          const sk = state.stats.skills[ex.skill];
          if (sk) { sk.n++; if (ok) sk.ok++; }
          state.stats.exercises++;
          if (ok) correctFirst++;
        }
        bump('exercises');
        if (ex.skill) bump(ex.skill);
        if (ok) { const g = first ? 10 : 4; xpGain += g; addXp(g); if (first) { coinGain++; addCoins(1); } }
        else mistakes++;
        for (const id of ex.ids || []) {
          if (recorded.has(id)) continue;
          if (ex.type === 'pairs' && !ok) continue;
          recorded.add(id);
          recordWord(id, ok);
        }
        if (ex.type === 'dictation' && ex.mode === 'sentence' && first && res.exact) { dictPerfect = true; state.stats.perfectDictation++; }
      }
      (ok || res.skipped ? sfx.good : sfx.bad)();
      if (!ok && !res.skipped) { queue.push({ ...ex, retry: true, tiles: ex.tiles && shuffle(ex.tiles) }); added++; }
      feedback.replaceChildren(h('div', { class: 'feedback ' + (ok ? 'ok' : 'ko') },
        ok
          ? [h('b', null, res.skipped ? 'On passe à la suite.' : PRAISE[Math.floor(Math.random() * PRAISE.length)]),
            res.fix ? h('span', null, res.note, h('span', { class: 'fix' }, res.answer)) : (res.note ? h('span', null, res.note) : null)]
          : [h('b', null, res.note && res.fix ? res.note.replace(/ : $/, '') : 'Pas tout à fait…'),
            h('span', null, 'Bonne réponse : ', h('span', { class: 'fix' }, res.answer)),
            h('div', { class: 'muted', style: { fontSize: '.88rem' } }, 'Cet exercice reviendra à la fin.')]));
      btn.textContent = 'Continuer';
      btn.disabled = false;
      btn.onclick = next;
      setBar();
      setTimeout(() => btn.focus?.(), 0);
    }
    renderExercise(ex, stage, api);
    if (ex.info) {
      btn.disabled = false;
      if (ex.type === 'discover') introduce(ex.word.id);
      btn.onclick = next;
    } else {
      btn.onclick = () => { if (checkFn) { btn.disabled = true; resolve(checkFn()); } };
    }
  }

  function finish() {
    addTime();
    const pct = scoredTotal ? Math.round((100 * correctFirst) / Math.max(1, scoredTotal - skipped)) : 100;
    const perfect = mistakes === 0;
    const isSynth = opts.kind === 'synth';
    const passed = !isSynth || pct >= 70;
    let bonusXp = 0, bonusCoins = 0, chest = null;
    const firstTime = opts.unit && !state.units[opts.unit.id]?.done;

    const reviewLike = opts.kind === 'review' || (opts.kind === 'drill' && !opts.unit);
    if (!reviewLike) {
      if (passed) {
        bonusCoins += 10;
        if (perfect) { bonusXp += 30; bonusCoins += 15; state.stats.perfect++; bump('perfect'); }
        state.stats.lessons++;
        const u = state.units[opts.unit.id] || { n: 0, best: 0 };
        state.units[opts.unit.id] = { done: true, n: u.n + 1, best: Math.max(u.best, pct), date: today() };
        if (isSynth) {
          const ch = state.chapters[opts.chapter.id] || {};
          if (!ch.validated) chest = openChest();
          state.chapters[opts.chapter.id] = { validated: true, best: Math.max(ch.best || 0, pct), date: ch.date || today() };
        }
      }
    } else {
      state.stats.reviews = (state.stats.reviews || 0) + 1;
      state.stats.reviewWords += opts.exercises.length;
      bump('reviewWords', opts.exercises.length);
      if (perfect) bonusXp += 15;
    }
    if (bonusXp) addXp(bonusXp);
    if (bonusCoins) addCoins(bonusCoins);
    xpGain += bonusXp; coinGain += bonusCoins;
    const newStreakDay = touchStreak();
    const lvlBefore = levelInfo(state.xp - xpGain).index, lvlNow = levelInfo().index;
    const badges = checkBadges();
    save();

    if (passed) { sfx.win(); confetti(); } else sfx.bad();

    // Avancée du personnage
    let travel = null;
    if (opts.chapter) {
      const ch = opts.chapter, prev = chapterById(ch.id - 1);
      const p = chapterProgress(ch);
      travel = h('div', null,
        h('div', { class: 'travel' },
          h('div', { class: 'track' }, h('i', { id: 'tr-fill' })),
          h('div', { class: 'hero', id: 'tr-hero', html: avatarSVG(state.equipped, 40) })),
        h('div', { class: 'ends' },
          h('span', null, prev ? prev.etape : 'Départ'), h('span', null, ch.etape)));
      setTimeout(() => {
        const f = document.getElementById('tr-fill'), hero = document.getElementById('tr-hero');
        if (!f) return;
        const w = Math.round(p.t * 100);
        f.style.width = w + '%';
        hero.style.left = `calc(12px + (100% - 24px) * ${p.t})`;
      }, 120);
    }

    const title = !passed ? 'Presque !' : perfect ? 'Parfait ! 🎉' : opts.kind === 'review' ? 'Révision terminée' : opts.kind === 'drill' ? 'Entraînement terminé !' : isSynth ? 'Chapitre validé ! 🏔️' : 'Leçon terminée !';
    const msg = opts.kind === 'drill' ? 'Plus tu répètes, mieux tu retiens. Bravo !' : !passed
      ? `Il faut 70 % pour valider la synthèse. Tu as fait ${pct} %. Retente-la, tu y es presque !`
      : isSynth ? `Bravo, tu continues vers le nord !` : perfect ? 'Aucune erreur, impressionnant.' : 'Chaque leçon te rapproche du A2.';

    const screen = h('div', { class: 'session finish' },
      h('div', { class: 'stage', style: { justifyContent: 'center' } },
        h('div', { class: 'big' }, passed ? (perfect ? '🏆' : '⭐') : '💪'),
        h('h1', null, title),
        h('p', { class: 'muted' }, msg),
        h('div', { class: 'stats3' },
          h('div', null, h('b', null, pct + ' %'), h('small', null, 'Score')),
          h('div', null, h('b', null, '+' + xpGain), h('small', null, 'XP')),
          h('div', null, h('b', null, '+' + coinGain), h('small', null, 'kroner'))),
        h('div', { class: 'card', style: { textAlign: 'left' } },
          h('div', { class: 'statusline' }, h('span', null, `🔥 Série : ${state.streak} jour${state.streak > 1 ? 's' : ''}`),
            newStreakDay ? h('span', { class: 'tag ok' }, 'Jour validé') : h('span', { class: 'muted' }, 'Déjà validé aujourd\'hui')),
          travel),
        lvlNow > lvlBefore ? h('div', { class: 'card tint-lilac' }, h('b', null, `Nouveau niveau : ${levelInfo().name} ${levelInfo().emoji}`)) : null,
        ...badges.map((b) => h('div', { class: 'card tint-yellow' }, h('b', null, `${b.e} Badge : ${b.name}`))),
      ),
      h('div', { class: 'footer' },
        !passed ? h('button', { class: 'btn secondary', onclick: opts.onRetry }, 'Réessayer la synthèse') : null,
        h('button', { class: 'btn', onclick: opts.onClose }, passed ? 'Continuer' : 'Retour')));
    app.replaceChildren(screen);
    window.scrollTo(0, 0);

    if (chest) chestModal(chest);
  }
  next();
}

function chestModal(r) {
  const bg = h('div', { class: 'modal-bg' });
  const box = h('div', { class: 'modal' },
    h('div', { class: 'chest' }, '🎁'),
    h('h2', null, 'Coffre-surprise !'),
    h('p', { class: 'muted' }, 'Touche le coffre pour l\'ouvrir.'));
  box.querySelector('.chest').onclick = () => {
    sfx.coin(); confetti();
    const item = r.item ? SHOP.find((s) => s.id === r.item.id) : null;
    box.replaceChildren(
      h('div', { class: 'big' }, '💰'),
      h('h2', null, `+${r.coins} kroner`),
      item ? h('p', null, `Et un objet : ${item.e} ${item.name} !`) : h('p', { class: 'muted' }, 'Tu pourras les dépenser dans la boutique.'),
      h('button', { class: 'btn', onclick: () => bg.remove() }, 'Super !'));
  };
  bg.append(box);
  document.body.append(bg);
}
