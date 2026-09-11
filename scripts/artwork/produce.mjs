import { bananas, greens } from './fresh-produce.mjs';
const circles = (points, color, radius = 8) =>
  points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`).join('');
const citrus = (color, shape) =>
  `<path d="${shape}" fill="${color}" stroke="#b4a05d" stroke-width="1.5"/><path d="M25 30q2-8 10-9" fill="none" stroke="#fff1bd88" stroke-width="3" stroke-linecap="round"/><path d="M44 17q4-9 15-7-4 9-15 7" fill="#7d925f"/>`;
const berrySeeds =
  '<g fill="#f0ca8b"><path d="m30 33 1 2m10-6 1 2m-5 10 1 2m-8 0 1 2m10 4 1 2m8-10 1 2" stroke="#f0ca8b" stroke-width="1.5"/></g>';
const produce = {
  bananas,
  greens,
  orange: citrus('#dda453', 'M59 26C51 10 21 15 18 35c-3 20 19 31 34 19 10-7 12-17 7-28Z'),
  lemon: citrus(
    '#e6c75f',
    'M14 39c1-9 4-7 6-14 8-17 31-15 40 0 3 5 9 5 7 11-3 5-6 3-9 10-11 19-33 11-38 1-3-6-7-3-6-8Z',
  ),
  lime: citrus(
    '#9eb267',
    'M18 39c-2-15 13-23 26-22 17 1 23 16 17 30-6 14-28 15-36 3-3-5-7-5-7-11Z',
  ),
  avocado:
    '<path d="M27 17c7-13 18-6 18 5 1 10 18 18 12 32-5 15-32 15-38 0-6-13 4-24 8-37Z" fill="#6c8458" stroke="#546d46"/><path d="M30 20c5-8 11-4 11 5 0 9 17 19 11 29-5 10-24 10-29-1-4-9 4-22 7-33Z" fill="#c8ce8c"/><ellipse cx="38" cy="48" rx="10" ry="12" fill="#ad8559"/><ellipse cx="35" cy="45" rx="4" ry="5" fill="#c39b6a"/>',
  tomato:
    '<path d="M40 24c-25-17-36 23-16 34 11 7 19 4 29 0 23-12 10-45-13-34Z" fill="#c27154" stroke="#a45d46"/><path d="m40 12 2 13 15-5-9 11 8 4-15-4-12 4 6-8-11-5 14 2Z" fill="#768958"/><path d="M22 35q-5 8 1 13" fill="none" stroke="#e4a583" stroke-width="3" stroke-linecap="round"/>',
  cucumber:
    '<path d="M19 44 49 13c12-12 26 5 16 15L32 60c-14 11-26-4-13-16Z" fill="#7f9869" stroke="#617d56"/><path d="m22 48 34-31m-26 38 32-32" stroke="#a5b78c" stroke-width="2" stroke-linecap="round"/><ellipse cx="24" cy="53" rx="12" ry="10" transform="rotate(-35 24 53)" fill="#d8dfb0" stroke="#6c8b5e" stroke-width="3"/><path d="m20 50 3 6m3-8 3 6" stroke="#adba85" stroke-width="2"/>',
  'bell-pepper':
    '<path d="M39 25C20 12 9 30 16 47c4 20 16 15 24 11 10 12 29 2 27-18 3-20-16-27-28-15Z" fill="#c17c56" stroke="#a16646"/><path d="M37 24q0-16 12-17l3 5q-11 1-9 13" fill="#788b55"/><path d="M35 28q-8 13 0 28m10-28q9 16 0 27" fill="none" stroke="#a96648" stroke-width="2"/><path d="M22 30q-4 7-2 12" stroke="#e6b17f" fill="none" stroke-width="3" stroke-linecap="round"/>',
  broccoli:
    '<path d="m27 59 6-26h16l6 26-12 4Z" fill="#a3b47c" stroke="#7d965f"/><path d="m39 54 2-24m0 13L26 31m15 6 13-12" stroke="#7f9863" stroke-width="3"/>' +
    circles(
      [
        [23, 29],
        [31, 18],
        [47, 17],
        [58, 28],
        [39, 29],
      ],
      '#71916c',
      12,
    ) +
    circles(
      [
        [21, 26],
        [34, 15],
        [53, 24],
      ],
      '#8ba27a',
      7,
    ),
  cauliflower:
    '<path d="M13 36q1 25 27 28 23-1 27-28-17 2-27 14-12-13-27-14Z" fill="#91a676"/>' +
    circles(
      [
        [24, 31],
        [34, 22],
        [48, 24],
        [57, 36],
        [39, 37],
      ],
      '#e6dfc3',
      12,
    ) +
    circles(
      [
        [24, 27],
        [36, 19],
        [50, 28],
      ],
      '#f0ead5',
      7,
    ) +
    '<path d="m14 38 26 26 26-25" fill="none" stroke="#6e8c5c" stroke-width="2"/>',
  mushrooms:
    '<path d="m28 30-5 26q9 7 16 0l-4-26Z" fill="#e1d5b8" stroke="#b6a58b"/><path d="M10 32c0-30 43-31 43 0q-22 13-43 0Z" fill="#baa387" stroke="#9a846c"/><path d="M12 33q20 6 38 0" stroke="#e3d3b4" stroke-width="3"/><path d="m52 45-5 17q8 4 13-1l-2-17Z" fill="#e1d5b8"/><path d="M37 46c2-25 33-23 34 0q-17 9-34 0Z" fill="#c5b194" stroke="#9a846c"/>',
  strawberries:
    '<path d="M21 31c-3-21 35-25 36-2 0 12-9 26-18 34-9-7-17-22-18-32Z" fill="#bb715c" stroke="#a45f4b"/><path d="m22 24 10-5-1-9 9 7 10-8-1 10 12 6-15 3-5-7-6 9Z" fill="#7e9165"/>' +
    berrySeeds,
  blueberries:
    circles(
      [
        [24, 40],
        [36, 28],
        [51, 37],
        [56, 51],
        [38, 54],
      ],
      '#7d879e',
      11,
    ) +
    circles(
      [
        [21, 35],
        [34, 24],
        [48, 32],
        [52, 47],
      ],
      '#9da6b8',
      3,
    ) +
    '<path d="m35 25 3-3 2 4 4 2-5 2-3-1Zm17 25 3-3 3 3-2 4Z" fill="#59697f"/>',
  grapes:
    '<path d="M40 20q-1-12 12-13m-10 11q-15-15-24-5 7 15 24 5" fill="#8b9a6d" stroke="#76895b" stroke-width="2"/>' +
    circles(
      [
        [30, 27],
        [46, 26],
        [24, 40],
        [39, 40],
        [54, 39],
        [32, 52],
        [47, 52],
        [40, 61],
      ],
      '#9e8393',
      8,
    ) +
    circles(
      [
        [28, 25],
        [44, 24],
        [37, 38],
        [30, 50],
      ],
      '#b8a0ac',
      2,
    ),
  celery:
    '<path d="m23 25 10 36 17 0 9-37-8-2-7 28-1-33-8 0 1 33-7-28Z" fill="#acc18c" stroke="#8ba673"/><path d="m29 22 10 37m6 0 8-36" stroke="#d5dfb0" stroke-width="2"/>' +
    circles(
      [
        [21, 21],
        [34, 13],
        [45, 13],
        [59, 20],
      ],
      '#839e6d',
      8,
    ),
  zucchini:
    '<path d="m19 44 32-30c10-9 22 4 13 14L33 60c-13 10-25-5-14-16Z" fill="#809367" stroke="#677b51"/><path d="m25 48 30-29m-25 34 29-29" stroke="#a6b187" stroke-width="2"/><path d="m56 15 5-8 6 3-6 9Z" fill="#a6ad78"/><ellipse cx="23" cy="55" rx="6" ry="5" fill="#b9bf93"/>',
  'green-onions':
    '<g fill="none" stroke-linecap="round" stroke-width="6"><path d="m27 48 0-35m10 36 3-42m6 43 12-34m-19 30 14-37" stroke="#7b9967"/><path d="m27 48 3 13m7-14 1 14m8-12-1 12" stroke="#e1dfbd"/></g><path d="m30 62-3 4m11-4 2 5m5-5 4 3" stroke="#b5a685"/><path d="m24 46 24 4" stroke="#b8946f" stroke-width="3"/>',
  potatoes:
    '<path d="M12 44c0-24 28-30 36-14 12 21-25 43-34 25Z" fill="#c1aa7d" stroke="#a58c65"/><path d="M41 38c15-13 32 0 24 17-9 20-40 4-24-17Z" fill="#ceb991" stroke="#a58c65"/><path d="m24 32 3-1m-8 15 2 1m16-8 2 0m13 7 2-2m1 12 3 0" stroke="#9c825d" stroke-width="2" stroke-linecap="round"/>',
  onions:
    '<path d="M40 14c-3 13-22 13-24 31-2 22 48 25 48 0-1-18-20-18-24-31Z" fill="#c9a777" stroke="#ae8d60"/><path d="M40 18c-15 20-14 35-4 44m6-43c14 20 17 31 3 43m-4-42v41" fill="none" stroke="#e3c798" stroke-width="2"/><path d="m37 14 1-8m4 8 3-9m-7 58-3 4m9-5 3 4" stroke="#9a8d60" stroke-width="2"/>',
  garlic:
    '<path d="M39 19c-13 10-29 19-24 33 4 13 47 13 52-2 4-17-23-24-23-31l1-11-9 1Z" fill="#e8dfc9" stroke="#bdb09a"/><path d="M39 22c-19 20-17 28-7 39m9-39c14 18 19 26 8 39m-9-33v34" fill="none" stroke="#c9b9a3" stroke-width="2"/><path d="m35 62-3 4m8-4 0 5m6-6 4 4" stroke="#b6a185"/>',
  'sweet-potatoes':
    '<path d="M11 47c10-2 9-20 27-24 25-7 33 5 24 20-8 15-30 13-38 18-11 8-25-10-13-14Z" fill="#b88360" stroke="#9f6d50"/><path d="M19 48q3-14 20-19m-14 25 14-4m13-17 4 2m-8 7 3 0" stroke="#d2a680" fill="none" stroke-width="2" stroke-linecap="round"/>',
};
export function produceArt(id) {
  if (!produce[id]) throw new Error(`Unknown produce: ${id}`);
  return produce[id];
}
