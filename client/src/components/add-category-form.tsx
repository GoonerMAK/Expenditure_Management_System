import { useForm } from "react-hook-form";
import { useGetCategoriesQuery, useAddCategoryMutation } from '../redux/category-api';

import { Button } from "../components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import { Table } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { getCategoryErrorMessage } from '../lib/category-errors';
import useAuth from '../lib/use-auth';
import SectionCard from './section-card';
import CategoryList from './category-list';

const MANAGER_ROLES = ['Contributor', 'Administrator'];


interface Category {
  id?: string;
  category_name: string;
  created_at?: string;
  updated_at?: string;
}

const AddCategoryForm = () => {
  const { data: categories = [], refetch } = useGetCategoriesQuery();
  const [addCategory, { isLoading }] = useAddCategoryMutation();
  const { user } = useAuth();
  const canManage = MANAGER_ROLES.includes(user?.role_name ?? '');

  const form = useForm<Category>({
    defaultValues: {
      category_name: '',
    },
  });

  const onSubmit = async (data: Category) => {
    try {
      const response = await addCategory(data).unwrap();
      console.log('Server response:', response);
      toast.success('Successfully created Category');
      refetch();
    } catch (error) {
      console.error('Error response:', error);
      toast.error(getCategoryErrorMessage(error, user?.role_name));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:p-12">
      <SectionCard title="Add a category" className="lg:w-1/3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-col space-y-6">
            <FormField
              control={form.control}
              name="category_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name of the category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>Submit</Button>
          </form>
        </Form>
      </SectionCard>

      <SectionCard title="Existing categories" className="lg:flex-1">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet</p>
        ) : (
          <Table>
            <CategoryList categories={categories} canManage={canManage} roleName={user?.role_name} />
          </Table>
        )}
      </SectionCard>
    </div>
  );
};

export default AddCategoryForm;
