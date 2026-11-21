import { getAlertLevel, isHigherAlert, toBudgetTotals } from '../../src/budget.js';

describe('budget', () => {
  describe('getAlertLevel', () => {
    it('gives no alert while spending is under the threshold', () => {
      expect(getAlertLevel(toBudgetTotals(1000, 799), 80)).toBeNull();
    });

    it('alerts at the threshold once the used share reaches it', () => {
      expect(getAlertLevel(toBudgetTotals(1000, 800), 80)).toBe('Threshold');
    });

    it('compares the same rounded share the dashboard shows', () => {
      expect(getAlertLevel(toBudgetTotals(1000, 799.6), 80)).toBe('Threshold');
    });

    it('alerts at the threshold when spending equals the budget', () => {
      expect(getAlertLevel(toBudgetTotals(1000, 1000), 80)).toBe('Threshold');
    });

    it('alerts over budget once spending passes the budget', () => {
      expect(getAlertLevel(toBudgetTotals(1000, 1000.01), 80)).toBe('OverBudget');
    });

    it('alerts over budget when there is spending but no budget', () => {
      expect(getAlertLevel(toBudgetTotals(0, 50), 80)).toBe('OverBudget');
    });

    it('gives no alert for a project without budget or spending', () => {
      expect(getAlertLevel(toBudgetTotals(0, 0), 80)).toBeNull();
    });
  });

  describe('isHigherAlert', () => {
    it.each([
      ['Threshold', null, true],
      ['OverBudget', null, true],
      ['OverBudget', 'Threshold', true],
      ['Threshold', 'OverBudget', false],
      ['Threshold', 'Threshold', false],
      [null, 'Threshold', false],
      [null, null, false],
    ] as const)('%s after %s is higher: %s', (level, previous, expected) => {
      expect(isHigherAlert(level, previous)).toBe(expected);
    });
  });
});
