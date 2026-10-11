/* the sky of cyberia: sun left, earth right — as they stand now, stars as they stand.
   planets: Standish/JPL Keplerian elements 1800–2050. stars: Yale BSC5, mag ≤ 4.15. */
(function () {
    var DESKTOP = '(min-width: 960px)';
    var STILL = '(prefers-reduced-motion: reduce)';
    var TAU = Math.PI * 2;
    var DEG = Math.PI / 180;
    var EPS = 23.43928 * DEG;

    var canvas, ctx, running = false, raf = 0, t0 = 0, last = 0;
    var W = 0, H = 0, dpr = 1;
    var sx = 0, sy = 0, sunR = 0, earthA = 0, earthR = 0;
    var wind, rocks, meteors, starField = [], milky = [];
    var cam, worldAng = 0, earthWorld, bodiesCache;

    /* a, da, e, de, I, dI, L, dL, ϖ, dϖ, Ω, dΩ  — au / deg, per Julian century, J2000 ecliptic */
    var ELEM = {
        mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
        venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
        earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
        mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
        jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
        saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
        uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
        neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664]
    };

    var PLANETS = [
        { id: 'mercury', kind: 'rock',  r: 5.2,  c0: '#f3ebe0', c1: '#a09080', c2: '#2a221c' },
        { id: 'venus',   kind: 'venus', r: 9.0,  c0: '#fff4c8', c1: '#e2c36a', c2: '#5a3a10' },
        { id: 'earth',   kind: 'earth', r: 0 },
        { id: 'mars',    kind: 'mars',  r: 6.6,  c0: '#ffc4a0', c1: '#e04a28', c2: '#2a0a08' },
        { id: 'jupiter', kind: 'jupiter', r: 18 },
        { id: 'saturn',  kind: 'saturn',  r: 15 },
        { id: 'uranus',  kind: 'ice',   r: 9.0,  c0: '#e7fffb', c1: '#7ec8d4', c2: '#12343c' },
        { id: 'neptune', kind: 'ice',   r: 8.6,  c0: '#d0dcff', c1: '#3a5cff', c2: '#07082a' }
    ];

    /* Yale BSC5, mag ≤ 4.15: ra deg, dec deg, V, T/100K */
    var STARS = [101.29,-16.72,-1.46,98,95.99,-52.70,-0.72,75,213.91,19.18,-0.04,48,219.90,-60.84,-0.01,58,279.24,38.78,0.03,100,79.17,46.00,0.08,55,78.64,-8.20,0.12,140,114.83,5.22,0.38,68,24.43,-57.24,0.46,240,88.79,7.41,0.50,34,210.96,-60.37,0.61,280,297.70,8.87,0.77,82,68.98,16.51,0.85,42,247.35,-26.43,0.96,34,201.30,-11.16,0.98,280,116.33,28.03,1.14,50,344.41,-29.62,1.16,92,191.93,-59.69,1.25,300,310.36,45.28,1.25,95,186.65,-63.10,1.33,300,219.90,-60.84,1.33,48,152.09,11.97,1.35,160,104.66,-28.97,1.50,260,187.79,-57.11,1.63,30,263.40,-37.10,1.63,260,81.28,6.35,1.64,260,81.57,28.61,1.65,160,138.30,-69.72,1.68,95,84.05,-1.20,1.70,300,186.65,-63.10,1.73,280,332.06,-46.96,1.74,160,193.51,55.96,1.77,100,122.38,-47.34,1.78,141,51.08,49.86,1.79,68,165.93,61.75,1.79,50,107.10,-26.39,1.84,63,276.04,-34.38,1.85,120,125.63,-59.51,1.86,46,206.88,49.31,1.86,240,264.33,-43.00,1.87,74,89.88,44.95,1.90,95,252.17,-69.03,1.92,47,99.43,16.40,1.93,100,306.41,-56.73,1.94,260,131.18,-54.71,1.96,98,95.67,-17.96,1.98,280,113.65,31.89,1.98,98,141.90,-8.66,1.98,46,31.79,23.46,2.00,47,239.88,25.92,2.00,240,37.95,89.26,2.02,64,283.82,-26.30,2.02,260,10.90,-17.99,2.04,51,85.19,-1.94,2.05,330,2.10,29.09,2.06,140,17.43,35.62,2.06,35,86.94,-9.67,2.06,300,211.67,-36.37,2.06,50,222.68,74.16,2.08,44,263.73,12.56,2.08,88,340.67,-46.88,2.10,28,47.04,40.96,2.12,140,177.26,14.57,2.14,92,190.38,-48.96,2.17,98,305.56,40.26,2.20,63,137.00,-43.43,2.21,44,10.13,56.54,2.23,50,83.00,-0.30,2.23,330,233.67,26.71,2.23,100,269.15,51.49,2.23,42,120.90,-40.00,2.25,450,139.27,-59.27,2.25,80,30.98,42.33,2.26,46,2.29,59.15,2.27,72,200.98,54.92,2.27,98,252.54,-34.29,2.29,47,204.97,-53.47,2.30,280,220.48,-47.39,2.30,280,218.88,-42.16,2.31,280,240.08,-22.62,2.32,300,165.46,56.38,2.37,98,6.57,-42.31,2.39,50,326.05,9.88,2.39,47,265.62,-39.03,2.41,280,345.94,28.08,2.42,32,257.60,-15.72,2.43,95,178.46,53.70,2.44,100,319.64,62.59,2.44,82,111.02,-29.30,2.45,200,311.55,33.97,2.46,50,14.18,60.72,2.47,300,346.19,15.21,2.49,120,140.53,-55.01,2.50,260,45.57,4.09,2.53,34,208.88,-47.29,2.55,260,168.53,20.52,2.56,90,249.29,-10.57,2.56,330,83.18,-17.82,2.58,75,183.95,-17.54,2.59,140,182.09,-50.72,2.60,260,285.65,-29.88,2.60,95,154.99,19.84,2.61,48,229.25,-9.38,2.61,140,89.93,37.21,2.62,100,241.36,-19.81,2.62,280,28.66,20.81,2.64,88,84.91,-34.07,2.64,160,188.60,-23.40,2.65,55,236.07,6.43,2.65,47,21.45,60.23,2.68,88,208.67,18.40,2.68,60,224.63,-43.13,2.68,260,74.25,33.17,2.69,46,161.69,-49.42,2.69,55,189.30,-69.14,2.69,260,262.69,-37.30,2.69,260,109.29,-37.10,2.70,46,221.25,27.07,2.70,50,275.25,-29.83,2.70,46,296.56,10.61,2.72,46,243.59,-3.69,2.74,35,246.00,61.51,2.74,52,200.15,-36.71,2.75,95,222.72,-16.04,2.75,92,160.74,-64.39,2.76,300,83.86,-5.91,2.77,330,247.56,21.49,2.77,53,265.87,4.57,2.77,47,233.78,-41.17,2.78,260,76.96,-5.09,2.79,92,262.61,52.30,2.79,58,6.44,-77.25,2.80,58,183.79,-58.75,2.80,260,121.89,-24.30,2.81,66,250.32,31.60,2.81,60,276.99,-25.42,2.81,48,248.97,-28.22,2.82,300,3.31,15.18,2.83,260,195.54,10.96,2.83,52,82.06,-20.76,2.84,55,58.53,31.88,2.85,280,238.78,-63.43,2.85,72,261.32,-55.53,2.85,46,29.69,-61.57,2.86,75,334.62,-60.26,2.86,46,56.87,24.11,2.87,160,296.24,45.13,2.87,120,326.76,-16.13,2.87,88,95.74,22.51,2.88,30,113.65,31.89,2.88,95,59.46,40.01,2.89,300,229.73,-68.68,2.89,98,239.71,-26.11,2.89,280,245.30,-25.59,2.89,280,287.44,-21.02,2.89,72,111.79,8.29,2.90,140,194.01,38.32,2.90,100,322.89,-5.57,2.91,60,46.20,53.51,2.93,52,102.48,-50.62,2.93,48,340.75,30.22,2.94,58,59.51,-13.51,2.95,35,187.47,-16.52,2.95,120,262.96,-49.88,2.95,260,331.45,-0.32,2.96,58,100.98,25.13,2.98,52,146.46,23.77,2.98,59,75.49,43.82,2.99,75,271.45,-30.42,2.99,50,286.35,13.86,2.99,100,32.39,34.99,3.00,88,84.41,21.14,3.00,220,182.53,-22.62,3.00,47,199.73,-23.17,3.00,52,55.73,47.79,3.01,200,146.78,-65.07,3.01,85,167.42,44.50,3.01,48,328.48,-37.37,3.01,140,95.08,-30.06,3.02,260,105.76,-23.83,3.02,240,218.02,38.31,3.03,82,266.90,-40.13,3.03,72,34.84,-2.98,3.04,24,207.40,-42.47,3.04,260,155.58,41.50,3.05,35,191.57,-68.11,3.05,260,230.18,71.83,3.05,92,288.14,67.66,3.07,51,252.97,-38.05,3.08,280,292.68,27.96,3.08,46,305.25,-14.78,3.08,63,133.85,5.95,3.11,51,162.41,-16.19,3.11,47,274.41,-36.76,3.11,30,309.39,-47.29,3.11,50,87.74,-35.77,3.12,47,140.26,34.39,3.13,40,142.81,-57.03,3.13,42,173.94,-63.02,3.13,120,224.79,-42.10,3.13,260,254.66,-55.99,3.13,46,134.80,48.04,3.14,82,258.76,24.84,3.14,92,258.76,36.81,3.16,46,76.63,41.23,3.17,240,99.44,-43.20,3.17,140,143.21,51.68,3.17,66,257.20,65.72,3.17,180,281.41,-26.99,3.17,140,72.46,6.96,3.19,66,76.36,-22.37,3.19,42,220.63,-64.97,3.19,88,254.42,9.38,3.20,47,318.23,30.23,3.20,52,267.46,-37.04,3.21,47,354.84,77.63,3.21,48,230.34,-40.65,3.22,280,302.83,-0.82,3.23,120,322.17,70.56,3.23,280,44.56,-40.30,3.24,90,56.81,-74.24,3.24,32,244.58,-4.69,3.24,51,284.74,32.69,3.24,120,112.31,-43.30,3.25,42,275.33,-2.90,3.26,50,9.83,30.86,3.27,46,68.50,-55.05,3.27,100,102.05,-61.94,3.27,82,211.59,-26.68,3.27,47,260.50,-25.00,3.27,260,343.66,-15.82,3.27,92,93.72,22.51,3.28,30,226.02,-25.28,3.29,30,231.23,58.97,3.29,47,16.52,-46.72,3.31,52,78.23,-16.21,3.31,120,183.86,57.03,3.31,92,153.43,-70.04,3.32,140,158.01,-61.69,3.32,220,286.74,-27.67,3.32,48,258.04,-43.24,3.33,70,117.32,-24.86,3.34,54,168.56,15.43,3.34,95,261.35,-56.38,3.34,280,269.76,-9.77,3.34,50,63.61,-62.47,3.35,52,332.71,58.20,3.35,48,81.12,-2.40,3.36,280,101.32,12.90,3.36,68,127.57,60.72,3.36,55,291.38,3.12,3.36,70,203.67,-0.60,3.37,92,230.67,-44.69,3.37,260,28.60,63.67,3.38,240,131.69,6.42,3.38,55,193.90,3.40,3.38,30,46.29,38.84,3.39,29,67.17,15.87,3.40,82,154.27,-61.33,3.40,46,340.37,10.83,3.40,140,22.09,-43.32,3.41,35,28.27,29.58,3.41,66,207.38,-41.69,3.41,260,228.07,-52.10,3.41,52,240.03,-38.40,3.41,260,266.62,27.72,3.42,55,311.24,-66.20,3.42,82,311.32,61.84,3.43,50,12.28,57.82,3.44,62,137.74,-58.97,3.44,260,154.17,23.42,3.44,75,286.56,-4.88,3.44,120,17.15,-10.18,3.45,48,154.27,42.91,3.45,95,282.52,33.36,3.45,140,40.83,3.24,3.47,92,60.17,12.49,3.47,240,105.43,-27.93,3.47,40,119.19,-52.98,3.47,240,228.88,33.31,3.47,52,299.69,19.49,3.47,35,169.62,33.09,3.48,46,258.66,14.39,3.48,28,342.50,24.60,3.48,52,342.14,-51.32,3.49,92,26.02,-15.94,3.50,52,225.49,40.39,3.50,52,276.74,-45.97,3.51,240,284.43,-21.11,3.51,48,124.13,9.19,3.52,44,145.29,9.89,3.52,66,151.83,16.76,3.52,100,342.42,66.20,3.52,50,67.15,19.18,3.53,51,110.03,21.98,3.53,72,237.41,-3.43,3.53,100,250.72,38.92,3.53,53,332.55,6.20,3.53,95,55.81,-9.76,3.54,50,83.78,9.93,3.54,360,149.22,-54.57,3.54,200,173.25,-31.86,3.54,53,264.40,-15.40,3.54,75,86.74,-14.82,3.55,92,214.85,-46.06,3.55,260,4.86,-8.82,3.56,48,34.13,-51.51,3.56,140,64.47,-33.80,3.56,120,169.84,-14.78,3.56,52,230.45,-36.26,3.56,42,302.18,-66.18,3.56,54,24.50,48.63,3.57,46,116.11,24.40,3.57,52,253.08,-38.02,3.57,260,275.26,72.73,3.57,64,304.51,-12.54,3.57,52,109.52,16.54,3.58,92,217.96,30.37,3.58,46,234.26,-28.14,3.58,46,185.34,-60.40,3.59,46,21.01,-8.18,3.60,50,51.20,9.03,3.60,54,79.40,-6.84,3.60,200,86.12,-22.45,3.60,66,103.20,33.96,3.60,92,135.91,47.16,3.60,98,142.68,-40.47,3.60,70,116.31,-37.97,3.61,47,152.65,-12.35,3.61,50,177.67,1.76,3.61,62,22.87,15.35,3.62,53,130.07,-52.92,3.62,240,195.57,-71.55,3.62,47,253.65,-42.36,3.62,44,262.77,-60.68,3.62,140,266.43,-64.72,3.62,47,345.48,42.33,3.62,180,42.50,27.26,3.63,140,57.29,24.05,3.63,140,309.39,14.60,3.63,68,176.40,-66.73,3.64,82,64.95,15.63,3.65,50,190.41,-1.45,3.65,75,211.10,64.38,3.65,100,313.70,-58.45,3.65,48,9.24,53.90,3.66,260,234.66,-29.78,3.66,260,271.66,-50.09,3.66,260,347.36,-21.17,3.66,48,142.88,63.06,3.67,75,236.55,15.42,3.67,95,130.90,-33.19,3.68,280,190.41,-1.45,3.68,75,231.96,29.11,3.68,75,325.02,-16.66,3.68,75,49.88,-21.76,3.69,30,72.80,5.61,3.69,260,146.31,-62.51,3.69,55,349.29,3.28,3.69,51,28.99,-51.61,3.70,52,56.22,24.11,3.70,180,269.44,29.25,3.70,52,89.10,-14.17,3.71,74,176.51,47.78,3.71,50,237.70,4.48,3.71,95,298.83,6.41,3.71,52,73.56,2.44,3.72,240,89.88,54.28,3.72,50,221.56,1.89,3.72,100,316.23,43.93,3.72,44,318.70,38.05,3.72,72,27.86,-10.34,3.73,50,53.23,-9.46,3.73,47,118.05,-40.58,3.73,48,271.84,9.56,3.73,90,51.79,9.73,3.74,120,321.67,-22.41,3.74,56,343.15,-7.58,3.74,32,75.62,41.08,3.75,44,136.04,-47.10,3.75,47,245.48,19.15,3.75,78,266.97,2.71,3.75,100,268.38,56.87,3.75,47,337.29,58.41,3.75,68,42.67,55.90,3.76,46,65.73,17.54,3.76,50,83.41,-62.49,3.76,66,252.45,-59.04,3.76,42,325.37,-77.39,3.76,50,331.75,25.34,3.76,68,56.30,42.58,3.77,68,126.43,-66.14,3.77,48,286.17,-21.74,3.77,51,289.28,53.37,3.77,51,309.91,15.91,3.77,120,311.92,-9.50,3.77,98,337.82,50.28,3.77,98,107.19,-70.50,3.78,50,163.37,-58.85,3.78,48,106.03,20.57,3.79,64,111.43,27.80,3.79,51,292.43,51.73,3.79,88,303.41,46.74,3.79,47,47.37,44.86,3.80,50,147.75,59.04,3.80,72,154.99,19.84,3.80,53,233.70,10.54,3.80,75,233.70,10.54,3.80,75,264.87,46.01,3.80,240,84.69,-2.60,3.81,330,87.83,-20.88,3.81,50,156.52,-16.84,3.81,44,68.89,-30.56,3.82,52,139.71,36.80,3.82,92,156.97,-58.74,3.82,72,247.73,1.98,3.82,100,296.85,18.53,3.82,32,354.39,46.46,3.82,52,56.08,32.29,3.83,280,163.33,34.22,3.83,50,209.57,-42.10,3.83,260,221.97,-79.05,3.83,46,271.89,28.76,3.83,120,297.04,70.27,3.83,53,67.14,15.96,3.84,50,130.16,-46.65,3.84,70,133.76,-60.65,3.84,140,159.32,-48.23,3.84,69,172.85,69.33,3.84,35,235.69,26.30,3.84,120,275.93,21.77,3.84,47,335.41,-1.39,3.84,100,56.05,-64.81,3.85,47,86.82,-51.07,3.85,88,95.53,-33.44,3.85,53,108.70,-26.77,3.85,260,153.68,-42.12,3.85,95,158.20,9.31,3.85,280,239.11,15.66,3.85,66,243.86,-63.69,3.85,58,278.80,-8.24,3.85,46,63.50,-42.29,3.86,48,189.43,-48.54,3.86,95,269.06,37.25,3.86,48,273.44,-21.06,3.86,140,14.19,38.50,3.87,88,48.02,-28.99,3.87,63,56.46,24.37,3.87,140,69.55,-14.30,3.87,47,82.80,-35.47,3.87,48,103.53,-24.18,3.87,47,188.12,-72.13,3.87,200,188.37,69.79,3.87,180,209.67,-44.80,3.87,260,227.98,-48.74,3.87,120,2.35,-45.75,3.88,50,138.59,2.31,3.88,120,148.19,26.01,3.88,47,202.76,-39.41,3.88,51,220.76,-5.66,3.88,72,239.22,-29.21,3.88,260,44.11,-8.90,3.89,48,170.25,-54.49,3.89,200,184.98,-0.67,3.89,95,244.94,46.31,3.89,200,248.36,-78.90,3.89,52,299.08,35.08,3.89,50,126.42,-3.91,3.90,100,298.12,1.01,3.90,66,347.59,-45.25,3.90,48,60.79,5.99,3.91,98,131.51,-46.04,3.91,98,144.96,-1.14,3.91,47,167.15,-58.98,3.91,56,187.01,-50.23,3.91,260,233.88,-14.79,3.91,52,17.10,-55.25,3.92,180,255.07,30.93,3.92,100,318.96,5.25,3.92,60,69.08,-3.35,3.93,260,115.31,-9.55,3.93,50,290.42,-17.85,3.93,75,6.55,-43.68,3.94,82,131.17,18.15,3.94,50,170.98,10.53,3.94,69,314.29,41.17,3.94,98,22.81,-49.07,3.95,50,43.56,52.76,3.95,56,99.17,-19.26,3.95,48,115.45,-72.61,3.95,50,200.99,54.92,3.95,98,237.74,-33.63,3.95,120,341.63,23.57,3.95,52,66.01,-34.02,3.96,44,89.79,-42.81,3.96,50,102.46,-32.51,3.96,280,115.95,-28.95,3.96,95,182.91,-52.37,3.96,240,241.70,-20.67,3.96,280,300.15,-72.91,3.96,100,87.87,39.15,3.97,51,130.03,-35.31,3.97,53,135.16,41.78,3.97,68,137.82,-62.32,3.97,240,270.16,2.93,3.97,200,290.97,-40.62,3.97,140,337.32,-43.50,3.97,54,350.74,-20.10,3.97,50,30.86,72.42,3.98,95,93.71,-6.28,3.98,48,109.21,-67.96,3.98,66,303.87,47.71,3.98,46,349.36,-58.24,3.99,74,30.00,-21.08,4.00,35,43.47,-49.89,4.00,24,135.61,-66.40,4.00,95,156.10,-74.03,4.00,72,220.49,-37.79,4.00,240,34.33,33.85,4.01,98,132.63,-27.71,4.01,46,201.31,54.99,4.01,88,240.47,58.56,4.01,63,243.00,-19.46,4.01,240,280.76,-71.43,4.01,50,290.66,-44.46,4.01,120,307.35,30.37,4.01,68,342.40,-13.59,4.01,35,359.83,6.86,4.01,69,71.38,-3.25,4.02,200,131.67,28.76,4.02,53,182.10,-24.73,4.02,72,244.96,-50.16,4.02,52,284.91,15.07,4.02,48,285.42,-5.74,4.02,48,323.50,45.59,4.02,52,338.84,-0.12,4.02,120,75.86,60.44,4.03,59,176.47,6.53,4.03,34,193.65,-57.18,4.03,260,271.36,2.50,4.03,50,308.30,11.30,4.03,180,59.74,35.79,4.04,390,62.16,47.71,4.04,240,62.97,-6.84,4.04,72,184.61,-64.00,4.04,260,283.83,43.95,4.04,28,47.27,49.61,4.05,60,170.28,6.03,4.05,120,215.14,-37.88,4.05,100,216.30,51.85,4.05,64,219.47,-49.43,4.05,200,220.91,-35.17,4.05,46,227.21,-45.28,4.05,240,11.84,24.27,4.06,48,113.98,26.90,4.06,35,254.90,-53.16,4.06,44,25.91,50.69,4.07,260,39.87,0.33,4.07,260,74.09,13.51,4.07,47,103.55,-12.04,4.07,44,124.63,-76.92,4.07,68,131.10,-42.65,4.07,55,207.37,15.80,4.07,42,229.38,-58.80,4.07,92,316.49,-17.23,4.07,98,143.61,-59.23,4.08,200,164.94,-18.30,4.08,50,171.22,-17.68,4.08,88,214.00,-6.00,4.08,66,320.52,19.80,4.08,48,325.88,58.78,4.08,32,24.20,41.41,4.09,63,35.44,-68.66,4.09,92,45.60,-23.62,4.09,90,84.23,9.29,4.09,50,237.19,18.14,4.09,35,40.17,-39.86,4.11,50,39.90,-68.27,4.11,120,52.72,12.94,4.11,50,117.31,-46.37,4.11,300,158.87,-78.61,4.11,35,176.63,-61.18,4.11,55,184.39,-67.96,4.11,28,234.18,-66.32,4.11,48,287.37,-37.90,4.11,95,287.51,-39.34,4.11,50,312.95,-26.92,4.11,35,337.44,-43.75,4.11,29,41.05,49.23,4.12,63,90.60,9.65,4.12,95,105.94,-15.63,4.12,140,147.87,-14.85,4.12,53,181.30,8.73,4.12,52,345.22,-52.75,4.12,52,277.21,-49.07,4.13,52,298.81,-41.87,4.13,50,326.16,25.64,4.13,68,333.99,37.75,4.13,46,354.99,5.63,4.13,64,63.73,48.41,4.14,60,80.99,-7.81,4.14,52,129.41,-42.99,4.14,85,233.23,31.36,4.14,180,311.52,-25.27,4.14,69,355.10,44.33,4.14,120,97.24,20.21,4.15,180,107.97,-0.49,4.15,95,181.72,-64.61,4.15,72,238.46,-16.73,4.15,52,239.40,26.88,4.15,47,341.51,-81.38,4.15,78];

    function rng(seed) {
        var s = seed % 2147483647; if (s <= 0) s += 2147483646;
        return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    }
    function rgba(h, a) {
        return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
    }
    function desktop() { return matchMedia(DESKTOP).matches; }
    function still() { return matchMedia(STILL).matches; }
    function hypot3(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
    function wrap180(d) {
        var x = (d + 180) % 360;
        if (x < 0) x += 360;
        return x - 180;
    }
    function norm3(x, y, z) {
        var n = hypot3(x, y, z) || 1;
        return [x / n, y / n, z / n];
    }
    function cross(a, b) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    function julianNow() {
        return Date.now() / 86400000 + 2440587.5;
    }
    function centuries(jd) { return (jd - 2451545.0) / 36525; }

    function keplerE(Mdeg, e) {
        var e1 = 57.295779513 * e, E = Mdeg + e1 * Math.sin(Mdeg * DEG), i, dM, dE;
        for (i = 0; i < 12; i++) {
            dM = Mdeg - (E - e1 * Math.sin(E * DEG));
            dE = dM / (1 - e * Math.cos(E * DEG));
            E += dE;
            if (Math.abs(dE) < 1e-8) break;
        }
        return E * DEG;
    }

    function planetEcl(id, T, Moverride) {
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

    function visRatio(au, earthAu) {
        var u = au / Math.max(0.2, earthAu);
        if (u <= 1) return Math.max(0.22, u);
        var t = (Math.log(u) - Math.log(1)) / (Math.log(31) - Math.log(1));
        return 1 + 0.2 * Math.max(0, Math.min(1, t));
    }

    function toWorld(x, y, z, earthAu) {
        var c = Math.cos(worldAng), s = Math.sin(worldAng);
        var xr = x * c + y * s, yr = -x * s + y * c;
        var r = hypot3(xr, yr, z), v = visRatio(r, earthAu) * earthA / Math.max(1e-6, r);
        return [xr * v, yr * v, z * v];
    }

    function eqToEclDir(ra, dec) {
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

    function galToEq(l, b) {
        var lN = 122.93192 * DEG, aG = 192.85948 * DEG, dG = 27.12825 * DEG;
        var sl = Math.sin(lN - l), cl = Math.cos(lN - l);
        var sb = Math.sin(b), cb = Math.cos(b);
        var dec = Math.asin(sb * Math.sin(dG) + cb * Math.cos(dG) * cl);
        var ra = Math.atan2(cb * sl, sb * Math.cos(dG) - cb * Math.sin(dG) * cl) + aG;
        return [ra, dec];
    }

    function moonEcl(jd) {
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

    function gmst(jd) {
        var t = jd - 2451545.0;
        return ((280.46061837 + 360.98564736629 * t) % 360) * DEG;
    }

    function buildCamera(eW) {
        var dist = earthA * 2.35, elev = 28 * DEG;
        var cx = earthA * 0.42, cy = -dist * Math.cos(elev), cz = dist * Math.sin(elev);
        var lx = earthA * 0.42, ly = 0, lz = 0;
        var fwd = norm3(lx - cx, ly - cy, lz - cz);
        var cr = cross(fwd, [0, 0, 1]);
        var right = norm3(cr[0], cr[1], cr[2]);
        var up = cross(right, fwd);
        function raw(p) {
            var vx = p[0] - cx, vy = p[1] - cy, vz = p[2] - cz;
            var x = vx * right[0] + vy * right[1] + vz * right[2];
            var y = vx * up[0] + vy * up[1] + vz * up[2];
            var z = vx * fwd[0] + vy * fwd[1] + vz * fwd[2];
            return { xn: x / z, yn: y / z, z: z, x: x, y: y };
        }
        var s = raw([0, 0, 0]), e = raw(eW);
        var span = e.xn - s.xn;
        cam = {
            cx: cx, cy: cy, cz: cz,
            fwd: fwd, right: right, up: up,
            s: s, k: (Math.abs(span) < 1e-6 ? earthA : earthA / span),
            earthZ: e.z
        };
    }

    function project(p) {
        if (!cam) return null;
        var vx = p[0] - cam.cx, vy = p[1] - cam.cy, vz = p[2] - cam.cz;
        var x = vx * cam.right[0] + vy * cam.right[1] + vz * cam.right[2];
        var y = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
        var z = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
        if (z < 12) return null;
        return {
            x: sx + cam.k * (x / z - cam.s.xn),
            y: sy - cam.k * (y / z - cam.s.yn),
            z: z,
            scale: cam.earthZ / z
        };
    }

    /* same camera basis as the orrery, wider sky so the galactic plane fills the canvas */
    function projectSky(dir) {
        if (!cam) return null;
        var x = dir[0] * cam.right[0] + dir[1] * cam.right[1] + dir[2] * cam.right[2];
        var y = dir[0] * cam.up[0] + dir[1] * cam.up[1] + dir[2] * cam.up[2];
        var z = dir[0] * cam.fwd[0] + dir[1] * cam.fwd[1] + dir[2] * cam.fwd[2];
        if (z < 0.12) return null;
        var f = 0.64 * H;
        var px = W * 0.5 + f * x / z;
        var py = H * 0.5 - f * y / z;
        if (px < -60 || px > W + 60 || py < -60 || py > H + 60) return null;
        return { x: px, y: py, z: z };
    }

    function kelvinRGB(k100, a) {
        var k = k100 * 100;
        var r, g, b;
        if (k >= 10000) { r = 180; g = 210; b = 255; }
        else if (k >= 8000) { r = 210; g = 225; b = 255; }
        else if (k >= 6500) { r = 235; g = 238; b = 255; }
        else if (k >= 5500) { r = 255; g = 244; b = 230; }
        else if (k >= 4500) { r = 255; g = 214; b = 170; }
        else if (k >= 3500) { r = 255; g = 180; b = 120; }
        else { r = 255; g = 150; b = 90; }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
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
        var x = sx, y = sy, r = sunR;
        var pulse = 1 + 0.04 * Math.sin(t * 0.7) + 0.018 * Math.sin(t * 1.9);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * 4.6 * pulse, '#fe0000', 0.08);
        glowDisc(ctx, x, y, r * 2.9 * pulse, '#ff6501', 0.24);
        glowDisc(ctx, x, y, r * 1.75 * pulse, '#ffc501', 0.58);
        glowDisc(ctx, x, y, r * 1.08, '#fff6d0', 0.95);
        var i, n = 8, ang, len, px, py, qx, qy, g;
        for (i = 0; i < n; i++) {
            ang = (i / n) * TAU + t * 0.06;
            len = r * (1.4 + 0.32 * Math.sin(t * 1.35 + i * 1.7));
            px = x + Math.cos(ang) * r * 0.72; py = y + Math.sin(ang) * r * 0.72;
            qx = x + Math.cos(ang) * len; qy = y + Math.sin(ang) * len;
            g = ctx.createLinearGradient(px, py, qx, qy);
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

    function drawEarth(ctx, x, y, r, rot, moon) {
        function disc() {
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
        function luna() {
            if (!moon) return;
            litSphere(ctx, moon.x, moon.y, Math.max(2.6, r * 0.24), '#f7f4ee', '#a8a49c', '#1c1c1a');
        }
        if (moon && moon.behind) { luna(); disc(); } else { disc(); luna(); }
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

    function drawPlanet(ctx, p, x, y, r, rot, moon) {
        try {
            ctx.save();
            if (p.kind === 'earth') drawEarth(ctx, x, y, r, rot, moon);
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

    function bakeStars() {
        var i, dir, wdir, p, mag, a, rad, k, eq, l, b, u, z, rxy;
        var cA = Math.cos(worldAng), sA = Math.sin(worldAng);
        function worldDir(ecl) {
            return [ecl[0] * cA + ecl[1] * sA, -ecl[0] * sA + ecl[1] * cA, ecl[2]];
        }
        var rnd = rng(7);
        milky = [];
        starField = [];
        for (i = 0; i < 980; i++) {
            l = rnd() * TAU;
            b = (rnd() + rnd() + rnd() - 1.5) * 0.11;
            eq = galToEq(l, b);
            p = projectSky(worldDir(eqToEclDir(eq[0] / DEG, eq[1] / DEG)));
            if (!p) continue;
            milky.push({ x: p.x, y: p.y, r: 0.8 + rnd() * 2.4, a: 0.03 + rnd() * 0.06, warm: rnd() > 0.55 });
        }
        for (i = 0; i < STARS.length; i += 4) {
            p = projectSky(worldDir(eqToEclDir(STARS[i], STARS[i + 1])));
            if (!p) continue;
            mag = STARS[i + 2]; k = STARS[i + 3];
            a = mag < 0 ? 1 : mag < 1.5 ? 0.96 : mag < 2.5 ? 0.84 : mag < 3.4 ? 0.64 : 0.44;
            rad = mag < 0 ? 2.7 : mag < 1 ? 2.0 : mag < 2 ? 1.45 : mag < 3 ? 1.0 : 0.65;
            starField.push({ x: p.x, y: p.y, mag: mag, k: k, a: a, r: rad });
        }
        var rnd2 = rng(13), f = 0.64 * H;
        for (i = 0; i < 1400; i++) {
            z = 0.2 + rnd2() * 0.8;
            rxy = Math.sqrt(Math.max(0, 1 - z * z));
            u = rnd2() * TAU;
            p = {
                x: W * 0.5 + f * (rxy * Math.cos(u)) / z,
                y: H * 0.5 - f * (rxy * Math.sin(u)) / z
            };
            if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
            starField.push({
                x: p.x, y: p.y, mag: 5.4, k: 48 + (rnd2() * 42 | 0),
                a: 0.16 + rnd2() * 0.2, r: 0.34 + rnd2() * 0.32
            });
        }
    }

    function seedField() {
        var rnd = rng(99), i, T = centuries(julianNow()), earthAu, ecl, w;
        var e0 = planetEcl('earth', T);
        earthAu = hypot3(e0.x, e0.y, e0.z);
        wind = [];
        for (i = 0; i < 80; i++) wind.push({ a: rnd(), s: 0.25 + rnd() * 0.9, y: (rnd() - 0.5) * 2, w: 0.4 + rnd() * 1.4 });
        rocks = [];
        for (i = 0; i < 140; i++) {
            ecl = planetEcl('mars', T, rnd() * 360);
            /* a belt between mars and jupiter: 2.2–3.2 AU, random mean anomaly */
            var au = 2.2 + rnd() * 1.1;
            var th = rnd() * TAU, inc = (rnd() - 0.5) * 0.18;
            var x = au * Math.cos(th), y = au * Math.sin(th), z = au * inc;
            w = toWorld(x, y, z, earthAu);
            rocks.push({ w: w, r: 0.45 + rnd() * 1.1, c: rnd() > 0.5 ? '#d0c0a8' : '#8a7a68' });
        }
        meteors = [];
    }

    function orbitPoints(id, T, earthAu) {
        var el = ELEM[id], out = [], i, ecl, w, p, n = 96;
        for (i = 0; i <= n; i++) {
            ecl = planetEcl(id, T, -180 + 360 * (i / n));
            w = toWorld(ecl.x, ecl.y, ecl.z, earthAu);
            p = project(w);
            if (p) out.push(p);
        }
        return out;
    }

    var orbits = [];

    function rebuildSky() {
        var jd = julianNow(), T = centuries(jd);
        var e = planetEcl('earth', T);
        var earthAu = hypot3(e.x, e.y, e.z);
        worldAng = Math.atan2(e.y, e.x);
        earthWorld = toWorld(e.x, e.y, e.z, earthAu);
        buildCamera(earthWorld);
        orbits = [];
        var i, p;
        for (i = 0; i < PLANETS.length; i++) {
            p = PLANETS[i];
            orbits.push({ id: p.id, pts: orbitPoints(p.id, T, earthAu), earth: p.id === 'earth' });
        }
        seedField();
        bakeStars();
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
        var targetX = sx + (W - sx - earthR * 2.4) * 0.84;
        earthA = Math.max(220, targetX - sx);
        rebuildSky();
    }

    function drawOrbits(ctx) {
        var i, j, pts, q;
        for (i = 0; i < orbits.length; i++) {
            pts = orbits[i].pts;
            if (pts.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = orbits[i].earth ? 'rgba(0,180,255,0.38)' : 'rgba(220,230,255,0.16)';
            ctx.lineWidth = orbits[i].earth ? 1.3 : 0.9;
            ctx.stroke();
        }
    }

    function drawStarfield(ctx, t) {
        var i, s, a;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < milky.length; i++) {
            s = milky[i];
            ctx.fillStyle = s.warm ? 'rgba(255,230,200,' + s.a + ')' : 'rgba(200,210,255,' + s.a + ')';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        }
        for (i = 0; i < starField.length; i++) {
            s = starField[i];
            a = s.a;
            if (s.mag < 4.2 && i < 36) a = Math.min(1, a + 0.22 * (0.5 + 0.5 * Math.sin(t * (1.1 + i * 0.07) + i)));
            if (s.mag < 2.8) {
                ctx.fillStyle = kelvinRGB(s.k, a * 0.2);
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.6, 0, TAU); ctx.fill();
            }
            ctx.fillStyle = kelvinRGB(s.k, a);
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
            if (s.mag < 1.2) {
                ctx.globalAlpha = 0.34;
                ctx.fillRect(s.x - s.r * 3.8, s.y - 0.4, s.r * 7.6, 0.8);
                ctx.fillRect(s.x - 0.4, s.y - s.r * 3.8, 0.8, s.r * 7.6);
                ctx.globalAlpha = 1;
            }
        }
        ctx.restore();
    }

    function drawRocks(ctx) {
        var i, p, q;
        for (i = 0; i < rocks.length; i++) {
            p = rocks[i];
            q = project(p.w);
            if (!q) continue;
            ctx.fillStyle = p.c;
            ctx.globalAlpha = 0.45 + 0.35 * Math.max(0, Math.min(1, 1.2 - q.z / (cam.earthZ * 2)));
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
            x = sx + sunR * 0.9 + u * (W * 0.72);
            y = sy + p.y * sunR * 1.8 + Math.sin(u * 6 + i) * 6;
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

    function placeBodies(jd) {
        var T = centuries(jd), e = planetEcl('earth', T);
        var earthAu = hypot3(e.x, e.y, e.z);
        var i, p, ecl, w, q, r, scale, moon, me, mw, mq, dx, dy, len, behind;
        var list = [{ z: cam.earthZ * 0.92, sun: true }];
        var rot = gmst(jd);
        for (i = 0; i < PLANETS.length; i++) {
            p = PLANETS[i];
            ecl = planetEcl(p.id, T);
            w = toWorld(ecl.x, ecl.y, ecl.z, earthAu);
            q = project(w);
            if (!q) continue;
            scale = Math.max(0.55, Math.min(1.45, q.scale));
            r = p.kind === 'earth' ? earthR : p.r * Math.min(W, H) / 860;
            r = Math.max(r * scale, p.kind === 'earth' ? 26 : 2.4);
            moon = null;
            if (p.kind === 'earth') {
                me = moonEcl(jd);
                mw = toWorld(e.x + me.x, e.y + me.y, e.z + me.z, earthAu);
                mq = project(mw);
                if (mq) {
                    dx = mq.x - q.x; dy = mq.y - q.y;
                    len = Math.sqrt(dx * dx + dy * dy) || 1;
                    behind = mq.z > q.z;
                    moon = {
                        x: q.x + dx / len * r * 1.78,
                        y: q.y + dy / len * r * 0.62,
                        behind: behind
                    };
                }
            }
            list.push({ z: q.z, p: p, x: q.x, y: q.y, r: r, rot: rot, moon: moon });
        }
        list.sort(function (a, b) { return b.z - a.z; });
        return list;
    }

    function frame(now) {
        if (!running) return;
        if (!last) last = now;
        var t = (now - t0) / 1000;
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        paint(t, dt);
        if (!still()) raf = requestAnimationFrame(frame);
    }

    function paint(t, dt) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        drawStarfield(ctx, t);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, sx, sy, sunR * 6.8, '#ff6501', 0.08);
        glowDisc(ctx, sx, sy, sunR * 3.8, '#ffc501', 0.09);
        ctx.restore();
        drawOrbits(ctx);
        drawRocks(ctx);
        drawWind(ctx, t);

        var bodies = placeBodies(julianNow()), i;
        for (i = 0; i < bodies.length; i++) {
            if (bodies[i].sun) drawSun(ctx, t);
            else drawPlanet(ctx, bodies[i].p, bodies[i].x, bodies[i].y, bodies[i].r, bodies[i].rot, bodies[i].moon);
        }
        drawMeteors(ctx, dt || 0);
    }

    function start() {
        if (!desktop()) { stop(); return; }
        try {
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
        } catch (err) { try { console.error(err); } catch (e) {} }
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
    matchMedia(DESKTOP).addEventListener('change', onResize);
    matchMedia(STILL).addEventListener('change', function () { stop(); start(); });

    function boot() { setTimeout(start, 0); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
