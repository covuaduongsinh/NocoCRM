// @vitest-environment node

import { expect, it } from 'vitest';
import { definitions, sources } from '../../server/providers/crm/schema.js';
import {
  tuitionPackage,
  tuitionPackages,
  tuitionTotal,
} from '../../server/providers/crm/tuition.js';

const options = (key: string): string[] =>
  definitions.opportunities.fields.find((field) => field.key === key)
    ?.options ?? [];

// The fee notice sent to parents (server/providers/crm/tuition.ts): what a
// parent pays for each package, its sessions and its books.
it('totals each tuition package as the fee notice does', () => {
  expect(
    Object.fromEntries(
      tuitionPackages.map((item) => [item.key, tuitionTotal(item)]),
    ),
  ).toEqual({
    course10: 1_700_000,
    course20: 3_200_000,
    course40: 5_500_000,
  });
  // 40 sessions at the per-session price would be 6,000,000.
  const forty = tuitionPackage('course40');
  expect(forty?.saving).toBe(40 * 150_000 - 5_500_000);
  expect(forty).toMatchObject({ bookFee: 0, bookWaiver: 300_000 });
  expect(tuitionPackage('course20')?.gift).toEqual({
    key: 'chessSet',
    value: 200_000,
  });
  expect(tuitionPackage('chessCourse')).toBeUndefined();
  expect(tuitionPackage(null)).toBeUndefined();
});

it('offers every tuition package as an opportunity business type', () => {
  for (const item of tuitionPackages)
    expect(options('businessType')).toContain(item.key);
});

// Books and equipment are the bookshop application's: an opportunity can no
// longer be one, and a lead can come from the bookshop.
it('offers no bookshop sale on an opportunity, and the bookshop as a source', () => {
  expect(options('pipelineType')).toEqual(['tuition', 'b2b_school']);
  for (const retired of [
    'chessBook',
    'chessEquipment',
    'course12',
    'course24',
    'course48',
  ])
    expect(options('businessType')).not.toContain(retired);
  expect(sources).toContain('bookshop');
});
