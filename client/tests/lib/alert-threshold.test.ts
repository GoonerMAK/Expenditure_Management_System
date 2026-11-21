import { alertThresholdRules, DEFAULT_ALERT_THRESHOLD } from '../../src/lib/alert-threshold';

describe('alert threshold', () => {
  it('defaults to 80 percent', () => {
    expect(DEFAULT_ALERT_THRESHOLD).toBe(80);
  });

  it('allows whole percentages from 1 to 100', () => {
    expect(alertThresholdRules.min).toEqual({ value: 1, message: 'Alert threshold must be between 1 and 100' });
    expect(alertThresholdRules.max).toEqual({ value: 100, message: 'Alert threshold must be between 1 and 100' });
    expect(alertThresholdRules.required).toBe('Alert threshold is required');
  });

  it.each([1, '80', 100])('accepts %s as a whole number', (value) => {
    expect(alertThresholdRules.validate(value)).toBe(true);
  });

  it.each([80.5, '12.25'])('rejects %s as not a whole number', (value) => {
    expect(alertThresholdRules.validate(value)).toBe('Alert threshold must be a whole number');
  });
});
