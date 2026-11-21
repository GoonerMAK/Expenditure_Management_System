import prisma from '../db.js';
import { AuditAction, AuditEntity, Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

type Snapshot = { id: string; project_id?: string } & Record<string, unknown>;

export type AuditValue = string | number | null;

export type AuditChange = {
    field: string;
    from: AuditValue;
    to: AuditValue;
};

const TRACKED_FIELDS: Record<AuditEntity, string[]> = {
    Project: ['project_name', 'description', 'category_name', 'start_date', 'end_date', 'alert_threshold'],
    Budget: ['year', 'month', 'initial_budget', 'revised_budget', 'expenditure'],
    Expense: ['date', 'vendor', 'amount', 'notes', 'receipt_name', 'status', 'rejection_reason'],
};

const toAuditValue = (value: unknown): AuditValue => {
    if (value === '') return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') return value;
    return null;
};

const toMonthLabel = (year: unknown, month: unknown) => `${year}-${String(month).padStart(2, '0')}`;

export const describeRecord = (entity: AuditEntity, record: Snapshot) => {
    if (entity === AuditEntity.Project) return String(record.project_name);
    if (entity === AuditEntity.Budget) return toMonthLabel(record.year, record.month);
    return String(record.vendor);
};

const projectIdOf = (entity: AuditEntity, record: Snapshot) =>
    entity === AuditEntity.Project ? record.id : record.project_id;

export const listChanges = (entity: AuditEntity, before: Partial<Snapshot> = {}, after: Partial<Snapshot> = {}): AuditChange[] =>
    TRACKED_FIELDS[entity]
        .map((field) => ({ field, from: toAuditValue(before[field]), to: toAuditValue(after[field]) }))
        .filter((change) => change.from !== change.to);

export const recordAudit = async (
    db: Db,
    entity: AuditEntity,
    action: AuditAction,
    user_id: string | undefined,
    before: Snapshot | null,
    after: Snapshot | null
) => {
    const changes = listChanges(entity, before ?? {}, after ?? {});
    if (action === AuditAction.Updated && changes.length === 0) return;

    const record = after ?? before;
    await db.auditLog.create({
        data: {
            entity,
            action,
            entity_label: describeRecord(entity, record),
            project_id: projectIdOf(entity, record),
            user_id: user_id ?? null,
            changes,
        },
    });
};

export const getProjectAuditLog = async (project_id: string) => {
    return await prisma.auditLog.findMany({
        where: { project_id },
        include: { user: { select: { username: true, name: true, email: true } } },
        orderBy: { created_at: 'desc' },
    });
};
