import { Prisma } from '@prisma/client';
import { getAdminRole } from '../roles.js';
import { getAlertLevel, isHigherAlert, sumBudget, sumSpent, toBudgetTotals } from '../budget.js';

type Db = Prisma.TransactionClient;

const findRecipientIds = async (db: Db, owner_id: string) => {
    const admins = await db.user.findMany({
        where: { role: { role_name: getAdminRole() } },
        select: { id: true },
    });
    return [...new Set([owner_id, ...admins.map((admin) => admin.id)])];
};

export const checkBudgetAlert = async (db: Db, project_id: string) => {
    const project = await db.project.findUnique({
        where: { id: project_id },
        select: {
            project_name: true,
            created_by_id: true,
            alert_threshold: true,
            budget_alert_level: true,
            financial_data: { select: { expenditure: true, initial_budget: true, revised_budget: true } },
        },
    });
    if (!project) return;

    const totals = toBudgetTotals(sumBudget(project.financial_data), sumSpent(project.financial_data));
    const level = getAlertLevel(totals, project.alert_threshold);
    if (level === project.budget_alert_level) return;

    await db.project.update({ where: { id: project_id }, data: { budget_alert_level: level } });
    if (!level || !isHigherAlert(level, project.budget_alert_level)) return;

    const recipients = await findRecipientIds(db, project.created_by_id);
    await db.notification.createMany({
        data: recipients.map((user_id) => ({
            user_id,
            project_id,
            project_name: project.project_name,
            level,
            threshold: project.alert_threshold,
            budget: totals.budget,
            spent: totals.spent,
            percent_used: totals.percent_used,
        })),
    });
};
