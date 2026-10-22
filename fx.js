/* Twinkling stars, meteors, and tap ripples. Pure canvas, no libraries. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- Twinkling stars and meteors ---------- */
  const stars = [];
  function seedStars() {
    stars.length = 0;
    const n = Math.round(Math.min(90, (W * H) / 14000));
    for (let i = 0; i < n; i++) stars.push({ x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.4), f: rand(0.6, 2), p: rand(0, Math.PI * 2), a: rand(0.25, 0.8) });
  }
  const meteors = [];
  let nextMeteor = 1.2;
  function spawnMeteor() {
    // enter from the top or right edge, travel down-left
    const angle = rand(2.45, 2.75);
    const fromTop = Math.random() < 0.65;
    const x = fromTop ? rand(W * 0.3, W * 1.05) : W + 20;
    const y = fromTop ? rand(-40, H * 0.1) : rand(0, H * 0.45);
    const speed = rand(11, 18);
    meteors.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, len: rand(140, 280), life: 1, fade: rand(0.55, 0.9), w: rand(1.4, 2.4) });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  /* ---------- Ripples ---------- */
  const ripples = [];
  const sparks = [];
  function addRipple(x, y, strength = 1) {
    ripples.push({ x, y, age: 0, strength });
    if (ripples.length > 12) ripples.shift();
    for (let i = 0; i < 8 * strength; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.6, 2.2) * strength;
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    const s = dt * 60;

    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * st.f + st.p);
      ctx.fillStyle = `rgba(225,238,255,${st.a * (0.25 + 0.75 * tw)})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (0.7 + 0.3 * tw), 0, Math.PI * 2); ctx.fill();
    }

    nextMeteor -= dt;
    if (nextMeteor <= 0 && dt > 0) {
      spawnMeteor();
      if (Math.random() < 0.18) setTimeout(spawnMeteor, rand(150, 450));
      nextMeteor = rand(2.5, 6);
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * s; m.y += m.vy * s;
      m.life -= dt * m.fade;
      if (m.life <= 0 || m.x < -m.len || m.y > H + m.len) { meteors.splice(i, 1); continue; }
      const sp = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / sp) * m.len, ty = m.y - (m.vy / sp) * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      const a = Math.min(1, m.life * 1.4);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.15, `rgba(190,225,255,${a * 0.6})`);
      g.addColorStop(1, 'rgba(150,200,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
      const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 7);
      hg.addColorStop(0, `rgba(255,255,255,${a})`); hg.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      const life = 1.8;
      if (r.age > life) { ripples.splice(i, 1); continue; }
      for (let k = 0; k < 3; k++) {
        const a = r.age - k * 0.16;
        if (a <= 0) continue;
        const p = a / life;
        const ease = 1 - Math.pow(1 - p, 3);
        const radius = ease * 170 * r.strength + 4;
        const alpha = (1 - p) * (0.55 - k * 0.13);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, radius, radius * 0.92, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(190,225,255,${alpha})`;
        ctx.lineWidth = 1.6 - k * 0.4;
        ctx.shadowColor = 'rgba(150,205,255,0.8)';
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (r.age < 0.35) {
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 40);
        g.addColorStop(0, `rgba(240,248,255,${0.5 * (1 - r.age / 0.35)})`);
        g.addColorStop(1, 'rgba(240,248,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(r.x, r.y, 40, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx * s; p.y += p.vy * s; p.vx *= Math.pow(0.95, s); p.vy *= Math.pow(0.95, s);
      p.life -= dt * 1.1;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(230,244,255,${p.life * 0.9})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.life + 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduce) { draw(0, 0); return; }

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('dialog, .gallery-track')) return;
    addRipple(e.clientX, e.clientY, 1);
  }, { passive: true });

  setTimeout(() => {
    const p = document.querySelector('.portrait');
    if (p) { const b = p.getBoundingClientRect(); if (b.bottom > 0) addRipple(b.left + b.width / 2, b.top + b.height / 2, 1.3); }
  }, 900);

  let last = performance.now(), t = 0, running = true;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    draw(t, dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(loop); }
  });
})();
