import { loadState, state, save } from './state.js';
import { loadContent } from './content.js';
import { askPersist } from './db.js';
import { checkStreakOnLaunch } from './game.js';
import { dueCount } from './leitner.js';
import { h, toast } from './util.js';
import * as S from './screens.js';
import { hasSynth } from './audio.js';

const app = document.getElementById('app');
let nav = null;

const TABS = [
  ['#/', '🗺️', 'Voyage'],
  ['#/revision', '🧠', 'Réviser'],
  ['#/lexique', '📖', 'Lexique'],
  ['#/profil', '🏅', 'Profil'],
  ['#/reglages', '⚙️', 'Réglages'],
];

function renderNav(active) {
  nav?.remove(); nav = null;
  if (!active) return;
  const due = dueCount();
  nav = h('nav', { class: 'nav' }, h('div', { class: 'nav-inner' }, TABS.map(([href, ico, label]) =>
    h('a', { href, class: active === href ? 'on' : '' }, h('span', { class: 'ico' }, ico), label,
      href === '#/revision' && due > 0 ? h('span', { class: 'dot' }, due > 99 ? '99+' : due) : null))));
  document.body.append(nav);
}

function route() {
  const hash = location.hash || '#/';
  const [, a, b] = hash.split('/');
  let tab = null;
  try {
    if (a === 'jouer') S.Play(app, b);
    else if (a === 'revision' && b) S.Review(app, b);
    else if (a === 'chapitre') { S.Chapter(app, b); tab = '#/'; }
    else if (a === 'revision') { S.Review(app); tab = '#/revision'; }
    else if (a === 'lexique') { S.Lexicon(app); tab = '#/lexique'; }
    else if (a === 'profil') { S.Profile(app); tab = '#/profil'; }
    else if (a === 'boutique') { S.Shop(app); tab = '#/profil'; }
    else if (a === 'reglages') { S.Settings(app); tab = '#/reglages'; }
    else { S.Home(app); tab = '#/'; }
  } catch (e) {
    console.error(e);
    app.replaceChildren(h('div', { class: 'screen' }, h('div', { class: 'card' }, h('h2', null, 'Oups'), h('p', null, 'Une erreur est survenue : ' + e.message), h('a', { class: 'btn', href: '#/' }, 'Retour à l\'accueil'))));
  }
  renderNav(tab);
  if (!(a === 'jouer' || a === 'revision' && b)) window.scrollTo(0, a ? 0 : window.scrollY);
}

async function boot() {
  app.replaceChildren(h('div', { class: 'screen', style: { textAlign: 'center', paddingTop: '30vh' } }, h('div', { style: { fontSize: '3rem' } }, '🏔️'), h('p', { class: 'muted' }, 'Chargement…')));
  await loadState();
  askPersist();
  document.body.classList.toggle('no-anim', !state.settings.anim);
  try { await loadContent(); }
  catch (e) {
    app.replaceChildren(h('div', { class: 'screen' }, h('div', { class: 'card' }, h('h2', null, 'Contenu introuvable'), h('p', null, 'Connecte-toi à internet une première fois pour charger l\'application.'))));
    return;
  }
  const msg = checkStreakOnLaunch();
  window.addEventListener('hashchange', route);
  route();
  if (msg) toast(msg);
  if (hasSynth()) speechSynthesis.getVoices();
}

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  // Quand une nouvelle version prend le relais, on recharge (sauf pendant une leçon).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    if (/^#\/(jouer|revision\/(go|free))/.test(location.hash)) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
boot();
