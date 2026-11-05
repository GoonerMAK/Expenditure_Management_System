import { toast } from 'sonner';
import { Category } from './interfaces';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { useDeleteCategoryMutation, useGetCategoryUsageQuery } from '../redux/category-api';
import { getCategoryErrorMessage } from '../lib/category-errors';

const SHOWN_PROJECTS = 5;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface DeleteCategoryDialogProps {
  category: Category;
  roleName?: string | null;
  onClose: () => void;
}

const DeleteCategoryDialog = ({ category, roleName, onClose }: DeleteCategoryDialogProps) => {
  const { data: usage, error: usageError, isLoading } = useGetCategoryUsageQuery(category.id);
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  const name = category.category_name;
  const isUsed = !!usage && usage.project_count > 0;
  const hiddenCount = usage ? usage.project_count - SHOWN_PROJECTS : 0;

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id).unwrap();
      toast.success(`Deleted "${name}".`);
    } catch (error) {
      toast.error(getCategoryErrorMessage(error, roleName));
    }
    onClose();
  };

  const renderBody = () => {
    if (isLoading) {
      return <AlertDialogDescription>Checking where this category is used…</AlertDialogDescription>;
    }

    if (usageError || !usage) {
      return (
        <AlertDialogDescription>
          {(usageError as { status?: number })?.status === 404
            ? getCategoryErrorMessage(usageError, roleName)
            : "Couldn't check what uses this category. Try again."}
        </AlertDialogDescription>
      );
    }

    if (!isUsed) {
      return <AlertDialogDescription>This can't be undone.</AlertDialogDescription>;
    }

    return (
      <AlertDialogDescription asChild>
        <div className="space-y-3">
          <ul className="list-disc pl-5">
            {usage.projects.slice(0, SHOWN_PROJECTS).map((project) => (
              <li key={project.id}>{project.project_name}</li>
            ))}
            {hiddenCount > 0 && <li className="list-none">+{hiddenCount} more</li>}
          </ul>
          <p>
            These projects and their {plural(usage.financial_record_count, 'financial record')}{' '}
            <strong>won't be deleted</strong>. They'll be left <strong>without a category</strong>, and you can assign a
            new one later.
          </p>
        </div>
      </AlertDialogDescription>
    );
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isUsed ? `"${name}" is used by ${plural(usage.project_count, 'project')}` : `Delete "${name}"?`}
          </AlertDialogTitle>
          {renderBody()}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={isLoading || isDeleting || !usage} onClick={handleDelete}>
            Delete category
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCategoryDialog;
