import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import {
  standardizationVersion,
  type SavedStandardization,
} from '../../../src/domain/standardization/model';
import { ResultNote } from '../../../src/features/standardization/ResultNote';

const saved: SavedStandardization = {
  version: standardizationVersion,
  fingerprint: 'a'.repeat(64),
  source: 'ai-private',
  status: 'unknown',
  identity: null,
  preparation: 'unknown',
  reason: 'Choose an ingredient, check its preparation, and review this item.',
};
it.each(['unknown', 'uncertain', 'taxonomy-gap', 'composite', 'nonfood'] as const)(
  'describes a cached %s result without turning its provider reason into a correction chore',
  (status) => {
    const html = renderToStaticMarkup(
      createElement(ResultNote, {
        result: { ...saved, status },
        manual: false,
      }),
    );
    expect(html).not.toContain(saved.reason);
    expect(html).not.toMatch(/choose|check|review|clarif|need/i);
    expect(html).toContain('<p');
  },
);
it('keeps an unspecified recognized preparation descriptive', () => {
  const html = renderToStaticMarkup(
    createElement(ResultNote, {
      result: { ...saved, status: 'recognized', identity: 'rice' },
      manual: false,
    }),
  );
  expect(html).toContain('preparation unspecified');
  expect(html).not.toMatch(/choose|check|review|clarif|need/i);
});
it('does not display a stale automatic result over a manual correction', () => {
  expect(renderToStaticMarkup(createElement(ResultNote, { result: saved, manual: true }))).toBe('');
});
it('hides obsolete catalog-gap notes while keeping successful older results visible', () => {
  const old = { ...saved, version: '1', status: 'taxonomy-gap' as const };
  expect(renderToStaticMarkup(createElement(ResultNote, { result: old, manual: false }))).toBe('');
  expect(
    renderToStaticMarkup(
      createElement(ResultNote, {
        result: { ...old, status: 'recognized', identity: 'rice', preparation: 'cooked' },
        manual: false,
      }),
    ),
  ).toContain('AI ingredient match.');
});
