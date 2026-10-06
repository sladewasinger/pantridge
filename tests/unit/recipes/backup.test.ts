import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportKitchen, restoreKitchen } from '../../../src/data/backup';
import { emptySnapshot, snapshotSchema, type Snapshot } from '../../../src/domain/model';
import { starterRecipes } from '../../../src/domain/recipes/starters';
import { reduceChecked } from '../../../src/domain/reducer';
import { initializeStarter } from '../../../src/domain/starter';
const mocked = vi.hoisted(() => ({ current: {} as { data: Snapshot }, dispatch: vi.fn() }));
vi.mock('../../../src/data/store', () => ({
  getKitchen: () => mocked.current,
  dispatchMany: mocked.dispatch,
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mocked.dispatch.mockReset();
});
describe('cookbook backup compatibility', () => {
  it('does not populate fictional stock in an existing cookbook-only kitchen', () => {
    const data = { ...emptySnapshot(), recipes: [starterRecipes[0]!] };
    expect(initializeStarter(data)).toEqual({ ...data, starterVersion: 1 });
  });
  it('exports a near-capacity cookbook compactly so its own file is restorable', async () => {
    let snapshot = emptySnapshot();
    for (let index = 0; index < 96; index++) {
      const recipe = {
        ...starterRecipes[0]!,
        id: `fab00000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        title: `Recipe ${index}`,
        steps: Array<string>(4).fill('x'.repeat(620)),
      };
      snapshot = reduceChecked(snapshot, { type: 'recipe.save', recipe });
    }
    expect(new TextEncoder().encode(JSON.stringify(snapshot, null, 2)).length).toBeGreaterThan(
      300_000,
    );
    mocked.current = { data: snapshot };
    let exported: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      if (!(blob instanceof Blob)) throw new Error('Expected a Blob backup.');
      exported = blob;
      return 'blob:test';
    });
    vi.stubGlobal('document', { createElement: () => ({ click: vi.fn() }) });
    vi.stubGlobal('window', { setTimeout: vi.fn() });
    exportKitchen();
    expect(exported).toBeDefined();
    expect(exported!.size).toBeLessThanOrEqual(280_000);
    expect(snapshotSchema.parse(JSON.parse(await exported!.text()))).toEqual(snapshot);
    mocked.current = { data: emptySnapshot() };
    await restoreKitchen(new File([exported!], 'pantridge.json'));
    const commands = mocked.dispatch.mock.calls[0]?.[0] as Parameters<typeof reduceChecked>[1][];
    expect(commands.reduce(reduceChecked, emptySnapshot())).toEqual(snapshot);
  });
  it('does not overwrite a kitchen containing only recipes', async () => {
    mocked.current = { data: { ...emptySnapshot(), recipes: [starterRecipes[0]!] } };
    await expect(restoreKitchen(new File(['{}'], 'backup.json'))).rejects.toThrow('empty kitchen');
    expect(mocked.dispatch).not.toHaveBeenCalled();
  });
  it('still imports old inventory-only backups without cookbook fields', async () => {
    mocked.current = { data: emptySnapshot() };
    await restoreKitchen(new File([JSON.stringify(emptySnapshot())], 'old.json'));
    expect(mocked.dispatch).toHaveBeenCalledWith([], true);
  });
});
