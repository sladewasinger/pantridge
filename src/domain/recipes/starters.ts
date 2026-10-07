import type { Recipe } from './model';
import { curatedRecipes } from './collection';

const ingredient = (
  recipe: number,
  index: number,
  name: string,
  [quantity, unit]: [number, Recipe['ingredients'][number]['unit']],
) => ({
  id: `cb010000-0000-4000-8000-${String(recipe * 100 + index).padStart(12, '0')}`,
  name,
  quantity,
  unit,
});
// Recipe ideas only. These never create food identities or inventory lots.
export const starterRecipes: Recipe[] = [
  {
    id: 'cb000000-0000-4000-8000-000000000001',
    title: 'Simple scrambled eggs',
    description: 'Soft scrambled eggs with butter.',
    servings: 2,
    minutes: 10,
    cuisine: 'Everyday',
    source: 'starter',
    ingredients: [ingredient(1, 1, 'Eggs', [4, 'count']), ingredient(1, 2, 'Butter', [1, 'tbsp'])],
    steps: [
      'Beat the eggs together.',
      'Melt the butter in a pan over low heat.',
      'Add the eggs and stir gently until set. Cook eggs thoroughly to your needs.',
    ],
  },
  {
    id: 'cb000000-0000-4000-8000-000000000002',
    title: 'Black beans and rice',
    description: 'An easy pantry bowl using cooked or canned beans.',
    servings: 2,
    minutes: 30,
    cuisine: 'Everyday',
    source: 'starter',
    ingredients: [
      ingredient(2, 1, 'Rice', [150, 'g']),
      ingredient(2, 2, 'Black beans', [400, 'g']),
      ingredient(2, 3, 'Olive oil', [1, 'tbsp']),
    ],
    steps: [
      'Cook the rice in water following its package directions.',
      'Use cooked or canned black beans. Drain and warm them in a pan with the oil and a splash of water.',
      'Serve the beans over the cooked rice.',
    ],
  },
  {
    id: 'cb000000-0000-4000-8000-000000000003',
    title: 'Tomato pasta',
    description: 'A quick tomato sauce for pasta.',
    servings: 2,
    minutes: 25,
    cuisine: 'Italian-inspired',
    source: 'starter',
    ingredients: [
      ingredient(3, 1, 'Pasta', [200, 'g']),
      ingredient(3, 2, 'Tomatoes', [400, 'g']),
      ingredient(3, 3, 'Olive oil', [1, 'tbsp']),
    ],
    steps: [
      'Cook the pasta following its package directions, reserving a little cooking water.',
      'Chop the tomatoes and simmer with olive oil until softened.',
      'Toss the pasta with the tomatoes, adding cooking water as needed.',
    ],
  },
  {
    id: 'cb000000-0000-4000-8000-000000000004',
    title: 'Vegetable fried rice',
    description: 'A flexible fried-rice supper.',
    servings: 2,
    minutes: 20,
    cuisine: 'East Asian-inspired',
    source: 'starter',
    ingredients: [
      ingredient(4, 1, 'Cooked rice', [300, 'g']),
      ingredient(4, 2, 'Eggs', [2, 'count']),
      ingredient(4, 3, 'Carrots', [100, 'g']),
      ingredient(4, 4, 'Soy sauce', [1, 'tbsp']),
    ],
    steps: [
      'Use freshly cooked rice, or rice promptly refrigerated after cooking.',
      'Chop and cook the carrots in a lightly oiled pan until tender.',
      'Scramble the eggs in the pan until set, then add rice and soy sauce. Stir until steaming hot throughout.',
    ],
  },
  ...curatedRecipes,
];
