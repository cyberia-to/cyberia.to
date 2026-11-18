/* laws: where everything stands at a moment. pure functions of the Julian day — no clock, no screen, no page.
   positions are heliocentric, in au, on the J2000 ecliptic unless a name says otherwise. */
import { ELEM } from './facts.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const EPS = 23.43928 * DEG; /* the obliquity of the ecliptic, J2000 */

export function hypot3(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
export function wrap180(d) {
    var x = (d + 180) % 360;
    if (x < 0) x += 360;
    return x - 180;
}
export function norm3(x, y, z) {
    var n = hypot3(x, y, z) || 1;
    return [x / n, y / n, z / n];
}
export function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/* unix milliseconds → Julian day; centuries from J2000 */
export function julian(ms) { return ms / 86400000 + 2440587.5; }
export function centuries(jd) { return (jd - 2451545.0) / 36525; }

export function keplerE(Mdeg, e) {
    var e1 = 57.295779513 * e, E = Mdeg + e1 * Math.sin(Mdeg * DEG), i, dM, dE;
    for (i = 0; i < 12; i++) {
        dM = Mdeg - (E - e1 * Math.sin(E * DEG));
        dE = dM / (1 - e * Math.cos(E * DEG));
        E += dE;
        if (Math.abs(dE) < 1e-8) break;
    }
    return E * DEG;
}

/* a planet at T centuries; Moverride puts it anywhere on its orbit by mean anomaly, deg */
export function planetEcl(id, T, Moverride) {
    var el = ELEM[id];
    var a = el[0] + el[1] * T, e = el[2] + el[3] * T, I = (el[4] + el[5] * T) * DEG;
    var L = el[6] + el[7] * T, varpi = el[8] + el[9] * T, Om = (el[10] + el[11] * T) * DEG;
    var w = (varpi - (el[10] + el[11] * T)) * DEG;
    var M = Moverride != null ? wrap180(Moverride) : wrap180(L - varpi);
    var E = keplerE(M, e);
    var x = a * (Math.cos(E) - e);
    var y = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
    var cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(I), si = Math.sin(I);
    return {
        x: (cw * cO - sw * sO * ci) * x + (-sw * cO - cw * sO * ci) * y,
        y: (cw * sO + sw * cO * ci) * x + (-sw * sO + cw * cO * ci) * y,
        z: (sw * si) * x + (cw * si) * y,
        a: a, e: e, I: I, w: w, Om: Om, L: L, varpi: varpi, M: M
    };
}

/* a direction given in right ascension and declination, deg → on the ecliptic */
export function eqToEclDir(ra, dec) {
    var r = ra * DEG, d = dec * DEG;
    var x = Math.cos(d) * Math.cos(r);
    var y = Math.cos(d) * Math.sin(r);
    var z = Math.sin(d);
    return [
        x,
        y * Math.cos(EPS) + z * Math.sin(EPS),
        -y * Math.sin(EPS) + z * Math.cos(EPS)
    ];
}

/* galactic longitude and latitude, rad → right ascension and declination, rad */
export function galToEq(l, b) {
    var lN = 122.93192 * DEG, aG = 192.85948 * DEG, dG = 27.12825 * DEG;
    var sl = Math.sin(lN - l), cl = Math.cos(lN - l);
    var sb = Math.sin(b), cb = Math.cos(b);
    var dec = Math.asin(sb * Math.sin(dG) + cb * Math.cos(dG) * cl);
    var ra = Math.atan2(cb * sl, sb * Math.cos(dG) - cb * Math.sin(dG) * cl) + aG;
    return [ra, dec];
}

/* the moon from the earth, au, on the ecliptic of date — the leading terms */
export function moonEcl(jd) {
    var d = jd - 2451545.0;
    var L = 218.316 + 13.176396 * d;
    var M = 134.963 + 13.064993 * d;
    var F = 93.272 + 13.229350 * d;
    var lam = (L + 6.289 * Math.sin(M * DEG)) * DEG;
    var bet = (5.128 * Math.sin(F * DEG)) * DEG;
    var dist = (385001 - 20905 * Math.cos(M * DEG)) / 1.495978707e8;
    return {
        x: dist * Math.cos(bet) * Math.cos(lam),
        y: dist * Math.cos(bet) * Math.sin(lam),
        z: dist * Math.sin(bet)
    };
}

/* Greenwich mean sidereal time, rad */
export function gmst(jd) {
    var t = jd - 2451545.0;
    return ((280.46061837 + 360.98564736629 * t) % 360) * DEG;
}

/* how far the equinox has moved along the ecliptic since J2000, rad */
export function precession(jd) { return 1.396971 * centuries(jd) * DEG; }

/* a planet's own axes on the J2000 ecliptic: Z its north pole, X its prime meridian at the equator */
export function bodyAxes(pole, jd) {
    var Z = eqToEclDir(pole[0], pole[1]), Q = eqToEclDir(pole[0] + 90, 0), P = cross(Z, Q);
    var w = (pole[2] + pole[3] * (jd - 2451545.0)) % 360 * DEG, cw = Math.cos(w), sw = Math.sin(w);
    var X = [Q[0] * cw + P[0] * sw, Q[1] * cw + P[1] * sw, Q[2] * cw + P[2] * sw], Y = cross(Z, X);
    return { X: X, Y: Y, Z: Z };
}

/* the moon's axes: one face kept to the earth (X toward it), its pole to the pole of the ecliptic */
export function moonAxes(jd) {
    var m = moonEcl(jd);
    var X = norm3(-m.x, -m.y, -m.z), Z = norm3(-X[2] * X[0], -X[2] * X[1], 1 - X[2] * X[2]), Y = cross(Z, X);
    return { X: X, Y: Y, Z: Z };
}
