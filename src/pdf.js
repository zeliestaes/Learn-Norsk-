// Génération du PDF d'un chapitre (vocabulaire, phrases, grammaire, textes), directement dans l'appli.
let libPromise = null;
function loadJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!libPromise) {
    libPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'assets/vendor/jspdf.umd.min.js';
      s.onload = () => res(window.jspdf.jsPDF);
      s.onerror = () => { libPromise = null; rej(new Error('Bibliothèque PDF introuvable (connexion nécessaire la première fois)')); };
      document.head.append(s);
    });
  }
  return libPromise;
}

// Les polices PDF standard gèrent le latin (æ ø å é è ü…) mais pas tous les symboles.
const MAP = { '−': '-', '→': '->', '←': '<-', '≈': '~', '✓': 'v', '’': "'", '‘': "'", ' ': ' ', ' ': ' ' };
const clean = (s) => String(s ?? '').replace(/[^\u0000-ÿ–—‘-”…•Œœ€]/g, (c) => MAP[c] ?? '?').replace(/[‘’]/g, "'");

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const INK = [47, 58, 74], SOFT = [107, 118, 134], BLUE = [60, 120, 165], GREEN = [63, 143, 107];

function buildDoc(jsPDF, ch) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15, W = 210, H = 297, CW = W - 2 * M;
  let y = M;
  const MM = 0.3528;

  const need = (h) => { if (y + h > H - 14) { doc.addPage(); y = M; } };
  const lines = (str, size, w, style = 'normal') => {
    doc.setFont('helvetica', style); doc.setFontSize(size);
    return doc.splitTextToSize(clean(str), w);
  };
  const put = (arr, x, size, style, color, lh) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color);
    arr.forEach((l, i) => doc.text(l, x, y + lh * (i + 0.8)));
  };
  const block = (str, { size = 10, style = 'normal', color = INK, x = M, w = CW - (x - M), gap = 1.5 } = {}) => {
    const lh = size * MM * 1.3;
    const arr = lines(str, size, w, style);
    need(arr.length * lh + gap);
    put(arr, x, size, style, color, lh);
    y += arr.length * lh + gap;
  };

  // --- Page de titre ---
  doc.setFillColor(198, 235, 217); doc.rect(0, 0, W, 38, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN);
  doc.text(clean(`NORSK-REISEN  ·  ETAPE ${ch.id}  ·  ${ch.etape.toUpperCase()}`), M, 14);
  doc.setFontSize(21); doc.setTextColor(...INK);
  doc.text(clean(ch.titre), M, 25);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SOFT);
  const nWords = ch.data.lecons.reduce((n, l) => n + l.mots.length, 0);
  doc.text(clean(`${nWords} mots · ${ch.data.lecons.length} leçons · prononciation : la syllabe accentuée est en MAJUSCULES`), M, 32);
  y = 46;

  // --- Leçons ---
  ch.data.lecons.forEach((l, li) => {
    need(40);
    doc.setFillColor(191, 223, 245); doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
    doc.text(clean(`Leçon ${li + 1} · ${l.titre}`), M + 3, y + 6.2);
    y += 13;

    block('Vocabulaire', { size: 11, style: 'bold', color: BLUE, gap: 1 });
    const cNo = 52, cPr = 46, cFr = CW - cNo - cPr - 4;
    l.mots.forEach((w) => {
      const a = lines(w.no, 11, cNo, 'bold'), b = lines(w.pron, 9.5, cPr), c = lines(w.fr, 10, cFr);
      const e = lines(`${w.ex}  —  ${w.ex_fr}`, 9, CW - 4, 'italic');
      const lhA = 11 * MM * 1.3, hA = Math.max(a.length * lhA, b.length * 9.5 * MM * 1.3, c.length * 10 * MM * 1.3);
      const hB = e.length * 9 * MM * 1.3;
      need(hA + hB + 3.5);
      put(a, M, 11, 'bold', INK, lhA);
      put(b, M + cNo + 2, 9.5, 'normal', BLUE, 9.5 * MM * 1.3);
      put(c, M + cNo + cPr + 4, 10, 'normal', INK, 10 * MM * 1.3);
      y += hA + 0.6;
      put(e, M + 2, 9, 'italic', SOFT, 9 * MM * 1.3);
      y += hB + 1.2;
      doc.setDrawColor(230, 225, 216); doc.setLineWidth(0.2); doc.line(M, y, M + CW, y);
      y += 1.8;
    });
    y += 2;

    if (l.grammaire) {
      const g = l.grammaire;
      block(`Grammaire : ${g.titre}`, { size: 11, style: 'bold', color: GREEN, gap: 1 });
      g.texte.split('\n').forEach((p) => block(p, { size: 10, gap: 1.2 }));
      g.exemples.forEach((e) => block(`•  ${e.no}  —  ${e.fr}`, { size: 10, x: M + 3, gap: 0.8 }));
      y += 3;
    }

    if (l.texte) {
      block('Texte', { size: 11, style: 'bold', color: BLUE, gap: 1 });
      l.texte.no.split('\n').forEach((p) => block(p, { size: 10, style: 'bold', gap: 0.8 }));
      y += 1;
      l.texte.fr.split('\n').forEach((p) => block(p, { size: 9.5, style: 'italic', color: SOFT, gap: 0.8 }));
      y += 6;
    }
  });

  // --- Synthèse ---
  const s = ch.data.synthese;
  if (s) {
    need(40);
    doc.setFillColor(255, 241, 189); doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
    doc.text('Synthèse du chapitre', M + 3, y + 6.2);
    y += 13;
    s.no.split('\n').forEach((p) => block(p, { size: 10, style: 'bold', gap: 0.8 }));
    y += 1;
    s.fr.split('\n').forEach((p) => block(p, { size: 9.5, style: 'italic', color: SOFT, gap: 0.8 }));
  }

  // --- Pieds de page ---
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...SOFT);
    doc.text(clean(`Norsk-reisen · Chapitre ${ch.id} : ${ch.titre}`), M, H - 8);
    doc.text(`${i} / ${n}`, W - M, H - 8, { align: 'right' });
  }
  return doc;
}

export async function downloadChapterPdf(ch) {
  if (!ch?.data) throw new Error('Chapitre indisponible');
  const jsPDF = await loadJsPdf();
  const doc = buildDoc(jsPDF, ch);
  const name = `norsk-chapitre-${String(ch.id).padStart(2, '0')}-${slug(ch.titre)}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], name, { type: 'application/pdf' });
  // Sur iPhone : feuille de partage (« Enregistrer dans Fichiers »…)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: ch.titre }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}
