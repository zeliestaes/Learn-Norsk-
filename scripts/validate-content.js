#!/usr/bin/env node
// Vérifie les fichiers de contenu : JSON valide, champs obligatoires, doublons, longueurs des textes.
// Usage : node scripts/validate-content.js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content');
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.error('  ✗ ' + m); };
const warn = (m) => { warnings++; console.warn('  ! ' + m); };
const countWords = (s) => s.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

function readJSON(f) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { err(`${f} : JSON invalide (${e.message})`); return null; }
}

const index = readJSON('index.json');
if (!index) process.exit(1);
const seenNo = new Map(), seenFr = new Map();
let totalWords = 0, totalLessons = 0, ready = 0;

function checkText(where, t, minW, maxW, nQ) {
  if (!t) return err(`${where} : texte manquant`);
  ['no', 'fr'].forEach((k) => { if (!isStr(t[k])) err(`${where} : champ « ${k} » manquant`); });
  if (isStr(t.no)) {
    const n = countWords(t.no);
    if (n < minW || n > maxW) err(`${where} : texte de ${n} mots (attendu ${minW}–${maxW})`);
  }
  if (!Array.isArray(t.questions) || t.questions.length !== nQ) return err(`${where} : ${nQ} questions attendues`);
  t.questions.forEach((q, i) => {
    if (!isStr(q.q)) err(`${where} q${i + 1} : question vide`);
    if (!Array.isArray(q.choix) || q.choix.length < 2 || !q.choix.every(isStr)) err(`${where} q${i + 1} : choix invalides`);
    else if (new Set(q.choix).size !== q.choix.length) err(`${where} q${i + 1} : choix en double`);
    if (!Number.isInteger(q.rep) || q.rep < 0 || q.rep >= (q.choix || []).length) err(`${where} q${i + 1} : « rep » hors limites`);
  });
  if (t.aide && !(Array.isArray(t.aide) && t.aide.every((a) => isStr(a.no) && isStr(a.fr)))) err(`${where} : « aide » invalide`);
}

for (const c of index.chapters) {
  if (!c.fichier) { console.log(`Chapitre ${c.id} : ${c.titre} — pas encore écrit`); continue; }
  const f = c.fichier;
  if (!fs.existsSync(path.join(dir, f))) { err(`${f} introuvable`); continue; }
  const ch = readJSON(f);
  if (!ch) continue;
  ready++;
  const nL = c.id <= 5 ? 2 : 5;
  console.log(`Chapitre ${c.id} : ${c.titre}`);
  if (ch.id !== c.id) err(`${f} : id ${ch.id} ≠ ${c.id}`);
  if (!Array.isArray(ch.lecons) || ch.lecons.length !== nL) err(`${f} : ${nL} leçons attendues`);
  (ch.lecons || []).forEach((l, li) => {
    const where = `${f} leçon ${li + 1}`;
    totalLessons++;
    if (!isStr(l.titre)) err(`${where} : titre manquant`);
    if (!Array.isArray(l.mots) || l.mots.length !== 8) err(`${where} : 8 mots attendus (${l.mots ? l.mots.length : 0})`);
    (l.mots || []).forEach((w, wi) => {
      const ww = `${where} mot ${wi + 1} (${w.no || '?'})`;
      ['no', 'fr', 'pron', 'ex', 'ex_fr'].forEach((k) => { if (!isStr(w[k])) err(`${ww} : champ « ${k} » manquant`); });
      if (!isStr(w.no)) return;
      totalWords++;
      const key = w.no.trim().toLowerCase();
      if (seenNo.has(key)) err(`${ww} : mot déjà vu dans ${seenNo.get(key)}`);
      else seenNo.set(key, `${f} leçon ${li + 1}`);
      const frKey = (w.fr || '').trim().toLowerCase();
      if (seenFr.has(frKey)) warn(`${ww} : traduction « ${w.fr} » déjà utilisée dans ${seenFr.get(frKey)} (exercices ambigus)`);
      else seenFr.set(frKey, `${f} leçon ${li + 1}`);
      if (/^(en|ei|et) /.test(w.no) === false && !/^å /.test(w.no) && /^[A-ZÆØÅ]/.test(w.no)) warn(`${ww} : majuscule inattendue`);
      if (isStr(w.pron) && !/[A-ZÆØÅÉÈÜÂ]/.test(w.pron)) err(`${ww} : prononciation sans syllabe accentuée en MAJUSCULES`);
      if (isStr(w.ex)) {
        const n = countWords(w.ex);
        if (n < 3 || n > 9) err(`${ww} : phrase d'exemple de ${n} mots (attendu 3–9)`);
        if (!/[.!?]$/.test(w.ex.trim())) warn(`${ww} : phrase d'exemple sans ponctuation finale`);
      }
    });
    const g = l.grammaire;
    if (!g || !isStr(g.titre) || !isStr(g.texte)) err(`${where} : grammaire incomplète`);
    else if (!Array.isArray(g.exemples) || g.exemples.length < 2 || !g.exemples.every((e) => isStr(e.no) && isStr(e.fr))) err(`${where} : au moins 2 exemples de grammaire (no/fr)`);
    checkText(`${where} texte`, l.texte, 40, 70, 2);
  });
  checkText(`${f} synthèse`, ch.synthese, 80, 120, 4);
}

console.log(`\n${ready} chapitre(s) écrit(s) · ${totalLessons} leçons · ${totalWords} mots · ${errors} erreur(s) · ${warnings} avertissement(s)`);
process.exit(errors ? 1 : 0);
