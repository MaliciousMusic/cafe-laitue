// QR code (norme ISO 18004), sans bibliothèque : mode octets (UTF-8), versions 1 à 10, quatre
// niveaux de correction, choix automatique du masque. Assez pour une adresse de site.
// D'après l'algorithme de référence de Project Nayuki (domaine public / MIT).

import { s, svgRoot } from './svg.js';

const ECL = { L: { ord: 0, bits: 1 }, M: { ord: 1, bits: 0 }, Q: { ord: 2, bits: 3 }, H: { ord: 3, bits: 2 } };
// Par niveau (L, M, Q, H) et par version (index 0 inutilisé) : octets de correction par bloc, nombre de blocs.
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
];
const MAX_VERSION = 10;

const bit = (x, i) => ((x >>> i) & 1) !== 0;

/** Nombre de modules disponibles pour les données (après les motifs fixes). */
function rawModules(ver) {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const align = Math.floor(ver / 7) + 2;
    n -= (25 * align - 10) * align - 55;
    if (ver >= 7) n -= 36;
  }
  return n;
}
const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e.ord][ver] * NUM_BLOCKS[e.ord][ver];

// ---------------------------------------------------------------- Reed-Solomon sur GF(256)
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) {
    const factor = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => (r[i] ^= gfMul(c, factor)));
  }
  return r;
}

/** Positions des centres des motifs d'alignement. */
function alignPositions(ver, size) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

/**
 * Calcule la matrice du QR code de `text`.
 * @returns {{ size: number, version: number, mask: number, dark: (x: number, y: number) => boolean }}
 */
export function qrMatrix(text, { ecl = 'M', mask: forcedMask = -1, minVersion = 1 } = {}) {
  const bytes = [...new TextEncoder().encode(text)];
  let e = ECL[ecl] || ECL.M;
  // plus petite version qui contient les données (en remontant le niveau de correction si ça tient)
  let ver = 0;
  for (let v = minVersion; v <= MAX_VERSION; v++) {
    const used = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
    if (used <= dataCodewords(v, e) * 8) {
      ver = v;
      break;
    }
  }
  if (!ver) throw new Error('QR : texte trop long');
  for (const up of ['M', 'Q', 'H']) {
    const cand = ECL[up];
    if (cand.ord > e.ord && 4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver, cand) * 8) e = cand;
  }

  // Flux de bits : mode octets, longueur, données, terminaison, bourrage
  const bb = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  };
  push(0x4, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const cap = dataCodewords(ver, e) * 8;
  push(0, Math.min(4, cap - bb.length));
  push(0, (8 - (bb.length % 8)) % 8);
  for (let pad = 0xec; bb.length < cap; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data = [];
  for (let i = 0; i < bb.length; i += 8) data.push(bb.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Blocs + correction d'erreurs, entrelacés
  const nBlocks = NUM_BLOCKS[e.ord][ver];
  const eccLen = ECC_PER_BLOCK[e.ord][ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlocks - (raw % nBlocks);
  const shortLen = Math.floor(raw / nBlocks);
  const div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const codewords = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((b, j) => {
      if (i !== shortLen - eccLen || j >= nShort) codewords.push(b[i]);
    });
  }

  // La matrice
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => {
    mod[y][x] = d;
    fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const al = alignPositions(ver, size);
  al.forEach((ay, i) => al.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (m) => {
    const d = (e.bits << 3) | m;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i));
    set(8, 7, bit(bits, 6));
    set(8, 8, bit(bits, 7));
    set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i));
    set(8, size - 8, true);
  };
  drawFormat(0); // réserve les emplacements
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit(bits, i));
      set(b, a, bit(bits, i));
    }
  }
  // Les données en zigzag, deux colonnes à la fois, de bas en haut puis de haut en bas
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? size - 1 - v : v;
        if (!fn[y][x] && k < codewords.length * 8) {
          mod[y][x] = bit(codewords[k >>> 3], 7 - (k & 7));
          k++;
        }
      }
    }
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
  };

  // Pénalités (pour choisir le masque le plus lisible)
  const penalty = () => {
    let score = 0;
    const addHist = (len, h) => {
      if (h[0] === 0) len += size;
      h.pop();
      h.unshift(len);
    };
    const countPatterns = (h) => {
      const n = h[1];
      const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
      return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
    };
    const terminate = (color, len, h) => {
      if (color) {
        addHist(len, h);
        len = 0;
      }
      len += size;
      addHist(len, h);
      return countPatterns(h);
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < size; a++) {
        let color = false;
        let run = 0;
        const h = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < size; b++) {
          const d = pass ? mod[b][a] : mod[a][b];
          if (d === color) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score++;
          } else {
            addHist(run, h);
            if (!color) score += countPatterns(h) * 40;
            color = d;
            run = 1;
          }
        }
        score += terminate(color, run, h) * 40;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x < size - 1 && y < size - 1) {
          const c = mod[y][x];
          if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
        }
      }
    }
    const total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  };

  let mask = forcedMask;
  if (mask < 0) {
    let best = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      const p = penalty();
      if (p < best) {
        best = p;
        mask = m;
      }
      applyMask(m); // annule (le XOR est son propre inverse)
    }
  }
  applyMask(mask);
  drawFormat(mask);
  return { size, version: ver, mask, ecl: Object.keys(ECL).find((kk) => ECL[kk] === e), dark: (x, y) => mod[y][x] };
}

/**
 * QR code en SVG (modules carrés, marge de 4 modules).
 * `hole` : nombre de modules laissés vides au centre (pour poser un logo par-dessus).
 */
export function qrSvg(text, { ecl = 'Q', color = '#12432B', bg = '#FFFDF5', hole = 0, className = 'qr' } = {}) {
  const q = qrMatrix(text, { ecl });
  const n = q.size;
  const quiet = 4;
  const svg = svgRoot(`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`, { class: className });
  svg.append(s('rect', { x: -quiet, y: -quiet, width: n + quiet * 2, height: n + quiet * 2, rx: 2.4, fill: bg }));
  const eye = (x, y) => (x <= 7 && y <= 7) || (x >= n - 8 && y <= 7) || (x <= 7 && y >= n - 8);
  const h0 = Math.round((n - hole) / 2);
  const inHole = (x, y) => hole > 0 && x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole;
  // une forme par suite de modules sombres sur une ligne (légèrement plus haute : pas de liseré)
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!q.dark(x, y) || eye(x, y) || inHole(x, y)) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < n && q.dark(x, y) && !eye(x, y) && !inHole(x, y)) x++;
      d += `M${x0} ${y}h${x - x0}v1.04h${x0 - x}z`;
    }
  }
  svg.append(s('path', { d, fill: color }));
  // les trois yeux : carré net (les coins servent de repères aux lecteurs) + pastille adoucie
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => {
    svg.append(
      s('path', { d: `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z`, fill: color, 'fill-rule': 'evenodd' }),
      s('rect', { x: x + 2, y: y + 2, width: 3, height: 3, rx: 0.5, fill: color }),
    );
  });
  return { svg, size: n, version: q.version, ecl: q.ecl, hole: hole > 0 ? { x: h0, y: h0, size: hole } : null };
}
