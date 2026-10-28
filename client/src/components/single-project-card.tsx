import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { format } from "date-fns"
import useAuth from '../lib/use-auth';

import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react"
import { cn, toOptionalAmount } from '../lib/utils';
import { Button } from "../components/ui/button";
import { Calendar } from './ui/calendar';
import { toast } from "sonner";
import { Toaster } from './ui/sonner';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import { Textarea } from './ui/textarea';
import { Input } from "./ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "./ui/command"
import { Popover, PopoverContent, PopoverTrigger, } from "./ui/popover"

import { useGetProjectByIdQuery, useUpdateProjectMutation } from '../redux/project-api';
import { useGetCategoriesQuery } from '../redux/category-api';
import { useGetFinancialDataByIdQuery, useUpdateFinancialDataMutation } from '../redux/financial-data-api';
import { useGetUserAuthQuery } from '../redux/user-api';
import { FinancialData as FinancialDataPayload } from './interfaces';


interface Project {
    id?: string;
    project_name: string;
    description: string;
    category_id: string;
    category_name: string;
    start_date: string;
    end_date: string;
    created_by_id?: string;
    created_at?: string;
    updated_at?: string;
}

interface FinancialData {
    id?: string;
    year: number;
    month: number;
    expenditure: number;
    initial_budget: number;
    revised_budget: number | '';
}


const SingleProject = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();

    const [editMode, setEditMode] = useState(false);
    const [open, setOpen] = useState(false)
    
    const { data: project, error: projectError, isLoading: projectLoading } = useGetProjectByIdQuery(id!);
    const { data: financialData, error: financialDataError, isLoading: financialDataLoading } = useGetFinancialDataByIdQuery(id!);
    const { data: categories } = useGetCategoriesQuery();
    const { data: authUser } = useGetUserAuthQuery();

    const [updateProject] = useUpdateProjectMutation();
    const [updateFinancialData] = useUpdateFinancialDataMutation();


    const form = useForm<Project & FinancialData>({
        defaultValues: {
            project_name: '',
            description: '',
            category_id: '',
            category_name: '',
            start_date: '',
            end_date: '',

            year: 0,
            month: 0,
            expenditure: 0,
            initial_budget: 0,
            revised_budget: '',
        }
    });

    const { setValue, getValues, reset } = form;


    useEffect(() => {
        if (project) {
            reset({
                ...getValues(),
                project_name: project.project_name,
                description: project.description,
                category_id: project.category_id,
                category_name: project.category_name,
                start_date: new Date(project.start_date).toISOString(),
                end_date: new Date(project.end_date).toISOString(),
            });
        }
    }, [project, getValues, reset]);

    useEffect(() => {
        if (authUser) {
            setValue('created_by_id', authUser.user.id);
        }
    }, [authUser, setValue]);

    useEffect(() => {
        if (financialData) {
            reset({
                ...getValues(),
                year: financialData.year,
                month: financialData.month,
                expenditure: financialData.expenditure,
                initial_budget: financialData.initial_budget,
                revised_budget: financialData.revised_budget ?? '',
            });
        }
    }, [financialData, getValues, reset]);


    const onSubmit = async (data: Project & FinancialData) => {
        const projectData: Partial<Project> = {
            project_name: data.project_name,
            description: data.description,
            category_id: data.category_id,
            category_name: data.category_name,
            start_date: data.start_date,
            end_date: data.end_date,
        };
    
        const financialData: Partial<FinancialDataPayload> = {
            year: parseInt(data.year.toString(), 10),
            month: parseInt(data.month.toString(), 10),
            expenditure: parseFloat(data.expenditure.toString()),
            initial_budget: parseFloat(data.initial_budget.toString()),
            revised_budget: toOptionalAmount(data.revised_budget)
        };

        try {
            await Promise.all([
                updateProject({ id: id!, data: projectData }).unwrap(),
                updateFinancialData({ id: id!, data: financialData }).unwrap(),
            ]);
            toast.success('Project updated successfully');
        } catch (error) {
            toast.error('Failed to update project');
            console.log("The error ", error)
        }
    };

    if (projectLoading || financialDataLoading) {
        return <div>Loading...</div>;
    }

    if (projectError || financialDataError) {
        return <div>Error loading project</div>;
    }


    const canEdit = user?.role_name !== "Read-only";


    return (
        <div className="flex space-x-6 p-12 ml-10">
            <Toaster />
            <div className="w-1/3">
                {canEdit && <Button onClick={() => setEditMode(true)}>Edit</Button>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-col space-y-6">
                        
                        <FormField
                            control={form.control}
                            name="project_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter project name" {...field} disabled={!editMode} />
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
                                            disabled={!editMode}
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
                                                disabled={!editMode}
                                            >
                                                {form.getValues("category_name") || "Select category"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search Category..." />
                                                <CommandList>
                                                    {categories && categories.length === 0 && <CommandEmpty>No Category found</CommandEmpty>}
                                                    <CommandGroup>
                                                        {categories && categories.map((category) => (
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
                                                    disabled={!editMode}
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
                                                selected={field.value ? new Date(field.value) : undefined} 
                                                onSelect={(date) => field.onChange(date ? date.toISOString() : '')}
                                                initialFocus
                                                disabled={!editMode}
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
                                                    disabled={!editMode}
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
                                                selected={field.value ? new Date(field.value) : undefined} 
                                                onSelect={(date) => field.onChange(date ? date.toISOString() : '')}
                                                // modifiers={{ disabled: { before: startDate } }}
                                                initialFocus
                                                disabled={!editMode}
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

                        <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Year</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1900" {...field} disabled={!editMode} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the year for financial data
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="month"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Month</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" max="12" {...field} disabled={!editMode} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the month for financial data (1 for January, 2 for February, etc.)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="expenditure"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Expenditure</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} disabled={!editMode} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the expenditure amount (optional)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="initial_budget"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Budget</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} disabled={!editMode} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the initial budget amount (optional)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="revised_budget"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Revised Budget</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} disabled={!editMode} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the revised budget amount (optional)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    

                        {editMode && <Button type="submit">Update</Button>}
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default SingleProject;
