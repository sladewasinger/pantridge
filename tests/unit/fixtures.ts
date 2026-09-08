import { emptySnapshot, type Food, type ShoppingItem, type Snapshot } from '../../src/domain/model';
export const egg: Food = {
  id: 'a30e9e54-8038-4ba0-a0f5-10100a123456',
  name: 'Eggs',
  unit: 'cartons',
  art: 'eggs',
  brand: '',
  packageSize: '',
  location: 'fridge',
  shelf: 0,
  frozen: false,
};
export const lotId = 'b30e9e54-8038-4ba0-a0f5-10100a123456';
export const shoppingId = 'c30e9e54-8038-4ba0-a0f5-10100a123456';
export const newLotId = 'd30e9e54-8038-4ba0-a0f5-10100a123456';
export const purchase: ShoppingItem = {
  id: shoppingId,
  foodId: egg.id,
  name: 'Eggs',
  unit: 'cartons',
  quantity: 2,
  purchased: true,
};
export function kitchen(): Snapshot {
  return {
    ...emptySnapshot(),
    foods: [egg],
    stock: [{ id: lotId, foodId: egg.id, quantity: 2, expires: '2026-09-12' }],
    shopping: [purchase],
  };
}
