import { Sparkles, LoaderCircle } from 'lucide-react';
import type { Food } from '../../domain/model';
import { artPath } from '../../domain/artwork/catalog';
import { packageLabel } from '../../domain/products/variants';

export function ScanPreview({
  food,
  stage,
}: {
  food: Food;
  stage: 'lookup' | 'enhance' | 'complete';
}) {
  return (
    <div className="scan-product">
      <img src={artPath(food.art)} alt="" />
      <span>
        {food.name || (stage === 'lookup' ? 'Scanned item' : 'Product not found')}
        {stage !== 'complete' && (
          <span className="scan-refining" role="status">
            {stage === 'enhance' && <Sparkles size={15} />}
            <LoaderCircle size={14} />
            <span className={stage === 'enhance' ? 'sr-only' : undefined}>
              {stage === 'lookup' ? 'Fetching details…' : 'Refining details'}
            </span>
          </span>
        )}
        <small>
          {packageLabel(food) || 'Unspecified size'} · {food.unit}
        </small>
        <small>{food.brand}</small>
      </span>
    </div>
  );
}
