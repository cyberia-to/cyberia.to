/* cyberia.to navigation — pages swap without a reload, so the anthem never stops.
 * a click on a same-origin link fetches the page and replaces #app; the player bar lives outside #app.
 * external links, downloads, modified clicks and hashes on the same page go the normal way. */
(function () {
    if (window.__cyberiaSite) return; window.__cyberiaSite = true;
    var app = function () { return document.getElementById('app'); };
    function swap(href, push) {
        return fetch(href, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw r; return r.text(); }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var next = doc.getElementById('app'), cur = app();
            if (!next || !cur) { location.href = href; return; }
            cur.replaceWith(next);
            document.title = doc.title;
            if (push) history.pushState({ cyberia: 1 }, '', href);
            var hash = new URL(href, location.href).hash, target = hash && document.querySelector(hash);
            if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
            if (window.cyberiaPlayer) window.cyberiaPlayer.mountTracks(next);
        }).catch(function () { location.href = href; });
    }
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.target || a.hasAttribute('download')) return;
        var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
        if (u.origin !== location.origin) return;
        if (u.pathname === location.pathname && u.search === location.search) {
            if (u.hash) return; e.preventDefault(); window.scrollTo(0, 0); return;
        }
        e.preventDefault(); swap(u.href, true);
    });
    window.addEventListener('popstate', function () { swap(location.href, false); });
    // [data-copy]: a click puts the value on the clipboard and says so for a moment; the value itself stays hidden
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-copy]');
        if (!b) return;
        e.preventDefault();
        var v = b.getAttribute('data-copy'), label = b.textContent;
        function done() { b.textContent = 'copied'; b.classList.add('done'); setTimeout(function () { b.textContent = label; b.classList.remove('done'); }, 1500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { fallback(); });
        else fallback();
        function fallback() {
            var t = document.createElement('textarea'); t.value = v; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
            document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (err) {} document.body.removeChild(t);
        }
    });
    history.replaceState({ cyberia: 1 }, '', location.href);
})();
