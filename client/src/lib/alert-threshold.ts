export const DEFAULT_ALERT_THRESHOLD = 80;

const RANGE_MESSAGE = 'Alert threshold must be between 1 and 100';

const isWholeNumber = (value: number | string) =>
  Number.isInteger(Number(value)) || 'Alert threshold must be a whole number';

export const alertThresholdRules = {
  required: 'Alert threshold is required',
  min: { value: 1, message: RANGE_MESSAGE },
  max: { value: 100, message: RANGE_MESSAGE },
  validate: isWholeNumber,
};
