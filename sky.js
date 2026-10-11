/* the sky of cyberia: the sun on the left, the earth on the right, everyone else on their roads */
(function () {
    var DESKTOP = '(min-width: 960px)';
    var STILL = '(prefers-reduced-motion: reduce)';
    var TAU = Math.PI * 2;

    var canvas, ctx, running = false, raf = 0, t0 = 0, last = 0;
    var W = 0, H = 0, dpr = 1;
    var stars, wind, rocks, meteors;
    var mx = 0, my = 0, tx = 0, ty = 0;
    var sx = 0, sy = 0, sunR = 0, earthA = 0, earthR = 0;

    /* distances are compressed so the family fits on a desk; phases are a still that reads sun-left earth-right */
    var PLANETS = [
        { id: 'mercury', a: 0.28, e: 0.38, T: 32,   r: 5.2,  phase: 0.55, kind: 'rock',  c0: '#f3ebe0', c1: '#a09080', c2: '#2a221c' },
        { id: 'venus',   a: 0.52, e: 0.36, T: 72,   r: 9.0,  phase: 0.95, kind: 'venus', c0: '#fff4c8', c1: '#e2c36a', c2: '#5a3a10' },
        { id: 'earth',   a: 1.00, e: 0.34, T: 160,  r: 0,    phase: 0.06, kind: 'earth' },
        { id: 'mars',    a: 1.18, e: 0.33, T: 220,  r: 6.6,  phase: 0.38, kind: 'mars',  c0: '#ffc4a0', c1: '#e04a28', c2: '#2a0a08' },
        { id: 'jupiter', a: 1.40, e: 0.30, T: 380,  r: 18,   phase: -0.86, kind: 'jupiter' },
        { id: 'saturn',  a: 1.58, e: 0.28, T: 520,  r: 15,   phase: 0.80, kind: 'saturn' },
        { id: 'uranus',  a: 1.74, e: 0.26, T: 720,  r: 9.0,  phase: -1.38, kind: 'ice',   c0: '#e7fffb', c1: '#7ec8d4', c2: '#12343c' },
        { id: 'neptune', a: 1.88, e: 0.24, T: 880,  r: 8.6,  phase: 1.48, kind: 'ice',   c0: '#d0dcff', c1: '#3a5cff', c2: '#07082a' }
    ];

    function rng(seed) {
        var s = seed % 2147483647; if (s <= 0) s += 2147483646;
        return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    }
    function rgba(h, a) {
        return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
    }
    function desktop() { return matchMedia(DESKTOP).matches; }
    function still() { return matchMedia(STILL).matches; }

    function makeStars(w, h) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var g = c.getContext('2d');
        var n = Math.floor(w * h / 1400);
        var rnd = rng(42), i, x, y, r, roll;
        for (i = 0; i < n; i++) {
            x = rnd() * w; y = rnd() * h; r = rnd() * rnd() * 1.45 + 0.18;
            roll = rnd();
            if (roll > 0.97) g.fillStyle = 'rgba(0,180,255,' + (0.35 + rnd() * 0.55) + ')';
            else if (roll > 0.94) g.fillStyle = 'rgba(255,197,1,' + (0.35 + rnd() * 0.55) + ')';
            else if (roll > 0.915) g.fillStyle = 'rgba(0,255,1,' + (0.28 + rnd() * 0.45) + ')';
            else g.fillStyle = 'rgba(240,244,255,' + (0.22 + rnd() * 0.7) + ')';
            g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
            if (r > 1.1 && rnd() > 0.5) {
                g.globalAlpha = 0.4;
                g.fillRect(x - r * 3.4, y - 0.4, r * 6.8, 0.8);
                g.fillRect(x - 0.4, y - r * 3.4, 0.8, r * 6.8);
                g.globalAlpha = 1;
            }
        }
        return c;
    }

    function orbitOf(p) {
        var a = earthA * p.a;
        var e = Math.min(p.e, (H * 0.40) / Math.max(80, a));
        return { a: a, b: Math.max(28, a * e) };
    }

    function pos(a, b, theta) {
        return {
            x: sx + mx + a * Math.cos(theta),
            y: sy + my + b * Math.sin(theta),
            z: Math.sin(theta)
        };
    }

    function thetaOf(p, t) {
        /* earth holds the right side of the sky; the others rest a beat, then run */
        if (p.id === 'earth') return p.phase;
        var mt = Math.max(0, t - 1.4);
        return p.phase + (mt / p.T) * TAU;
    }

    function ellipsePath(ctx, a, b) {
        ctx.beginPath();
        ctx.ellipse(sx + mx, sy + my, a, b, 0, 0, TAU);
    }

    function glowDisc(ctx, x, y, r, color, a) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(color, a));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function litSphere(ctx, x, y, r, c0, c1, c2) {
        var g = ctx.createRadialGradient(x - r * 0.42, y - r * 0.28, r * 0.08, x + r * 0.2, y, r * 1.05);
        g.addColorStop(0, c0);
        g.addColorStop(0.42, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function drawSun(ctx, t) {
        var x = sx + mx, y = sy + my, r = sunR;
        var pulse = 1 + 0.04 * Math.sin(t * 0.7) + 0.018 * Math.sin(t * 1.9);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * 4.6 * pulse, '#fe0000', 0.08);
        glowDisc(ctx, x, y, r * 2.9 * pulse, '#ff6501', 0.24);
        glowDisc(ctx, x, y, r * 1.75 * pulse, '#ffc501', 0.58);
        glowDisc(ctx, x, y, r * 1.08, '#fff6d0', 0.95);

        var i, n = 8;
        for (i = 0; i < n; i++) {
            var ang = (i / n) * TAU + t * 0.06;
            var len = r * (1.4 + 0.32 * Math.sin(t * 1.35 + i * 1.7));
            var px = x + Math.cos(ang) * r * 0.72, py = y + Math.sin(ang) * r * 0.72;
            var qx = x + Math.cos(ang) * len, qy = y + Math.sin(ang) * len;
            var g = ctx.createLinearGradient(px, py, qx, qy);
            g.addColorStop(0, 'rgba(255,197,1,0.6)');
            g.addColorStop(1, 'rgba(255,101,1,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = r * 0.05;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
        }

        var flare = ctx.createLinearGradient(x, y, x + Math.min(W * 0.62, r * 9), y);
        flare.addColorStop(0, 'rgba(255,197,1,0.20)');
        flare.addColorStop(0.35, 'rgba(255,101,1,0.06)');
        flare.addColorStop(1, 'rgba(255,197,1,0)');
        ctx.fillStyle = flare;
        ctx.fillRect(x, y - 1.4, Math.min(W * 0.62, r * 9), 2.8);
        ctx.restore();

        var core = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.05, x, y, r);
        core.addColorStop(0, '#fffef4');
        core.addColorStop(0.28, '#ffe27a');
        core.addColorStop(0.62, '#ffc501');
        core.addColorStop(0.86, '#ff6501');
        core.addColorStop(1, '#fe2200');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function drawEarth(ctx, x, y, r, t) {
        var mth = t / 18 * TAU + 0.4;
        var mxp = x + Math.cos(mth) * r * 1.78;
        var myp = y + Math.sin(mth) * r * 0.58;
        var moonBehind = Math.sin(mth) < 0;
        function moon() { litSphere(ctx, mxp, myp, Math.max(2.6, r * 0.24), '#f7f4ee', '#a8a49c', '#1c1c1a'); }
        function globe() {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            glowDisc(ctx, x, y, r * 2.05, '#00b4ff', 0.34);
            glowDisc(ctx, x, y, r * 1.35, '#00ff01', 0.10);
            ctx.restore();

            var ocean = ctx.createRadialGradient(x - r * 0.38, y - r * 0.28, r * 0.08, x, y, r);
            ocean.addColorStop(0, '#b8ecff');
            ocean.addColorStop(0.35, '#00b4ff');
            ocean.addColorStop(0.72, '#0468b0');
            ocean.addColorStop(1, '#021830');
            ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
            ctx.fillStyle = ocean; ctx.fill();

            var rot = t / 48 * TAU;
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
            function land(lon, lat, rx, ry, color) {
                var vis = Math.cos(lon + rot) * Math.cos(lat);
                if (vis < 0.08) return;
                var px = x + Math.sin(lon + rot) * Math.cos(lat) * r * 0.92;
                var py = y + Math.sin(lat) * r * 0.88;
                ctx.globalAlpha = 0.4 + 0.6 * vis;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(px, py, rx * r * (0.45 + 0.55 * vis), ry * r, 0.15 * vis, 0, TAU);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            land(0.15, 0.12, 0.42, 0.28, '#00ff01');
            land(0.55, -0.18, 0.24, 0.18, '#14c02c');
            land(1.7, 0.22, 0.32, 0.22, '#00e020');
            land(2.15, -0.28, 0.2, 0.14, '#3d8a22');
            land(-1.15, 0.32, 0.22, 0.34, '#00cc22');
            land(-1.95, -0.08, 0.3, 0.2, '#00ff01');
            land(3.0, 0.45, 0.16, 0.12, '#12a02a');
            ctx.fillStyle = '#f4fbff';
            ctx.beginPath(); ctx.ellipse(x, y - r * 0.82, r * 0.46, r * 0.2, 0, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, y + r * 0.84, r * 0.4, r * 0.17, 0, 0, TAU); ctx.fill();
            var night = ctx.createRadialGradient(x - r * 0.5, y - r * 0.16, r * 0.12, x, y, r * 1.02);
            night.addColorStop(0, 'rgba(255,250,220,0.28)');
            night.addColorStop(0.38, 'rgba(0,0,0,0)');
            night.addColorStop(0.78, 'rgba(0,0,12,0.14)');
            night.addColorStop(1, 'rgba(0,0,16,0.5)');
            ctx.fillStyle = night;
            ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
            ctx.restore();
        }
        if (moonBehind) { moon(); globe(); } else { globe(); moon(); }
    }

    function drawJupiter(ctx, x, y, r) {
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
        var g = ctx.createLinearGradient(x, y - r, x, y + r);
        g.addColorStop(0, '#f0d8b0');
        g.addColorStop(0.18, '#d4a06a');
        g.addColorStop(0.32, '#f4e0c0');
        g.addColorStop(0.48, '#c48448');
        g.addColorStop(0.62, '#ead4a8');
        g.addColorStop(0.78, '#b56a38');
        g.addColorStop(1, '#e8c898');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        ctx.fillStyle = '#c4452a';
        ctx.beginPath(); ctx.ellipse(x + r * 0.28, y + r * 0.22, r * 0.22, r * 0.12, -0.2, 0, TAU); ctx.fill();
        var shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.3, r * 0.1, x, y, r);
        shade.addColorStop(0, 'rgba(255,255,240,0.32)');
        shade.addColorStop(0.45, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(20,8,0,0.7)');
        ctx.fillStyle = shade; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * 1.4, '#ffc501', 0.1);
        ctx.restore();
    }

    function drawSaturn(ctx, x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.42);
        ctx.strokeStyle = 'rgba(230,201,138,0.32)';
        ctx.lineWidth = r * 0.58;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, Math.PI, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,197,1,0.55)';
        ctx.lineWidth = r * 0.24;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, Math.PI, TAU); ctx.stroke();
        ctx.restore();
        litSphere(ctx, x, y, r, '#fff1c8', '#e6c98a', '#5a4020');
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.42);
        ctx.strokeStyle = 'rgba(230,201,138,0.32)';
        ctx.lineWidth = r * 0.58;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,197,1,0.6)';
        ctx.lineWidth = r * 0.24;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
    }

    function drawMars(ctx, x, y, r, p) {
        litSphere(ctx, x, y, r, p.c0, p.c1, p.c2);
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.beginPath(); ctx.ellipse(x, y - r * 0.82, r * 0.4, r * 0.2, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * 1.35, '#fe0000', 0.12);
        ctx.restore();
    }

    function drawVenus(ctx, x, y, r, p) {
        litSphere(ctx, x, y, r, p.c0, p.c1, p.c2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * 1.55, '#ffc501', 0.22);
        ctx.restore();
    }

    function drawPlanet(ctx, p, x, y, r, t) {
        try {
            ctx.save();
            if (p.kind === 'earth') drawEarth(ctx, x, y, r, t);
            else if (p.kind === 'jupiter') drawJupiter(ctx, x, y, r);
            else if (p.kind === 'saturn') drawSaturn(ctx, x, y, r);
            else if (p.kind === 'mars') drawMars(ctx, x, y, r, p);
            else if (p.kind === 'venus') drawVenus(ctx, x, y, r, p);
            else {
                if (p.kind === 'rock') {
                    ctx.globalCompositeOperation = 'lighter';
                    glowDisc(ctx, x, y, r * 1.6, '#ffc501', 0.14);
                    ctx.globalCompositeOperation = 'source-over';
                }
                litSphere(ctx, x, y, r, p.c0, p.c1, p.c2);
                if (p.kind === 'ice') {
                    ctx.globalCompositeOperation = 'lighter';
                    glowDisc(ctx, x, y, r * 1.45, p.id === 'neptune' ? '#1700fe' : '#00b4ff', 0.2);
                }
            }
            ctx.restore();
        } catch (err) { try { ctx.restore(); } catch (e) {} }
    }

    function seedField() {
        var rnd = rng(99), i;
        wind = [];
        for (i = 0; i < 80; i++) wind.push({ a: rnd(), s: 0.25 + rnd() * 0.9, y: (rnd() - 0.5) * 2, w: 0.4 + rnd() * 1.4 });
        rocks = [];
        for (i = 0; i < 180; i++) {
            rocks.push({
                a: 1.26 + rnd() * 0.12,
                e: 0.31 + rnd() * 0.04,
                th: rnd() * TAU,
                T: 240 + rnd() * 160,
                r: 0.45 + rnd() * 1.2,
                c: rnd() > 0.5 ? '#d0c0a8' : '#8a7a68'
            });
        }
        meteors = [];
    }

    function layout() {
        var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
            canvas.width = Math.floor(cssW * dpr);
            canvas.height = Math.floor(cssH * dpr);
        }
        W = cssW; H = cssH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sunR = Math.min(W, H) * 0.148;
        sx = Math.max(sunR * 0.46, Math.min(W * 0.09, sunR * 0.72));
        sy = H * 0.50;
        var wrap = Math.min(780, W);
        var gutter = Math.max(140, (W - wrap) / 2);
        earthR = Math.max(30, Math.min(W, H) * 0.052, gutter * 0.145);
        var targetX = sx + (W - sx - earthR * 2.4) * 0.92;
        earthA = Math.max(220, targetX - sx);
        stars = makeStars(Math.max(1, Math.floor(W * dpr)), Math.max(1, Math.floor(H * dpr)));
        seedField();
    }

    function drawOrbits(ctx) {
        var i, p, o;
        for (i = 0; i < PLANETS.length; i++) {
            p = PLANETS[i];
            o = orbitOf(p);
            ellipsePath(ctx, o.a, o.b);
            if (p.id === 'earth') {
                ctx.strokeStyle = 'rgba(0,180,255,0.42)';
                ctx.lineWidth = 1.4;
            } else {
                ctx.strokeStyle = 'rgba(220,230,255,0.20)';
                ctx.lineWidth = 1.0;
            }
            ctx.stroke();
        }
    }

    function drawNebula(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, sx + mx, sy + my, sunR * 6.8, '#ff6501', 0.08);
        glowDisc(ctx, sx + mx, sy + my, sunR * 3.8, '#ffc501', 0.09);
        glowDisc(ctx, W * 0.86 + mx * 0.4, H * 0.50 + my * 0.4, Math.min(W, H) * 0.42, '#00b4ff', 0.055);
        glowDisc(ctx, W * 0.55, H * 0.16, Math.min(W, H) * 0.3, '#6b00fe', 0.03);
        glowDisc(ctx, W * 0.62, H * 0.84, Math.min(W, H) * 0.24, '#00ff01', 0.022);
        ctx.restore();
    }

    function drawTwinkles(ctx, t) {
        var rnd = rng(3), i, n = 32;
        for (i = 0; i < n; i++) {
            var x = rnd() * W, y = rnd() * H;
            var a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * (1.4 + rnd() * 2) + i));
            ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 0.75 + rnd() * 1.0, 0, TAU); ctx.fill();
        }
    }

    function drawRocks(ctx, t) {
        var i, p, q, o;
        for (i = 0; i < rocks.length; i++) {
            p = rocks[i];
            o = { a: earthA * p.a, b: earthA * p.a * Math.min(p.e, (H * 0.40) / Math.max(80, earthA * p.a)) };
            q = pos(o.a, o.b, p.th + t / p.T * TAU);
            ctx.fillStyle = p.c;
            ctx.globalAlpha = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(p.th));
            ctx.fillRect(q.x, q.y, p.r, p.r);
        }
        ctx.globalAlpha = 1;
    }

    function drawWind(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var i, p, x, y, len, u;
        for (i = 0; i < wind.length; i++) {
            p = wind[i];
            u = (p.a + t * p.s * 0.045) % 1;
            x = sx + mx + sunR * 0.9 + u * (W * 0.72);
            y = sy + my + p.y * sunR * 1.8 + Math.sin(u * 6 + i) * 6;
            len = 10 + p.w * 18;
            ctx.strokeStyle = 'rgba(255,197,1,' + (0.045 + (1 - u) * 0.09) + ')';
            ctx.lineWidth = p.w;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + p.y * 2); ctx.stroke();
        }
        ctx.restore();
    }

    function drawMeteors(ctx, dt) {
        if (!still() && Math.random() < 0.014 && meteors.length < 2) {
            meteors.push({
                x: W * (0.2 + Math.random() * 0.7),
                y: H * Math.random() * 0.42,
                vx: 440 + Math.random() * 380,
                vy: 170 + Math.random() * 180,
                life: 0.55 + Math.random() * 0.25
            });
        }
        var i, m;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (i = meteors.length - 1; i >= 0; i--) {
            m = meteors[i];
            m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
            if (m.life <= 0 || m.x > W + 40 || m.y > H + 40) { meteors.splice(i, 1); continue; }
            var a = Math.max(0, m.life * 1.6);
            ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * 0.08, m.y - m.vy * 0.08);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,240,200,' + a + ')';
            ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    function frame(now) {
        if (!running) return;
        if (!last) last = now;
        var t = (now - t0) / 1000;
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        mx += (tx - mx) * 0.06;
        my += (ty - my) * 0.06;
        paint(t, dt);
        if (!still()) raf = requestAnimationFrame(frame);
    }

    function paint(t, dt) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (stars) ctx.drawImage(stars, 0, 0, W, H);
        drawNebula(ctx);
        drawTwinkles(ctx, t);
        drawOrbits(ctx);
        drawRocks(ctx, t);
        drawWind(ctx, t);

        var bodies = [], i, p, th, q, r, o, scale;
        for (i = 0; i < PLANETS.length; i++) {
            p = PLANETS[i];
            o = orbitOf(p);
            th = thetaOf(p, t);
            q = pos(o.a, o.b, th);
            scale = 1 + 0.12 * q.z;
            r = p.kind === 'earth' ? earthR : p.r * Math.min(W, H) / 860;
            r = Math.max(r * scale, p.kind === 'earth' ? 26 : 2.4);
            bodies.push({ z: q.z, p: p, x: q.x, y: q.y, r: r });
        }
        bodies.push({ z: 0, sun: true });
        bodies.sort(function (a, b) { return a.z - b.z; });
        for (i = 0; i < bodies.length; i++) {
            if (bodies[i].sun) drawSun(ctx, t);
            else drawPlanet(ctx, bodies[i].p, bodies[i].x, bodies[i].y, bodies[i].r, t);
        }
        drawMeteors(ctx, dt || 0);
    }

    function onMove(e) {
        if (still()) return;
        tx = (e.clientX / Math.max(1, W) - 0.5) * 18;
        ty = (e.clientY / Math.max(1, H) - 0.5) * 12;
    }

    function start() {
        if (!desktop()) { stop(); return; }
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'sky';
            canvas.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(canvas, document.body.firstChild);
            ctx = canvas.getContext('2d', { alpha: false });
        }
        canvas.style.display = '';
        layout();
        t0 = performance.now(); last = 0;
        running = true;
        paint(0, 0);
        if (!still()) raf = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (canvas) canvas.style.display = 'none';
    }

    var resizeWait = 0;
    function onResize() {
        clearTimeout(resizeWait);
        resizeWait = setTimeout(function () {
            if (!desktop()) { stop(); return; }
            if (!running) start();
            else layout();
        }, 80);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
        else if (running && !still()) { last = 0; raf = requestAnimationFrame(frame); }
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove, { passive: true });
    matchMedia(DESKTOP).addEventListener('change', onResize);
    matchMedia(STILL).addEventListener('change', function () { stop(); start(); });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
