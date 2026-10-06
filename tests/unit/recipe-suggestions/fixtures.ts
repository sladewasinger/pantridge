export const request = {
  kind: 'recipe',
  useUp: false,
  inventory: [{ name: 'Eggs', quantity: 6, unit: 'count', useSoon: false }],
};
export const generated = {
  recipes: [
    {
      title: 'Scrambled eggs',
      description: 'Simple eggs for breakfast.',
      servings: 2,
      minutes: 10,
      ingredients: [
        { name: 'Eggs', quantity: 4, unit: 'count', note: '' },
        { name: 'Butter', quantity: 1, unit: 'tbsp', note: '' },
      ],
      steps: ['Beat the eggs.', 'Melt the butter in a pan and stir in the eggs. Cook until set.'],
    },
  ],
};
export const output = (value: unknown) =>
  Response.json({
    status: 'completed',
    output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
  });
