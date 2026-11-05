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
    ['empty', '', "Category name can't be empty."],
    ['only spaces', '   ', "Category name can't be empty."],
    ['2 characters', 'ab', 'Category name must be 3–20 characters.'],
    ['2 characters once trimmed', '  ab  ', 'Category name must be 3–20 characters.'],
    ['21 characters', 'a'.repeat(21), 'Category name must be 3–20 characters.'],
  ])('rejects a name that is %s', (_label, category_name, message) => {
    const result = categorySchema.safeParse({ category_name });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });

  it('trims spaces around the name', () => {
    expect(categorySchema.parse({ category_name: '  Tech  ' })).toEqual({ category_name: 'Tech' });
  });

  it('rejects a missing name as empty', () => {
    const result = categorySchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Category name can't be empty.");
  });

  it('rejects a non-string name as empty', () => {
    const result = categorySchema.safeParse({ category_name: 12345 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Category name can't be empty.");
  });

  it('strips unknown keys', () => {
    expect(categorySchema.parse({ category_name: 'Healthcare', id: 'x' })).toEqual({ category_name: 'Healthcare' });
  });
});
