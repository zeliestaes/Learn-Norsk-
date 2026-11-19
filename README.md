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

## Structure d'un chapitre

Les leçons (8 mots nouveaux chacune) alternent avec des **drills** : jamais deux paquets de mots à la suite sans entraînement.

- Chapitres 1 à 5 : leçon 1 → drill 1 → leçon 2 → drill 2 → entraînement « écouter » → entraînement « phrases » → synthèse (16 mots).
- Chapitres 6 et suivants : leçon 1 → drill 1 → leçon 2 → drill 2 → … → leçon 5 → **entraînement du chapitre** (tous les mots) → synthèse (40 mots).
- Chaque drill (≈ 27 exercices ; ≈ 36 pour celui du chapitre) reprend les mots de la leçon qui précède et ceux de la leçon d'avant, les plus fragiles d'abord. Aucun mot nouveau.
- Chaque leçon commence par un **rappel** (6 exercices sur la leçon précédente), présente les mots par paquets de 4 (reconnaissance puis production) et se termine par des exercices mélangés.
- Les drills sont répétables à volonté : **entraînement libre** et **drill par leçon** sur la page de chaque chapitre, **entraînement ciblé** dans Réviser.
- **Chapitres de révision** (★ sur la carte) après les chapitres 5, 10, 15, 20, 25 et 30 : résumé des 5 chapitres précédents + entraînement sur les mots fragiles, puis bilan à 70 % (coffre-surprise). Définis dans `content/index.json` (`revision`, `couvre`), générés à partir du contenu des chapitres.
- **Rythme quotidien** : seules les leçons, synthèses et révisions comptent dans le calendrier (une nouvelle par jour). Les drills s'ouvrent dès que la leçon correspondante est terminée et doivent être faits avant la leçon suivante : une journée = une leçon + son drill. Chapitres 6 à 34 + 5 révisions = 184 étapes, soit environ 45 jours d'avance sur le 30 juin 2027.

## Histoires (chapitres 6 et suivants)

Chaque chapitre à partir du 6 contient une **histoire à lire** et une **histoire audio** (lue par la voix norvégienne, avec transcription et traduction masquables), avec 3 questions de compréhension chacune. Elles réutilisent les mots du chapitre et s'ouvrent quand les leçons sont terminées. Dans le JSON : champ `histoires` → `lire` et `ecouter` (`titre`, `titre_fr`, `no`, `fr`, `aide`, `questions`). Pour l'audio, une réplique de dialogue = une ligne (`\n`). Les PDF de chapitre les incluent.

## Corriger ou ajouter du contenu

1. Modifie `content/chNN.json` (à partir du chapitre 6, n'oublie pas le champ `histoires`). Chaque mot : `no`, `fr`, `pron`, `ex`, `ex_fr`.
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

## Personnage et boutique

L'écran **Mon personnage** (gratuit) permet de choisir le genre, la peau, la coiffure (8), la couleur des cheveux (9) et des yeux (5). La **boutique** propose des tenues (dont le bunad, le pull de Setesdal, la tenue de ski, la tunique viking), des couvre-chefs, des accessoires de visage et 8 décors illustrés. Tout est dessiné en SVG dans `src/avatar.js` (aucune image externe).

## Sauvegarde

La progression est dans IndexedDB (sur l'appareil). Utilise **Réglages → Exporter** de temps en temps :
Safari peut effacer les données d'un site peu utilisé.
