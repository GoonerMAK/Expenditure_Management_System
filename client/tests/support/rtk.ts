export const queryResult = (overrides: Record<string, unknown> = {}) =>
  ({
    data: undefined,
    error: undefined,
    isLoading: false,
    refetch: jest.fn(),
    ...overrides,
  }) as never;

export const resolvingTrigger = (value: unknown = {}) => jest.fn(() => ({ unwrap: () => Promise.resolve(value) }));

export const rejectingTrigger = (reason: unknown) => jest.fn(() => ({ unwrap: () => Promise.reject(reason) }));

export const mutationResult = (trigger: jest.Mock, state: Record<string, unknown> = {}) =>
  [trigger, { isLoading: false, ...state }] as never;
