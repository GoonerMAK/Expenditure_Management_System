import { checkBudgetAlert } from '../../../src/repositories/budget-alert.repository.js';
import { ID, OTHER_ID, USER_ID } from '../helpers/factories.js';

const tx = {
  project: { findUnique: jest.fn(), update: jest.fn() },
  user: { findMany: jest.fn() },
  notification: { createMany: jest.fn() },
};

const month = (expenditure: number | null, initial_budget: number | null, revised_budget: number | null = null) => ({
  expenditure,
  initial_budget,
  revised_budget,
});

const projectState = (overrides: Record<string, unknown> = {}) => ({
  project_name: 'Bridge Renovation',
  created_by_id: OTHER_ID,
  alert_threshold: 80,
  budget_alert_level: null,
  financial_data: [month(500, 1000)],
  ...overrides,
});

const alertFor = (user_id: string, overrides: Record<string, unknown> = {}) => ({
  user_id,
  project_id: ID,
  project_name: 'Bridge Renovation',
  level: 'Threshold',
  threshold: 80,
  budget: 1000,
  spent: 850,
  percent_used: 85,
  ...overrides,
});

const check = () => checkBudgetAlert(tx as never, ID);

describe('budget-alert.repository', () => {
  beforeEach(() => {
    tx.user.findMany.mockResolvedValue([{ id: USER_ID }]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('reads the threshold, the saved alert level and the budget months of the project', async () => {
    tx.project.findUnique.mockResolvedValue(projectState());

    await check();

    expect(tx.project.findUnique).toHaveBeenCalledWith({
      where: { id: ID },
      select: {
        project_name: true,
        created_by_id: true,
        alert_threshold: true,
        budget_alert_level: true,
        financial_data: { select: { expenditure: true, initial_budget: true, revised_budget: true } },
      },
    });
  });

  it('does nothing when the project no longer exists', async () => {
    tx.project.findUnique.mockResolvedValue(null);

    await check();

    expect(tx.project.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('does nothing while spending stays under the threshold', async () => {
    tx.project.findUnique.mockResolvedValue(projectState());

    await check();

    expect(tx.project.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('notifies the owner and every administrator when spending reaches the threshold', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ financial_data: [month(600, 1000, 500), month(250, 500)] }));

    await check();

    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { budget_alert_level: 'Threshold' } });
    expect(tx.user.findMany).toHaveBeenCalledWith({
      where: { role: { role_name: 'Administrator' } },
      select: { id: true },
    });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [alertFor(OTHER_ID), alertFor(USER_ID)],
    });
  });

  it('notifies an owner who is also an administrator only once', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ financial_data: [month(850, 1000)] }));
    tx.user.findMany.mockResolvedValue([{ id: OTHER_ID }, { id: USER_ID }]);

    await check();

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [alertFor(OTHER_ID), alertFor(USER_ID)],
    });
  });

  it('uses the threshold set on the project', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ alert_threshold: 50, financial_data: [month(600, 1000)] }));

    await check();

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        alertFor(OTHER_ID, { threshold: 50, spent: 600, percent_used: 60 }),
        alertFor(USER_ID, { threshold: 50, spent: 600, percent_used: 60 }),
      ],
    });
  });

  it('does not notify again while the project stays past the threshold', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ budget_alert_level: 'Threshold', financial_data: [month(900, 1000)] }));

    await check();

    expect(tx.project.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('notifies again when a project past the threshold goes over budget', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ budget_alert_level: 'Threshold', financial_data: [month(1200, 1000)] }));

    await check();

    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { budget_alert_level: 'OverBudget' } });
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        alertFor(OTHER_ID, { level: 'OverBudget', spent: 1200, percent_used: 120 }),
        alertFor(USER_ID, { level: 'OverBudget', spent: 1200, percent_used: 120 }),
      ],
    });
  });

  it('sends only the over budget alert when spending jumps straight past the budget', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ financial_data: [month(1200, 1000)] }));

    await check();

    expect(tx.notification.createMany).toHaveBeenCalledTimes(1);
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ level: 'OverBudget' })]),
    });
  });

  it('notifies over budget for spending on a project without a budget', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ financial_data: [month(50, null)] }));

    await check();

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        alertFor(OTHER_ID, { level: 'OverBudget', budget: 0, spent: 50, percent_used: null }),
        alertFor(USER_ID, { level: 'OverBudget', budget: 0, spent: 50, percent_used: null }),
      ],
    });
  });

  it('lowers the saved level without notifying when the budget is raised', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ budget_alert_level: 'OverBudget', financial_data: [month(1200, 1000, 1400)] }));

    await check();

    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { budget_alert_level: 'Threshold' } });
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('clears the saved level when spending drops back under the threshold', async () => {
    tx.project.findUnique.mockResolvedValue(projectState({ budget_alert_level: 'Threshold', financial_data: [month(500, 1000)] }));

    await check();

    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: ID }, data: { budget_alert_level: null } });
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});
