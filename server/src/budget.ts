import { BudgetAlertLevel } from '@prisma/client';

export type FinancialEntry = {
    expenditure: number | null;
    initial_budget: number | null;
    revised_budget: number | null;
};

export type BudgetTotals = ReturnType<typeof toBudgetTotals>;

export const sumBudget = (entries: FinancialEntry[]) =>
    entries.reduce((sum, entry) => sum + (entry.revised_budget ?? entry.initial_budget ?? 0), 0);

export const sumSpent = (entries: FinancialEntry[]) =>
    entries.reduce((sum, entry) => sum + (entry.expenditure || 0), 0);

export const toBudgetTotals = (budget: number, spent: number) => ({
    budget,
    spent,
    remaining: budget - spent,
    percent_used: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : null,
    over_budget: spent > budget,
});

export const groupEntriesByPeriod = <T extends FinancialEntry>(entries: T[], periodOf: (entry: T) => string) => {
    const groups = new Map<string, T[]>();
    for (const entry of entries) {
        const period = periodOf(entry);
        const group = groups.get(period);
        if (group) {
            group.push(entry);
        } else {
            groups.set(period, [entry]);
        }
    }
    return [...groups.values()];
};

export const getAlertLevel = (totals: BudgetTotals, threshold: number): BudgetAlertLevel | null => {
    if (totals.over_budget) return BudgetAlertLevel.OverBudget;
    if (totals.percent_used !== null && totals.percent_used >= threshold) return BudgetAlertLevel.Threshold;
    return null;
};

const ALERT_RANK: Record<BudgetAlertLevel, number> = {
    Threshold: 1,
    OverBudget: 2,
};

export const isHigherAlert = (level: BudgetAlertLevel | null, previous: BudgetAlertLevel | null) =>
    (level ? ALERT_RANK[level] : 0) > (previous ? ALERT_RANK[previous] : 0);
