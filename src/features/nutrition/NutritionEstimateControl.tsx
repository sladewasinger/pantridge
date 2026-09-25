import { Sparkles } from 'lucide-react';
import type { Food } from '../../domain/model';
import type { PackageSize } from '../../domain/products/size';
import { estimateNutrition } from '../../domain/products/nutrition-estimate';
import { NutritionLabel } from './NutritionLabel';
import { useNutritionEstimate } from './useNutritionEstimate';

export function NutritionEstimateControl({ food, size }: { food: Food; size?: PackageSize }) {
  const state = useNutritionEstimate(food);
  const saved = food.nutritionEstimate?.name === food.name ? food.nutritionEstimate : undefined;
  const estimate = state.preview ?? saved;
  return (
    <div className="nutrition-estimate" aria-busy={state.busy}>
      {estimate ? (
        <>
          <p className="estimate-note">
            <Sparkles size={16} /> AI estimate · {state.preview ? 'Review before saving' : 'Saved'}
          </p>
          <p className="muted">{estimate.assumptions}</p>
          <NutritionLabel
            key={estimate.estimatedAt}
            nutrition={estimateNutrition(estimate)}
            name={food.name}
            size={size}
            estimated
          />
          {state.preview ? (
            <>
              <button
                className="primary full"
                disabled={state.busy}
                onClick={() => void state.save(state.preview)}
              >
                Save estimate
              </button>
              <button className="text-button full" disabled={state.busy} onClick={state.clear}>
                Discard estimate
              </button>
            </>
          ) : (
            <button
              className="text-button full"
              disabled={state.busy}
              onClick={() => void state.save(null)}
            >
              Remove estimate
            </button>
          )}
        </>
      ) : (
        <>
          <p className="muted">No nutrition information yet.</p>
          <label>
            Details <span className="optional">optional</span>
            <input
              value={state.details}
              maxLength={200}
              disabled={state.busy || state.account === 'local'}
              onChange={(event) => state.setDetails(event.target.value)}
              placeholder="e.g. 90% lean, raw"
            />
          </label>
          <button
            className="secondary full"
            disabled={state.busy || state.account === 'local'}
            onClick={() => void state.estimate()}
          >
            <Sparkles size={18} />
            {state.busy ? 'Estimating…' : 'Estimate nutrition info'}
          </button>
          <p className="muted">
            {state.account === 'local'
              ? 'Sign in with Google to estimate nutrition.'
              : 'AI estimate, not a package label. Review before saving.'}
          </p>
        </>
      )}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
