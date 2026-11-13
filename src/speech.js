// Reconnaissance vocale (si disponible).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canRecognize = () => !!SR;

export function listen() {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('indisponible'));
    const r = new SR();
    r.lang = 'nb-NO';
    r.interimResults = false;
    r.maxAlternatives = 3;
    let done = false;
    r.onresult = (e) => {
      done = true;
      const alts = [...e.results[0]].map((a) => a.transcript);
      resolve(alts);
    };
    r.onerror = (e) => { if (!done) { done = true; reject(new Error(e.error || 'erreur')); } };
    r.onend = () => { if (!done) { done = true; resolve([]); } };
    try { r.start(); } catch (e) { reject(e); }
  });
}
