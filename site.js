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
    history.replaceState({ cyberia: 1 }, '', location.href);
})();
