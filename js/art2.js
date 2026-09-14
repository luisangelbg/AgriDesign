/* AgriDesign — crops, animals and the home-page scene.
   Flat vector icons, each drawn in its own 0–100 box; colours are literal because they mean
   "this crop", not "this theme". Loaded after art.js; overrides Art.hero. */

(function () {
const TR = ['#2f7d4f', '#c8842a', '#2b7bb9', '#b5432f'];
const CR = { leaf: '#3f8f4f', leafD: '#2f6d3c', leafL: '#6cbf6a', stem: '#4d7c3a', red: '#d63b2f', redD: '#a52a21', green: '#4b9d3e', yellow: '#f2c14e', white: '#fbfbf6', cream: '#f6f1e6', dark: '#2b2b2b', pink: '#e9a1b0', cowB: '#3a3a3a', goat: '#b07a4a', goatD: '#8a5a33' };
const F = 'font-family="Segoe UI, Helvetica, Arial, sans-serif"';
function rnd(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function shuffled(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const leaf = (x, y, w, h, rot, col) => `<path d="M${x} ${y} C ${x + w * 0.5} ${y - h}, ${x + w} ${y - h * 0.4}, ${x + w} ${y} C ${x + w} ${y + h * 0.4}, ${x + w * 0.5} ${y + h}, ${x} ${y} Z" fill="${col || CR.leaf}" transform="rotate(${rot || 0} ${x} ${y})"/><path d="M${x} ${y} L${x + w} ${y}" stroke="${CR.leafD}" stroke-width="0.8" opacity="0.6" transform="rotate(${rot || 0} ${x} ${y})"/>`;
const flower = (cx, cy, r, petal, centre, n) => { let s = ''; const k = n || 5; for (let i = 0; i < k; i++) s += `<ellipse cx="${cx}" cy="${cy - r * 0.62}" rx="${r * 0.34}" ry="${r * 0.62}" fill="${petal}" transform="rotate(${(360 / k) * i} ${cx} ${cy})"/>`; return s + `<circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="${centre}"/>`; };
const inner = svg => svg.replace(/<svg[^>]*>|<\/svg>/g, '');
const place = (svg, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${inner(svg)}</g>`;

Art.crop = {
  /* chile pepper: plant with a white flower and two pods */
  chile: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 92 C 50 70, 48 55, 50 34" stroke="${CR.stem}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M50 60 C 40 56, 32 50, 28 42" stroke="${CR.stem}" stroke-width="2.2" fill="none"/><path d="M50 52 C 60 48, 68 44, 72 36" stroke="${CR.stem}" stroke-width="2.2" fill="none"/>
    ${leaf(28, 42, 20, 7, -40)}${leaf(72, 36, 20, 7, 210, CR.leafD)}${leaf(50, 34, 18, 6, -70)}${leaf(50, 34, 18, 6, 250, CR.leafL)}${leaf(44, 72, 16, 6, 200, CR.leafD)}${leaf(56, 78, 16, 6, -20)}
    <path d="M34 44 C 28 56, 30 70, 38 78 C 44 70, 42 56, 36 46 Z" fill="${CR.red}"/><path d="M34 44 c 2 6, 2 20, 4 34" stroke="${CR.redD}" stroke-width="1" fill="none" opacity=".6"/><path d="M31 43 l6 0 l-2 -5 z" fill="${CR.stem}"/>
    <path d="M66 40 C 74 50, 72 64, 64 72 C 60 62, 58 50, 62 42 Z" fill="${CR.green}"/><path d="M69 39 l-6 1 l2 -5 z" fill="${CR.stem}"/>
    ${flower(50, 24, 9, CR.white, CR.yellow)}
  </svg>`,
  /* tomato: vine with a yellow star flower and a ripe fruit */
  tomato: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M46 94 C 44 72, 42 56, 46 30" stroke="${CR.stem}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M45 62 C 36 58, 30 52, 26 46" stroke="${CR.stem}" stroke-width="2" fill="none"/><path d="M45 44 C 54 40, 62 36, 70 30" stroke="${CR.stem}" stroke-width="2" fill="none"/>
    ${leaf(26, 46, 14, 5, -30)}${leaf(26, 46, 12, 5, 200, CR.leafD)}${leaf(70, 30, 14, 5, 200, CR.leafD)}${leaf(70, 30, 12, 5, -15)}${leaf(46, 30, 14, 5, -60, CR.leafL)}
    <circle cx="62" cy="72" r="17" fill="${CR.red}"/><circle cx="56" cy="66" r="5" fill="#fff" opacity=".35"/>
    <path d="M62 56 l-8 -4 l6 6 l-9 1 l9 3 l-6 6 l8 -4 l8 4 l-6 -6 l9 -3 l-9 -1 l6 -6 z" fill="${CR.leafD}"/><path d="M62 52 l0 -6" stroke="${CR.stem}" stroke-width="2"/>
    ${flower(30, 24, 8, CR.yellow, '#b8860b', 6)}
  </svg>`,
  /* coffee: branch with paired glossy leaves, white flower clusters and red cherries */
  coffee: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 62 C 30 58, 60 50, 94 40" stroke="#6b4a2b" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    ${leaf(22, 58, 24, 8, -35, CR.leafD)}${leaf(22, 58, 22, 8, 150, CR.leaf)}${leaf(50, 51, 24, 8, -35, CR.leafD)}${leaf(50, 51, 22, 8, 150, CR.leaf)}${leaf(78, 44, 22, 8, -35, CR.leafD)}${leaf(78, 44, 20, 8, 150, CR.leaf)}
    ${[[36, 55], [40, 52], [33, 59], [64, 47], [68, 44], [61, 51]].map(([x, y]) => flower(x, y, 5, CR.white, CR.yellow)).join('')}
    ${[[44, 60], [48, 66], [41, 67], [70, 52], [75, 57], [66, 58]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${i % 3 === 2 ? CR.green : CR.red}"/><circle cx="${x - 1.2}" cy="${y - 1.2}" r="1.2" fill="#fff" opacity=".45"/>`).join('')}
  </svg>`,
  /* maize: stalk with leaves, tassel and an ear */
  maize: () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 96 L50 22" stroke="${CR.stem}" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 70 C 30 66, 18 56, 14 42 C 30 46, 42 56, 50 66 Z" fill="${CR.leaf}"/><path d="M50 58 C 68 54, 82 44, 86 30 C 70 34, 58 44, 50 54 Z" fill="${CR.leafD}"/>
    <path d="M50 44 C 34 40, 26 30, 24 18 C 38 22, 46 32, 50 40 Z" fill="${CR.leafL}"/><path d="M50 84 C 66 82, 78 74, 82 62 C 66 66, 56 74, 50 80 Z" fill="${CR.leaf}"/>
    <g stroke="${CR.yellow}" stroke-width="2" stroke-linecap="round" fill="none"><path d="M50 22 L50 6"/><path d="M50 20 L40 8"/><path d="M50 20 L60 8"/><path d="M50 18 L34 14"/><path d="M50 18 L66 14"/></g>
    <g transform="translate(60 52) rotate(20)"><path d="M0 0 C 8 -2, 12 8, 10 24 C 8 32, 2 34, 0 34 C -2 34, -8 32, -10 24 C -12 8, -8 -2, 0 0 Z" fill="${CR.yellow}"/><path d="M-8 4 C -6 14, -6 24, -4 32 M0 2 C 0 14, 0 24, 0 34 M8 4 C 6 14, 6 24, 4 32" stroke="#c9961f" stroke-width="1" fill="none"/><path d="M-10 20 C -16 12, -14 2, -6 -4 C -4 6, -4 14, -6 24 Z" fill="${CR.leafD}"/><path d="M10 20 C 16 12, 14 2, 6 -4 C 4 6, 4 14, 6 24 Z" fill="${CR.leaf}"/></g>
  </svg>`,
};

Art.animal = {
  /* cow, side view */
  cow: () => `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><g stroke="${CR.cowB}" stroke-width="1.2">
    <rect x="36" y="64" width="7" height="24" rx="3" fill="${CR.cream}"/><rect x="52" y="66" width="7" height="22" rx="3" fill="${CR.cream}"/><rect x="74" y="64" width="7" height="24" rx="3" fill="${CR.cream}"/><rect x="90" y="66" width="7" height="22" rx="3" fill="${CR.cream}"/>
    <path d="M30 40 C 30 26, 46 22, 66 24 L 96 24 C 108 24, 110 34, 108 48 L 106 64 C 104 70, 96 70, 88 68 L 42 68 C 32 68, 28 60, 30 40 Z" fill="${CR.cream}"/>
    <path d="M44 30 C 52 26, 62 30, 60 42 C 58 52, 44 52, 40 44 C 36 38, 38 32, 44 30 Z" fill="${CR.cowB}" stroke="none"/><path d="M78 44 C 90 40, 100 46, 98 56 C 96 64, 82 64, 78 58 C 74 52, 72 46, 78 44 Z" fill="${CR.cowB}" stroke="none"/>
    <path d="M100 26 C 112 20, 120 30, 118 44 C 116 52, 108 54, 104 52 L 100 46 Z" fill="${CR.cream}"/><ellipse cx="114" cy="48" rx="7" ry="5" fill="${CR.pink}" stroke="none"/><circle cx="108" cy="36" r="1.8" fill="${CR.cowB}" stroke="none"/>
    <path d="M104 26 C 100 18, 104 14, 108 20" fill="none"/><path d="M114 24 C 118 16, 124 18, 120 26" fill="none"/><path d="M98 30 C 92 30, 90 34, 94 36" fill="${CR.cream}"/>
    <path d="M30 42 C 22 44, 22 56, 26 62" fill="none"/><path d="M26 62 l-3 5" stroke-width="2.5"/>
    <path d="M60 68 C 60 74, 72 76, 74 68" fill="${CR.pink}"/>
  </g></svg>`,
  /* sheep: fluffy body, dark face and legs */
  sheep: () => `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="${CR.cowB}"><rect x="34" y="66" width="6" height="22" rx="3"/><rect x="50" y="68" width="6" height="20" rx="3"/><rect x="72" y="66" width="6" height="22" rx="3"/><rect x="88" y="68" width="6" height="20" rx="3"/></g>
    ${[[40, 44, 14], [54, 36, 15], [70, 36, 15], [86, 42, 13], [44, 58, 13], [60, 62, 14], [78, 60, 14], [92, 56, 12], [66, 48, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CR.white}" stroke="#d8d4c4" stroke-width="1"/>`).join('')}
    <path d="M92 40 C 104 34, 114 42, 112 54 C 110 62, 100 64, 96 60 C 92 56, 90 48, 92 40 Z" fill="${CR.cowB}"/><circle cx="106" cy="48" r="1.8" fill="#fff"/><ellipse cx="94" cy="40" rx="6" ry="3" fill="${CR.cowB}" transform="rotate(-30 94 40)"/><ellipse cx="108" cy="38" rx="6" ry="3" fill="${CR.cowB}" transform="rotate(20 108 38)"/>
    ${[[98, 34, 7], [106, 32, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CR.white}" stroke="#d8d4c4" stroke-width="1"/>`).join('')}
  </svg>`,
  /* goat: brown body, beard, backswept horns */
  goat: () => `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <g fill="${CR.goatD}"><rect x="36" y="62" width="6" height="26" rx="3"/><rect x="50" y="64" width="6" height="24" rx="3"/><rect x="74" y="62" width="6" height="26" rx="3"/><rect x="88" y="64" width="6" height="24" rx="3"/></g>
    <path d="M32 44 C 34 30, 50 28, 70 30 L 94 30 C 104 30, 106 40, 104 50 L 102 62 C 100 68, 92 68, 84 66 L 44 66 C 34 66, 30 56, 32 44 Z" fill="${CR.goat}"/>
    <path d="M96 32 C 108 26, 118 34, 116 46 C 114 54, 106 56, 102 52 L 98 44 Z" fill="${CR.goat}"/><circle cx="108" cy="40" r="1.8" fill="${CR.dark}"/>
    <path d="M104 30 C 100 18, 92 14, 88 22" stroke="${CR.goatD}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M110 28 C 108 16, 100 12, 96 20" stroke="${CR.goatD}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M114 52 l2 10 l4 -8" fill="${CR.goatD}"/><path d="M96 36 C 90 34, 86 38, 90 42" fill="${CR.goat}" stroke="${CR.goatD}" stroke-width="1"/>
    <path d="M34 42 C 30 34, 34 30, 38 36" stroke="${CR.goatD}" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,
};

/* the signature image: a blocked field trial, the crops in front, the herd in the paddock, the means card */
Art.hero = () => {
  const r = rnd(11);
  let plots = '';
  const bx = 150, by = 118, pw = 54, ph = 22, gap = 5;
  for (let b = 0; b < 3; b++) {
    const order = shuffled([0, 1, 2, 3], r);
    for (let t = 0; t < 4; t++) {
      const x = bx + t * (pw + gap), y = by + b * (ph + gap);
      plots += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="3" fill="${TR[order[t]]}" opacity="0.9"/><text x="${x + pw / 2}" y="${y + 15}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" ${F}>T${order[t] + 1}</text>`;
    }
    plots += `<text x="${bx - 6}" y="${by + b * (ph + gap) + 15}" text-anchor="end" font-size="9" fill="#5b5b55" ${F}>Block ${b + 1}</text>`;
  }
  const means = [58, 82, 73, 66], letters = ['c', 'a', 'b', 'bc'];
  let bars = '';
  const cx = 420, cy = 62, ch = 70;
  means.forEach((m, i) => { const w = 22, x = cx + 10 + i * 30, h = m / 90 * ch, y = cy + ch - h; bars += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${TR[i]}"/><line x1="${x + 11}" x2="${x + 11}" y1="${y - 5}" y2="${y + 5}" stroke="#333" stroke-width="1.3"/><text x="${x + 11}" y="${y - 8}" text-anchor="middle" font-size="9" font-weight="700" fill="#333" ${F}>${letters[i]}</text>`; });
  return `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A blocked field trial with maize, chile, tomato and coffee, a paddock with a cow, a sheep and a goat, and a chart of treatment means">
  <defs>
    <linearGradient id="hsky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfe7f6"/><stop offset="1" stop-color="#edf5ea"/></linearGradient>
    <linearGradient id="hhill" x1="0" x2="1"><stop offset="0" stop-color="#6fb27a"/><stop offset="1" stop-color="#3f8f4f"/></linearGradient>
    <linearGradient id="hsoil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a97a55"/><stop offset="1" stop-color="#6e4a32"/></linearGradient>
    <linearGradient id="hgrass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9ccf7a"/><stop offset="1" stop-color="#6aa95a"/></linearGradient>
    <filter id="hsh" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity="0.16"/></filter>
  </defs>
  <rect x="0" y="0" width="600" height="400" rx="18" fill="url(#hsky)"/>
  <circle cx="530" cy="46" r="24" fill="#f6c453"/>
  <path d="M0 150 C 110 110, 220 130, 330 108 C 440 88, 520 104, 600 84 L600 200 L0 200 Z" fill="url(#hhill)" opacity="0.85"/>
  <path d="M0 176 C 100 164, 220 176, 340 164 L 340 400 L 0 400 Z" fill="url(#hsoil)"/>
  <path d="M330 168 C 420 160, 520 172, 600 158 L 600 400 L 330 400 Z" fill="url(#hgrass)"/>
  <g stroke="#3f2a1c" stroke-width="2" opacity="0.4"><path d="M30 400 L 90 300"/><path d="M110 400 L 150 300"/><path d="M190 400 L 210 300"/><path d="M270 400 L 270 300"/></g>
  <g stroke="#7a5a3a" stroke-width="2.5"><line x1="336" y1="196" x2="336" y2="400"/><line x1="336" y1="230" x2="600" y2="222"/><line x1="336" y1="270" x2="600" y2="262"/><line x1="336" y1="312" x2="600" y2="304"/><line x1="470" y1="220" x2="470" y2="400"/><line x1="580" y1="218" x2="580" y2="400"/></g>
  <rect x="92" y="98" width="290" height="102" rx="10" fill="#ffffff" opacity="0.94" filter="url(#hsh)"/>
  <text x="104" y="92" font-size="10" font-weight="700" fill="#2b2b28" ${F} letter-spacing="1.4">RANDOMISED COMPLETE BLOCKS &#183; 4 &#215; 3</text>
  ${plots}
  <rect x="${cx - 4}" y="${cy - 26}" width="140" height="${ch + 50}" rx="10" fill="#ffffff" opacity="0.95" filter="url(#hsh)"/>
  <text x="${cx + 6}" y="${cy - 10}" font-size="9" font-weight="700" fill="#2b2b28" ${F} letter-spacing="1.2">YIELD &#183; TUKEY HSD</text>
  <line x1="${cx + 4}" x2="${cx + 132}" y1="${cy + ch}" y2="${cy + ch}" stroke="#999"/>
  ${bars}
  ${place(Art.crop.maize(), 4, 198, 1.45)}${place(Art.crop.maize(), 72, 226, 1.2)}
  ${place(Art.crop.chile(), 192, 250, 1.1)}${place(Art.crop.tomato(), 236, 282, 1.0)}${place(Art.crop.coffee(), 24, 330, 0.72)}
  ${place(Art.animal.cow(), 440, 296, 0.95)}${place(Art.animal.sheep(), 348, 326, 0.7)}${place(Art.animal.goat(), 492, 336, 0.62)}
  <text x="346" y="212" font-size="8.5" fill="#ffffff" font-weight="700" ${F} opacity="0.9">GRAZING TRIAL &#183; 3 PADDOCKS</text>
</svg>`;
};

/* small scenes for the "kinds of experiments" tiles */
Art.kind = which => {
  const base = body => `<svg viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg"><path d="M0 74 C 60 66, 140 70, 200 62 L200 90 L0 90Z" fill="#8c5a3c" opacity="0.75"/>${body}</svg>`;
  switch (which) {
    case 'field': return base(place(Art.crop.maize(), 30, -8, 0.85) + place(Art.crop.maize(), 80, 0, 0.75) + place(Art.crop.maize(), 130, -4, 0.8));
    case 'horti': return base(place(Art.crop.tomato(), 40, -2, 0.85) + place(Art.crop.chile(), 110, -2, 0.85));
    case 'perennial': return base(place(Art.crop.coffee(), 20, -10, 0.85) + place(Art.crop.coffee(), 100, -4, 0.85));
    case 'livestock': return `<svg viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg"><path d="M0 70 C 60 62, 140 66, 200 58 L200 90 L0 90Z" fill="#7fb96a"/>${place(Art.animal.cow(), 4, 6, 0.62)}${place(Art.animal.sheep(), 78, 14, 0.55)}${place(Art.animal.goat(), 136, 12, 0.55)}</svg>`;
    case 'lab': return `<svg viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${18 + i * 30}" y="${30 - (i % 2) * 6}" width="22" height="${44 + (i % 2) * 6}" rx="4" fill="#e9eee7" stroke="#9aa39d"/><circle cx="${29 + i * 30}" cy="64" r="5" fill="#8c5a3c"/><path d="M${29 + i * 30} 60 v-${8 + (i * 7) % 16}" stroke="#3f8f4f" stroke-width="2"/>`).join('')}</svg>`;
    case 'scores': return `<svg viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg">${[1, 3, 5, 7, 9].map((v, i) => `<g transform="translate(${28 + i * 36} 20)">${leaf(0, 20, 26, 10, 0, ['#4b9d3e', '#7fb04a', '#c8b446', '#c98a3a', '#a05a3a'][i])}${Array.from({ length: i * 2 }, (_, k) => `<circle cx="${6 + (k * 7) % 20}" cy="${16 + Math.floor(k / 3) * 5}" r="1.6" fill="#5a3a20"/>`).join('')}<text x="13" y="48" text-anchor="middle" font-size="10" font-weight="700" fill="#444" ${F}>${v}</text></g>`).join('')}</svg>`;
    default: return base('');
  }
};
})();
