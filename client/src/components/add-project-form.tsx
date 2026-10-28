import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { format } from "date-fns"

import { useGetCategoriesQuery } from '../redux/category-api';
import { useGetUserAuthQuery } from '../redux/user-api';
import { useAddProjectMutation } from '../redux/project-api';

import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react"
import { cn } from '../lib/utils';
import { Button } from "../components/ui/button";
import { Calendar } from './ui/calendar';
import { toast } from "sonner";
import { Toaster } from './ui/sonner';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import { Textarea } from './ui/textarea';
import { Input } from "./ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "./ui/command"
import { Popover, PopoverContent, PopoverTrigger, } from "./ui/popover"


interface Project {
    project_name: string;
    description: string;
    category_id: string;
    category_name: string;
    start_date: Date;
    end_date: Date;
    created_by_id: string;
    created_at: Date;
    updated_at: Date;
}


const AddProjectForm = () => {
    const [open, setOpen] = useState(false);

    const { data: categories = [] } = useGetCategoriesQuery();
    const { data: userData } = useGetUserAuthQuery();
    const [addProject] = useAddProjectMutation();

    const form = useForm<Project>({
        defaultValues: {
            project_name: '',
            description: '',
            category_id: '',
            category_name: '',
            start_date: new Date(),
            end_date: new Date(),
            created_by_id: '',
            created_at: new Date(),
            updated_at: new Date(),
        },
    });

    const { setValue, watch } = form;

    useEffect(() => {
        if (userData) {
            setValue('created_by_id', userData.user.id);
        }
    }, [userData, setValue]);


    const onSubmit = async (data: Project) => {
        try {
            const response = await addProject(data).unwrap();
            console.log('Server response:', response);

            toast.success("Project has been created")
            setTimeout(() => {
                window.location.reload();
            }, 4000);
        } catch (error) {
            console.error('Error response:', error);
            toast.error("Error creating project")
        }
    };

    const startDate = watch("start_date");

    return (
        <div className="flex space-x-6 p-12 ml-10">
            <Toaster />
            <div className="w-1/3">

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-col space-y-6">

                        <FormField
                            control={form.control}
                            name="project_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter project name" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        This is the name of the project
                                    </FormDescription>
                                    <FormMessage />
                                    <br></br>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter Description"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This is the description of the project
                                    </FormDescription>
                                    <FormMessage />
                                    <br></br>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="category_name"
                            render={() => (
                                <FormItem className=''>
                                    <FormLabel>Category Name</FormLabel>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className="w-[200px] justify-between flex"
                                            >
                                                {form.getValues("category_name") || "Select category"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search Category..." />
                                                <CommandList>
                                                    {categories.length === 0 && <CommandEmpty>No Category found</CommandEmpty>}
                                                    <CommandGroup>
                                                        {categories.map((category) => (
                                                            <CommandItem
                                                                key={category.id}
                                                                value={category.category_name}
                                                                onSelect={(currentValue) => {
                                                                    const selectedCategory = categories.find(cat => cat.category_name === currentValue);
                                                                    if (selectedCategory) {
                                                                        setValue("category_name", selectedCategory.category_name);
                                                                        setValue("category_id", selectedCategory.id);
                                                                    }
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        form.getValues("category_name") === category.category_name ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {category.category_name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        These are the different categories a project can be
                                    </FormDescription>
                                    <FormMessage />
                                    <br></br>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="start_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col  mb-6">
                                    <FormLabel>Start Date of the Project</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[240px] pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Mention the date when the project work will commence
                                    </FormDescription>
                                    <FormMessage />
                                    <br></br>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="end_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>End Date of the Project</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[240px] pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                modifiers={{ disabled: { before: startDate } }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Presumed date when the project will be finished
                                    </FormDescription>
                                    <br></br>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        <Button type="submit"> Submit</Button>
                    </form>
                </Form>
            </div>
        </div >
    );
};

export default AddProjectForm;
