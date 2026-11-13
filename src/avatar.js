// Petit personnage en SVG, avec tenues et accessoires.
export function avatarSVG(eq = {}, size = 64) {
  const top = {
    top_pull: '<rect x="28" y="52" width="44" height="40" rx="14" fill="#f3e9d9"/><path d="M28 66h44M28 74h44" stroke="#c8577f" stroke-width="4"/><path d="M36 60l4 4 4-4 4 4 4-4 4 4 4-4 4 4" stroke="#5a9bc4" stroke-width="2" fill="none"/>',
    top_cire: '<rect x="26" y="52" width="48" height="42" rx="12" fill="#ffd54f"/><path d="M50 52v42" stroke="#e0a800" stroke-width="2"/><circle cx="46" cy="68" r="2" fill="#e0a800"/><circle cx="46" cy="78" r="2" fill="#e0a800"/>',
    top_echarpe: '<rect x="28" y="52" width="44" height="40" rx="14" fill="#8ec5e8"/><path d="M32 54q18 12 36 0v8q-18 12-36 0z" fill="#e57373"/><rect x="58" y="60" width="9" height="22" rx="3" fill="#e57373"/>',
  }[eq.top] || '<rect x="28" y="52" width="44" height="40" rx="14" fill="#8ec5e8"/>';
  const hat = {
    hat_bonnet: '<path d="M33 30q0-20 17-20t17 20z" fill="#e57373"/><rect x="32" y="27" width="36" height="7" rx="3" fill="#fff"/><circle cx="50" cy="9" r="5" fill="#fff"/>',
    hat_viking: '<path d="M33 31q0-19 17-19t17 19z" fill="#9aa5b1"/><rect x="32" y="28" width="36" height="5" rx="2" fill="#6b7686"/><path d="M33 22q-12-2-11-14q6 6 12 8zM67 22q12-2 11-14q-6 6-12 8z" fill="#f3e9d9"/>',
    hat_chapeau: '<ellipse cx="50" cy="29" rx="26" ry="6" fill="#c9a26b"/><path d="M36 29q0-17 14-17t14 17z" fill="#d8b47e"/><rect x="36" y="24" width="28" height="4" fill="#8b6b3d"/>',
  }[eq.hat] || '<path d="M34 30q0-16 16-16t16 16q-16-8-32 0z" fill="#7a5a3c"/>';
  const acc = {
    acc_jumelles: '<rect x="38" y="66" width="10" height="14" rx="4" fill="#4a5568"/><rect x="52" y="66" width="10" height="14" rx="4" fill="#4a5568"/><rect x="46" y="70" width="8" height="4" fill="#4a5568"/>',
    acc_sac: '<rect x="66" y="56" width="14" height="30" rx="6" fill="#c9783f"/><rect x="66" y="64" width="14" height="5" fill="#a85f2c"/>',
    acc_appareil: '<rect x="56" y="72" width="18" height="12" rx="3" fill="#4a5568"/><circle cx="65" cy="78" r="4" fill="#cbd5e0"/>',
  }[eq.acc] || '';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="50" cy="95" rx="22" ry="4" fill="rgba(0,0,0,.08)"/>
    <rect x="34" y="88" width="12" height="8" rx="3" fill="#5b6b7c"/><rect x="54" y="88" width="12" height="8" rx="3" fill="#5b6b7c"/>
    ${top}
    <circle cx="50" cy="38" r="17" fill="#ffd9b8"/>
    ${hat}
    <circle cx="44" cy="40" r="2" fill="#2f3a4a"/><circle cx="56" cy="40" r="2" fill="#2f3a4a"/>
    <path d="M45 47q5 4 10 0" stroke="#2f3a4a" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${acc}
  </svg>`;
}
export const DECORS = {
  plaine: 'linear-gradient(#d9eefb,#e5f5dd)',
  aurore: 'linear-gradient(#2b3a67,#4c8f8a 60%,#b6e3c6)',
  fjord: 'linear-gradient(#cfe9f7,#8ec5e8 70%,#6fb0d6)',
  neige: 'linear-gradient(#eef3f9,#dfe8f2 70%,#fff)',
};
