const tray =
  '<path d="M10 24q0-5 7-6h44q8 0 9 6l-3 31q-1 6-8 7H21q-8 0-9-7Z" fill="#e8e1cf" stroke="#bfb8a1"/><path d="M15 26h50v27q0 4-6 4H21q-5 0-5-4Z" fill="#d8d2bf"/>';
const meats = {
  chicken:
    '<path d="M24 27c10-6 28-3 28 11-1 9-13 11-18 8-13 12-25-9-10-19Z" fill="#e0ad90" stroke="#be8d72"/><path d="M46 45q-3-18 11-13 13 7-1 17-5 5-10-4Z" fill="#e9b99a" stroke="#be8d72"/><path d="m58 48 3 5" stroke="#f4e6c8" stroke-width="5" stroke-linecap="round"/>',
  mince:
    '<rect x="20" y="26" width="40" height="27" rx="6" fill="#ad6c60"/><path d="m24 30 28 17m-28-8 17 10m-6-20 20 12m-31 7 29-16m-20 18 25-12m-29-8 26 19" stroke="#ce9484" stroke-width="2" stroke-linecap="round"/>',
  bacon:
    '<g fill="#b97666" stroke="#935c4d"><path d="m20 27 7-2 4 25-8 2Zm13-1 8 0 3 26-7 0Zm13 0 8 2 4 23-8 1Z"/></g><path d="m23 29 5 20m9-19 3 19m10-18 5 17" stroke="#e6bca0" stroke-width="3" stroke-linecap="round"/>',
  slices:
    '<g fill="#e0b99b" stroke="#bb957b"><ellipse cx="31" cy="36" rx="13" ry="9"/><ellipse cx="43" cy="34" rx="13" ry="9"/><ellipse cx="48" cy="44" rx="13" ry="9"/><ellipse cx="34" cy="47" rx="13" ry="9"/></g><path d="M25 47q9 4 17 0m0-13q6 3 10 0" stroke="#efd1b4" stroke-width="2" fill="none"/>',
  sausage:
    '<g fill="none" stroke="#b78363" stroke-width="9" stroke-linecap="round"><path d="M24 31q-4 9 2 17m12-17q-4 9 2 17m12-17q-4 9 2 17"/></g><path d="m23 35 4 0m-3 7 4 0m9-7 4 0m-3 7 4 0m9-7 4 0m-3 7 4 0" stroke="#966747"/>',
  tofu: '<path d="m23 31 12-8 23 6-12 9Z" fill="#f2ead2" stroke="#b5ad90"/><path d="M23 31v19l23 7V38Z" fill="#e4dabe" stroke="#b5ad90"/><path d="m46 38 12-9v20l-12 8Z" fill="#ccc4a8" stroke="#b5ad90"/><path d="m27 37 14 4m-14 4 14 4" stroke="#f2ead2"/>',
};
export function proteinArt(recipe) {
  const detail = recipe[5];
  if (!meats[detail]) throw new Error(`Unknown protein: ${detail}`);
  return (
    tray + meats[detail] + '<path d="m18 23 17 0m17 0 10 0" stroke="#fff9e966" stroke-width="2"/>'
  );
}
export function cheeseArt([id, , , color]) {
  if (id === 'mozzarella')
    return '<ellipse cx="40" cy="53" rx="28" ry="9" fill="#d2cdb6"/><ellipse cx="34" cy="37" rx="19" ry="21" fill="#eee7d0" stroke="#c6bda3"/><ellipse cx="53" cy="47" rx="13" ry="13" fill="#f5eed9" stroke="#c6bda3"/><path d="M23 34q-1-9 9-11m14 21q6-7 12-1" stroke="#fff9e6" stroke-width="3" fill="none" stroke-linecap="round"/>';
  return `<path d="m14 38 35-23 17 27-35 21Z" fill="${color}" stroke="#b08b4e"/><path d="m14 38 17 9 35-5-17-27Z" fill="#efd18a"/><path d="m14 38 17 9v16l-17-7Z" fill="#d4a753"/><g fill="#c5a35e"><ellipse cx="36" cy="34" rx="4" ry="2.5"/><ellipse cx="48" cy="27" rx="3" ry="2"/><ellipse cx="53" cy="38" rx="4" ry="2.5"/><ellipse cx="41" cy="52" rx="3" ry="4"/></g>`;
}
