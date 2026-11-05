import { getCategoryErrorMessage } from '../../src/lib/category-errors';

const GENERIC = 'Something went wrong while saving the category. Try again.';

describe('getCategoryErrorMessage', () => {
  it.each([
    ['a duplicate name', { status: 409, data: { message: 'A category named "Tech" already exists.' } }, 'A category named "Tech" already exists.'],
    ['a name of the wrong length', { status: 400, data: { message: 'Category name must be 3–20 characters.' } }, 'Category name must be 3–20 characters.'],
    ['an empty name', { status: 400, data: { message: "Category name can't be empty." } }, "Category name can't be empty."],
    ['a deleted category', { status: 404, data: { message: 'anything' } }, 'This category no longer exists. Refresh the list.'],
    ['an expired session', { status: 401, data: { message: 'Invalid token.' } }, 'Your session has expired. Log in again.'],
    ['a dropped connection', { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }, "Couldn't reach the server. Check your connection and try again."],
    ['an axios network error', { code: 'ERR_NETWORK', message: 'Network Error' }, "Couldn't reach the server. Check your connection and try again."],
    ['an axios conflict', { response: { status: 409, data: { message: 'A category named "Tech" already exists.' } } }, 'A category named "Tech" already exists.'],
    ['a server crash', { status: 500, data: { message: 'PrismaClientKnownRequestError: internal details' } }, GENERIC],
    ['a 400 without a message', { status: 400 }, GENERIC],
    ['an unknown error', new Error('boom'), GENERIC],
    ['nothing at all', undefined, GENERIC],
  ])('explains %s', (_label, error, expected) => {
    expect(getCategoryErrorMessage(error, 'Contributor')).toBe(expected);
  });

  it('names the role that cannot manage categories', () => {
    expect(getCategoryErrorMessage({ status: 403 }, 'Read-only')).toBe("Your role (Read-only) can't manage categories.");
  });

  it('still explains a permission error when the role is unknown', () => {
    expect(getCategoryErrorMessage({ status: 403 })).toBe("Your role can't manage categories.");
  });
});
