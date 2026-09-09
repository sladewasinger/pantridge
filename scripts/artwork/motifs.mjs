const dots = (points, color, radius = 3) =>
  points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`).join('');
const seeds = (color) =>
  dots(
    [
      [33, 37],
      [41, 34],
      [48, 39],
      [37, 45],
      [46, 47],
    ],
    color,
  );
const leaf = '<path d="M38 32q0-7 7-7-1 7-7 7" fill="#6e885c"/>';
export const motifs = {
  tomato: `<circle cx="40" cy="41" r="10" fill="#ba6a50"/><path d="m40 29 2 7 7-3-5 6-7-4-5 1 6-4Z" fill="#6d8557"/>`,
  citrus:
    '<circle cx="40" cy="40" r="11" fill="#dca44b" stroke="#f5df9b" stroke-width="3"/><path d="m40 30 0 20m-9-15 18 10m-18 0 18-10" stroke="#f5df9b" stroke-width="1.5"/>',
  corn: '<rect x="34" y="29" width="13" height="24" rx="6" fill="#d9b45c"/><path d="M38 32v18m5-18v18m-9-13h13m-13 6h13" stroke="#f3d781" stroke-width="1.3"/><path d="m31 39 9 14 9-12" fill="none" stroke="#819762" stroke-width="3"/>',
  peas: `<path d="M27 44q12-21 28-9-12 20-28 9Z" fill="#809460"/>${dots(
    [
      [34, 41],
      [41, 38],
      [48, 37],
    ],
    '#b7bd7b',
  )}`,
  beans:
    '<g fill="#925d4b"><ellipse cx="34" cy="37" rx="5" ry="7" transform="rotate(-25 34 37)"/><ellipse cx="46" cy="45" rx="5" ry="7" transform="rotate(30 46 45)"/></g>',
  chickpeas: seeds('#c5a575'),
  lentils: seeds('#aa8964'),
  quinoa: seeds('#c6b891'),
  granola: seeds('#b99d67'),
  raisins: seeds('#806958'),
  berries: `${dots(
    [
      [34, 41],
      [44, 37],
      [46, 47],
    ],
    '#8c697d',
    6,
  )}${leaf}`,
  nuts: '<g fill="#b58c5e" stroke="#8f6b48"><ellipse cx="33" cy="40" rx="4" ry="8" transform="rotate(-20 33 40)"/><path d="M46 32q-10 3-2 16 11-2 6-10-6 6-4-6Z"/></g>',
  peanut:
    '<path d="M32 30c10-4 8 6 12 7 13 4 4 18-3 12-3-4-8-2-11-7-3-5-3-10 2-12Z" fill="#c6a16b" stroke="#9c774c"/><path d="m32 34 13 12m-15-9 8-3m-2 10 9-5" stroke="#af8957"/>',
  coffee:
    '<g fill="#77523e" stroke="#d8b68d"><ellipse cx="34" cy="39" rx="6" ry="9" transform="rotate(-25 34 39)"/><ellipse cx="47" cy="43" rx="5" ry="8" transform="rotate(25 47 43)"/><path d="m32 32 4 14m12-10-3 14" fill="none"/></g>',
  wheat:
    '<path d="M40 53V29m0 13-8-7m8 0-7-7m7 20 8-7m-8-5 8-7" fill="none" stroke="#b49355" stroke-width="3" stroke-linecap="round"/>',
  cubes:
    '<path d="m28 38 9-5 9 4-9 6Zm0 0v9l9 5v-9m0 9 9-5V37" fill="#f5e6c2" stroke="#baa57c"/><path d="m44 30 8 4v9l-8-4-6-3Z" fill="#e4cfaa" stroke="#baa57c"/>',
  cracker:
    '<rect x="29" y="30" width="23" height="23" rx="3" transform="rotate(-12 40 41)" fill="#d4b277" stroke="#b59459"/>' +
    dots(
      [
        [34, 36],
        [42, 35],
        [35, 44],
        [43, 43],
      ],
      '#ad874e',
      1,
    ),
  chips:
    '<g fill="#e2c27c" stroke="#bba063"><ellipse cx="35" cy="39" rx="7" ry="11" transform="rotate(-25 35 39)"/><ellipse cx="47" cy="43" rx="7" ry="10" transform="rotate(25 47 43)"/></g>',
  triangles: '<path d="m29 46 7-18 16 20Zm8 5 14-18 3 21Z" fill="#d7b477" stroke="#b4945d"/>',
  pretzel:
    '<path d="M32 47c-15-10 1-26 7-9l7 11c-1-19 17-21 8-5-6 11-17 11-22 3Zm2-9 13 12" fill="none" stroke="#b48a53" stroke-width="5"/>',
  popcorn:
    dots(
      [
        [34, 40],
        [42, 34],
        [47, 43],
        [38, 47],
      ],
      '#e5c98e',
      5,
    ) +
    dots(
      [
        [33, 37],
        [40, 31],
        [47, 40],
        [36, 44],
      ],
      '#f4e5be',
      4,
    ),
  cereal:
    '<g fill="none" stroke="#c9a56b" stroke-width="3"><circle cx="34" cy="36" r="4"/><circle cx="46" cy="38" r="4"/><circle cx="40" cy="47" r="4"/></g>',
  honey:
    '<path d="M40 28c-2 7-10 12-8 18 3 11 20 5 16-4Z" fill="#d4a144"/><path d="M36 40q-4 5 0 7" stroke="#f4d485" fill="none" stroke-width="2"/>',
  drop: '<path d="M40 29c-2 7-10 12-8 18 3 10 19 5 16-4Z" fill="#b8a05d"/>',
  olives: `${dots(
    [
      [34, 41],
      [45, 47],
    ],
    '#7c8352',
    5,
  )}${leaf}`,
  chili:
    '<path d="M32 49q23-6 13-18-4 2-4 7-3 8-9 11Z" fill="#b96348"/><path d="m44 31 2-6" stroke="#7b8c60" stroke-width="3"/>',
  seed: seeds('#aa874a'),
  cream: '<path d="M29 46q1-7 8-10 6-3 4-9 12 7 8 14 7 3 2 7Z" fill="#fff3d8" stroke="#c8b995"/>',
  curds: dots(
    [
      [33, 42],
      [40, 38],
      [47, 42],
      [38, 47],
      [47, 48],
    ],
    '#faf0d9',
    4,
  ),
  cheese:
    '<path d="m29 43 18-14 7 20-25 3Z" fill="#e4c78c" stroke="#bc9a63"/>' +
    dots(
      [
        [37, 43],
        [47, 45],
      ],
      '#c5a568',
      2,
    ),
  hummus:
    '<ellipse cx="40" cy="41" rx="13" ry="10" fill="#d7bf8e"/><path d="M34 39c8-9 20 6 7 7-8 0-8-8-2-7" fill="none" stroke="#b99b62" stroke-width="2"/>',
  soup: '<path d="M26 40h28q-3 14-14 14T26 40" fill="#d5ba86"/><path d="M34 35q-5-5 0-9m9 9q-5-5 0-9" fill="none" stroke="#b8996e" stroke-width="2" stroke-linecap="round"/>',
  coconut:
    '<path d="M27 39a13 13 0 0 0 26 0Z" fill="#8e7459"/><ellipse cx="40" cy="39" rx="13" ry="7" fill="#f2e8ce" stroke="#9b7e5e" stroke-width="2"/>',
  tea: '<path d="M29 36h19v10q-9 12-19 0Z" fill="#e8d5af" stroke="#9e926b"/><path d="M48 38c11-4 10 11 0 8M36 31q-6-4 0-9" stroke="#9e926b" fill="none" stroke-width="2"/>',
  cocoa:
    '<ellipse cx="40" cy="42" rx="12" ry="8" fill="#85634c"/><path d="m29 44 24 0" stroke="#b2956e"/>',
  cookie:
    '<circle cx="40" cy="41" r="12" fill="#caa46b" stroke="#b3915d"/>' +
    dots(
      [
        [34, 36],
        [44, 35],
        [39, 43],
        [47, 46],
        [33, 47],
      ],
      '#80634d',
      2,
    ),
  fish: '<path d="M28 41q12-17 24 0-12 16-24 0Zm24 0 7-7v14Z" fill="#879fa4"/><circle cx="34" cy="40" r="1.5" fill="#48676c"/>',
  broccoli:
    '<path d="m37 49 3-14 4 14Z" fill="#9aad7c"/>' +
    dots(
      [
        [33, 35],
        [40, 31],
        [47, 35],
      ],
      '#759276',
      6,
    ),
  fries:
    '<g fill="#dec080" stroke="#b49c65"><path d="m29 32 5-1 4 23-5 1Zm11-4 5 1-2 25-5-1Zm12 7 5 2-7 19-5-2Z"/></g>',
  waffle:
    '<circle cx="40" cy="41" r="13" fill="#dec18a" stroke="#b39560"/><path d="M32 31v20m8-23v26m8-23v20M29 35h22m-24 7h26m-23 7h20" stroke="#b39560" stroke-width="2"/>',
  dumpling:
    '<path d="M25 46q15-26 30 0-13 9-30 0Z" fill="#eee1c4" stroke="#b5a588"/><path d="m30 40 5 6m0-11 5 9m2-11 3 11m3-8 1 9" stroke="#bcaf91" fill="none"/>',
  shrimp:
    '<path d="M49 45c-7 16-29 0-20-11 7-10 25 2 16 8-5 4-11-4-5-5" fill="none" stroke="#d6a58e" stroke-width="7"/><path d="m49 44 6-3-1 10Z" fill="#be8b77"/><path d="m28 36 7 2m-5 8 6-4m6 9 1-7" stroke="#bd8b75"/>',
  scoop:
    '<path d="m28 42 24 0-7 13H35Z" fill="#b99d78"/>' +
    dots(
      [
        [34, 36],
        [44, 34],
        [48, 39],
      ],
      '#f3dfba',
      7,
    ),
};
export function motif(name) {
  if (!name) return '';
  if (!motifs[name]) throw new Error(`Missing package motif: ${name}`);
  return motifs[name];
}
