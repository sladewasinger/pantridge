export const standardizationReasoning = () =>
  process.env.STANDARDIZATION_REASONING_EFFORT ||
  process.env.CLASSIFIER_REASONING_EFFORT ||
  undefined;
