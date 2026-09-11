const silhouettes = {
  longneck: 'M35 11h10v15c0 5 8 8 8 16v17q0 5-5 5H32q-5 0-5-5V42c0-8 8-11 8-16Z',
  wine: 'M35 10h10v18c0 5 10 6 10 16v15q0 5-5 5H30q-5 0-5-5V44c0-10 10-11 10-16Z',
  sparkling: 'M35 10h10v13c0 8 13 10 13 23v12q0 6-6 6H28q-6 0-6-6V46c0-13 13-15 13-23Z',
  square: 'M33 12h14v10l11 8q3 2 3 6v23q0 5-5 5H24q-5 0-5-5V36q0-4 3-6l11-8Z',
  tall: 'M35 10h10v15q0 3 7 6l2 4v25q0 4-4 4H30q-4 0-4-4V35l2-4q7-3 7-6Z',
  round: 'M34 13h12v10c0 5 16 5 16 21v9q0 11-22 11T18 53v-9c0-16 16-16 16-21Z',
  herbal: 'M34 12h12v12c0 6 11 7 11 18v15q0 7-7 7H30q-7 0-7-7V42c0-11 11-12 11-18Z',
};

function labelMotif(motif, ink) {
  const marks = {
    grain: '<path d="M40 48V37m0 4-4-3m4 7 4-3m-4-4 3-3" fill="none"/>',
    seal: '<circle cx="40" cy="42" r="4" fill="none"/><path d="m38 46-1 3 3-1 3 1-1-3" fill="none"/>',
    botanical: '<path d="M40 49V38m0 6q-7 0-6-5 6 0 6 5Zm0-3q6 0 6-5-6 0-6 5Z" fill="none"/>',
    agave: '<path d="M40 48q-7-3-8-9l8 9-4-12 4 12 4-12-4 12q7-3 8-9Z" fill="none"/>',
    lines: '<path d="M35 40h10m-8 3h6m-5 3h4" fill="none"/>',
  };
  return marks[motif] ? `<g stroke="${ink}" stroke-width="1.1">${marks[motif]}</g>` : '';
}

function drinkCan(glass, paper, closure, motif) {
  return `<rect x="25" y="12" width="30" height="50" rx="6" fill="${glass}" stroke="#8a968a"/>
    <path d="M26 23h28v28H26Z" fill="${paper}"/>
    <path d="M26 22h28m-28 30h28" stroke="${closure}" stroke-width="3"/>
    <ellipse cx="40" cy="12" rx="14" ry="3.5" fill="#d8ddd2" stroke="#9ea99d"/>
    <ellipse cx="40" cy="12" rx="4" ry="1.8" fill="none" stroke="#7c8c80"/>
    <path d="M29 17v40m-1 3q12 3 24 0" fill="none" stroke="#fff8df" opacity=".45"/>
    ${labelMotif(motif, closure)}`;
}

export function drinkArt([, , shape, glass, paper, closure, motif]) {
  const kind = shape.replace('drink-', '');
  if (kind === 'can') return drinkCan(glass, paper, closure, motif);
  const outline = silhouettes[kind];
  if (!outline) throw new Error(`Unknown drink silhouette: ${shape}`);
  const wide = kind === 'square' || kind === 'round';
  const labelX = wide ? 25 : 29;
  const labelWidth = wide ? 30 : 22;
  const foil =
    kind === 'sparkling'
      ? `<path d="M34 7h12l2 21-8 4-8-4Z" fill="${closure}"/><path d="m36 11 7 12m-8-5 8 8" stroke="#efdfab" opacity=".55"/>`
      : `<rect x="33" y="6" width="14" height="8" rx="2" fill="${closure}"/><path d="M35 8h10" stroke="#fff4d8" opacity=".4"/>`;
  return `<path d="${outline}" fill="${glass}" stroke="#655f48" stroke-opacity=".55" stroke-width="1.2"/>
    <path d="${outline}" fill="none" stroke="#f7edca" stroke-opacity=".22" stroke-width="3" transform="translate(1 0) scale(.975 1)"/>
    <path d="M37 17v9m-6 10v21" stroke="#fff7df" opacity=".48" stroke-width="2.5" fill="none"/>
    <path d="M48 54v5q-8 3-16 0" stroke="#413c32" opacity=".2" stroke-width="2" fill="none"/>
    <rect x="${labelX}" y="35" width="${labelWidth}" height="19" rx="2" fill="${paper}"/>
    ${motif ? `<rect x="${labelX + 2}" y="37" width="${labelWidth - 4}" height="15" rx="1" fill="none" stroke="${closure}" stroke-opacity=".4" stroke-width=".65"/>` : ''}
    ${labelMotif(motif, closure)}${foil}`;
}
