// Synthèse vocale (voix norvégienne) + petits sons de réussite.
import { state } from './state.js';

let voices = [];
let ready = false;
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

function refresh() {
  if (!synth) return;
  voices = synth.getVoices().filter((v) => /^(nb|no|nn)([-_]|$)/i.test(v.lang) || /norw|norsk|nora|henrik|iselin/i.test(v.name));
  ready = true;
}
if (synth) {
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
}
export const norwegianVoices = () => { refresh(); return voices; };
export const hasVoice = () => !!synth && (voices.length > 0 || state.settings.forceAudio);
export const hasSynth = () => !!synth;

function chooseVoice() {
  if (!voices.length) return null;
  return voices.find((v) => v.name === state.settings.voice) || voices.find((v) => /nora/i.test(v.name)) || voices.find((v) => /^nb/i.test(v.lang)) || voices[0];
}

let current = null;
export function stop() { try { synth?.cancel(); } catch { /* ignoré */ } }

export function speak(text, { slow = false } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nb-NO';
    const v = chooseVoice();
    if (v) u.voice = v;
    u.rate = slow ? 0.55 : (state.settings.rate || 0.9);
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    current = u; // garde une référence (évite un bug de ramasse-miettes sur Safari)
    setTimeout(() => synth.speak(u), 30);
  });
}

// ----- Sons (WebAudio, aucun fichier) -----
let ctx = null;
function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  if (!state.settings.sound) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch { /* ignoré */ }
}
export const sfx = {
  good: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.18); },
  bad: () => { tone(220, 0, 0.22, 'triangle', 0.1); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25)); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.18, 'square', 0.05); },
};
