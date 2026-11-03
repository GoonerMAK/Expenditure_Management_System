import { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

import { ExpenseEntry } from './interfaces';
import { formatAmount, formatDay, formatMonth, getServerMessage, getYearMonth } from '../lib/utils';
import {
  getReceiptUrl,
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useGetProjectExpensesQuery,
  useUpdateExpenseMutation,
} from '../redux/financial-data-api';

import ErrorState from './error-state';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface EntryFormValues {
  date: string;
  vendor: string;
  amount: string;
  notes: string;
  receipt: File | null;
  remove_receipt: boolean;
}

interface MonthGroup {
  key: string;
  year: number;
  month: number;
  total: number;
  entries: ExpenseEntry[];
}

const RECEIPT_TYPES = 'application/pdf,image/jpeg,image/png,image/webp';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): EntryFormValues => ({ date: today(), vendor: '', amount: '', notes: '', receipt: null, remove_receipt: false });

const toFormValues = (entry: ExpenseEntry): EntryFormValues => ({
  date: entry.date.slice(0, 10),
  vendor: entry.vendor,
  amount: entry.amount.toString(),
  notes: entry.notes ?? '',
  receipt: null,
  remove_receipt: false,
});

const toFormData = (values: EntryFormValues, projectId?: string) => {
  const data = new FormData();
  if (projectId) data.append('project_id', projectId);
  data.append('date', values.date);
  data.append('vendor', values.vendor);
  data.append('amount', values.amount);
  data.append('notes', values.notes);
  if (values.receipt) {
    data.append('receipt', values.receipt);
  } else if (values.remove_receipt) {
    data.append('remove_receipt', 'true');
  }
  return data;
};

// Entries come sorted newest first, so groups keep that order.
const groupByMonth = (entries: ExpenseEntry[]): MonthGroup[] => {
  const groups = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const { year, month } = getYearMonth(entry.date);
    const key = `${year}-${month}`;
    const group = groups.get(key) ?? { key, year, month, total: 0, entries: [] };
    group.total += entry.amount;
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
};

const ExpenseEntries = ({ projectId, canEdit }: { projectId: string; canEdit: boolean }) => {
  const { data: entries, error, isLoading, refetch } = useGetProjectExpensesQuery(projectId);
  const [addExpense, { isLoading: adding }] = useAddExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseEntry | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<EntryFormValues>({ defaultValues: emptyForm() });

  const resetForm = () => {
    setEditing(null);
    form.reset(emptyForm());
    setFileInputKey((key) => key + 1);
  };

  const startEditing = (entry: ExpenseEntry) => {
    setEditing(entry);
    form.reset(toFormValues(entry));
    setFileInputKey((key) => key + 1);
  };

  const onSubmit = async (values: EntryFormValues) => {
    try {
      if (editing) {
        await updateExpense({ id: editing.id, projectId, data: toFormData(values) }).unwrap();
        toast.success('Expense entry updated');
      } else {
        await addExpense({ projectId, data: toFormData(values, projectId) }).unwrap();
        toast.success('Expense entry added');
      }
      resetForm();
    } catch (error) {
      toast.error(getServerMessage(error) ?? `Failed to ${editing ? 'update' : 'add'} expense entry`);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const entry = toDelete;
    setToDelete(null);
    try {
      await deleteExpense({ id: entry.id, projectId }).unwrap();
      if (editing?.id === entry.id) resetForm();
      toast.success('Expense entry deleted');
    } catch (error) {
      toast.error(getServerMessage(error) ?? 'Failed to delete expense entry');
    }
  };

  const groups = groupByMonth(entries ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense entries</CardTitle>
        <p className="text-sm text-muted-foreground">Each month's expenditure is the sum of its entries.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {canEdit && (
          <Form {...form}>
            <form noValidate onSubmit={form.handleSubmit(onSubmit)} aria-label={editing ? 'Edit expense entry' : 'Add expense entry'} className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                rules={{ required: 'Date is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                rules={{ validate: (value) => value.trim() !== '' || 'Vendor is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Who was paid" maxLength={200} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                rules={{ validate: (value) => parseFloat(value) > 0 || 'Amount must be greater than 0' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt</FormLabel>
                    <FormControl>
                      <Input
                        key={fileInputKey}
                        type="file"
                        accept={RECEIPT_TYPES}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">PDF, JPEG, PNG or WebP, up to 5 MB</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" maxLength={1000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editing?.has_receipt && (
                <FormField
                  control={form.control}
                  name="remove_receipt"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 sm:col-span-2">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                      </FormControl>
                      <FormLabel>Remove the current receipt ({editing.receipt_name})</FormLabel>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={adding || updating}>{editing ? 'Save entry' : 'Add entry'}</Button>
                {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </Form>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading expense entries...</p>}
        {error && <ErrorState message="Could not load expense entries." onRetry={refetch} />}
        {!isLoading && !error && groups.length === 0 && <p className="text-sm text-muted-foreground">No expense entries yet.</p>}

        {groups.length > 0 && (
          <Table className="[&_td]:px-2 [&_th]:px-2">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Receipt</TableHead>
                {canEdit && <TableHead><span className="sr-only">Actions</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={2}>{formatMonth(group.year, group.month)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatAmount(group.total)}</TableCell>
                    <TableCell colSpan={canEdit ? 2 : 1} />
                  </TableRow>
                  {group.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{formatDay(entry.date)}</TableCell>
                      <TableCell className="break-words">
                        {entry.vendor}
                        {entry.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatAmount(entry.amount)}</TableCell>
                      <TableCell>
                        {entry.has_receipt ? (
                          <a href={getReceiptUrl(entry.id)} target="_blank" rel="noreferrer" title={entry.receipt_name ?? undefined} className="block max-w-[120px] truncate text-primary underline-offset-4 hover:underline">
                            {entry.receipt_name ?? 'View'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex justify-end">
                            <Button size="icon" variant="ghost" onClick={() => startEditing(entry)} aria-label={`Edit ${entry.vendor} entry`} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setToDelete(entry)} aria-label={`Delete ${entry.vendor} entry`} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `${toDelete.vendor}, ${formatAmount(toDelete.amount)} on ${formatDay(toDelete.date)}. The month's expenditure goes down by this amount and its receipt is deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ExpenseEntries;
