#!/usr/bin/env node
// Régénère le calendrier des saisons (HTML statique, indexable) dans index.html
// à partir de assets/js/data/season.js.  Usage : node tools/gen-season.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { MONTHS, inSeason } = await import(pathToFileURL(join(root, 'assets/js/data/season.js')).href);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => s.replace(/&/g, '&amp;');
const list = (arr) => arr.map((p) => esc(p.name.toLowerCase())).join(', ');

const rows = MONTHS.map((m, i) => {
  const all = inSeason(i + 1).slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const fruits = all.filter((p) => p.kind === 'fruit');
  const veg = all.filter((p) => p.kind === 'legume');
  return `            <tr data-month="${i + 1}"><th scope="row">${cap(m)}</th><td>${list(fruits)}</td><td>${list(veg)}</td></tr>`;
}).join('\n');

const html = `<!-- saison:start -->
          <table class="season-table">
            <caption>Fruits et légumes de saison mois par mois, chez Café Laitue à Clermont-Ferrand</caption>
            <thead><tr><th scope="col">Mois</th><th scope="col">Fruits</th><th scope="col">Légumes</th></tr></thead>
            <tbody>
${rows}
            </tbody>
          </table>
          <!-- saison:end -->`;

const file = join(root, 'index.html');
const src = readFileSync(file, 'utf8');
const out = src.replace(/<!-- saison:start -->[\s\S]*?<!-- saison:end -->/, html);
writeFileSync(file, out);
console.log('Calendrier des saisons mis à jour dans index.html');
