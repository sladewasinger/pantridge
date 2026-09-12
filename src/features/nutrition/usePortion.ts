import { useState } from 'react';
import type { Nutrition } from '../../domain/products/nutrition';
import {
  nutritionContext,
  customNutrients,
  scaleNutrition,
  type NutritionUnit,
} from '../../domain/products/nutrition-amount';
import type { PackageSize } from '../../domain/products/size';

export function usePortion(nutrition: Nutrition, size?: PackageSize) {
  const [mode, setMode] = useState(nutrition.perServing ? 'serving' : 'hundred');
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<NutritionUnit>('g');
  const [labelBasis, setLabelBasis] = useState<'' | 'g' | 'ml'>('');
  const context = nutritionContext(nutrition, size, labelBasis);
  const chosenUnit = context.units.includes(unit) ? unit : (context.units[0] ?? 'g');
  const choices = {
    serving: nutrition.perServing ?? {},
    hundred: context.per100,
    whole: scaleNutrition(context.per100, context.wholeFactor ?? NaN),
    custom: customNutrients(context.per100, amount, chosenUnit, context.basis),
  };
  return {
    ...context,
    mode,
    setMode,
    amount,
    setAmount,
    unit: chosenUnit,
    setUnit,
    labelBasis,
    setLabelBasis,
    values: choices[mode as keyof typeof choices],
  };
}
