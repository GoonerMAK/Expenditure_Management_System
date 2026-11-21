import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportExport from '../../src/components/report-export';
import { downloadReport } from '../../src/lib/download-report';

jest.mock('../../src/lib/download-report', () => ({
  ...jest.requireActual('../../src/lib/download-report'),
  downloadReport: jest.fn(),
}));

const mockedDownload = jest.mocked(downloadReport);

const projects = [
  { project_id: 'p1', project_name: 'Bridge' },
  { project_id: 'p2', project_name: 'School' },
];
const categories = [
  { category_id: 'c1', category_name: 'Roads' },
  { category_id: null, category_name: 'Uncategorised' },
];

const choose = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string) => {
  await user.click(screen.getByLabelText(label));
  await user.click(screen.getByRole('option', { name: option }));
};

describe('ReportExport', () => {
  beforeEach(() => {
    mockedDownload.mockResolvedValue(undefined);
  });

  it('exports a monthly CSV of the first project over all years by default', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    expect(screen.getByLabelText('Which project')).toHaveTextContent('Bridge');
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(mockedDownload).toHaveBeenCalledWith({ subject: 'projects', id: 'p1', period: 'monthly', format: 'csv', year: '' });
  });

  it('exports the chosen project, period, year and format', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await choose(user, 'Which project', 'School');
    await choose(user, 'Period', 'Yearly');
    await choose(user, 'Format', 'PDF');
    await user.type(screen.getByLabelText('Year'), '2026');
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(mockedDownload).toHaveBeenCalledWith({ subject: 'projects', id: 'p2', period: 'yearly', format: 'pdf', year: '2026' });
  });

  it('exports a category, including projects without one', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await choose(user, 'Report for', 'Category');
    expect(screen.getByLabelText('Which category')).toHaveTextContent('Roads');
    await choose(user, 'Which category', 'Uncategorised');
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(mockedDownload).toHaveBeenCalledWith(expect.objectContaining({ subject: 'categories', id: 'uncategorised' }));
  });

  it('goes back to the first item after switching what the report is for', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await choose(user, 'Which project', 'School');
    await choose(user, 'Report for', 'Category');
    await choose(user, 'Report for', 'Project');

    expect(screen.getByLabelText('Which project')).toHaveTextContent('Bridge');
  });

  it('blocks the export while the year is not valid', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await user.type(screen.getByLabelText('Year'), '20');

    expect(screen.getByText('Enter a year from 1900 to 9999')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('disables the export when there is nothing to report on', () => {
    render(<ReportExport projects={[]} categories={[]} />);

    expect(screen.getByLabelText('Which project')).toBeDisabled();
    expect(screen.getByLabelText('Which project')).toHaveTextContent('No projects');
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('says when there are no categories', async () => {
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={[]} />);

    await choose(user, 'Report for', 'Category');

    expect(screen.getByLabelText('Which category')).toHaveTextContent('No categories');
  });

  it('shows the export in progress', async () => {
    let finish: () => void = () => {};
    mockedDownload.mockReturnValue(new Promise((resolve) => { finish = () => resolve(); }));
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('shows an error when the export fails and clears it on the next try', async () => {
    mockedDownload.mockRejectedValueOnce(new Error('500'));
    const user = userEvent.setup();
    render(<ReportExport projects={projects} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't export the report. Please try again.");

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
