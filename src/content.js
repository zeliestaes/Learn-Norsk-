// Chargement du contenu (JSON par chapitre) et index des mots / unités.
export const C = {
  chapters: [],      // [{ id, titre, etape, ready, data, units:[...] }]
  words: new Map(),  // id -> mot
  units: [],         // toutes les unités dans l'ordre du parcours
  course: [],        // unités des chapitres >= 6 (rythme quotidien)
  free: [],          // unités des chapitres 1-5
};

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
  for (const ch of loaded) {
    ch.units = [];
    const nLessons = ch.id <= 5 ? 2 : 5;
    for (let l = 1; l <= nLessons; l++) {
      const lesson = ch.data?.lecons?.[l - 1] || null;
      ch.units.push({ id: `${ch.id}-${l}`, ch: ch.id, kind: 'lesson', n: l, lesson, ready: !!lesson, titre: lesson?.titre || `Leçon ${l}` });
      if (lesson) lesson.mots.forEach((w, i) => {
        const id = `${ch.id}-${l}-${i + 1}`;
        C.words.set(id, { id, ch: ch.id, lesson: l, ...parseNo(w.no), ...w });
      });
    }
    const synth = ch.data?.synthese || null;
    ch.units.push({ id: `${ch.id}-S`, ch: ch.id, kind: 'synth', n: 0, lesson: synth, ready: !!synth, titre: 'Synthèse' });
    ch.units.forEach((u) => { C.units.push(u); (ch.id <= 5 ? C.free : C.course).push(u); });
    C.chapters.push(ch);
  }
  return C;
}

export const chapterById = (id) => C.chapters.find((c) => c.id === id);
export const unitById = (id) => C.units.find((u) => u.id === id);
export const chapterWords = (chId) => [...C.words.values()].filter((w) => w.ch === chId);
export const lessonWords = (chId, n) => [...C.words.values()].filter((w) => w.ch === chId && w.lesson === n);
