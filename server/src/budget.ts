export type FinancialEntry = {
    expenditure: number | null;
    initial_budget: number | null;
    revised_budget: number | null;
};

// A revised budget replaces the initial one for that entry
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
