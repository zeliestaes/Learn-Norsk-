import { state, save } from './state.js';
import { C } from './content.js';
import { today, dayDiff, addDays } from './util.js';

export const daysSince = () => Math.max(0, dayDiff(state.startDate, today()));
export const isDone = (u) => (u.kind === 'synth' ? !!state.chapters[u.ch]?.validated : !!state.units[u.id]?.done);
export const doneCourse = () => C.course.filter(isDone).length;
export const totalCourse = () => C.course.length;

export function availableCount() { return daysSince() + 1 + (state.bonus || 0); }

// Statut d'une unité : { open, done, reason, date }
export function unitStatus(u) {
  const done = isDone(u);
  if (!u.ready) return { open: false, done, reason: 'soon' };
  if (u.ch <= 5) return { open: true, done };
  const k = C.course.indexOf(u);
  if (k >= availableCount()) {
    return { open: false, done, reason: 'date', date: addDays(state.startDate, k - (state.bonus || 0)) };
  }
  if (k > 0 && !isDone(C.course[k - 1]) && !done) return { open: false, done, reason: 'order', prev: C.course[k - 1] };
  return { open: true, done };
}

export function nextCourseUnit() { return C.course.find((u) => !isDone(u)) || null; }

export function todayInfo() {
  const next = nextCourseUnit();
  if (!next) return { kind: 'finished' };
  const st = unitStatus(next);
  if (st.open) return { kind: 'play', unit: next };
  if (st.reason === 'soon') return { kind: 'soon', unit: next };
  if (st.reason === 'date') return { kind: 'rest', unit: next, date: st.date };
  return { kind: 'order', unit: next };
}

export function unlockBonus() { state.bonus = (state.bonus || 0) + 1; save(); }

// « à jour », « X leçons d'avance », « X leçons à rattraper »
export function paceIndicator() {
  const done = doneCourse(), d = daysSince();
  if (done < d) return { cls: 'late', text: `${d - done} leçon${d - done > 1 ? 's' : ''} à rattraper` };
  if (done > d + 1) return { cls: 'ahead', text: `${done - d - 1} leçon${done - d - 1 > 1 ? 's' : ''} d'avance` };
  return { cls: 'ok', text: 'À jour' };
}

export function currentChapter() {
  return C.chapters.find((c) => !state.chapters[c.id]?.validated) || C.chapters[C.chapters.length - 1];
}
export function chapterProgress(ch) {
  const total = ch.units.length;
  const done = ch.units.filter(isDone).length;
  return { done, total, t: done / total };
}
