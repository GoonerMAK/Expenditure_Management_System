import { useForm } from "react-hook-form";
import { useGetCategoriesQuery, useAddCategoryMutation } from '../redux/category-api';

import { Button } from "../components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Toaster } from './ui/sonner';


interface Category {
  id?: string;
  category_name: string;
  created_at?: string;
  updated_at?: string;
}

const AddCategoryForm = () => {
  const { data: categories = [], refetch } = useGetCategoriesQuery();
  const [addCategory, { isLoading }] = useAddCategoryMutation();

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
      const errorMessage = (error as { data?: { message?: string } })?.data?.message || "Failed to create Category";
      toast.error(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className="flex space-x-6 p-12 ml-10">
      <div className="w-1/3">
      <Toaster/>
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
      </div>

              
      <Table className="ml-60 w-1/2">
        <TableCaption></TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center text-xl">A list of your existing Categories</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>{category.category_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AddCategoryForm;
