// Bandeaux à défilement horizontal : au doigt c'est natif ; on ajoute le glisser à la souris,
// la molette verticale convertie en défilement horizontal, et des points de pagination.

import { play as sfx } from './sound.js';

/** Enfant le plus proche de la position de défilement actuelle. */
function nearestIndex(el) {
  const kids = [...el.children];
  const pad = parseFloat(getComputedStyle(el).scrollPaddingInlineStart) || 0;
  const x = el.scrollLeft + pad;
  let best = 0;
  let dist = Infinity;
  kids.forEach((k, i) => {
    const d = Math.abs(k.offsetLeft - x);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

function scrollToChild(el, i, smooth = true) {
  const kid = el.children[i];
  if (!kid) return;
  const pad = parseFloat(getComputedStyle(el).scrollPaddingInlineStart) || 0;
  el.scrollTo({ left: kid.offsetLeft - pad, behavior: smooth ? 'smooth' : 'auto' });
}

export function dragScroll(el) {
  if (!el || el.dataset.hscroll) return;
  el.dataset.hscroll = '1';
  let startX = 0;
  let startLeft = 0;
  let pid = null;
  let dragging = false;
  let moved = false;
  let startIndex = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = el.scrollLeft;
    startIndex = nearestIndex(el);
    pid = e.pointerId;
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      el.setPointerCapture?.(pid);
      el.classList.add('is-dragging');
    }
    if (moved) el.scrollLeft = startLeft - dx;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    // Aimante sur l'élément suivant / précédent selon le sens du geste
    const dx = e.clientX - startX;
    let i = nearestIndex(el);
    if (dx < -30) i = Math.max(i, startIndex + 1);
    if (dx > 30) i = Math.min(i, startIndex - 1);
    i = Math.max(0, Math.min(el.children.length - 1, i));
    scrollToChild(el, i);
    setTimeout(() => el.classList.remove('is-dragging'), 380);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // Un glisser ne doit pas déclencher de clic sur l'élément relâché
  el.addEventListener('click', (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);

  // Molette verticale → défilement horizontal (tant qu'il reste de la place)
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) return;
    if ((e.deltaY < 0 && el.scrollLeft <= 1) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
    e.preventDefault();
    el.scrollBy({ left: e.deltaY * 1.4, behavior: 'smooth' });
  }, { passive: false });
}

/** Points de pagination synchronisés avec un bandeau (cliquables). */
export function pager(el, { label = 'Élément' } = {}) {
  if (!el || el.nextElementSibling?.classList.contains('pager')) return;
  const kids = [...el.children];
  if (kids.length < 2) return;
  const nav = document.createElement('div');
  nav.className = 'pager';
  nav.dataset.sfx = 'none';
  const dots = kids.map((kid, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const name = kid.querySelector('h3')?.textContent || `${label} ${i + 1}`;
    b.setAttribute('aria-label', `Voir : ${name}`);
    b.addEventListener('click', () => scrollToChild(el, i));
    nav.append(b);
    return b;
  });
  let last = -1;
  const sync = () => {
    const i = nearestIndex(el);
    // Petit cran sonore à chaque nouvelle carte
    if (last !== -1 && i !== last) sfx('tick');
    last = i;
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  };
  let raf = 0;
  el.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }, { passive: true });
  el.after(nav);
  sync();
}
