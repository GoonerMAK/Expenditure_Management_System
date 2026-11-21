WITH totals AS (
    SELECT
        p."id",
        p."alert_threshold",
        COALESCE(SUM(COALESCE(f."revised_budget", f."initial_budget", 0)), 0) AS budget,
        COALESCE(SUM(COALESCE(f."expenditure", 0)), 0) AS spent
    FROM "Project" p
    LEFT JOIN "FinancialData" f ON f."project_id" = p."id"
    GROUP BY p."id", p."alert_threshold"
)
UPDATE "Project" p
SET "budget_alert_level" = CASE
    WHEN t.spent > t.budget THEN 'OverBudget'::"BudgetAlertLevel"
    WHEN t.budget > 0 AND ROUND((t.spent / t.budget * 1000)::numeric) / 10 >= t."alert_threshold" THEN 'Threshold'::"BudgetAlertLevel"
    ELSE NULL
END
FROM totals t
WHERE t."id" = p."id";
