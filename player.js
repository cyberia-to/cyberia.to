/* cyberia player — one line to embed:
 *   <script src="https://cyberia.to/player.js" async></script>
 * the primary player: mounts into [data-cyberia-player] when the page has one, otherwise a fixed bar at the
 * bottom; data-mode="fab" (data-bottom / data-right in px) gives a round corner button that unfolds.
 * data-track="anthem" or "set" names a track cyberia.to carries (the set by default); data-src, data-name, data-dur,
 * data-file, data-title, data-wave describe any other; data-download points the download link at the embedding site's own copy;
 * data-autoplay="typed" waits for the page's `cyberia:typed` event (15 s at most) before the first play.
 * inline players: any <div data-cyberia-track data-src=… data-name=… data-dur=… data-file=…> on the page
 * gets its own player, no autoplay. one plays at a time. position and a deliberate pause persist per
 * track per origin, and survive reloads.
 * prysm content molecule, audio, one line 3g tall: button 3g, name, time, waveform 3g (bars g/8, gap g/8), a 3g square download. g = 8px. */
(function () {
    if (window.cyberiaPlayer) return;
    var cfg = (document.currentScript && document.currentScript.dataset) || {};
    // the two tracks cyberia.to carries; data-track names one, data-src and friends describe any other
    var TRACKS = {
        set:    { src: 'https://cyberia.to/atlas.shrugged.set.mp3', name: 'Atlas Shrugged \u2014 the set', dur: '27:09', file: 'atlas.shrugged.set.mp3', title: 'Atlas Shrugged \u2014 the set, mp3, 65 MB',
                  wave: 'bcefnpokeehgjlklgkkomnmnlllkjmnnnnonlollkjlmmoqopqrqrofcdfimiihijhijklmmnooonklllkkklmnnnnjjknoooopoooqppqqqqqqhedemgghihjjjkhfgiiiklnopmkiijjkklmnmnnnnnlkklllllmlmnoopoqqqrrrrpkjjmppopnlkmonnllkkmomnkgepppnlprqqqqorssrrrrmrtttrkkjqttsrttsrqpooopmijklhnppppppqpoppppqqmjikppppppqpmkkmnlkmillpqqrnfhgqqqrqqqrmmlmlhimrrrrrssplkjjlllkklkjqppoqpopkjoonsokpmonlopoqrtrpmomruwuxzrkkllkjklkkoqpqppnonknqqpoojnpplqqqqrrqnmmsrsutjvyolihkkjjnmlnmlorrqoooonnjijonmrssrqrqssshmlrpqtuvvvvwnfrs' },
        anthem: { src: 'https://cyberia.to/cyberia.calling.mp3', name: 'Cyberia Calling \u2014 Anthem', dur: '03:23', file: 'cyberia.calling.mp3', title: 'Cyberia Calling \u2014 Anthem, mp3, 5 MB',
                  wave: '123445584466665455687888787baa88765658bcfmnlikjkjnpqrnrqroljppoomnmnplhhjmlhhdcbb999854e84666a8754ca9aa87443gjigdd974777ffbbbcc8glqqiihggha9fokihgiabbcaqqljgdb9fa8e97677bdggfhfcdihhgkjeeijijilnlpsrjohipihiloqlehmlnmrqmliegggghgqpplioqpqnqlefiocefgkqkjehidogcqmhklimhigkghgggehjhffedeeikfgdefjijkkkljorpoljojjijppijkljkpiqrkljjqljhhtnkikmmqqprsmkmlnqqosrlmkjkiinlpijihfgijimlnmoqpqquunebgaf6mrqmfkaefclpqqd9efacdejnfdcbbbbjlnghgjjgjhilflfhkhkihljkjnllkjlninlksuvxyzqqnpsqprquolnmpnmlrsqoprqpposstrrsssuwxywutsvsrqpuvssrsutqntuuurrsssoqpvqnmlkjade9987756876756645454555546565464223233376437gdegcbcc8543' }
    };
    var css = '.cybp{display:flex;align-items:center;gap:8px;height:24px;flex:1;min-width:0;font-family:Play,sans-serif;box-sizing:border-box}' +
        '.cybp *{box-sizing:border-box}' +
        '.cybp-pp{width:24px;height:24px;border-radius:50%;flex:none;border:1px solid #00ff01;background:transparent;color:#00ff01;font:9px/1 Play,sans-serif;cursor:pointer;padding:0;transition:background 150ms ease,color 150ms ease}' +
        '.cybp-pp:hover{background:rgba(0,255,1,.08)}.cybp-pp.on{background:#00ff01;color:#000}' +
        '.cybp-body{display:flex;align-items:center;gap:8px;flex:1;min-width:0;height:24px}' +
        '.cybp-name{color:#fff;font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}' +
        '.cybp-time{color:#00ff01;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}' +
        '.cybp canvas{display:block;flex:1;min-width:48px;width:0;height:24px;cursor:pointer}' +
        '.cybp-dl{width:24px;height:24px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid #1a1a24;border-radius:6px;color:#00b4ff;text-decoration:none;transition:border-color 150ms ease,color 150ms ease,background 150ms ease}' +
        '.cybp-dl svg{width:14px;height:14px}.cybp-dl:hover{color:#7fd4ff;border-color:#00b4ff;background:rgba(0,180,255,.08)}' +
        '.cybp-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#000;border-top:1px solid #1a1a24;padding:8px 16px;display:flex;justify-content:center}' +
        '.cybp-bar .cybp{max-width:780px}' +
        '.cybp-fab{position:fixed;z-index:2147483000;background:#000;border:1px solid #1a1a24;border-radius:16px;padding:3px;display:flex}' +
        '.cybp-fab .cybp{flex-direction:row-reverse;gap:0}' +
        '.cybp-fab .cybp-body{flex:none;width:0;opacity:0;overflow:hidden;transition:width 150ms ease,opacity 150ms ease}' +
        '.cybp-fab:hover .cybp-body,.cybp-fab.open .cybp-body{width:min(360px,calc(100vw - 80px));opacity:1;margin:0 8px 0 12px}' +
        '[data-cyberia-track]{display:flex;min-width:0}' +
        '@media (max-width:560px){.cybp-name{display:none}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var players = [], digits = '0123456789abcdefghijklmnopqrstuvwxyz';
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function fmt(x) { x = Math.floor(x || 0); return (x / 60 | 0).toString().padStart(2, '0') + ':' + (x % 60).toString().padStart(2, '0'); }
    function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

    // one player: the audio, the row, the waveform; opts: src name dur file title wave download autoplay
    function create(opts) {
        var preset = TRACKS[opts.track] || (opts.src ? null : TRACKS.set);
        var o = {}; Object.keys(preset || {}).forEach(function (k) { o[k] = preset[k]; }); Object.keys(opts).forEach(function (k) { if (opts[k] != null) o[k] = opts[k]; });
        var src = abs(o.src), name = o.name || src.split('/').pop(), dur = o.dur || '--:--', file = o.file || src.split('/').pop(), title = o.title || name + ', mp3';
        var wave = (o.wave || 'kkkkkkkk').split('').map(function (c) { return digits.indexOf(c) / 35; });
        var LS = 'cyberia.player.' + file + '.';
        var root = document.createElement('div');
        root.className = 'cybp';
        root.innerHTML = '<button class="cybp-pp" aria-label="play">▶</button><div class="cybp-body">' +
            '<span class="cybp-name">' + name + '</span><span class="cybp-time"><span class="cybp-t">00:00</span> / ' + dur + '</span>' +
            '<canvas height="24" aria-label="waveform, click to seek"></canvas>' +
            '<a class="cybp-dl" href="' + (o.download || src) + '" download="' + file + '" title="' + title + '" aria-label="download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"/></svg></a></div>';
        var a = new Audio(); a.src = src; a.preload = 'metadata'; a.loop = true;
        var pp = root.querySelector('.cybp-pp'), t = root.querySelector('.cybp-t'), cv = root.querySelector('canvas');
        var G = 8, H = 3 * G, BAR = G / 8, GAP = G / 8;
        var ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 0, bars = [];
        var me = { root: root, audio: a, size: size, file: file, start: function () { if (get(LS + 'paused') !== '1') start(); } };
        function size() {
            if (!cv.isConnected) return;
            W = cv.clientWidth; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var n = Math.floor(W / (BAR + GAP)); bars = [];
            for (var i = 0; i < n; i++) {
                var lo = Math.floor(i * wave.length / n), hi = Math.max(lo + 1, Math.floor((i + 1) * wave.length / n)), m = 0;
                for (var j = lo; j < hi; j++) m = Math.max(m, wave[j]);
                bars.push(m);
            }
            draw();
        }
        function draw() {
            var p = a.duration ? a.currentTime / a.duration : 0, k = Math.floor(p * bars.length);
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < bars.length; i++) {
                var h = Math.max(1, Math.round(bars[i] * H));
                ctx.fillStyle = i === k ? '#bfffbf' : i < k ? '#00ff01' : 'rgba(0,255,1,0.35)';
                ctx.fillRect(i * (BAR + GAP), H - h, BAR, h);
            }
        }
        function sync() { var on = !a.paused; pp.textContent = on ? '❚❚' : '▶'; pp.classList.toggle('on', on); pp.setAttribute('aria-label', on ? 'pause' : 'play'); }
        function start() { players.forEach(function (o) { if (o !== me && !o.audio.paused) { o.audio.pause(); } }); a.play().then(sync).catch(function () {}); }
        var saved = parseFloat(get(LS + 't'));
        a.addEventListener('loadedmetadata', function () { if (saved > 0 && saved < a.duration - 5) a.currentTime = saved; draw(); });
        function autoplay() {
            if (get(LS + 'paused') === '1') return;
            var events = ['pointerdown', 'keydown', 'touchstart'];
            function once() { events.forEach(function (e) { document.removeEventListener(e, once, true); }); if (a.paused && get(LS + 'paused') !== '1') start(); }
            a.play().then(sync).catch(function () { events.forEach(function (e) { document.addEventListener(e, once, true); }); });
        }
        if (o.autoplay === true) autoplay();
        else if (o.autoplay === 'typed') { var armed = false, go = function () { if (!armed) { armed = true; autoplay(); } }; document.addEventListener('cyberia:typed', go); setTimeout(go, 15000); }
        pp.addEventListener('click', function (e) { e.stopPropagation(); if (a.paused) { put(LS + 'paused', '0'); start(); } else { a.pause(); put(LS + 'paused', '1'); sync(); } });
        cv.addEventListener('click', function (e) { if (a.duration) { a.currentTime = a.duration * (e.offsetX / W); draw(); } });
        a.addEventListener('play', sync); a.addEventListener('pause', sync);
        var last = 0;
        a.addEventListener('timeupdate', function () {
            t.textContent = fmt(a.currentTime); draw();
            if (Math.abs(a.currentTime - last) > 2) { last = a.currentTime; put(LS + 't', String(last)); }
        });
        // the exact position survives a full reload or an outside link
        window.addEventListener('pagehide', function () { put(LS + 't', String(a.currentTime)); });
        if (window.ResizeObserver) new ResizeObserver(function () { if (cv.clientWidth !== W) size(); }).observe(cv);
        players.push(me);
        return me;
    }

    // inline tracks on the page: mount every [data-cyberia-track] once
    function mountTracks(scope) {
        var nodes = (scope || document).querySelectorAll('[data-cyberia-track]:not([data-cyberia-mounted])');
        Array.prototype.forEach.call(nodes, function (el) {
            el.setAttribute('data-cyberia-mounted', '1');
            var d = el.dataset, p = create({ track: d.track, src: d.src, name: d.name, dur: d.dur, file: d.file, title: d.title, wave: d.wave, download: d.download });
            el.appendChild(p.root); p.size();
        });
    }

    // the primary player: slot, bar or fab
    function boot() {
        var mount = document.querySelector('[data-cyberia-player]');
        var primary = create({ track: cfg.track, src: cfg.src, name: cfg.name, dur: cfg.dur, file: cfg.file, title: cfg.title, wave: cfg.wave, download: cfg.download, autoplay: cfg.autoplay === 'typed' ? 'typed' : true });
        var root = primary.root, fab = null, host = null;
        if (mount) { mount.appendChild(root); }
        else if (cfg.mode === 'fab') {
            fab = document.createElement('div'); fab.className = 'cybp-fab';
            fab.style.right = (parseInt(cfg.right, 10) || 16) + 'px'; fab.style.bottom = (parseInt(cfg.bottom, 10) || 16) + 'px';
            fab.appendChild(root); document.body.appendChild(fab); host = fab;
        }
        else { var bar = document.createElement('div'); bar.className = 'cybp-bar'; bar.appendChild(root); document.body.appendChild(bar); host = bar;
               document.body.style.paddingBottom = (parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + 40 + 'px'; }
        // some apps empty <body> before they mount (cyberstates does): come back if thrown out
        if (host && window.MutationObserver) {
            new MutationObserver(function () { if (!host.isConnected && document.body) { document.body.appendChild(host); primary.size(); } })
                .observe(document.documentElement, { childList: true, subtree: true });
        }
        if (fab) {
            var pp = root.querySelector('.cybp-pp'), closer = 0;
            fab.addEventListener('mouseenter', function () { setTimeout(primary.size, 170); });
            pp.addEventListener('click', function () {
                fab.classList.add('open'); setTimeout(primary.size, 170);
                clearTimeout(closer); closer = setTimeout(function () { fab.classList.remove('open'); }, 4000);
            });
        }
        window.addEventListener('resize', function () { players.forEach(function (o) { o.size(); }); });
        primary.size();
        mountTracks();
        window.cyberiaPlayer = { players: players, create: create, mountTracks: mountTracks, primary: primary };
    }
    // never queue behind other deferred scripts: a hung tracker must not mute the player.
    function ready() {
        if (!document.body) return false;
        if (cfg.mode === 'fab') return true;
        return !!document.querySelector('[data-cyberia-player]') || document.readyState !== 'loading';
    }
    if (ready()) boot();
    else { var iv = setInterval(function () { if (ready()) { clearInterval(iv); boot(); } }, 50); }
})();
