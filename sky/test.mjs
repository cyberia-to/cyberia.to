/* proof for the laws and the plots: node sky/test.mjs — no dependencies, exits 1 on the first lie.
   references are public events and an almanac formula independent of the code under test */
import * as A from './astro.js';
import { RADIUS_KM } from './facts.js';
import * as P from './plots.js';

var failed = 0;
function check(name, ok, detail) {
    console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  — ' + detail : ''));
    if (!ok) failed++;
}
function jdOf(iso) { return A.julian(Date.parse(iso)); }
function wrap(d) { return ((d % 360) + 540) % 360 - 180; }
function lonDeg(v) { return Math.atan2(v[1], v[0]) / A.DEG; }

/* a heliocentric J2000 position → geocentric ecliptic longitude of date, deg */
function geoLon(id, jd) {
    var T = A.centuries(jd), e = A.planetEcl('earth', T), p = id === 'sun' ? { x: 0, y: 0, z: 0 } : A.planetEcl(id, T);
    return lonDeg([p.x - e.x, p.y - e.y]) + A.precession(jd) / A.DEG;
}

/* the sun's apparent longitude, almanac formula (the Astronomical Almanac's low-precision sun) */
function almanacSun(jd) {
    var n = jd - 2451545.0, L = 280.460 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * A.DEG;
    return L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
}

/* the point under the sun: the sun's direction turned into the earth's frame by the obliquity and sidereal time */
function subsolar(jd) {
    var T = A.centuries(jd), e = A.planetEcl('earth', T), lam = lonDeg([-e.x, -e.y]) * A.DEG + A.precession(jd);
    var v = [Math.cos(lam), Math.sin(lam), -e.z / Math.hypot(e.x, e.y, e.z)];
    var ye = v[1] * Math.cos(A.EPS) - v[2] * Math.sin(A.EPS), ze = v[1] * Math.sin(A.EPS) + v[2] * Math.cos(A.EPS);
    var g = A.gmst(jd), x = v[0] * Math.cos(g) + ye * Math.sin(g), y = -v[0] * Math.sin(g) + ye * Math.cos(g);
    return { lon: Math.atan2(y, x) / A.DEG, lat: Math.asin(ze) / A.DEG };
}
function almanacSubsolar(jd, iso) {
    var n = jd - 2451545.0, L = (280.460 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) * A.DEG;
    var lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * A.DEG, eps = (23.439 - 0.0000004 * n) * A.DEG;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / A.DEG, dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / A.DEG;
    var d = new Date(iso), ut = d.getUTCHours() + d.getUTCMinutes() / 60;
    return { lon: wrap(-15 * (ut - 12) - wrap(L - ra)), lat: dec };
}

/* the sun */
['2026-03-20T12:00:00Z', '2026-06-21T06:00:00Z', '2026-11-17T18:13:00Z', '2030-01-01T00:00:00Z'].forEach(function (iso) {
    var jd = jdOf(iso), d = Math.abs(wrap(geoLon('sun', jd) - almanacSun(jd)));
    check('sun longitude ' + iso.slice(0, 10), d < 0.05, d.toFixed(3) + '° from the almanac');
    var s = subsolar(jd), r = almanacSubsolar(jd, iso), dl = Math.abs(wrap(s.lon - r.lon)), db = Math.abs(s.lat - r.lat);
    check('point under the sun ' + iso, dl < 0.5 && db < 0.1, 'Δlon ' + dl.toFixed(2) + '°, Δlat ' + db.toFixed(2) + '°');
});

/* the earth's own axes put the sun over the same point */
['2026-06-21T06:00:00Z', '2026-11-17T18:13:00Z'].forEach(function (iso) {
    var jd = jdOf(iso), e = A.planetEcl('earth', A.centuries(jd)), s = A.norm3(-e.x, -e.y, -e.z), ax = A.earthAxes(jd);
    var lon = Math.atan2(A.dot3(s, ax.Y), A.dot3(s, ax.X)) / A.DEG, lat = Math.asin(A.dot3(s, ax.Z)) / A.DEG, r = almanacSubsolar(jd, iso);
    var dl = Math.abs(wrap(lon - r.lon)), db = Math.abs(lat - r.lat);
    check('earth axes: point under the sun ' + iso, dl < 0.5 && db < 0.1, 'Δlon ' + dl.toFixed(2) + '°, Δlat ' + db.toFixed(2) + '°');
});

/* the moon: new and full moons as published (UTC) */
[['2024-01-11T11:57:00Z', 0], ['2024-01-25T17:54:00Z', 180], ['2025-01-29T12:36:00Z', 0]].forEach(function (c) {
    var jd = jdOf(c[0]), m = A.moonEcl(jd), el = Math.abs(wrap(lonDeg([m.x, m.y]) - geoLon('sun', jd) - c[1]));
    check('moon ' + (c[1] ? 'full ' : 'new ') + c[0].slice(0, 10), el < 3, el.toFixed(2) + '° from the published moment');
});

/* the planets: events everyone saw */
var jc = jdOf('2020-12-21T18:00:00Z'), sep = Math.abs(wrap(geoLon('jupiter', jc) - geoLon('saturn', jc)));
check('great conjunction 2020-12-21', sep < 0.5, 'jupiter and saturn ' + sep.toFixed(2) + '° apart');
var jo = jdOf('2025-01-16T02:38:00Z'), opp = Math.abs(wrap(geoLon('mars', jo) - geoLon('sun', jo) - 180));
check('mars opposition 2025-01-16', opp < 1.5, opp.toFixed(2) + '° from opposite the sun');

/* the axes are a true frame */
var ax = A.bodyAxes([317.68, 52.89, 176.630, 350.89198226], jdOf('2026-11-18T00:00:00Z'));
var orth = Math.max(Math.abs(A.dot3(ax.X, ax.Y)), Math.abs(A.dot3(ax.Y, ax.Z)), Math.abs(A.dot3(ax.Z, ax.X)),
    Math.abs(A.dot3(ax.X, ax.X) - 1), Math.abs(A.dot3(ax.Z, ax.Z) - 1));
check('planet axes orthonormal', orth < 1e-12, orth.toExponential(1));

/* the same moment gives the same numbers */
var a1 = A.planetEcl('neptune', 0.268), a2 = A.planetEcl('neptune', 0.268);
check('deterministic', a1.x === a2.x && a1.y === a2.y && a1.z === a2.z);

/* the plots */
var g = P.grid();
check('plots: ' + P.COUNT + ' cells', g.n === P.COUNT && g.n === 10 * P.FREQ * P.FREQ + 2, g.n + ' cells, 12 of them pentagons');
var sides = g.cells.reduce(function (s, c) { s[c.ring.length] = (s[c.ring.length] || 0) + 1; return s; }, {});
check('plots: 12 pentagons, the rest hexagons', sides[5] === 12 && sides[6] === g.n - 12, JSON.stringify(sides));
var total = 0, lo = Infinity, hi = 0, pent = [];
for (var i = 0; i < g.n; i++) {
    var s = P.solidAngle(g, i); total += s;
    if (g.cells[i].ring.length === 6) { lo = Math.min(lo, s); hi = Math.max(hi, s); } else pent.push(s);
}
var mean = 4 * Math.PI / g.n, pm = pent[0] / mean;
check('plots tile the sphere exactly', Math.abs(total - 4 * Math.PI) < 1e-9, 'Σ − 4π = ' + (total - 4 * Math.PI).toExponential(1));
check('hexagons nearly equal', hi / lo < 1.25, 'largest / smallest = ' + (hi / lo).toFixed(3));
check('pentagons about 5/6 of the mean', pm > 0.78 && pm < 0.88 && pent.every(function (p) { return Math.abs(p - pent[0]) < 1e-12; }), (pm).toFixed(3) + ' of the mean, all twelve equal');
var rnd = 12345, miss = 0;
function next() { rnd = rnd * 16807 % 2147483647; return rnd / 2147483647; }
for (i = 0; i < 20000; i++) {
    var z = 2 * next() - 1, t = 2 * Math.PI * next(), r = Math.sqrt(1 - z * z), v = [r * Math.cos(t), r * Math.sin(t), z];
    var k = P.pick(g, v);
    if (!P.inside(g, k, v)) miss++;
}
check('pick finds the cell a point lies in', miss === 0, miss + ' of 20000 random points outside their cell');
var earthArea = 0;
for (i = 0; i < g.n; i++) earthArea += P.area(g, i, RADIUS_KM.earth);
var sphere = 4 * Math.PI * RADIUS_KM.earth * RADIUS_KM.earth;
check('plot areas sum to the planet', Math.abs(earthArea - sphere) / sphere < 1e-12, Math.round(earthArea) + ' km² of ' + Math.round(sphere) + ' km²; a mean earth plot ' + Math.round(sphere / g.n) + ' km²');
var w0 = P.where(g, 0);
check('plot 0 sits on the north pole', Math.abs(w0.lat - 90) < 1e-9, 'lat ' + w0.lat.toFixed(6));
var nb = g.cells[777].near;
check('neighbours are mutual', nb.every(function (j) { return g.cells[j].near.indexOf(777) >= 0; }), nb.length + ' neighbours of 777');

console.log(failed ? '\n' + failed + ' failed' : '\nall true');
process.exit(failed ? 1 : 0);
