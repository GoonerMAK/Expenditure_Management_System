import { useState, KeyboardEvent } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from './interfaces';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TableBody, TableCell, TableRow } from './ui/table';
import DeleteCategoryDialog from './delete-category-dialog';
import { useUpdateCategoryMutation } from '../redux/category-api';
import { getCategoryErrorMessage } from '../lib/category-errors';

interface CategoryListProps {
  categories: Category[];
  canManage: boolean;
  roleName?: string | null;
}

const CategoryList = ({ categories, canManage, roleName }: CategoryListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [updateCategory, { isLoading: isSaving }] = useUpdateCategoryMutation();

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setDraftName(category.category_name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveName = async (category: Category) => {
    if (draftName.trim() === category.category_name) {
      cancelEditing();
      return;
    }

    try {
      const renamed = await updateCategory({ id: category.id, category_name: draftName }).unwrap();
      toast.success(`Renamed to "${renamed.category_name}".`);
      cancelEditing();
    } catch (error) {
      toast.error(getCategoryErrorMessage(error, roleName));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, category: Category) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName(category);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    <>
      <TableBody>
        {categories.map((category) => {
          const isEditing = editingId === category.id;

          return (
            <TableRow key={category.id} className="border-section">
              <TableCell>
                {isEditing ? (
                  <Input
                    aria-label="Category name"
                    autoFocus
                    value={draftName}
                    disabled={isSaving}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => handleKeyDown(event, category)}
                  />
                ) : (
                  category.category_name
                )}
              </TableCell>
              {canManage && (
                <TableCell className="w-28 text-right">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Save name"
                        disabled={isSaving}
                        onClick={() => saveName(category)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Cancel rename" disabled={isSaving} onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Rename ${category.category_name}`}
                        onClick={() => startEditing(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${category.category_name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>

      {deleting && (
        <DeleteCategoryDialog category={deleting} roleName={roleName} onClose={() => setDeleting(null)} />
      )}
    </>
  );
};

export default CategoryList;
