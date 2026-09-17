/* cyberia player — Atlas Shrugged, the set. one line to embed:
 *   <script src="https://cyberia.to/player.js" async></script>
 * mounts into [data-cyberia-player] when the page has one, otherwise adds a fixed bar at the bottom.
 * data-mode="fab" on the script tag: a round button bottom-right (data-bottom / data-right in px) that
 * unfolds the panel on hover or tap — for pages whose header and bottom edge are already taken.
 * prysm content molecule, audio: button 6g, waveform media atom 4g (bars g/8, gap g/8), g = 8px. */
(function () {
    if (window.__cyberiaPlayer) return; window.__cyberiaPlayer = true;
    var cfg = (document.currentScript && document.currentScript.dataset) || {};
    function boot() {
    var SRC = 'https://cyberia.to/atlas.shrugged.set.mp3';
    var CID = 'QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9';
    var WAVE = 'bcefnpokeehgjlklgkkomnmnlllkjmnnnnonlollkjlmmoqopqrqrofcdfimiihijhijklmmnooonklllkkklmnnnnjjknoooopoooqppqqqqqqhedemgghihjjjkhfgiiiklnopmkiijjkklmnmnnnnnlkklllllmlmnoopoqqqrrrrpkjjmppopnlkmonnllkkmomnkgepppnlprqqqqorssrrrrmrtttrkkjqttsrttsrqpooopmijklhnppppppqpoppppqqmjikppppppqpmkkmnlkmillpqqrnfhgqqqrqqqrmmlmlhimrrrrrssplkjjlllkklkjqppoqpopkjoonsokpmonlopoqrtrpmomruwuxzrkkllkjklkkoqpqppnonknqqpoojnpplqqqqrrqnmmsrsutjvyolihkkjjnmlnmlorrqoooonnjijonmrssrqrqssshmlrpqtuvvvvwnfrs';
    var css = '.cybp{display:flex;align-items:center;gap:8px;height:48px;flex:1;min-width:0;font-family:Play,sans-serif;box-sizing:border-box}' +
        '.cybp *{box-sizing:border-box}' +
        '.cybp-pp{width:48px;height:48px;border-radius:50%;flex:none;border:1px solid #00ff01;background:transparent;color:#00ff01;font:16px Play,sans-serif;cursor:pointer;padding:0;transition:background 150ms ease,color 150ms ease}' +
        '.cybp-pp:hover{background:rgba(0,255,1,.08)}.cybp-pp.on{background:#00ff01;color:#000}' +
        '.cybp-body{display:flex;flex-direction:column;flex:1;min-width:0;height:48px}' +
        '.cybp-meta{display:flex;align-items:baseline;gap:8px;height:16px;line-height:16px;font-size:13px;color:#889;white-space:nowrap;overflow:hidden}' +
        '.cybp-name{color:#fff;font-weight:700;overflow:hidden;text-overflow:ellipsis}' +
        '.cybp-time{color:#00ff01;font-variant-numeric:tabular-nums}' +
        '.cybp-dl{margin-left:auto;color:#00b4ff;text-decoration:none}.cybp-dl:hover{color:#7fd4ff}' +
        '.cybp canvas{display:block;width:100%;height:32px;cursor:pointer}' +
        '.cybp-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#000;border-top:1px solid #1a1a24;padding:8px 16px;display:flex;justify-content:center}' +
        '.cybp-bar .cybp{max-width:780px}' +
        '.cybp-fab{position:fixed;z-index:2147483000;background:#000;border:1px solid #1a1a24;border-radius:28px;padding:3px;display:flex}' +
        '.cybp-fab .cybp{flex-direction:row-reverse;gap:0}' +
        '.cybp-fab .cybp-body{flex:none;width:0;opacity:0;overflow:hidden;transition:width 150ms ease,opacity 150ms ease}' +
        '.cybp-fab:hover .cybp-body,.cybp-fab.open .cybp-body{width:min(300px,calc(100vw - 96px));opacity:1;margin:0 8px 0 12px}' +
        '.cybp-fab .cybp-dl span{display:none}' +
        '@media (max-width:560px){.cybp-dl span{display:none}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var mount = document.querySelector('[data-cyberia-player]'), root = document.createElement('div');
    root.className = 'cybp';
    root.innerHTML = '<button class="cybp-pp" aria-label="play">▶</button><div class="cybp-body"><div class="cybp-meta">' +
        '<span class="cybp-name">Atlas Shrugged — the set</span><span class="cybp-time"><span class="cybp-t">00:00</span> / 27:09</span>' +
        '<a class="cybp-dl" href="https://cyb.ai/ipfs/' + CID + '" target="_blank" rel="noopener"><span>download from </span>cyb.ai →</a>' +
        '</div><canvas height="32" aria-label="waveform, click to seek"></canvas></div>';
    var fab = null;
    if (mount) { mount.appendChild(root); }
    else if (cfg.mode === 'fab') {
        fab = document.createElement('div'); fab.className = 'cybp-fab';
        fab.style.right = (parseInt(cfg.right, 10) || 16) + 'px'; fab.style.bottom = (parseInt(cfg.bottom, 10) || 16) + 'px';
        fab.appendChild(root); document.body.appendChild(fab);
    }
    else { var bar = document.createElement('div'); bar.className = 'cybp-bar'; bar.appendChild(root); document.body.appendChild(bar);
           document.body.style.paddingBottom = (parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + 64 + 'px'; }

    var a = new Audio(); a.src = SRC; a.preload = 'auto'; a.loop = true;
    var pp = root.querySelector('.cybp-pp'), t = root.querySelector('.cybp-t'), cv = root.querySelector('canvas');
    var G = 8, H = 4 * G, BAR = G / 8, GAP = G / 8, digits = '0123456789abcdefghijklmnopqrstuvwxyz';
    var wave = WAVE.split('').map(function (c) { return digits.indexOf(c) / 35; });
    var ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 0, bars = [];
    var LS = 'cyberia.player.';
    function get(k) { try { return localStorage.getItem(LS + k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(LS + k, v); } catch (e) {} }
    function fmt(x) { x = Math.floor(x || 0); return (x / 60 | 0).toString().padStart(2, '0') + ':' + (x % 60).toString().padStart(2, '0'); }
    function size() {
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
    function start() { a.play().then(sync).catch(function () {}); }
    var events = ['pointerdown', 'keydown', 'touchstart'];
    function once() { events.forEach(function (e) { document.removeEventListener(e, once, true); }); if (a.paused && get('paused') !== '1') start(); }

    // resume where the visitor left off on this origin; a deliberate pause survives navigation
    var saved = parseFloat(get('t'));
    a.addEventListener('loadedmetadata', function () { if (saved > 0 && saved < a.duration - 5) a.currentTime = saved; draw(); });
    if (get('paused') !== '1') {
        a.play().then(sync).catch(function () { events.forEach(function (e) { document.addEventListener(e, once, true); }); });
    }
    pp.addEventListener('click', function (e) { e.stopPropagation(); if (a.paused) { put('paused', '0'); start(); } else { a.pause(); put('paused', '1'); sync(); } });
    cv.addEventListener('click', function (e) { if (a.duration) { a.currentTime = a.duration * (e.offsetX / W); draw(); } });
    a.addEventListener('play', sync); a.addEventListener('pause', sync);
    var last = 0;
    a.addEventListener('timeupdate', function () {
        t.textContent = fmt(a.currentTime); draw();
        if (Math.abs(a.currentTime - last) > 2) { last = a.currentTime; put('t', String(last)); }
    });
    // some apps empty <body> before they mount (cyberstates does): come back if thrown out
    var host = fab || (mount ? null : root.parentNode);
    if (host && window.MutationObserver) {
        new MutationObserver(function () { if (!host.isConnected && document.body) { document.body.appendChild(host); size(); } })
            .observe(document.documentElement, { childList: true, subtree: true });
    }
    window.addEventListener('resize', size);
    if (window.ResizeObserver) new ResizeObserver(function () { if (cv.clientWidth !== W) size(); }).observe(cv);
    if (fab) {
        var closer = 0;
        fab.addEventListener('mouseenter', function () { setTimeout(size, 170); });
        pp.addEventListener('click', function () {
            fab.classList.add('open'); setTimeout(size, 170);
            clearTimeout(closer); closer = setTimeout(function () { fab.classList.remove('open'); }, 4000);
        });
    }
    size();
    }
    // never queue behind other deferred scripts: a hung tracker must not mute the player.
    // embed with `async`; start as soon as <body> exists (slot mode waits for the slot or DOM ready).
    function ready() {
        if (!document.body) return false;
        if (cfg.mode === 'fab') return true;
        return !!document.querySelector('[data-cyberia-player]') || document.readyState !== 'loading';
    }
    if (ready()) boot();
    else { var iv = setInterval(function () { if (ready()) { clearInterval(iv); boot(); } }, 50); }
})();
