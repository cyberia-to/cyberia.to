/* taste: every number of how the sky looks that the owner tunes — sizes, colours, glow, blur, twinkle.
   nothing here is a fact; change freely, the positions stay true. */
import { ORDER, POLES, RINGS } from './facts.js';

/* r: radius at 860 px of viewport (the earth is sized by the layout). c: the plain sphere that stands in until
   the map arrives. glow: colour, strength, reach in radii. light: the colour of its orbit */
var BODY = {
    mercury: { r: 5.2, c: ['#f3ebe0', '#a09080', '#2a221c'], glow: ['#ffc501', 0.08, 1.6],  light: '#d8c8b4' },
    venus:   { r: 9.0, c: ['#fff4c8', '#e2c36a', '#5a3a10'], glow: ['#ffc501', 0.12, 1.55], light: '#ffe2a0' },
    earth:   { r: 0,   c: ['#9fd8ff', '#0468b0', '#021830'], glow: ['#00b4ff', 0.16, 2.05], light: '#4fc3ff' },
    mars:    { r: 6.6, c: ['#ffc4a0', '#e04a28', '#2a0a08'], glow: ['#fe0000', 0.07, 1.35], light: '#ff7a4d' },
    jupiter: { r: 18,  c: ['#f4e0c0', '#c48448', '#3a2410'], glow: ['#ffc501', 0.06, 1.4],  light: '#f0c898' },
    saturn:  { r: 15,  c: ['#fff1c8', '#e6c98a', '#5a4020'], glow: ['#ffc501', 0.04, 1.4],  light: '#f2d48a' },
    uranus:  { r: 9.0, c: ['#e7fffb', '#7ec8d4', '#12343c'], glow: ['#00b4ff', 0.10, 1.45], light: '#9fe8f0' },
    neptune: { r: 8.6, c: ['#d0dcff', '#3a5cff', '#07082a'], glow: ['#1700fe', 0.12, 1.45], light: '#6f8cff' }
};

/* the planets in order from the sun, each with its pole and rings from the facts */
export const PLANETS = ORDER.map(function (id) {
    var b = BODY[id];
    return { id: id, r: b.r, c: b.c, glow: b.glow, light: b.light, pole: POLES[id], rings: !!RINGS[id] };
});

export const MOON = ['#f7f4ee', '#a8a49c', '#1c1c1a'];

/* the sun: its corona around the disc (reach in radii, colour, strength), and the haze far behind the orbits.
   speed: how fast SDO's last 48 hours run (1 = 13 s for the whole recording). flicker: how strongly the corona
   follows the disc's recorded brightness — it changes by about 1%, so it is multiplied to be seen */
export const SUN = {
    corona: [[4.6, '#fe0000', 0.08], [2.9, '#ff6501', 0.24], [1.75, '#ffc501', 0.58]],
    haze: [[6.8, '#ff6501', 0.08], [3.8, '#ffc501', 0.09]],
    speed: 0.5,
    flicker: 9
};

/* the orbits: a line of light (width css px, strength) blurred by three veils (radius css px, weight).
   wide: strokes that stand in where a canvas cannot blur. trail: how fast an orbit fades behind its planet,
   floor: the strength it fades to */
export const ORBIT = {
    line: [3, 0.6],
    veils: [[5, 0.45], [12, 0.7], [26, 0.85]],
    wide: [[6, 0.035], [12, 0.026], [20, 0.018], [32, 0.011], [46, 0.006]],
    trail: 0.14,
    floor: 0.2
};

/* a star: core width and fall-off of its Moffat profile, its halo (strength, width), how white the core burns
   (gain, mix), and how deep it twinkles */
export const STAR = {
    core: 0.055,
    fall: 1.4,
    halo: [0.13, 0.3],
    white: [1.3, 0.9],
    twinkle: 0.32
};
