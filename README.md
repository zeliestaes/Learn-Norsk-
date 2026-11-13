# Norsk-reisen 🏔️

Application web progressive (PWA) pour apprendre le norvégien (bokmål) jusqu'au niveau A2, en voyageant d'Oslo aux Lofoten.
Sans backend, sans dépendance : HTML + CSS + JavaScript (modules ES). Fonctionne hors ligne, installable sur iPhone.

## Lancer en local

```bash
python3 -m http.server 8000      # ou : npx serve .
# puis ouvrir http://localhost:8000
```

## Structure

```
index.html, manifest.webmanifest, sw.js   PWA
content/index.json                        liste des 34 chapitres (titre, étape de la carte, fichier)
content/chNN.json                         un fichier par chapitre (à corriger à la main si besoin)
src/                                      code (stockage, Leitner, XP, exercices, écrans…)
styles/main.css, assets/fonts/            thème pastel, police Nunito embarquée
scripts/validate-content.js               vérifie les JSON (champs, doublons, longueur des textes)
scripts/build-sw.js                       régénère la liste de fichiers hors ligne de sw.js
```

## Corriger ou ajouter du contenu

1. Modifie `content/chNN.json`. Chaque mot : `no`, `fr`, `pron`, `ex`, `ex_fr`.
   Noms avec article (`en kaffe`, `ei søster`, `et brød`), verbes avec `å`.
2. Pour publier un nouveau chapitre, mets son nom de fichier dans `content/index.json` (`"fichier": "ch07.json"`).
3. Vérifie : `npm run validate`.
4. ⚠️ Ne change pas l'**ordre** des mots dans une leçon : la progression de révision est liée à leur position.
   Corriger une faute dans un mot est sans risque.

## Déployer sur GitHub Pages

1. Fusionne la branche de travail dans `main` (Pull Request ou `git merge`).
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
3. Le workflow `.github/workflows/deploy.yml` se lance à chaque push sur `main` (onglet **Actions**).
   Il valide le contenu, régénère `sw.js` et publie le site.
4. L'adresse sera `https://<ton-compte>.github.io/<nom-du-depot>/`.

## Installer sur iPhone

Ouvre l'adresse dans **Safari** → bouton Partager ⬆️ → **Sur l'écran d'accueil**.
Lance l'appli une fois en ligne, elle fonctionnera ensuite hors ligne.
Voix norvégienne : Réglages iPhone → Accessibilité → Contenu énoncé → Voix → Norvégien → « Nora ».

## PDF par chapitre

Sur la page de chaque chapitre, le bouton **Télécharger le PDF** génère (dans l'appli, y compris hors ligne) un PDF avec le vocabulaire, les phrases d'exemple, la grammaire et les textes. Il se met à jour tout seul quand le contenu change. Bibliothèque : jsPDF (`assets/vendor/`).

## Sauvegarde

La progression est dans IndexedDB (sur l'appareil). Utilise **Réglages → Exporter** de temps en temps :
Safari peut effacer les données d'un site peu utilisé.
