import { createUserSchema, updateUserSchema } from '../../../src/validators/user.validator.js';
import { ID, OTHER_ID } from '../helpers/factories.js';

const validCreate = {
  username: 'jdoe',
  password: 'secret123',
  email: 'jdoe@example.com',
  name: 'John Doe',
  role_id: OTHER_ID,
  role_name: 'Contributor',
  age: '30',
  gender: 'Male',
  nationality: 'Bangladeshi',
};

const createIssue = (input: unknown) => createUserSchema.safeParse(input).error?.issues[0];
const updateIssue = (input: unknown) => updateUserSchema.safeParse(input).error?.issues[0];

describe('user.validator', () => {
  describe('createUserSchema', () => {
    it('accepts a complete user', () => {
      expect(createUserSchema.parse(validCreate)).toEqual(validCreate);
    });

    it('accepts a user without optional profile fields', () => {
      const { age: _a, gender: _g, nationality: _n, ...required } = validCreate;

      expect(createUserSchema.safeParse(required).success).toBe(true);
    });

    it.each([
      ['username', 'jd', 'Username must be at least 3 characters long'],
      ['password', '12345', 'Password must be at least 6 characters long'],
      ['email', 'jdoe.example.com', 'Invalid email address'],
      ['name', '', 'Name is required'],
      ['role_id', 'admin', 'Invalid role ID'],
    ])('rejects an invalid %s with its message', (field, value, message) => {
      expect(createIssue({ ...validCreate, [field]: value })?.message).toBe(message);
    });

    it('accepts a password of exactly 6 characters', () => {
      expect(createUserSchema.safeParse({ ...validCreate, password: '123456' }).success).toBe(true);
    });

    it.each(['Read-only', 'Contributor', 'Administrator'])('accepts the role %p', (role_name) => {
      expect(createUserSchema.safeParse({ ...validCreate, role_name }).success).toBe(true);
    });

    it.each(['administrator', 'Owner', ''])('rejects the role %p', (role_name) => {
      expect(createIssue({ ...validCreate, role_name })?.path).toEqual(['role_name']);
    });

    it.each(['Male', 'Female', 'Other'])('accepts the gender %p', (gender) => {
      expect(createUserSchema.safeParse({ ...validCreate, gender }).success).toBe(true);
    });

    it('rejects a gender outside the enum', () => {
      expect(createIssue({ ...validCreate, gender: 'male' })?.path).toEqual(['gender']);
    });

    it('rejects a numeric age because age is stored as a string', () => {
      expect(createIssue({ ...validCreate, age: 30 })?.path).toEqual(['age']);
    });

    it.each(['username', 'password', 'email', 'name', 'role_id', 'role_name'])('requires %s', (field) => {
      const input: Record<string, unknown> = { ...validCreate };
      delete input[field];

      expect(createIssue(input)?.path).toEqual([field]);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts an empty data object', () => {
      expect(updateUserSchema.parse({ data: {} })).toEqual({ data: {} });
    });

    it('accepts a role-only update', () => {
      expect(updateUserSchema.parse({ data: { role_id: OTHER_ID, role_name: 'Administrator' } })).toEqual({
        data: { role_id: OTHER_ID, role_name: 'Administrator' },
      });
    });

    it('accepts an optional top-level UUID id', () => {
      expect(updateUserSchema.safeParse({ id: ID, data: {} }).success).toBe(true);
    });

    it('rejects a non-UUID top-level id', () => {
      expect(updateIssue({ id: '1', data: {} })?.message).toBe('Invalid user ID');
    });

    it('requires the data wrapper', () => {
      expect(updateIssue({ username: 'jdoe' })?.path).toEqual(['data']);
    });

    it('allows a 2-character username on update', () => {
      expect(updateUserSchema.safeParse({ data: { username: 'jd' } }).success).toBe(true);
    });

    it('rejects a 1-character username on update', () => {
      expect(updateIssue({ data: { username: 'j' } })?.message).toBe('Username must be at least 2 characters long');
    });

    it.each([
      ['email', 'bad', 'Invalid email address'],
      ['name', '', 'Name is required'],
      ['role_id', 'x', 'Invalid role ID'],
    ])('validates %s inside data', (field, value, message) => {
      expect(updateIssue({ data: { [field]: value } })?.message).toBe(message);
    });

    it('rejects a role outside the enum inside data', () => {
      expect(updateIssue({ data: { role_name: 'Root' } })?.path).toEqual(['data', 'role_name']);
    });

    it('strips unknown keys inside data', () => {
      expect(updateUserSchema.parse({ data: { name: 'Jane', is_superuser: true } })).toEqual({ data: { name: 'Jane' } });
    });
  });
});
