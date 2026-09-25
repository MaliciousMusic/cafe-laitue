#!/usr/bin/env node
// Génère assets/icons/favicon.svg (version simplifiée du tampon, sans texte, lisible en 16 px).
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { cursiveLoops } = await import(pathToFileURL(join(root, 'assets/js/lib/svg.js')).href);

const lettuce = cursiveLoops(
  [150, 258],
  [
    { base: [158, 250], tip: [102, 210], w: 21, k: 1.15 },
    { base: [170, 246], tip: [130, 152], w: 27, k: 1.2 },
    { base: [186, 240], tip: [168, 114], w: 17, k: 1.1 },
    { base: [203, 234], tip: [216, 118], w: 18, k: 1.1 },
    { base: [222, 229], tip: [264, 172], w: 22, k: 1.15 },
  ],
  [244, 224],
);
const body = 'M-64 0C-64 44-42 76 0 76C42 76 64 44 64 0A64 15 0 0 1-64 0Z';
const lines = [];
[-0.8, -0.44, -0.1, 0.24, 0.58, 0.9].forEach((u) => {
  const x0 = 64 * u;
  const y0 = 15 * Math.sqrt(Math.max(0, 1 - u * u));
  lines.push(`M${x0.toFixed(1)} ${(y0 - 6).toFixed(1)}Q${(x0 * 1.02).toFixed(1)} 52 ${(u * 30).toFixed(1)} 84`);
});
[[17, 64], [35, 60], [53, 49], [68, 32]].forEach(([y, rx]) => {
  const ry = (15 * rx) / 64;
  lines.push(`M${-rx - 4} ${y}A${rx + 4} ${ry.toFixed(1)} 0 0 0 ${rx + 4} ${y}`);
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 40 320 320">
<circle cx="200" cy="200" r="158" fill="#12432B"/>
<path d="${lettuce}" fill="none" stroke="#B9CDB5" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(197 239) rotate(-19) scale(1.1)">
<clipPath id="c"><path d="${body}"/></clipPath>
<path d="${body}" fill="#12432B"/>
<g clip-path="url(#c)" fill="none" stroke="#FDFBEB" stroke-width="9" stroke-linecap="round"><path d="${lines.join('')}"/></g>
<path d="${body}" fill="none" stroke="#FDFBEB" stroke-width="10" stroke-linejoin="round"/>
<path d="M55 7C108-18 122 56 44 55" fill="none" stroke="#FDFBEB" stroke-width="13" stroke-linecap="round"/>
<path d="M-64 0A64 15 0 0 0 64 0" fill="none" stroke="#FDFBEB" stroke-width="13" stroke-linecap="round"/>
</g>
</svg>
`;
writeFileSync(join(root, 'assets/icons/favicon.svg'), svg);
console.log('assets/icons/favicon.svg', svg.length, 'octets');
