import { categoryParamsSchema } from '../../../src/validators/category.validator.js';
import { financialDataParamsSchema } from '../../../src/validators/financial-data.validator.js';
import { permissionParamsSchema } from '../../../src/validators/permission.validator.js';
import { projectParamsSchema } from '../../../src/validators/project.validator.js';
import { roleParamsSchema } from '../../../src/validators/role.validator.js';
import { userParamsSchema } from '../../../src/validators/user.validator.js';
import { ID } from '../helpers/factories.js';

const schemas = [
  ['categoryParamsSchema', categoryParamsSchema],
  ['financialDataParamsSchema', financialDataParamsSchema],
  ['permissionParamsSchema', permissionParamsSchema],
  ['projectParamsSchema', projectParamsSchema],
  ['roleParamsSchema', roleParamsSchema],
  ['userParamsSchema', userParamsSchema],
] as const;

describe.each(schemas)('%s', (_name, schema) => {
  it('accepts a UUID id', () => {
    expect(schema.parse({ id: ID })).toEqual({ id: ID });
  });

  it('accepts an upper-case UUID id', () => {
    expect(schema.safeParse({ id: ID.toUpperCase() }).success).toBe(true);
  });

  it.each([
    ['a numeric string', '123'],
    ['an empty string', ''],
    ['a UUID without dashes', ID.replace(/-/g, '')],
    ['a UUID with trailing text', `${ID}x`],
    ['a SQL injection attempt', "' OR 1=1 --"],
  ])('rejects %s with the UUID message', (_label, id) => {
    const result = schema.safeParse({ id });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid ID format. Must be a UUID.');
  });

  it('rejects a missing id', () => {
    const result = schema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['id']);
  });

  it('rejects a non-string id', () => {
    expect(schema.safeParse({ id: 123 }).success).toBe(false);
  });
});
