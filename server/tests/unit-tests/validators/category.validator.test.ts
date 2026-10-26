import { categorySchema } from '../../../src/validators/category.validator.js';

describe('category.validator categorySchema', () => {
  it('accepts a valid category name', () => {
    expect(categorySchema.parse({ category_name: 'Infrastructure' })).toEqual({ category_name: 'Infrastructure' });
  });

  it.each([
    ['3 characters', 'abc'],
    ['20 characters', 'a'.repeat(20)],
  ])('accepts a name of exactly %s', (_label, category_name) => {
    expect(categorySchema.safeParse({ category_name }).success).toBe(true);
  });

  it.each([
    ['empty', '', 'Category name must be at least 3 characters long'],
    ['2 characters', 'ab', 'Category name must be at least 3 characters long'],
    ['21 characters', 'a'.repeat(21), 'Category name must be at most 20 characters long'],
  ])('rejects a name that is %s', (_label, category_name, message) => {
    const result = categorySchema.safeParse({ category_name });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });

  it('rejects a missing name', () => {
    expect(categorySchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-string name', () => {
    expect(categorySchema.safeParse({ category_name: 12345 }).success).toBe(false);
  });

  it('strips unknown keys', () => {
    expect(categorySchema.parse({ category_name: 'Healthcare', id: 'x' })).toEqual({ category_name: 'Healthcare' });
  });
});
