import { authLoginSchema, authSignUpSchema } from '../../../src/validators/auth.validator.js';

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0].message;

describe('auth.validator', () => {
  describe('authSignUpSchema', () => {
    const valid = { email: 'jdoe@example.com', password: 'secret123', username: 'jdoe' };

    it('accepts a complete sign-up payload', () => {
      expect(authSignUpSchema.parse(valid)).toEqual(valid);
    });

    it('strips unknown keys such as role escalation attempts', () => {
      expect(authSignUpSchema.parse({ ...valid, role_name: 'Administrator' })).toEqual(valid);
    });

    it.each(['not-an-email', 'jdoe@', '@example.com', ''])('rejects the email %p', (email) => {
      expect(firstMessage(authSignUpSchema.safeParse({ ...valid, email }))).toBe('Invalid email address');
    });

    it('requires a username', () => {
      const { username: _omit, ...rest } = valid;

      expect(authSignUpSchema.safeParse(rest).success).toBe(false);
    });

    it.each([
      ['2 characters', 'ab', 'Username must be at least 3 characters long'],
      ['21 characters', 'a'.repeat(21), 'Username must be at most 20 characters long'],
    ])('rejects a username of %s', (_label, username, message) => {
      expect(firstMessage(authSignUpSchema.safeParse({ ...valid, username }))).toBe(message);
    });

    it.each([
      ['3 characters', 'abc'],
      ['20 characters', 'a'.repeat(20)],
    ])('accepts a username of exactly %s', (_label, username) => {
      expect(authSignUpSchema.safeParse({ ...valid, username }).success).toBe(true);
    });

    it('requires a password', () => {
      const { password: _omit, ...rest } = valid;

      expect(authSignUpSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects a non-string password', () => {
      expect(authSignUpSchema.safeParse({ ...valid, password: 123456 }).success).toBe(false);
    });
  });

  describe('authLoginSchema', () => {
    const valid = { email: 'jdoe@example.com', password: 'secret123' };

    it('accepts email and password without a username', () => {
      expect(authLoginSchema.parse(valid)).toEqual(valid);
    });

    it('accepts an optional username within bounds', () => {
      expect(authLoginSchema.safeParse({ ...valid, username: 'jdoe' }).success).toBe(true);
    });

    it('still validates the username length when one is sent', () => {
      expect(firstMessage(authLoginSchema.safeParse({ ...valid, username: 'ab' }))).toBe(
        'Username must be at least 3 characters long',
      );
    });

    it('rejects an invalid email', () => {
      expect(firstMessage(authLoginSchema.safeParse({ ...valid, email: 'nope' }))).toBe('Invalid email address');
    });

    it('requires a password', () => {
      expect(authLoginSchema.safeParse({ email: valid.email }).success).toBe(false);
    });
  });
});
