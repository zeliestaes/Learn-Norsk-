// Chargement du contenu (JSON par chapitre) et index des mots / unités.
export const C = {
  chapters: [],      // [{ id, titre, etape, ready, data, units:[...] }]
  words: new Map(),  // id -> mot
  units: [],         // toutes les unités dans l'ordre du parcours
  course: [],        // unités des chapitres >= 6 (rythme quotidien)
  free: [],          // unités des chapitres 1-5
};

export const FOCUS_LABEL = { vocab: 'vocabulaire', write: 'écrire', listen: 'écouter', sentences: 'phrases', mix: 'mixte', mixlong: 'mixte' };

export function parseNo(no) {
  // Renvoie { art, bare, verb } pour "en kaffe" / "å drikke" / "hei".
  const m = /^(en|ei|et) (.+)$/.exec(no);
  if (m) return { art: m[1], bare: m[2], noun: true, verb: false };
  if (no.startsWith('å ')) return { art: null, bare: no.slice(2), noun: false, verb: true };
  return { art: null, bare: no, noun: false, verb: false };
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}

export async function loadContent() {
  const index = await getJSON('content/index.json');
  C.chapters = []; C.words.clear(); C.units = []; C.course = []; C.free = [];
  const loaded = await Promise.all(index.chapters.map(async (c) => {
    if (!c.fichier) return { ...c, ready: false, data: null };
    try { return { ...c, ready: true, data: await getJSON('content/' + c.fichier) }; }
    catch { return { ...c, ready: false, data: null }; }
  }));
  const readyById = new Map(loaded.map((c) => [c.id, c.ready]));
  for (const ch of loaded) {
    ch.units = [];
    if (ch.revision) {
      // Chapitre de révision : un résumé suivi d'un entraînement, puis un bilan (pas de mots nouveaux).
      ch.data = null;
      ch.ready = ch.couvre.every((id) => readyById.get(id));
      ch.units.push({ id: `${ch.id}-R`, ch: ch.id, kind: 'recap', n: 1, lesson: null, ready: ch.ready, titre: 'Résumé + entraînement' });
      ch.units.push({ id: `${ch.id}-S`, ch: ch.id, kind: 'synth', n: 0, lesson: null, ready: ch.ready, titre: 'Bilan' });
      ch.units.forEach((u) => { C.units.push(u); (ch.id === 105 ? C.free : C.course).push(u); });
      C.chapters.push(ch);
      continue;
    }
    const nLessons = ch.data?.lecons?.length || (ch.id <= 5 ? 2 : 5);
    for (let l = 1; l <= nLessons; l++) {
      const lesson = ch.data?.lecons?.[l - 1] || null;
      ch.units.push({ id: `${ch.id}-${l}`, ch: ch.id, kind: 'lesson', n: l, lesson, ready: !!lesson, titre: lesson?.titre || `Leçon ${l}` });
      if (lesson) lesson.mots.forEach((w, i) => {
        const id = `${ch.id}-${l}-${i + 1}`;
        C.words.set(id, { id, ch: ch.id, lesson: l, ...parseNo(w.no), ...w });
      });
    }
    // Séances d'entraînement : elles réutilisent les mots du chapitre (aucun mot nouveau).
    const foci = ch.id <= 5 ? ['vocab', 'write', 'listen', 'sentences'] : ['mixlong'];
    foci.forEach((focus, k) => {
      ch.units.push({ id: `${ch.id}-D${k + 1}`, ch: ch.id, kind: 'drill', n: k + 1, focus, lesson: null, ready: !!ch.data, titre: 'Entraînement · ' + FOCUS_LABEL[focus] });
    });
    const synth = ch.data?.synthese || null;
    ch.units.push({ id: `${ch.id}-S`, ch: ch.id, kind: 'synth', n: 0, lesson: synth, ready: !!synth, titre: 'Synthèse' });
    ch.units.forEach((u) => { C.units.push(u); (ch.id <= 5 ? C.free : C.course).push(u); });
    C.chapters.push(ch);
  }
  C.chapters.forEach((c, i) => { c.pos = i + 1; });
  return C;
}

export const chapterById = (id) => C.chapters.find((c) => c.id === id);
export const unitById = (id) => C.units.find((u) => u.id === id);
export const chapterWords = (chId) => [...C.words.values()].filter((w) => w.ch === chId);
export const lessonWords = (chId, n) => [...C.words.values()].filter((w) => w.ch === chId && w.lesson === n);
