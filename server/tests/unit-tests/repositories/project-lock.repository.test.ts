import { lockProjects } from '../../../src/repositories/project-lock.repository.js';
import { ID, OTHER_ID } from '../helpers/factories.js';

const tx = { $executeRaw: jest.fn() };

const lockedIds = () => tx.$executeRaw.mock.calls.map(([, id]) => id);

describe('project-lock.repository', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('locks the project row for the rest of the transaction', async () => {
    await lockProjects(tx as never, ID);

    const [query, id] = tx.$executeRaw.mock.calls[0];
    expect(query.join('?')).toBe('SELECT 1 FROM "Project" WHERE id = ? FOR NO KEY UPDATE');
    expect(id).toBe(ID);
  });

  it('locks several projects once each in a fixed order', async () => {
    const [first, second] = [ID, OTHER_ID].sort();

    await lockProjects(tx as never, second, first, second);

    expect(lockedIds()).toEqual([first, second]);
  });

  it('skips missing project ids', async () => {
    await lockProjects(tx as never, undefined, ID, undefined);

    expect(lockedIds()).toEqual([ID]);
  });

  it('does nothing without a project id', async () => {
    await lockProjects(tx as never, undefined);

    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
