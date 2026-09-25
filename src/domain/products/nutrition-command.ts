import type { Snapshot } from '../model';
import type { Command } from '../commands';

export function saveNutrition(
  data: Snapshot,
  command: Extract<Command, { type: 'food.nutrition' }>,
): Snapshot {
  const food = data.foods.find((item) => item.id === command.foodId);
  if (!food || food.name !== command.name) return data;
  if (command.estimate && command.estimate.name !== food.name)
    throw new Error('Food and nutrition estimate do not match.');
  return {
    ...data,
    foods: data.foods.map((item) => {
      if (item.id !== food.id) return item;
      const { nutritionEstimate: _previous, ...rest } = item;
      return command.estimate ? { ...rest, nutritionEstimate: command.estimate } : rest;
    }),
  };
}
