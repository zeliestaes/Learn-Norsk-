// XP, niveaux, série, pièces, défis, badges, coffre, boutique.
import { state, save } from './state.js';
import { C } from './content.js';
import { today, addDays, dayDiff, hashStr, seeded, pick } from './util.js';
import { learnedCount } from './leitner.js';
import { toast } from './util.js';

export const LEVELS = [
  { name: 'Turist', min: 0, emoji: '🧳' },
  { name: 'Reisende', min: 3000, emoji: '🚂' },
  { name: 'Oppdager', min: 10000, emoji: '🧭' },
  { name: 'Viking', min: 22000, emoji: '⚓' },
  { name: 'Nordlending', min: 40000, emoji: '🏔️' },
];
export function levelInfo(xp = state.xp) {
  let i = 0;
  LEVELS.forEach((l, k) => { if (xp >= l.min) i = k; });
  const cur = LEVELS[i], next = LEVELS[i + 1];
  return { index: i, ...cur, next, pct: next ? (xp - cur.min) / (next.min - cur.min) : 1, toNext: next ? next.min - xp : 0 };
}

// ---------- Boutique ----------
export const SHOP = [
  { id: 'hat_bonnet', slot: 'hat', e: '🧶', name: 'Bonnet à pompon', price: 60 },
  { id: 'hat_viking', slot: 'hat', e: '🪖', name: 'Casque viking', price: 220 },
  { id: 'hat_chapeau', slot: 'hat', e: '👒', name: 'Chapeau de randonnée', price: 120 },
  { id: 'top_pull', slot: 'top', e: '🧥', name: 'Pull norvégien', price: 90 },
  { id: 'top_cire', slot: 'top', e: '🌧️', name: 'Ciré jaune', price: 140 },
  { id: 'top_echarpe', slot: 'top', e: '🧣', name: 'Écharpe rouge', price: 70 },
  { id: 'acc_jumelles', slot: 'acc', e: '🔭', name: 'Jumelles', price: 110 },
  { id: 'acc_sac', slot: 'acc', e: '🎒', name: 'Sac à dos', price: 80 },
  { id: 'acc_appareil', slot: 'acc', e: '📷', name: 'Appareil photo', price: 130 },
  { id: 'decor_plaine', slot: 'decor', e: '🌿', name: 'Décor : prairie', price: 0 },
  { id: 'decor_aurore', slot: 'decor', e: '🌌', name: 'Décor : aurore boréale', price: 180 },
  { id: 'decor_fjord', slot: 'decor', e: '🌊', name: 'Décor : fjord', price: 150 },
  { id: 'decor_neige', slot: 'decor', e: '❄️', name: 'Décor : montagne enneigée', price: 160 },
];
export const owns = (id) => id.endsWith('plaine') || state.owned.includes(id);
export function buy(id) {
  const it = SHOP.find((s) => s.id === id);
  if (!it || owns(id) || state.coins < it.price) return false;
  state.coins -= it.price; state.owned.push(id); equip(id); save(); return true;
}
export function equip(id) {
  const it = SHOP.find((s) => s.id === id);
  if (!it || !owns(id)) return;
  const key = it.slot;
  const val = key === 'decor' ? id.replace('decor_', '') : id;
  state.equipped[key] = state.equipped[key] === val && key !== 'decor' ? null : val;
  save();
}

// ---------- Défis du jour ----------
const QUESTS = [
  { id: 'listen10', t: 'Fais 10 exercices d\'écoute', key: 'listen', n: 10, coins: 20 },
  { id: 'review15', t: 'Révise 15 mots', key: 'reviewWords', n: 15, coins: 25 },
  { id: 'perfect', t: 'Termine une leçon sans erreur', key: 'perfect', n: 1, coins: 30 },
  { id: 'write8', t: 'Écris 8 réponses au clavier', key: 'write', n: 8, coins: 20 },
  { id: 'speak3', t: 'Prononce 3 phrases à voix haute', key: 'speak', n: 3, coins: 20 },
  { id: 'xp100', t: 'Gagne 100 XP', key: 'xp', n: 100, coins: 20 },
  { id: 'ex25', t: 'Fais 25 exercices', key: 'exercises', n: 25, coins: 20 },
];
function ensureDaily() {
  const t = today();
  if (state.daily.date !== t) state.daily = { date: t, c: {}, done: [] };
}
export function todayQuests() {
  ensureDaily();
  const rnd = seeded(hashStr(state.daily.date));
  const pool = QUESTS.slice();
  const chosen = [QUESTS[2]]; // « leçon sans erreur » toujours proposée
  pool.splice(2, 1);
  while (chosen.length < 3) chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return chosen.map((q) => ({ ...q, value: state.daily.c[q.key] || 0, done: state.daily.done.includes(q.id) }));
}
export function bump(key, n = 1) {
  ensureDaily();
  state.daily.c[key] = (state.daily.c[key] || 0) + n;
  for (const q of todayQuests()) {
    if (!q.done && q.value >= q.n) {
      state.daily.done.push(q.id);
      state.coins += q.coins;
      toast(`Défi réussi ! +${q.coins} kr 🎉`);
    }
  }
  save();
}

// ---------- XP / pièces / série ----------
export function addXp(n) { state.xp += n; bump('xp', n); }
export function addCoins(n) { state.coins += n; save(); }

export function checkStreakOnLaunch() {
  const t = today();
  if (!state.lastActive) return null;
  const missed = dayDiff(state.lastActive, t) - 1;
  if (missed <= 0) return null;
  if (state.freezes >= missed) {
    state.freezes -= missed;
    state.lastActive = addDays(t, -1);
    save();
    return `Ton gel de série a protégé ta série de ${state.streak} jours ❄️`;
  }
  const lost = state.streak;
  state.streak = 0;
  save();
  return lost > 1 ? `Série interrompue (${lost} jours). On repart ! 💪` : null;
}
export function touchStreak() {
  const t = today();
  if (state.lastActive === t) return false;
  state.streak = (state.streak || 0) + 1;
  state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
  state.lastActive = t;
  if (state.streak % 7 === 0 && state.freezes < 3) { state.freezes++; toast('Gel de série gagné ❄️'); }
  save();
  return true;
}

// ---------- Coffre ----------
export function openChest() {
  const coins = 30 + Math.floor(Math.random() * 71);
  state.coins += coins; state.stats.chests++;
  let item = null;
  if (Math.random() < 0.3) {
    const left = SHOP.filter((s) => s.price > 0 && !owns(s.id));
    if (left.length) { item = pick(left); state.owned.push(item.id); }
  }
  save();
  return { coins, item };
}

// ---------- Badges ----------
const chOk = (n) => !!state.chapters[n]?.validated;
export const BADGES = [
  { id: 'first', e: '🌱', name: 'Premier pas', test: () => state.stats.lessons >= 1 },
  { id: 'words50', e: '📘', name: '50 mots', test: () => learnedCount() >= 50 },
  { id: 'words100', e: '📚', name: '100 mots', test: () => learnedCount() >= 100 },
  { id: 'words500', e: '🏛️', name: '500 mots', test: () => learnedCount() >= 500 },
  { id: 'streak3', e: '🔥', name: '3 jours de suite', test: () => state.bestStreak >= 3 },
  { id: 'streak7', e: '🔥', name: '7 jours de suite', test: () => state.bestStreak >= 7 },
  { id: 'streak30', e: '🌋', name: '30 jours de suite', test: () => state.bestStreak >= 30 },
  { id: 'perfect', e: '💯', name: 'Leçon parfaite', test: () => state.stats.perfect >= 1 },
  { id: 'dictee', e: '✍️', name: 'Première dictée parfaite', test: () => state.stats.perfectDictation >= 1 },
  { id: 'chest', e: '🎁', name: 'Premier coffre', test: () => state.stats.chests >= 1 },
  { id: 'ch5', e: '🗺️', name: '5 chapitres validés', test: () => Object.values(state.chapters).filter((c) => c.validated).length >= 5 },
  { id: 'ch10', e: '🧭', name: '10 chapitres validés', test: () => Object.values(state.chapters).filter((c) => c.validated).length >= 10 },
  { id: 'ch20', e: '⛰️', name: '20 chapitres validés', test: () => Object.values(state.chapters).filter((c) => c.validated).length >= 20 },
  { id: 'sea', e: '🐋', name: 'Chapitre de la mer terminé', test: () => chOk(23) },
  { id: 'viking', e: '⚓', name: 'Niveau Viking', test: () => levelInfo().index >= 3 },
  { id: 'rich', e: '💰', name: '500 kr gagnés', test: () => state.coins >= 500 || state.owned.length >= 4 },
  { id: 'a2', e: '🏆', name: 'A2 atteint', test: () => chOk(34) },
];
export function checkBadges() {
  const fresh = [];
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test()) { state.badges[b.id] = today(); fresh.push(b); }
  }
  if (fresh.length) save();
  return fresh;
}

// ---------- Statistiques ----------
export function skillRate(k) {
  const s = state.stats.skills[k];
  return s.n ? Math.round((100 * s.ok) / s.n) : null;
}
export function a2Progress() {
  const total = C.units.length || 1;
  const done = C.units.filter((u) => (u.kind === 'synth' ? state.chapters[u.ch]?.validated : state.units[u.id]?.done)).length;
  return Math.round((100 * done) / total);
}
