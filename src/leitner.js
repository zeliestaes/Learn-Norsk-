import { state, save } from './state.js';
import { C } from './content.js';
import { today, addDays } from './util.js';

export const INTERVALS = [0, 1, 2, 4, 7, 15, 30];

export function getWord(id) { return state.words[id]; }
export function introduce(id) {
  if (!state.words[id]) state.words[id] = { b: 0, d: today(), m: 0, n: 0 };
  return state.words[id];
}
// ok = réussite à la première tentative de la séance.
export function recordWord(id, ok) {
  const w = introduce(id);
  w.n++;
  if (ok) {
    w.b = Math.min(6, w.b + 1);
    w.d = addDays(today(), INTERVALS[w.b]);
  } else {
    w.m++;
    w.b = 1;
    w.d = addDays(today(), 1);
  }
  save();
}
export function dueWords(limit = 15) {
  const t = today();
  return Object.entries(state.words)
    .filter(([id, w]) => w.d <= t && C.words.has(id))
    .sort((a, b) => a[1].b - b[1].b || a[1].d.localeCompare(b[1].d))
    .slice(0, limit)
    .map(([id]) => C.words.get(id));
}
export function dueCount() {
  const t = today();
  return Object.entries(state.words).filter(([id, w]) => w.d <= t && C.words.has(id)).length;
}
export const level5 = (id) => Math.min(5, state.words[id]?.b || 0); // 0..5 points
export const learnedCount = () => Object.values(state.words).filter((w) => w.b >= 1).length;
