import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShowProjects from '../../src/components/multiple-projects-card';
import { useGetProjectsQuery } from '../../src/redux/project-api';
import { useGetUsersQuery } from '../../src/redux/user-api';
import { queryResult } from '../support/rtk';

jest.mock('../../src/redux/project-api', () => ({ useGetProjectsQuery: jest.fn() }));
jest.mock('../../src/redux/user-api', () => ({ useGetUsersQuery: jest.fn() }));

const mockedGetProjects = jest.mocked(useGetProjectsQuery);
const mockedGetUsers = jest.mocked(useGetUsersQuery);

const project = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  project_name: 'Bridge Renovation',
  description: 'Renovate the river bridge',
  category_id: 'c1',
  category_name: 'Infrastructure',
  start_date: '2026-02-01T12:00:00.000Z',
  end_date: '2026-12-31T12:00:00.000Z',
  created_by_id: 'u1',
  created_at: '2026-01-15T12:00:00.000Z',
  updated_at: '2026-01-20T12:00:00.000Z',
  ...overrides,
});

const page = (data: unknown[], totalItems = data.length) => ({
  data,
  pagination: { offset: 0, limit: 6, totalItems, totalPages: Math.ceil(totalItems / 6), hasMore: false },
});

const renderCard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<ShowProjects />} />
        <Route path="/projects/:id" element={<p>Project detail</p>} />
        <Route path="/add-project" element={<p>Add project page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ShowProjects (multiple projects card)', () => {
  beforeEach(() => {
    mockedGetUsers.mockReturnValue(queryResult({ data: [{ id: 'u1', username: 'jdoe' }] }));
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project()]) }));
  });

  it('shows a loading state while projects load', () => {
    mockedGetProjects.mockReturnValue(queryResult({ isLoading: true }));

    renderCard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows a loading state while users load', () => {
    mockedGetUsers.mockReturnValue(queryResult({ isLoading: true }));

    renderCard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('requests the first page of six projects', () => {
    renderCard();

    expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6 });
  });

  it('shows an empty state with a link to add a project', async () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([]) }));
    renderCard();

    expect(screen.getByText('You have no projects')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add Project' }));
    expect(screen.getByText('Add project page')).toBeInTheDocument();
  });

  it('shows the empty state when the response has no data', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: undefined }));

    renderCard();

    expect(screen.getByText('You have no projects')).toBeInTheDocument();
  });

  it('renders the project details', () => {
    renderCard();

    const card = screen.getByRole('heading', { name: 'Bridge Renovation' }).closest('div') as HTMLElement;
    expect(within(card).getByText('Renovate the river bridge')).toBeInTheDocument();
    expect(within(card).getByText('Category: Infrastructure')).toBeInTheDocument();
    expect(within(card).getByText('Created by: jdoe')).toBeInTheDocument();
    expect(within(card).getByText('Start Date: 1 February 2026')).toBeInTheDocument();
    expect(within(card).getByText('Created Date: 15 January 2026')).toBeInTheDocument();
    expect(within(card).getByText('Updated Date: 20 January 2026')).toBeInTheDocument();
  });

  it('shows N/A when the creator is not among the users', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ created_by_id: 'unknown' })]) }));

    renderCard();

    expect(screen.getByText('Created by: N/A')).toBeInTheDocument();
  });

  it('shows "Not specified" for a missing start date', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ start_date: null })]) }));

    renderCard();

    expect(screen.getByText('Start Date: Not specified')).toBeInTheDocument();
  });

  it('shows a placeholder for a missing category name', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ category_name: '' })]) }));

    renderCard();

    expect(screen.getByText('Category: Loading...')).toBeInTheDocument();
  });

  it('links each project to its detail page', async () => {
    renderCard();

    await userEvent.setup().click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('Project detail')).toBeInTheDocument();
  });

  it('hides pagination when everything fits on one page', () => {
    renderCard();

    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  it('requests the next offset when another page is chosen', async () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project()], 13) }));
    renderCard();

    await userEvent.setup().click(screen.getByRole('link', { name: '3' }));

    expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 12, limit: 6 });
  });
});
