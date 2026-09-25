const berry = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">
  <path d="M0-14C-16-16-18-4-12 8L-6 17Q0 23 6 17L12 8C18-4 16-16 0-14Z" fill="#a74359" stroke="#87334b"/>
  ${[
    [-8, -9],
    [0, -11],
    [8, -9],
    [-11, -2],
    [-3, -3],
    [5, -3],
    [12, -1],
    [-8, 5],
    [0, 5],
    [8, 6],
    [-4, 12],
    [4, 13],
    [0, 18],
  ]
    .map(
      ([a, b], i) =>
        `<circle cx="${a}" cy="${b}" r="4.4" fill="${i % 3 ? '#c9586c' : '#d57582'}" stroke="#a74359" stroke-width=".8"/><path d="m${a - 1.5} ${b - 1.5} 1-.6" stroke="#f0adab" stroke-width="1"/>`,
    )
    .join('')}
  <ellipse cy="-13" rx="7" ry="3.3" fill="#813447" stroke="#db8991" stroke-width="1.4"/>
</g>`;

const drawings = {
  'red-onion': `<path d="M32 14C29 23 11 23 10 42c-2 22 45 26 47 4 2-20-20-20-21-32Z" fill="#954c70" stroke="#713952" stroke-width="1.3"/>
    <path d="M31 18C16 34 18 49 27 59m8-40c16 15 19 27 10 39m-12-37c-5 15-5 27 0 39" fill="none" stroke="#c4819b" stroke-width="1.8"/>
    <path d="M24 29q-9 8-6 16" fill="none" stroke="#dda8b5" stroke-width="2.5"/>
    <path d="m31 16-3-10 5 4 3-6 3 13m-12 44-4 4m10-4-1 5m7-6 4 4" fill="none" stroke="#ad9275" stroke-width="1.4"/>
    <ellipse cx="54" cy="48" rx="17" ry="18" transform="rotate(24 54 48)" fill="#f4e8dc" stroke="#894568" stroke-width="2"/>
    <g fill="none" stroke="#bb7394" stroke-width="1.2" transform="rotate(24 54 48)"><ellipse cx="54" cy="48" rx="13" ry="14.5"/><ellipse cx="54" cy="48" rx="9" ry="10.5"/><ellipse cx="54" cy="48" rx="5" ry="6.5"/><ellipse cx="54" cy="48" rx="1.5" ry="2.5"/></g>`,
  raspberries: `<path d="M36 24q-5-16 10-17-2 14-10 17m1-2q6-12 19-6-9 10-19 6" fill="#768b59" stroke="#5b764c"/>
    ${berry(27, 34, 0.85)}${berry(53, 37, 0.9)}${berry(37, 49, 0.82)}`,
  tabasco: `<path d="M34 12h12v11c0 7 11 8 12 16v22q0 5-18 5t-18-5V39c1-8 12-9 12-16Z" fill="#d3d2b7" stroke="#979a7d" stroke-width="1.1"/>
    <path d="M35 19h10v7c0 7 11 8 11 14v20q0 4-16 4t-16-4V40c0-6 11-7 11-14Z" fill="#b95332"/>
    <path d="M27 38v21q0 2 4 2m6-45v11" fill="none" stroke="#f1d7aa" stroke-width="1.6" opacity=".65"/>
    <path d="M53 39v21" stroke="#963e28" stroke-width="2"/>
    <rect x="33" y="4" width="14" height="11" rx="1.7" fill="#b7332c" stroke="#8d3028"/>
    <path d="M35 6v6m3-6v6m4-6v6m3-6v6" stroke="#d7654a" stroke-width=".6"/>
    <path d="M33.5 15h13v10h-13Z" fill="#faf2d8" stroke="#cbc5a6" stroke-width=".5"/>
    <path d="M34 16h12v3H34Zm0 8h12" fill="#39734b" stroke="#39734b" stroke-width=".5"/>
    <text x="40" y="22.5" text-anchor="middle" font-family="Georgia,serif" font-size="3.3" font-weight="bold" fill="#a8392c">TABASCO</text>
    <path d="m40 31 17 16-17 17-17-17Z" fill="#fff9e5" stroke="#39734b" stroke-width="1.6"/>
    <path d="m40 34 14 13-14 14-14-14Z" fill="none" stroke="#75926a" stroke-width=".55"/>
    <text x="40" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="3.5" fill="#396c46">McILHENNY CO.</text>
    <text x="40" y="49.7" text-anchor="middle" font-family="Georgia,serif" font-size="6.3" font-weight="bold" fill="#ad352c" textLength="28" lengthAdjust="spacingAndGlyphs">TABASCO</text>
    <text x="40" y="54" text-anchor="middle" font-family="Georgia,serif" font-size="3.3" fill="#396c46">PEPPER SAUCE</text>
    <path d="M36 57h8" stroke="#ac3e2d" stroke-width=".6"/>`,
};
export const addedArt = (id) =>
  id === 'tabasco'
    ? `<g transform="translate(17.6 0) scale(.56 1)">${drawings[id]}</g>`
    : drawings[id];
