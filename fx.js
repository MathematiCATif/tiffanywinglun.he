/* Drifting feathers + tap ripples. Pure canvas, no libraries. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- Feather sprites, drawn once ---------- */
  function makeSprite(len, hue, curl) {
    const w = len * 0.46, h = len, s = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * s) + 16; c.height = Math.ceil(h * s) + 16;
    const g = c.getContext('2d');
    g.scale(s, s);
    g.translate(w / 2 + 4, 4);
    const top = h * 0.03, bot = h * 0.8, base = h * 0.99;

    // vane outline (slightly asymmetric like a real feather)
    const vane = new Path2D();
    vane.moveTo(0, top);
    vane.bezierCurveTo(w * 0.52 + curl, h * 0.1, w * 0.5, h * 0.55, w * 0.05, bot);
    vane.lineTo(-w * 0.05, bot);
    vane.bezierCurveTo(-w * 0.4, h * 0.62, -w * 0.46 + curl, h * 0.14, 0, top);

    const grad = g.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, `hsla(${hue},90%,90%,0.72)`);
    grad.addColorStop(1, `hsla(${hue},85%,78%,0.18)`);
    g.save();
    g.shadowColor = `hsla(${hue},100%,82%,0.9)`;
    g.shadowBlur = 10;
    g.fillStyle = grad;
    g.fill(vane);
    g.restore();

    // barbs
    g.save();
    g.clip(vane);
    g.strokeStyle = `hsla(${hue + 10},60%,40%,0.16)`;
    g.lineWidth = 0.6;
    for (let y = top + 3; y < bot; y += 2.6) {
      g.beginPath();
      g.moveTo(0, y); g.quadraticCurveTo(w * 0.22, y - 1.5, w * 0.62, y - h * 0.12);
      g.moveTo(0, y); g.quadraticCurveTo(-w * 0.22, y - 1.5, -w * 0.62, y - h * 0.12);
      g.stroke();
    }
    // a couple of natural splits in the vane
    g.globalCompositeOperation = 'destination-out';
    g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(0.5, h * rand(0.35, 0.48)); g.lineTo(w * 0.62, h * rand(0.22, 0.32)); g.stroke();
    g.beginPath(); g.moveTo(-0.5, h * rand(0.52, 0.64)); g.lineTo(-w * 0.62, h * rand(0.42, 0.5)); g.stroke();
    g.restore();

    // downy fluff at the base
    g.strokeStyle = 'rgba(235,244,255,0.42)';
    g.lineWidth = 0.55;
    for (let i = 0; i < 16; i++) {
      const y = rand(bot - h * 0.06, base - h * 0.05);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const lenF = rand(w * 0.18, w * 0.42);
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(dir * lenF * 0.4, y - rand(2, 6), dir * lenF * 0.8, y + rand(-4, 4), dir * lenF, y + rand(-8, 2));
      g.stroke();
    }

    // shaft
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(0, top); g.quadraticCurveTo(1.6, h * 0.5, 0, base); g.stroke();

    return { c, w: c.width / s, h: c.height / s };
  }

  const sprites = [];
  for (let i = 0; i < 6; i++) sprites.push(makeSprite(rand(70, 92), rand(205, 245), rand(-6, 6)));

  /* ---------- Feathers ---------- */
  const feathers = [];
  function makeFeather(initial) {
    const depth = rand(0.32, 1);
    return {
      sprite: sprites[(Math.random() * sprites.length) | 0],
      depth,
      x: rand(-40, W + 40),
      y: initial ? rand(-60, H) : rand(-140, -60),
      vy: rand(0.25, 0.55) * (0.5 + depth * 0.6),
      sway: rand(0.4, 1.0) * depth,
      freq: rand(0.5, 1.1),
      phase: rand(0, Math.PI * 2),
      flipFreq: rand(0.3, 0.8),
      flipPhase: rand(0, Math.PI * 2),
      rot0: rand(-0.6, 0.6),
      spin: 0,
      ix: 0, iy: 0,
      alpha: 0.35 + depth * 0.55,
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.max(9, Math.min(24, (W * H) / 62000)));
    while (feathers.length < target) feathers.push(makeFeather(true));
    feathers.length = target;
    seedStars();
  }

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
    const angle = rand(2.45, 2.75); // ~140–158 degrees
    const fromTop = Math.random() < 0.65;
    const x = fromTop ? rand(W * 0.3, W * 1.05) : W + 20;
    const y = fromTop ? rand(-40, H * 0.1) : rand(0, H * 0.45);
    const speed = rand(11, 18);
    meteors.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, len: rand(140, 280), life: 1, fade: rand(0.55, 0.9), w: rand(1.4, 2.4) });
  }

  /* ---------- Ripples ---------- */
  const ripples = [];
  const sparks = [];
  const pointer = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };

  function addRipple(x, y, strength = 1) {
    ripples.push({ x, y, age: 0, strength });
    if (ripples.length > 12) ripples.shift();
    for (let i = 0; i < 8 * strength; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.6, 2.2) * strength;
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
    // feathers within reach get blown outward
    const R = 260 * strength;
    for (const f of feathers) {
      const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R) {
        const k = (1 - d / R) * 5 * strength;
        f.ix += (dx / d) * k;
        f.iy += (dy / d) * k * 0.8;
        f.spin += (Math.random() < 0.5 ? -1 : 1) * k * 0.03;
      }
    }
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    const s = dt * 60;

    // twinkling stars
    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * st.f + st.p);
      ctx.fillStyle = `rgba(225,238,255,${st.a * (0.25 + 0.75 * tw)})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (0.7 + 0.3 * tw), 0, Math.PI * 2); ctx.fill();
    }

    // meteors
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

    for (const f of feathers) {
      // gentle push away from a moving pointer
      const dx = f.x - pointer.x, dy = f.y - pointer.y, d = Math.hypot(dx, dy);
      if (d < 130 && d > 0) {
        const k = (1 - d / 130) * 0.12;
        f.ix += (dx / d) * k + pointer.vx * 0.012;
        f.iy += (dy / d) * k + pointer.vy * 0.012;
      }
      f.ix *= Math.pow(0.95, s); f.iy *= Math.pow(0.95, s); f.spin *= Math.pow(0.97, s);
      const swing = Math.sin(t * f.freq + f.phase);
      f.x += (swing * f.sway + f.ix) * s;
      f.y += (f.vy * (0.55 + 0.45 * Math.abs(Math.cos(t * f.freq + f.phase))) + f.iy) * s;
      f.rot0 += f.spin * s;

      if (f.y > H + 120 || f.x < -160 || f.x > W + 160 || f.y < -260) Object.assign(f, makeFeather(false));

      const flip = Math.cos(t * f.flipFreq + f.flipPhase);
      const sx = Math.sign(flip || 1) * Math.max(0.18, Math.abs(flip));
      const sc = 0.45 + f.depth * 0.55;
      ctx.save();
      ctx.globalAlpha = f.alpha * (0.75 + 0.25 * Math.abs(flip));
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot0 + swing * 0.55);
      ctx.scale(sx * sc, sc);
      ctx.drawImage(f.sprite.c, -f.sprite.w / 2, -f.sprite.h / 2, f.sprite.w, f.sprite.h);
      ctx.restore();
    }

    // ripples: three soft rings each
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

    // sparkles
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

  // Parallax with scroll: feathers drift a bit against the page
  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastScroll; lastScroll = window.scrollY;
    for (const f of feathers) f.y -= dy * 0.18 * f.depth;
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    const dt = Math.max(16, now - pointer.t);
    pointer.vx = ((e.clientX - pointer.x) / dt) * 16;
    pointer.vy = ((e.clientY - pointer.y) / dt) * 16;
    if (Math.abs(pointer.vx) > 60) pointer.vx = 0;
    if (Math.abs(pointer.vy) > 60) pointer.vy = 0;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = now;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.x = pointer.y = -999; });

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('dialog, .gallery-track')) return;
    addRipple(e.clientX, e.clientY, 1);
  }, { passive: true });

  // A welcome ripple behind the portrait (or centre) after load
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
