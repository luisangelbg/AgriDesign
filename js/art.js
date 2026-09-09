/* AgriDesign — SVG illustrations (no image files: the app works offline).
   Colours come from CSS classes (art-*) so the same drawing works in light and dark themes;
   a few fixed colours are used where the meaning is "treatment colour". */

const Art = {};
const TR = ['#2f7d4f', '#c8842a', '#2b7bb9', '#b5432f', '#7a5195', '#5aa469'];

/* tiny seeded RNG so randomised layouts are stable between renders */
function rnd(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function shuffled(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* a maize / cereal plant silhouette */
function plant(x, y, h, cls) {
  cls = cls || 'art-p';
  return `<g transform="translate(${x},${y})">
    <rect x="-1.2" y="${-h}" width="2.4" height="${h}" class="${cls}"/>
    <path d="M0 ${-h * 0.35} C ${-h * 0.35} ${-h * 0.45}, ${-h * 0.5} ${-h * 0.75}, ${-h * 0.42} ${-h * 0.95} C ${-h * 0.2} ${-h * 0.8}, ${-h * 0.1} ${-h * 0.55}, 0 ${-h * 0.45} Z" class="${cls}"/>
    <path d="M0 ${-h * 0.55} C ${h * 0.35} ${-h * 0.65}, ${h * 0.5} ${-h * 0.95}, ${h * 0.4} ${-h * 1.1} C ${h * 0.2} ${-h * 0.95}, ${h * 0.1} ${-h * 0.75}, 0 ${-h * 0.65} Z" class="${cls}"/>
    <path d="M0 ${-h * 0.8} C ${-h * 0.3} ${-h * 0.9}, ${-h * 0.4} ${-h * 1.15}, ${-h * 0.3} ${-h * 1.3} C ${-h * 0.15} ${-h * 1.15}, ${-h * 0.05} ${-h * 0.95}, 0 ${-h * 0.85} Z" class="${cls}"/>
    <ellipse cx="0" cy="${-h * 1.05}" rx="${h * 0.09}" ry="${h * 0.22}" class="art-a"/>
  </g>`;
}

/* ================= brand mark ================= */
Art.logo = () => `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="2" y="2" width="36" height="36" rx="9" class="art-p"/>
  <g fill="#ffffff" opacity="0.95">
    <rect x="8" y="8" width="10" height="10" rx="2"/>
    <rect x="22" y="8" width="10" height="10" rx="2" opacity="0.55"/>
    <rect x="8" y="22" width="10" height="10" rx="2" opacity="0.55"/>
    <rect x="22" y="22" width="10" height="10" rx="2"/>
  </g>
  <path d="M20 31 C 20 22, 26 17, 33 16 C 32 24, 27 30, 20 31 Z" fill="#e0b04c"/>
</svg>`;

/* ================= hero ================= */
Art.hero = () => {
  const r = rnd(7);
  const blocks = 4, trts = 4;
  let plots = '';
  const px = 60, py = 150, pw = 68, ph = 34, gap = 6;
  for (let b = 0; b < blocks; b++) {
    const order = shuffled([0, 1, 2, 3], r);
    for (let t = 0; t < trts; t++) {
      const x = px + t * (pw + gap), y = py + b * (ph + gap);
      const col = TR[order[t]];
      plots += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="4" fill="${col}" opacity="0.9"/>
        <text x="${x + pw / 2}" y="${y + ph / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Segoe UI, Helvetica, Arial, sans-serif">T${order[t] + 1}</text>`;
      /* seedlings rows */
      for (let k = 0; k < 3; k++) plots += `<circle cx="${x + 12 + k * 22}" cy="${y + ph - 7}" r="2.2" fill="#fff" opacity="0.55"/>`;
    }
    plots += `<text x="${px - 10}" y="${py + b * (ph + gap) + ph / 2 + 4}" text-anchor="end" font-size="11" class="art-mut" font-family="Segoe UI, Helvetica, Arial, sans-serif">Block ${b + 1}</text>`;
  }
  /* bar chart card with letters */
  const means = [62, 78, 71, 55], letters = ['bc', 'a', 'ab', 'c'], se = [5, 4, 6, 5];
  let bars = '';
  const cx = 400, cy = 120, cw = 150, ch = 100;
  means.forEach((m, i) => {
    const bw = 26, x = cx + 14 + i * 34, h = m / 90 * ch, y = cy + ch - h;
    bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${TR[i]}"/>
      <line x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${y - se[i]}" y2="${y + se[i]}" stroke="#333" stroke-width="1.4"/>
      <line x1="${x + bw / 2 - 5}" x2="${x + bw / 2 + 5}" y1="${y - se[i]}" y2="${y - se[i]}" stroke="#333" stroke-width="1.4"/>
      <text x="${x + bw / 2}" y="${y - se[i] - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="#333" font-family="Segoe UI, Helvetica, Arial, sans-serif">${letters[i]}</text>`;
  });
  return `<svg viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Randomised field layout and a treatment means chart">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bfe0f7"/><stop offset="1" stop-color="#eaf5ec"/></linearGradient>
    <linearGradient id="hill" x1="0" x2="1"><stop offset="0" stop-color="#5aa469"/><stop offset="1" stop-color="#2f7d4f"/></linearGradient>
    <linearGradient id="soilg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a8754f"/><stop offset="1" stop-color="#6b4630"/></linearGradient>
    <filter id="sh" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.18"/></filter>
  </defs>
  <rect x="0" y="0" width="600" height="380" rx="18" fill="url(#sky)"/>
  <circle cx="520" cy="58" r="26" fill="#f6c453" opacity="0.95"/>
  <path d="M0 150 C 120 100, 220 120, 330 100 C 430 82, 520 96, 600 80 L600 190 L0 190 Z" fill="url(#hill)" opacity="0.85"/>
  <path d="M0 175 C 90 160, 200 172, 300 160 C 420 145, 500 165, 600 150 L600 380 L0 380 Z" fill="url(#soilg)"/>
  <g opacity="0.9">
    <path d="M40 380 L 120 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/><path d="M120 380 L 175 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/>
    <path d="M200 380 L 230 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/><path d="M280 380 L 285 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/>
    <path d="M360 380 L 340 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/><path d="M440 380 L 395 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/>
    <path d="M520 380 L 450 300" stroke="#3f2a1c" stroke-width="2" opacity="0.5"/>
  </g>
  <rect x="48" y="138" width="316" height="182" rx="12" fill="#ffffff" opacity="0.93" filter="url(#sh)"/>
  <text x="60" y="130" font-size="11" font-weight="700" fill="#2b2b28" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1.5">RANDOMISED COMPLETE BLOCK DESIGN</text>
  ${plots}
  <rect x="${cx}" y="${cy - 30}" width="${cw + 30}" height="${ch + 62}" rx="12" fill="#ffffff" opacity="0.95" filter="url(#sh)"/>
  <text x="${cx + 14}" y="${cy - 12}" font-size="10" font-weight="700" fill="#2b2b28" font-family="Segoe UI, Helvetica, Arial, sans-serif" letter-spacing="1.2">YIELD (t/ha) · TUKEY HSD</text>
  <line x1="${cx + 8}" x2="${cx + cw + 20}" y1="${cy + ch}" y2="${cy + ch}" stroke="#999" stroke-width="1"/>
  ${bars}
  ${plant(30, 330, 34)}${plant(58, 345, 40)}${plant(578, 338, 38)}${plant(552, 352, 30)}
  ${plant(470, 300, 24, 'art-p2')}${plant(500, 296, 22, 'art-p2')}
</svg>`;
};

/* ================= block feature thumbnails ================= */
Art.block = n => {
  const F = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
  switch (n) {
    case 2: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="14" width="144" height="82" rx="8" class="art-card"/>
      ${[0, 1, 2, 3].map(i => `<rect x="36" y="${24 + i * 16}" width="128" height="12" rx="2" fill="${i === 0 ? '#2f7d4f' : '#2f7d4f'}" opacity="${i === 0 ? 0.9 : 0.14}"/>`).join('')}
      ${[0, 1, 2].map(j => `<line x1="${72 + j * 32}" x2="${72 + j * 32}" y1="24" y2="88" class="art-line" stroke-width="1" opacity="0.5"/>`).join('')}
      <circle cx="160" cy="88" r="16" class="art-a"/><path d="M160 80 v16 M153 87 l7 -7 l7 7" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`;
    case 3: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      ${[12, 30, 52, 70, 58, 38, 20, 10].map((h, i) => `<rect x="${22 + i * 16}" y="${92 - h}" width="13" height="${h}" rx="2" fill="${TR[0]}" opacity="${0.55 + i * 0.05}"/>`).join('')}
      <path d="M22 84 C 60 80, 80 20, 100 22 C 120 24, 140 82, 172 88" class="art-line" stroke="#c8842a" stroke-width="2.5" fill="none"/>
      <rect x="150" y="30" width="30" height="34" rx="3" fill="#2b7bb9" opacity="0.85"/><line x1="150" x2="180" y1="46" y2="46" stroke="#fff" stroke-width="2"/>
      <line x1="165" x2="165" y1="18" y2="30" stroke="#2b7bb9" stroke-width="2"/><line x1="165" x2="165" y1="64" y2="78" stroke="#2b7bb9" stroke-width="2"/>
    </svg>`;
    case 4: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" x2="170" y1="90" y2="20" class="art-line" stroke-width="2" stroke-dasharray="4 4"/>
      ${[[34, 90], [48, 78], [62, 72], [76, 62], [90, 58], [104, 50], [118, 44], [132, 36], [146, 30], [160, 18]].map(([x, y], i) => `<circle cx="${x}" cy="${y + (i % 2 ? 4 : -4)}" r="4.5" fill="${TR[0]}"/>`).join('')}
      <path d="M120 100 q 18 -40 36 0" class="art-a" opacity="0.5"/>
      <text x="40" y="24" font-size="12" font-weight="700" ${F} class="art-txt">Q–Q · Shapiro · Levene</text>
    </svg>`;
    case 5: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      ${[[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2]].map((row, i) => row.map((t, j) => `<rect x="${44 + j * 29}" y="${8 + i * 24}" width="26" height="21" rx="4" fill="${TR[t]}"/><text x="${57 + j * 29}" y="${23 + i * 24}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" ${F}>${'ABCD'[t]}</text>`).join('')).join('')}
    </svg>`;
    case 6: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      ${[[58, 'b'], [86, 'a'], [70, 'ab'], [40, 'c'], [76, 'a']].map(([h, l], i) => `<rect x="${28 + i * 30}" y="${96 - h}" width="22" height="${h}" rx="3" fill="${TR[i]}"/><line x1="${39 + i * 30}" x2="${39 + i * 30}" y1="${90 - h}" y2="${102 - h}" stroke="#333" stroke-width="1.5"/><text x="${39 + i * 30}" y="${86 - h}" text-anchor="middle" font-size="10" font-weight="700" ${F} class="art-txt">${l}</text>`).join('')}
      <line x1="22" x2="182" y1="96" y2="96" class="art-line" stroke-width="1.5"/>
    </svg>`;
    case 7: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="18" width="90" height="70" rx="6" class="art-card"/><path d="M36 82 L60 52 L78 68 L96 40 L114 82 Z" fill="${TR[0]}" opacity="0.8"/><circle cx="100" cy="34" r="7" class="art-a"/>
      <g ${F} font-size="9" font-weight="700"><rect x="132" y="22" width="44" height="16" rx="4" fill="#2b7bb9"/><text x="154" y="33" text-anchor="middle" fill="#fff">PNG 600</text>
      <rect x="132" y="44" width="44" height="16" rx="4" fill="#2f7d4f"/><text x="154" y="55" text-anchor="middle" fill="#fff">TIFF</text>
      <rect x="132" y="66" width="44" height="16" rx="4" fill="#c8842a"/><text x="154" y="77" text-anchor="middle" fill="#fff">SVG</text></g>
    </svg>`;
    case 8: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="56" y="10" width="88" height="92" rx="6" class="art-card"/>
      <rect x="66" y="22" width="50" height="6" rx="2" fill="${TR[0]}"/>
      ${[0, 1, 2, 3].map(i => `<rect x="66" y="${36 + i * 9}" width="${68 - (i % 2) * 12}" height="4" rx="2" class="art-mut" opacity="0.5"/>`).join('')}
      <rect x="66" y="74" width="30" height="18" rx="2" fill="${TR[1]}" opacity="0.8"/><rect x="100" y="80" width="34" height="12" rx="2" fill="${TR[2]}" opacity="0.6"/>
    </svg>`;
    default: return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 80 C 60 60, 120 70, 200 55 L200 110 L0 110Z" fill="#8c5a3c"/>
      ${plant(50, 88, 40)}${plant(100, 84, 46)}${plant(150, 90, 38)}
      <circle cx="170" cy="26" r="14" fill="#f6c453"/>
    </svg>`;
  }
};

/* ================= design layouts ================= */
Art.design = id => {
  const F = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
  const cell = (x, y, w, h, t, label, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${TR[t % TR.length]}" ${extra || ''}/><text x="${x + w / 2}" y="${y + h / 2 + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" ${F}>${label}</text>`;
  let body = '';
  const r = rnd(id.length * 31 + 5);
  if (id === 'crd') {
    const order = shuffled([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], r);
    order.forEach((t, i) => { body += cell(10 + (i % 4) * 46, 8 + Math.floor(i / 4) * 27, 42, 23, t, 'T' + (t + 1)); });
  } else if (id === 'rcbd') {
    for (let b = 0; b < 4; b++) {
      const o = shuffled([0, 1, 2, 3], r);
      body += `<text x="8" y="${23 + b * 27}" font-size="8" class="art-mut" ${F}>B${b + 1}</text>`;
      o.forEach((t, i) => { body += cell(24 + i * 43, 8 + b * 27, 39, 23, t, 'T' + (t + 1)); });
    }
  } else if (id === 'latin') {
    const L = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2]];
    L.forEach((row, i) => row.forEach((t, j) => { body += cell(24 + j * 43, 8 + i * 27, 39, 23, t, 'ABCD'[t]); }));
    for (let i = 0; i < 4; i++) body += `<text x="8" y="${23 + i * 27}" font-size="8" class="art-mut" ${F}>R${i + 1}</text>`;
  } else if (id === 'factorial') {
    const combos = shuffled([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5], r);
    combos.forEach((c, i) => { const a = Math.floor(c / 3), b = c % 3; body += cell(10 + (i % 4) * 46, 8 + Math.floor(i / 4) * 36, 42, 32, a === 0 ? b : b + 3, `A${a + 1}B${b + 1}`); });
  } else if (id === 'split') {
    for (let b = 0; b < 2; b++) {
      const mains = shuffled([0, 1], r);
      mains.forEach((m, mi) => {
        const x = 10 + (b * 2 + mi) * 46;
        body += `<rect x="${x - 2}" y="6" width="44" height="106" rx="5" fill="${TR[m]}" opacity="0.25"/><text x="${x + 20}" y="17" text-anchor="middle" font-size="8" font-weight="700" ${F} class="art-txt">A${m + 1}</text>`;
        shuffled([0, 1, 2, 3], r).forEach((s, si) => { body += cell(x, 22 + si * 22, 40, 19, m, 'b' + (s + 1)); });
      });
    }
  } else if (id === 'strip') {
    const rows = shuffled([0, 1, 2], r), cols = shuffled([0, 1, 2, 3], r);
    rows.forEach((a, i) => cols.forEach((b, j) => { body += `<rect x="${10 + j * 46}" y="${8 + i * 36}" width="42" height="32" rx="3" fill="${TR[a]}"/><rect x="${10 + j * 46}" y="${8 + i * 36}" width="42" height="32" rx="3" fill="${TR[b + 2]}" opacity="0.45"/><text x="${31 + j * 46}" y="${27 + i * 36}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#fff" ${F}>A${a + 1}B${b + 1}</text>`; }));
  } else if (id === 'lattice') {
    for (let b = 0; b < 3; b++) {
      body += `<text x="8" y="${24 + b * 36}" font-size="8" class="art-mut" ${F}>R${b + 1}</text>`;
      for (let k = 0; k < 3; k++) {
        body += `<rect x="${22 + k * 60}" y="${8 + b * 36}" width="56" height="32" rx="4" fill="none" class="art-line" stroke-dasharray="3 2"/>`;
        for (let j = 0; j < 3; j++) body += cell(25 + k * 60 + j * 17.5, 12 + b * 36, 15, 24, (b + k + j) % 6, '');
      }
    }
  } else if (id === 'augmented') {
    for (let i = 0; i < 16; i++) { const isCheck = i % 5 === 0 || i === 7 || i === 14; body += cell(10 + (i % 4) * 46, 8 + Math.floor(i / 4) * 27, 42, 23, isCheck ? 1 : 0, isCheck ? 'Chk' : 'g' + i, isCheck ? '' : 'opacity="0.55"'); }
  } else if (id === 'repeated') {
    for (let s = 0; s < 4; s++) { body += `<text x="10" y="${22 + s * 26}" font-size="8" class="art-mut" ${F}>S${s + 1}</text>`; for (let t = 0; t < 4; t++) body += cell(26 + t * 42, 8 + s * 26, 38, 22, t, 't' + (t + 1)); }
  } else if (id === 'nested') {
    for (let a = 0; a < 2; a++) { body += `<rect x="${8 + a * 96}" y="6" width="90" height="106" rx="6" fill="${TR[a]}" opacity="0.2"/><text x="${53 + a * 96}" y="18" text-anchor="middle" font-size="8" font-weight="700" ${F} class="art-txt">A${a + 1}</text>`; for (let b = 0; b < 2; b++) { body += `<rect x="${12 + a * 96 + b * 44}" y="24" width="40" height="84" rx="4" fill="${TR[a]}" opacity="0.3"/>`; for (let k = 0; k < 3; k++) body += cell(15 + a * 96 + b * 44, 30 + k * 26, 34, 22, a, `B${b + 1}`); } }
  } else if (id === 'bibd') {
    const blocks = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
    blocks.forEach((bl, i) => { body += `<text x="8" y="${23 + i * 27}" font-size="8" class="art-mut" ${F}>B${i + 1}</text>`; bl.forEach((t, j) => { body += cell(24 + j * 43, 8 + i * 27, 39, 23, t, 'T' + (t + 1)); }); body += `<rect x="${24 + 3 * 43}" y="${8 + i * 27}" width="39" height="23" rx="3" fill="none" class="art-line" stroke-dasharray="3 2"/>`; });
  }
  return `<svg viewBox="0 0 200 118" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
};

/* ================= misc icons ================= */
Art.upload = () => `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="24" class="art-p" opacity="0.15"/><path d="M26 36 V16 M17 25 l9 -9 l9 9" stroke="#2f7d4f" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 38 h22" stroke="#2f7d4f" stroke-width="3.2" stroke-linecap="round"/></svg>`;
Art.soon = () => `<svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg"><path d="M0 95 C 40 80, 100 90, 180 78 L180 120 L0 120Z" fill="#8c5a3c" opacity="0.8"/>${plant(50, 100, 22)}${plant(90, 98, 30)}${plant(130, 102, 26)}<circle cx="150" cy="30" r="12" fill="#f6c453"/><text x="90" y="24" text-anchor="middle" font-size="12" font-family="Segoe UI, Helvetica, Arial, sans-serif" class="art-mut">growing…</text></svg>`;

/* good-experiment principles icons (Fisher) */
Art.principle = which => {
  const F = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
  if (which === 'replication') return `<svg class="inline-art" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">${[0, 1, 2, 3].map(i => `<rect x="${10 + i * 52}" y="20" width="46" height="46" rx="6" fill="${TR[0]}" opacity="${0.9 - i * 0.12}"/><text x="${33 + i * 52}" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" ${F}>T1</text>`).join('')}<text x="110" y="84" text-anchor="middle" font-size="10" class="art-mut" ${F}>the same treatment on r independent units</text></svg>`;
  if (which === 'randomization') { const r = rnd(3); const o = shuffled([0, 1, 2, 3, 0, 1, 2, 3], r); return `<svg class="inline-art" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">${o.map((t, i) => `<rect x="${10 + (i % 4) * 52}" y="${8 + Math.floor(i / 4) * 34}" width="46" height="30" rx="5" fill="${TR[t]}"/><text x="${33 + (i % 4) * 52}" y="${27 + Math.floor(i / 4) * 34}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" ${F}>T${t + 1}</text>`).join('')}<text x="110" y="86" text-anchor="middle" font-size="10" class="art-mut" ${F}>assignment by chance, not by convenience</text></svg>`; }
  return `<svg class="inline-art" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0" x2="1"><stop offset="0" stop-color="#6b4630"/><stop offset="1" stop-color="#d9c8a9"/></linearGradient></defs><rect x="8" y="8" width="204" height="60" rx="6" fill="url(#grad)" opacity="0.7"/>${[0, 1, 2, 3].map(b => `<rect x="${12 + b * 50}" y="12" width="46" height="52" rx="4" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/><text x="${35 + b * 50}" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" ${F}>Block ${b + 1}</text>`).join('')}<text x="110" y="84" text-anchor="middle" font-size="10" class="art-mut" ${F}>blocks follow the fertility / moisture gradient</text></svg>`;
};

window.Art = Art;
