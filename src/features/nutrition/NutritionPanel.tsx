import { useState } from 'react';
import type { Product } from '../../domain/products/barcode';
import { NutritionLabel } from './NutritionLabel';
import type { PackageSize } from '../../domain/products/size';

export function NutritionPanel({ products, size }: { products: Product[]; size?: PackageSize }) {
  const options = [...new Map(products.map((product) => [product.barcode, product])).values()];
  const [barcode, setBarcode] = useState('');
  const product = options.find((item) => item.barcode === barcode) ?? options[0];
  return (
    <div className="nutrition-panel">
      {options.length > 1 && (
        <label>
          Package
          <select value={product?.barcode} onChange={(event) => setBarcode(event.target.value)}>
            {options.map((item) => (
              <option key={item.barcode} value={item.barcode}>
                {item.brand} · {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {product?.nutrition ? (
        <NutritionLabel
          key={product.barcode}
          nutrition={product.nutrition}
          name={product.name}
          size={size}
        />
      ) : (
        <p className="muted">No nutrition information for this product yet.</p>
      )}
      {product?.source === 'openfoodfacts' && (
        <p className="scan-attribution">
          <a
            href={`https://world.openfoodfacts.org/product/${product.barcode}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts
          </a>{' '}
          · ODbL
        </p>
      )}
    </div>
  );
}
