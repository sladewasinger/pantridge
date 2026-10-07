import { useState } from 'react';
import {
  ingredientRegistry,
  ingredientLabel,
  identifyIngredient,
  customIngredient,
} from '../../domain/ingredient-matching/identity';
import {
  preparationSchema,
  type IngredientIdentity as Identity,
} from '../../domain/ingredient-matching/model';

function selectedIdentity(id: string, custom: Identity): Identity | undefined {
  if (id === custom.id) return custom;
  const identity = ingredientRegistry.find((item) => item.id === id);
  return identity
    ? {
        id: identity.id,
        preparation: preparationSchema.parse(identity.preparation),
        basis: 'as-sold',
      }
    : undefined;
}

function automaticIdentity(name: string, inferred?: Identity | null) {
  return inferred === undefined ? identifyIngredient(name) : (inferred ?? undefined);
}

export function IngredientIdentity({
  name,
  value,
  onChange,
  disabled = false,
  inferred,
}: {
  name: string;
  value?: Identity;
  onChange: (value: Identity | undefined) => void;
  disabled?: boolean;
  inferred?: Identity | null;
}) {
  const [open, setOpen] = useState(false);
  const automatic = automaticIdentity(name, inferred);
  const current = value ?? automatic;
  const custom = customIngredient(name);
  const patch = (change: Partial<Identity>) => {
    if (current) onChange({ ...current, ...change });
  };
  return (
    <details
      className="recipe-substitutions"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Recipe matching</summary>
      {open && (
        <>
          <label>
            Ingredient identity
            <select
              value={value?.id ?? ''}
              disabled={disabled}
              onChange={(event) => onChange(selectedIdentity(event.target.value, custom))}
            >
              <option value="">
                Automatic · {automatic ? ingredientLabel(automatic.id) : 'unrecognized'}
              </option>
              {!identifyIngredient(name) && (
                <option value={custom.id}>Use exact name · {name}</option>
              )}
              {ingredientRegistry.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Preparation
              <select
                value={current?.preparation ?? 'unknown'}
                disabled={disabled || !current}
                onChange={(event) =>
                  patch({ preparation: preparationSchema.parse(event.target.value) })
                }
              >
                {preparationSchema.options.map((form) => (
                  <option key={form} value={form}>
                    {form === 'any' ? 'Any preparation' : form}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount basis
              <select
                value={current?.basis ?? 'unknown'}
                disabled={disabled || !current}
                onChange={(event) => patch({ basis: event.target.value as Identity['basis'] })}
              >
                <option value="as-sold">As sold</option>
                <option value="drained">Drained</option>
                <option value="edible">Edible portion</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
          </div>
        </>
      )}
    </details>
  );
}
