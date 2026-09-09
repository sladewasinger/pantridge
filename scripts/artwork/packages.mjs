import { motif } from './motifs.mjs';

const snow =
  '<g stroke="#f7faf2" stroke-width="1.2" stroke-linecap="round"><path d="M58 13v10m-4-7 8 4m-8 0 8-4"/></g>';
const seam =
  '<path d="m22 10 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3" fill="none" stroke="#ffffff55"/>';
export function packageArt([, , shape, color = '#b6a383', accent = '#eee0c0', detail]) {
  const label = ['bar', 'pizza', 'stack'].includes(shape) ? '' : motif(detail);
  const body = {
    can: `<rect x="20" y="15" width="40" height="44" rx="4" fill="${color}"/><path d="M20 27h40v24H20Z" fill="${accent}"/><path d="M23 18v39" stroke="#ffffff44" stroke-width="2"/><ellipse cx="40" cy="15" rx="20" ry="6" fill="#d8d9c6" stroke="#9fa78e"/><ellipse cx="40" cy="15" rx="15" ry="3" fill="none" stroke="#b0b79d"/><path d="M21 58q19 5 38 0" fill="none" stroke="#b4bba5" stroke-width="3"/>${label}`,
    tin: `<path d="M11 27q0-7 10-7h38q10 0 10 7v23q0 9-11 9H23q-12 0-12-9Z" fill="${color}" stroke="#929b92"/><rect x="11" y="18" width="58" height="33" rx="11" fill="#dbdecf" stroke="#98a297" stroke-width="2"/><rect x="15" y="22" width="50" height="25" rx="8" fill="${accent}" stroke="#b1b8a5"/><path d="M28 26h24m-24 17h24" stroke="#b7bea9"/><ellipse cx="24" cy="33" rx="6" ry="4" fill="none" stroke="#859488" stroke-width="2"/>${detail ? `<g transform="translate(10 -2) scale(.85)">${label}</g>` : ''}<path d="M15 51q25 5 50 0" stroke="#eff0e1" fill="none"/>`,
    box: `<path d="m19 14 12-7 34 5-11 7Z" fill="${accent}"/><path d="M19 14v45l35 6V19Z" fill="${color}" stroke="#9e8c70"/><path d="m54 19 11-7v45l-11 8Z" fill="${color}"/><path d="m54 19 11-7v45l-11 8Z" fill="#413a2922"/><path d="m24 25 25 4v25l-25-4Z" fill="${accent}"/><path d="m23 18 27 5" stroke="#fff4d655" stroke-width="2"/>${label}`,
    bag: `<path d="m21 9 38 0-3 11 6 38-5 5H23l-5-5 6-38Z" fill="${color}" stroke="#a09275"/><path d="m24 17 32 0m-33 39 34 0" stroke="${accent}" stroke-width="2"/><path d="M27 23h26l4 28H23Z" fill="${accent}"/><path d="m22 58 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3" fill="none" stroke="#ffffff55"/>${seam}${label}`,
    sack: `<path d="M23 10h33l-2 9 7 37q0 7-7 7H26q-7 0-7-7l6-37Z" fill="${color}" stroke="#a49173"/><path d="M24 11h31v8H24Z" fill="${accent}"/><path d="m24 19 4 8m26-8-3 8M24 59h32" stroke="#8f7c5a66" fill="none"/><path d="M25 30h30v23H25Z" fill="${accent}"/>${label}`,
    jar: `<rect x="21" y="15" width="38" height="47" rx="9" fill="${color}" stroke="#a29475"/><rect x="19" y="9" width="42" height="10" rx="3" fill="${accent}" stroke="#9d967d"/><path d="M25 12h30M25 23v30" stroke="#fff3d56b" stroke-width="2"/><path d="M21 31h38v23H21Z" fill="${accent}"/>${label}`,
    bottle: `<path d="M33 14v9c0 6-10 5-10 15v20q0 5 6 5h22q6 0 6-5V38c0-10-10-9-10-15v-9Z" fill="${color}" stroke="#8f9478"/><rect x="32" y="7" width="16" height="11" rx="2" fill="${accent}" stroke="#999477"/><path d="M28 37v18m8-35v6" stroke="#fff4d65c" stroke-width="2"/><path d="M24 33h32v21H24Z" fill="${accent}"/><g transform="translate(6 8) scale(.85)">${label}</g>`,
    squeeze: `<path d="M34 8h12v12l9 9 3 27q0 7-6 7H28q-6 0-6-7l3-27 9-9Z" fill="${color}" stroke="#9f895f"/><path d="M33 8h14v9H33Z" fill="${accent}"/><path d="M27 33h26v21H27Z" fill="${accent}"/><path d="m29 28-3 27" stroke="#fff4d65c" stroke-width="2"/>${label}`,
    carton: `<path d="m23 19 7-12h20l9 12v43H23Z" fill="${color}" stroke="#9f9d81"/><path d="m30 7 20 0-7 12H23Z" fill="${accent}"/><path d="M43 19h16v43H43Z" fill="#4a49331c"/><path d="M23 29h20v23H23Z" fill="${accent}"/><path d="M30 7v-3h20v3" fill="none" stroke="${color}" stroke-width="3"/><g transform="translate(1 6) scale(.82)">${label}</g>`,
    tub: `<path d="M16 23h48l-5 34q0 6-19 6t-19-6Z" fill="${color}" stroke="#a39b80"/><path d="M18 32h44l-3 21H21Z" fill="${accent}"/><ellipse cx="40" cy="23" rx="24" ry="7" fill="${accent}" stroke="#a59f87"/><ellipse cx="40" cy="22" rx="18" ry="4" fill="none" stroke="#ffffff88"/>${label}`,
    bar: '<path d="m18 17 14-7 34 16-14 8Z" fill="#9e7d61"/><path d="M18 17v34l34 15V34Z" fill="#785a47" stroke="#5e493d"/><path d="m52 34 14-8v34l-14 6Z" fill="#5e493d"/><path d="m22 20 26 12m-26 0 26 12m-26 0 26 12m-13-30v32" stroke="#b08a68" stroke-width="2"/><path d="m17 41 35 15 15-9v14l-15 8-35-15Z" fill="#c9bda3"/><path d="m17 41 35 15-8 5-15-11-7 2Z" fill="#ece3d0"/>',
    pizza:
      '<path d="m10 22 45-12 16 31-45 19Z" fill="#be8e68" stroke="#99734e"/><path d="m10 22 16 38v5L10 28Zm16 38 45-19v5L26 65Z" fill="#a77b55"/><ellipse cx="41" cy="34" rx="21" ry="16" transform="rotate(-14 41 34)" fill="#d1ac70" stroke="#edd49b" stroke-width="4"/><g fill="#b66d51"><circle cx="32" cy="30" r="4"/><circle cx="48" cy="30" r="4"/><circle cx="41" cy="42" r="4"/></g><path d="m26 38 5 2m18 4 5-3m-13-17 3 4" stroke="#7f9160" stroke-width="2"/>',
    stack:
      '<g fill="#e8d2a2" stroke="#bca273"><ellipse cx="40" cy="51" rx="27" ry="11"/><ellipse cx="40" cy="47" rx="27" ry="11"/><ellipse cx="40" cy="43" rx="27" ry="11"/><ellipse cx="40" cy="39" rx="27" ry="11"/></g><g fill="#c6aa74"><ellipse cx="28" cy="37" rx="3" ry="1.5"/><ellipse cx="45" cy="34" rx="4" ry="2"/><ellipse cx="49" cy="43" rx="3" ry="1.5"/><ellipse cx="36" cy="44" rx="2" ry="1"/></g>',
    grocery:
      '<path d="M20 18h40l-3 46H23Z" fill="#dbc298" stroke="#b2996e" stroke-width="2"/><path d="M26 19V9h28v10" fill="none" stroke="#9f8259" stroke-width="3"/><path d="m24 23 3 35m27-35-3 35" stroke="#eddbba" stroke-width="2"/>',
  };
  if (shape === 'frozen-bag') {
    return packageArt(['', '', 'bag', color, accent, detail]) + snow;
  }
  if (!body[shape]) throw new Error(`Unknown package: ${shape}`);
  return body[shape];
}
