import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from './interfaces';
import { CommandGroup, CommandItem } from './ui/command';
import { useAddCategoryMutation } from '../redux/category-api';
import { getCategoryErrorMessage } from '../lib/category-errors';

interface AddCategoryOptionProps {
  search: string;
  categories: Category[];
  roleName?: string | null;
  onCreated: (category: Category) => void;
  onAddNew: () => void;
}

const AddCategoryOption = ({ search, categories, roleName, onCreated, onAddNew }: AddCategoryOptionProps) => {
  const [addCategory, { isLoading }] = useAddCategoryMutation();

  const name = search.trim();
  const existing = name
    ? categories.find((category) => category.category_name.toLowerCase() === name.toLowerCase())
    : undefined;

  const createCategory = async () => {
    try {
      const category = await addCategory({ category_name: name }).unwrap();
      toast.success(`Created "${category.category_name}".`);
      onCreated(category);
    } catch (error) {
      toast.error(getCategoryErrorMessage(error, roleName));
    }
  };

  const renderRow = () => {
    if (existing) {
      return (
        <CommandItem forceMount disabled value="__existing-category__" className="text-muted-foreground">
          A category named "{existing.category_name}" already exists.
        </CommandItem>
      );
    }

    return (
      <CommandItem
        forceMount
        disabled={isLoading}
        value="__add-category__"
        onSelect={() => (name ? createCategory() : onAddNew())}
      >
        <Plus className="mr-2 h-4 w-4" />
        {name ? `Create "${name}"` : 'Add new category'}
      </CommandItem>
    );
  };

  return (
    <CommandGroup forceMount className="border-t">
      {renderRow()}
    </CommandGroup>
  );
};

export default AddCategoryOption;
