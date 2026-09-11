export const household = [
  ['napkins', 'Napkins', 'household'],
  ['paper-towels', 'Paper towels', 'household'],
  ['paper-plates', 'Paper plates', 'household'],
  ['toilet-paper', 'Toilet paper', 'household'],
  ['shaving-cream', 'Shaving cream', 'household'],
  ['household-box', 'Storage box', 'household'],
];
export function householdArt(id) {
  const roll = (height) =>
    `<path d="M20 ${height}h39v37q-20 9-39 0Z" fill="#eae4d2" stroke="#b9b5a2"/><ellipse cx="39.5" cy="${height}" rx="19.5" ry="7" fill="#fff9e8" stroke="#b9b5a2"/><ellipse cx="39.5" cy="${height}" rx="6" ry="3" fill="#a99b7b"/><path d="m49 ${height + 6} 0 29 14 3V${height + 4}" fill="#f6f0df" stroke="#c9c1ac"/>`;
  const drawings = {
    'paper-towels': roll(15),
    'toilet-paper': `<g transform="translate(0 12) scale(1 .76)">${roll(15)}</g>`,
    napkins:
      '<path d="m14 49 37-25 18 18-37 24Z" fill="#cec8b6"/><path d="m14 41 35-26 20 25-38 23Z" fill="#efe8d3" stroke="#b7ad97"/><path d="m14 41 30-1 5-25m-18 48 13-23 25 0" fill="none" stroke="#d4c8ad" stroke-width="2"/>',
    'paper-plates':
      '<ellipse cx="40" cy="47" rx="30" ry="15" fill="#c4bda9"/><ellipse cx="40" cy="42" rx="30" ry="15" fill="#e4ddc9" stroke="#b7ad97"/><ellipse cx="40" cy="36" rx="30" ry="16" fill="#fff7e5" stroke="#c4bda9"/><ellipse cx="40" cy="36" rx="22" ry="10" fill="none" stroke="#ddd2b8" stroke-width="2"/>',
    'shaving-cream':
      '<rect x="25" y="18" width="31" height="45" rx="7" fill="#8daba8" stroke="#698c89"/><path d="M25 32h31v22H25Z" fill="#e7ecda"/><path d="M30 10h21v9H30Z" fill="#e1decf"/><path d="M32 8h17v6H32Z" fill="#6d8279"/><path d="M33 46q7-11 15 0" fill="#fff9ec"/><path d="M29 23v6" stroke="#b9d4c9" stroke-width="3"/>',
    'household-box':
      '<path d="m12 25 28-11 28 11v32L40 67 12 55Z" fill="#bb956e" stroke="#926f4e"/><path d="m12 25 28 10 28-10M40 35v32" fill="none" stroke="#967450" stroke-width="2"/><path d="m28 19 28 10v10l-9 4V32L20 22Z" fill="#dfc89d"/>',
  };
  if (!drawings[id]) throw new Error(`Unknown household artwork ${id}`);
  return drawings[id];
}
