// Construction des exercices (builders) et affichage (renderers).
import { h, shuffle, sample } from './util.js';
import { C, lessonWords, chapterWords } from './content.js';
import { speak, hasVoice, sfx } from './audio.js';
import { canRecognize, listen as recognize } from './speech.js';
import { checkTyped, speechScore } from './text.js';
import { state } from './state.js';
import { level5 } from './leitner.js';

// ======================================================================
// BUILDERS
// ======================================================================
const label = (w, side) => (side === 'fr' ? w.fr : w.no);

function pickOptions(word, pool, side, n = 3) {
  const used = new Set([label(word, side)]);
  const same = shuffle(pool.filter((w) => w.id !== word.id && w.verb === word.verb));
  const other = shuffle(pool.filter((w) => w.id !== word.id && w.verb !== word.verb));
  const opts = [];
  for (const w of [...same, ...other, ...shuffle([...C.words.values()])]) {
    if (w.id === word.id || used.has(label(w, side))) continue;
    used.add(label(w, side)); opts.push(w);
    if (opts.length >= n) break;
  }
  return shuffle([word, ...opts]);
}

const mk = {
  discover: (w) => ({ type: 'discover', word: w, info: true, ids: [] }),
  mcq: (w, pool, dir) => ({ type: 'mcq', dir, word: w, options: pickOptions(w, pool, dir === 'no-fr' ? 'fr' : 'no'), skill: 'read', ids: [w.id] }),
  listen: (w, pool) => ({ type: 'listen', word: w, options: pickOptions(w, pool, 'no'), skill: 'listen', ids: [w.id] }),
  translateWord: (w) => ({ type: 'translate', prompt: w.fr, answer: w.no, hint: w.verb ? 'verbe' : '', skill: 'write', ids: [w.id] }),
  translateSent: (w) => ({ type: 'translate', prompt: w.ex_fr, answer: w.ex, sentence: true, skill: 'write', ids: [w.id] }),
  dictWord: (w) => ({ type: 'dictation', text: w.no, mode: 'word', skill: 'listen', ids: [w.id] }),
  dictSent: (w) => ({ type: 'dictation', text: w.ex, fr: w.ex_fr, mode: 'sentence', skill: 'listen', ids: [w.id] }),
  order: (w, pool) => {
    const tokens = w.ex.split(' ');
    const have = new Set(tokens.map((t) => t.toLowerCase().replace(/[.,!?]/g, '')));
    const traps = [];
    for (const o of shuffle(pool)) {
      for (const t of o.ex.split(' ')) {
        const bare = t.toLowerCase().replace(/[.,!?]/g, '');
        if (!have.has(bare) && bare.length > 1 && !traps.includes(bare) && !/^\d/.test(bare)) { traps.push(bare); break; }
      }
      if (traps.length >= 2) break;
    }
    return { type: 'order', fr: w.ex_fr, answer: tokens, tiles: shuffle([...tokens, ...traps]), skill: 'write', ids: [w.id] };
  },
  pairs: (ws) => ({ type: 'pairs', words: ws, skill: 'read', ids: ws.map((w) => w.id) }),
  speak: (w) => ({ type: 'speak', text: w.ex, fr: w.ex_fr, skill: 'speak', ids: [w.id] }),
};

function noRepeat(list) { // évite deux exercices du même type à la suite
  const out = [], rest = shuffle(list);
  while (rest.length) {
    const i = rest.findIndex((e) => !out.length || e.type !== out[out.length - 1].type);
    out.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}
const cyc = (arr) => { let i = 0; const s = shuffle(arr); return () => s[i++ % s.length]; };
const audioOk = () => hasVoice();

function readingBlock(texte, label) {
  return [
    { type: 'passage', text: texte, info: true, ids: [], title: label },
    ...texte.questions.map((q) => ({ type: 'question', passage: texte, q, skill: 'read', ids: [] })),
  ];
}

export function buildLesson(unit) {
  const L = unit.lesson;
  const W = lessonWords(unit.ch, unit.n);
  const A = W.slice(0, 4), B = W.slice(4);
  const seq = [];
  const half = (ws) => {
    ws.forEach((w) => seq.push(mk.discover(w)));
    shuffle(ws).forEach((w, i) => seq.push(mk.mcq(w, W, i % 2 ? 'fr-no' : 'no-fr')));
  };
  half(A); half(B);
  seq.push({ type: 'grammar', g: L.grammaire, info: true, ids: [] });
  const nx = cyc(W);
  const audio = audioOk();
  const mixed = [
    mk.translateWord(nx()), mk.translateWord(nx()), mk.translateSent(nx()),
    audio ? mk.listen(nx(), W) : mk.mcq(nx(), W, 'fr-no'),
    audio ? mk.listen(nx(), W) : mk.mcq(nx(), W, 'no-fr'),
    audio ? mk.dictWord(nx()) : mk.translateWord(nx()),
    audio ? mk.dictSent(nx()) : mk.translateSent(nx()),
    mk.order(nx(), W), mk.order(nx(), W),
    mk.pairs(sample(W, 5)),
    mk.speak(nx()),
  ];
  seq.push(...noRepeat(mixed));
  seq.push(...readingBlock(L.texte));
  return seq;
}

export function buildSynth(ch) {
  const S = ch.data.synthese;
  const W = chapterWords(ch.id);
  const nx = cyc(W);
  const audio = audioOk();
  const mixed = [
    ...[0, 1, 2].map(() => mk.mcq(nx(), W, 'no-fr')),
    ...[0, 1, 2].map(() => mk.mcq(nx(), W, 'fr-no')),
    ...[0, 1, 2, 3].map(() => mk.translateWord(nx())),
    mk.translateSent(nx()), mk.translateSent(nx()),
    ...[0, 1, 2].map(() => (audio ? mk.listen(nx(), W) : mk.mcq(nx(), W, 'fr-no'))),
    audio ? mk.dictWord(nx()) : mk.translateWord(nx()),
    audio ? mk.dictSent(nx()) : mk.translateSent(nx()),
    audio ? mk.dictSent(nx()) : mk.translateSent(nx()),
    mk.order(nx(), W), mk.order(nx(), W),
    mk.pairs(sample(W, 5)),
    mk.speak(nx()),
  ];
  return [...noRepeat(mixed), ...readingBlock(S)];
}

export function buildReview(words) {
  const pool = [...C.words.values()].filter((w) => state.words[w.id]);
  const audio = audioOk();
  const ex = words.map((w) => {
    const box = level5(w.id);
    if (box <= 2) {
      const r = Math.random();
      if (r < 0.4) return mk.mcq(w, pool.length > 8 ? pool : [...C.words.values()], 'no-fr');
      if (r < 0.7 || !audio) return mk.mcq(w, pool.length > 8 ? pool : [...C.words.values()], 'fr-no');
      return mk.listen(w, pool.length > 8 ? pool : [...C.words.values()]);
    }
    const r = Math.random();
    if (r < 0.5 || !audio) return mk.translateWord(w);
    if (r < 0.8) return mk.dictWord(w);
    return mk.translateSent(w);
  });
  return noRepeat(ex);
}

// ======================================================================
// RENDERERS
// ======================================================================
const ICON_SLOW = '🐢';

function hearRow(text, auto = false) {
  const row = h('div', { class: 'hear' },
    h('button', { class: 'icon-btn', 'aria-label': 'Écouter', onclick: () => speak(text) }, '🔊'),
    h('button', { class: 'icon-btn lilac', 'aria-label': 'Écouter lentement', onclick: () => speak(text, { slow: true }) }, ICON_SLOW));
  if (auto) setTimeout(() => speak(text), 350);
  return row;
}

function keyRow(input) {
  return h('div', { class: 'keys' }, ['æ', 'ø', 'å'].map((c) => h('button', {
    type: 'button',
    onclick: () => {
      const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
      input.value = input.value.slice(0, s) + c + input.value.slice(e);
      input.setSelectionRange(s + 1, s + 1);
      input.focus();
      input.dispatchEvent(new Event('input'));
    },
  }, c)));
}

function textInput(api, placeholder = 'Écris en norvégien…') {
  const input = h('input', {
    class: 'answer-input', type: 'text', placeholder, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', lang: 'nb',
  });
  input.addEventListener('input', () => api.enable(input.value.trim().length > 0));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') api.submit(); });
  return input;
}

function choiceList(options, api, labelFn) {
  let sel = -1;
  const btns = options.map((o, i) => h('button', {
    class: 'choice', type: 'button',
    onclick: () => { sel = i; btns.forEach((b, j) => b.classList.toggle('sel', j === i)); api.enable(true); },
  }, labelFn(o)));
  return { el: h('div', { class: 'choices' }, btns), btns, get sel() { return sel; } };
}

const R = {};

R.discover = (ex, el) => {
  const w = ex.word;
  el.append(
    h('span', { class: 'tag' }, 'Nouveau mot'),
    h('div', { class: 'card' },
      h('div', { class: 'bigword' }, w.no),
      h('div', { class: 'pron' }, '🗣 ' + w.pron),
      h('p', { style: { fontSize: '1.2rem', fontWeight: 800, margin: '10px 0' } }, w.fr),
      hearRow(w.no, true),
      h('div', { class: 'example' }, h('b', null, w.ex), h('span', { class: 'muted' }, w.ex_fr),
        h('div', { style: { marginTop: '8px' } }, hearRow(w.ex))),
    ),
  );
};

R.grammar = (ex, el) => {
  const g = ex.g;
  el.append(
    h('span', { class: 'tag' }, 'Grammaire'),
    h('div', { class: 'card grammar tint-yellow' },
      h('h2', null, g.titre),
      ...g.texte.split('\n').map((p) => h('p', null, p)),
      ...g.exemples.map((e) => h('div', { class: 'ex-pair' }, h('b', null, e.no), h('span', { class: 'muted' }, e.fr))),
    ),
  );
};

R.passage = (ex, el) => {
  const t = ex.text;
  const tr = h('div', { class: 'passage hidden' }, t.fr.split('\n').map((p) => h('p', null, p)));
  el.append(
    h('span', { class: 'tag' }, 'Lire'),
    h('div', { class: 'passage' }, t.no.split('\n').map((p) => h('p', null, p))),
    hearRow(t.no.replace(/\n/g, ' ')),
    h('button', { class: 'link', onclick: () => tr.classList.toggle('hidden') }, 'Voir / cacher la traduction'),
    tr,
    t.aide?.length ? h('p', { class: 'gloss' }, 'Aide : ' + t.aide.map((a) => `${a.no} = ${a.fr}`).join(' · ')) : null,
  );
};

R.question = (ex, el, api) => {
  const t = ex.passage;
  const order = shuffle(ex.q.choix.map((c, i) => ({ c, i })));
  const cl = choiceList(order, api, (o) => o.c);
  el.append(
    h('span', { class: 'tag' }, 'Compréhension'),
    h('p', { class: 'prompt' }, ex.q.q),
    cl.el,
    h('details', { class: 'review-text' }, h('summary', null, 'Relire le texte'),
      t.no.split('\n').map((p) => h('p', null, p))),
  );
  api.setCheck(() => {
    const ok = order[cl.sel].i === ex.q.rep;
    cl.btns[cl.sel].classList.add(ok ? 'good' : 'bad');
    if (!ok) cl.btns[order.findIndex((o) => o.i === ex.q.rep)].classList.add('good');
    return { ok, answer: ex.q.choix[ex.q.rep] };
  });
};

R.mcq = (ex, el, api) => {
  const w = ex.word, toFr = ex.dir === 'no-fr';
  const cl = choiceList(ex.options, api, (o) => (toFr ? o.fr : o.no));
  el.append(
    h('span', { class: 'tag' }, 'Lire'),
    h('p', { class: 'prompt' }, toFr ? 'Que veut dire ce mot ?' : 'Comment dit-on en norvégien ?'),
    toFr
      ? h('div', null, h('div', { class: 'bigword' }, w.no), h('div', { class: 'pron' }, w.pron), h('div', { style: { marginTop: '8px' } }, hearRow(w.no)))
      : h('div', { class: 'bigword' }, w.fr),
    cl.el,
  );
  api.setCheck(() => {
    const ok = ex.options[cl.sel].id === w.id;
    cl.btns[cl.sel].classList.add(ok ? 'good' : 'bad');
    if (!ok) cl.btns[ex.options.findIndex((o) => o.id === w.id)].classList.add('good');
    if (toFr || ok) speak(w.no);
    return { ok, answer: toFr ? w.fr : w.no };
  });
};

R.listen = (ex, el, api) => {
  const w = ex.word;
  const cl = choiceList(ex.options, api, (o) => o.no);
  el.append(
    h('span', { class: 'tag' }, 'Écouter'),
    h('p', { class: 'prompt' }, 'Écoute et choisis le bon mot.'),
    hearRow(w.no, true),
    cl.el,
  );
  api.setCheck(() => {
    const ok = ex.options[cl.sel].id === w.id;
    cl.btns[cl.sel].classList.add(ok ? 'good' : 'bad');
    if (!ok) cl.btns[ex.options.findIndex((o) => o.id === w.id)].classList.add('good');
    return { ok, answer: `${w.no} (${w.fr})` };
  });
};

function typedCheck(input, expected) {
  const r = checkTyped(input.value, expected);
  return { ok: r.ok, answer: expected, note: r.note, fix: r.fix, exact: r.exact };
}

R.translate = (ex, el, api) => {
  const input = textInput(api);
  el.append(
    h('span', { class: 'tag' }, 'Écrire'),
    h('p', { class: 'prompt' }, ex.sentence ? 'Traduis cette phrase en norvégien :' : 'Traduis en norvégien :'),
    h('div', { class: 'bigword', style: { fontSize: ex.sentence ? '1.4rem' : '2rem' } }, ex.prompt),
    ex.hint ? h('small', null, `(${ex.hint})`) : null,
    input, keyRow(input),
  );
  setTimeout(() => input.focus(), 150);
  api.setCheck(() => { input.disabled = true; return typedCheck(input, ex.answer); });
};

R.dictation = (ex, el, api) => {
  const input = textInput(api);
  el.append(
    h('span', { class: 'tag' }, 'Dictée'),
    h('p', { class: 'prompt' }, ex.mode === 'word' ? 'Écris le mot que tu entends.' : 'Écris la phrase que tu entends.'),
    hearRow(ex.text, true),
    input, keyRow(input),
  );
  api.setCheck(() => { input.disabled = true; const r = typedCheck(input, ex.text); if (!r.ok && ex.fr) r.answer = `${ex.text} (${ex.fr})`; return r; });
};

R.order = (ex, el, api) => {
  const line = h('div', { class: 'tiles line' });
  const bank = h('div', { class: 'tiles' });
  const chosen = [];
  const tiles = ex.tiles.map((t, i) => {
    const b = h('button', { class: 'tile', type: 'button' }, t);
    b.onclick = () => {
      if (b.classList.contains('used')) return;
      b.classList.add('used');
      const c = h('button', { class: 'tile', type: 'button' }, t);
      c.onclick = () => { b.classList.remove('used'); c.remove(); chosen.splice(chosen.findIndex((x) => x.c === c), 1); api.enable(chosen.length > 0); };
      chosen.push({ c, t });
      line.append(c); api.enable(true);
    };
    return b;
  });
  tiles.forEach((b) => bank.append(b));
  el.append(
    h('span', { class: 'tag' }, 'Construire'),
    h('p', { class: 'prompt' }, 'Remets les mots dans l\'ordre :'),
    h('div', { class: 'bigword', style: { fontSize: '1.3rem' } }, ex.fr),
    line, bank,
  );
  api.setCheck(() => {
    const got = chosen.map((x) => x.t);
    const ok = got.join(' ') === ex.answer.join(' ');
    return { ok, answer: ex.answer.join(' ') };
  });
};

R.pairs = (ex, el, api) => {
  const left = shuffle(ex.words), right = shuffle(ex.words);
  let a = null, b = null, mistakes = 0, left_n = ex.words.length;
  const mkBtn = (w, side) => {
    const btn = h('button', { class: 'choice', type: 'button' }, side === 'no' ? w.no : w.fr);
    btn.onclick = () => {
      if (btn.classList.contains('done')) return;
      if (side === 'no') { a = { w, btn }; colL.forEach((x) => x.classList.remove('sel')); } else { b = { w, btn }; colR.forEach((x) => x.classList.remove('sel')); }
      btn.classList.add('sel');
      if (side === 'no') speak(w.no);
      if (a && b) {
        if (a.w.id === b.w.id) {
          [a.btn, b.btn].forEach((x) => { x.classList.add('good'); setTimeout(() => x.classList.add('done'), 350); });
          sfx.good(); left_n--;
          if (!left_n) setTimeout(() => api.finish({ ok: mistakes === 0, answer: 'Associe bien chaque mot à sa traduction.', note: mistakes ? `${mistakes} erreur(s). ` : '' }), 500);
        } else {
          mistakes++; sfx.bad();
          [a.btn, b.btn].forEach((x) => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad', 'sel'), 450); });
        }
        a = b = null;
      }
    };
    return btn;
  };
  const colL = left.map((w) => mkBtn(w, 'no'));
  const colR = right.map((w) => mkBtn(w, 'fr'));
  const grid = h('div', { class: 'pairs' });
  colL.forEach((x, i) => grid.append(x, colR[i]));
  el.append(h('span', { class: 'tag' }, 'Associer'), h('p', { class: 'prompt' }, 'Associe chaque mot à sa traduction.'), grid);
  api.auto();
};

R.speak = (ex, el, api) => {
  const out = h('div', { class: 'muted', style: { minHeight: '1.6em', textAlign: 'center' } });
  const area = h('div', { style: { textAlign: 'center' } });
  const selfEval = () => {
    area.replaceChildren(
      h('p', { class: 'muted' }, 'Écoute, répète à voix haute, puis auto-évalue-toi.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn warn', onclick: () => api.finish({ ok: false, answer: ex.text }) }, 'Pas encore'),
        h('button', { class: 'btn', onclick: () => api.finish({ ok: true, answer: ex.text }) }, 'C\'est bon !')),
    );
  };
  if (canRecognize()) {
    const mic = h('button', { class: 'mic', 'aria-label': 'Parler' }, '🎤');
    mic.onclick = async () => {
      mic.classList.add('rec'); out.textContent = 'Je t\'écoute…';
      try {
        const alts = await recognize();
        mic.classList.remove('rec');
        if (!alts.length) { out.textContent = 'Je n\'ai rien entendu. Réessaie !'; return; }
        const best = Math.max(...alts.map((a) => speechScore(a, ex.text)));
        out.textContent = `J'ai entendu : « ${alts[0]} »`;
        api.finish({ ok: best >= 0.7, answer: ex.text, note: best >= 0.7 ? '' : 'Pas tout à fait. ' });
      } catch {
        mic.classList.remove('rec'); out.textContent = 'Micro indisponible : passe en auto-évaluation.'; selfEval();
      }
    };
    area.append(mic);
  } else selfEval();
  el.append(
    h('span', { class: 'tag' }, 'Parler'),
    h('p', { class: 'prompt' }, 'Lis cette phrase à voix haute :'),
    h('div', { class: 'card' }, h('div', { class: 'bigword', style: { fontSize: '1.4rem' } }, ex.text), h('p', { class: 'muted' }, ex.fr), hearRow(ex.text)),
    area, out,
    h('div', { style: { textAlign: 'center' } }, h('button', { class: 'link', onclick: () => api.finish({ ok: true, skipped: true, answer: ex.text }) }, 'Je ne peux pas parler maintenant')),
  );
  api.auto();
};

export function renderExercise(ex, el, api) { R[ex.type](ex, el, api); }
