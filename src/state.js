import { dbGet, dbSet, dbClear } from './db.js';
import { today } from './util.js';

const fresh = () => ({
  v: 1,
  startDate: today(),
  bonus: 0,
  words: {},      // id -> { b: boîte 0-6, d: prochaine révision, m: erreurs, n: vues }
  units: {},      // "6-1" -> { done, best, n, date }
  chapters: {},   // id -> { validated, best, date }
  xp: 0, coins: 0,
  streak: 0, bestStreak: 0, lastActive: null, freezes: 0,
  equipped: { hat: null, top: null, acc: null, decor: 'plaine' },
  owned: [],
  badges: {},
  daily: { date: null, c: {}, done: [] },
  stats: {
    seconds: 0, lessons: 0, perfect: 0, exercises: 0, chests: 0, reviewWords: 0,
    skills: { read: { ok: 0, n: 0 }, write: { ok: 0, n: 0 }, listen: { ok: 0, n: 0 }, speak: { ok: 0, n: 0 } },
    perfectDictation: 0,
  },
  settings: { sound: true, anim: true, voice: '', rate: 0.9, forceAudio: false },
  lastExport: null,
  flags: {},
});

export let state = fresh();
let timer = null;

function merge(base, over) {
  // Fusion récursive : garde les nouveaux champs par défaut quand on charge une ancienne sauvegarde.
  for (const k of Object.keys(over || {})) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') merge(base[k], over[k]);
    else base[k] = over[k];
  }
  return base;
}

export async function loadState() {
  const saved = await dbGet();
  state = saved ? merge(fresh(), saved) : fresh();
  if (!saved) await dbSet(state);
  return state;
}
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => dbSet(state), 250);
}
export function saveNow() { clearTimeout(timer); return dbSet(state); }

export function exportJSON() {
  state.lastExport = today();
  save();
  return JSON.stringify({ app: 'norsk-reisen', exportedAt: new Date().toISOString(), data: state }, null, 2);
}
export async function importJSON(text) {
  const obj = JSON.parse(text);
  const data = obj.data || obj;
  if (!data || typeof data !== 'object' || !data.words || !data.units) throw new Error('Fichier non reconnu');
  state = merge(fresh(), data);
  await saveNow();
}
export async function resetAll() {
  await dbClear();
  state = fresh();
  await saveNow();
}
