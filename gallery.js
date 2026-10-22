/* Swipeable art gallery + full-size viewer */
(() => {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const track = gallery.querySelector('.gallery-track');
  const slides = [...track.querySelectorAll('.slide')];
  const prev = gallery.querySelector('[data-prev]');
  const next = gallery.querySelector('[data-next]');
  const bar = gallery.querySelector('.gallery-progress span');
  const count = gallery.querySelector('.gallery-count');

  const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 18);
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    const ratio = track.clientWidth / track.scrollWidth;
    const pos = max > 0 ? track.scrollLeft / max : 0;
    bar.style.width = (ratio * 100) + '%';
    bar.style.left = (pos * (1 - ratio) * 100) + '%';
    const i = max > 0 && track.scrollLeft >= max - 4 ? slides.length - 1 : Math.round(track.scrollLeft / step());
    count.textContent = `${Math.min(slides.length, i + 1)} / ${slides.length}`;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
  }
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });

  // Mouse drag-to-scroll (touch already scrolls natively)
  let down = false, startX = 0, startLeft = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
    if (moved) track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    if (moved) {
      const target = Math.round(track.scrollLeft / step()) * step();
      track.classList.remove('dragging');
      track.scrollTo({ left: target, behavior: 'smooth' });
    }
  });
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  /* ---------- Lightbox ---------- */
  const box = document.querySelector('.lightbox');
  const img = box.querySelector('.lb-img');
  const title = box.querySelector('.lb-title');
  const alt = box.querySelector('.lb-alt');
  const counter = box.querySelector('.lb-count');
  const items = [];
  slides.forEach((slide) => {
    const name = slide.querySelector('h3').textContent;
    slide.querySelectorAll('.slide-media img').forEach((im) => items.push({ src: im.dataset.full, alt: im.alt, name, el: slide.querySelector('.slide-media') }));
  });
  let current = 0;

  function show(i) {
    current = (i + items.length) % items.length;
    const it = items[current];
    img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap');
    img.src = it.src; img.alt = it.alt;
    title.textContent = it.name; alt.textContent = it.alt;
    counter.textContent = `${current + 1} of ${items.length}`;
  }
  slides.forEach((slide) => {
    slide.querySelector('.slide-media').addEventListener('click', (e) => {
      const clicked = e.target.closest('img');
      const first = items.findIndex((it) => it.el === slide.querySelector('.slide-media'));
      const idx = clicked ? items.findIndex((it) => it.src === clicked.dataset.full) : first;
      show(idx >= 0 ? idx : first);
      box.showModal();
    });
  });
  box.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  box.querySelector('.lb-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lb-stage')) box.close(); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });
  let sx = 0, sy = 0;
  box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
