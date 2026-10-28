import { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { useAddFinancialDataMutation } from '../redux/financial-data-api';
import { useGetProjectsQuery } from '../redux/project-api';

import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from '../lib/utils';
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Toaster } from './ui/sonner';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import { Input } from "./ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "./ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"


interface FinancialData {
    year: number;
    month: number;
    expenditure: number;
    initial_budget: number;
    revised_budget: number;
    project_id: string;
    project_name: string;
}


const AddFinancialForm = () => {
    const { data: projectsPage, error } = useGetProjectsQuery({ offset: 0, limit: 100 });
    const projects = projectsPage?.data ?? [];
    const [addFinancialData] = useAddFinancialDataMutation();

    const form = useForm<FinancialData>({
        defaultValues: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            project_id: '',
            expenditure: 0,
            initial_budget: 0,
            revised_budget: 0,
            project_name: '',
        },
    });


    const { setValue } = form;

    useEffect(() => {
        if (error) {
            console.error('Failed to fetch projects:', error);
            toast.error('Failed to fetch projects');
        }
    }, [error]);


    const onSubmit = async (data: FinancialData) => {
        try {
            const selectedProject = projects.find(project => project.id === data.project_id);

            if (!selectedProject) {
                toast.error('Selected project not found. Please select a valid project.');
                return;
            }

            await addFinancialData({
                year: parseInt(data.year.toString()),
                month: parseInt(data.month.toString()),
                expenditure: parseFloat(data.expenditure.toString()),
                initial_budget: parseFloat(data.initial_budget.toString()),
                revised_budget: parseFloat(data.revised_budget.toString()),
                project_id: data.project_id,
                project_name: data.project_name
            }).unwrap();

            toast.success('Financial data added successfully');
            setTimeout(() => {
                window.location.reload();
            }, 4000);
        } catch (error) {
            console.error('Failed to add financial data:', error);
            toast.error('Failed to add financial data');
        }
    };



    return (

        <div className="flex space-x-6 p-12 ml-10">
            <Toaster position="top-right" />
            <div className="w-1/3">

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-col space-y-6">

                        <FormField
                            control={form.control}
                            name="project_name"
                            render={() => (
                                <FormItem className=''>
                                    <FormLabel>Project Name</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-[200px] justify-between flex"
                                            >
                                                {form.getValues("project_name") || "Select Project"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search Project..." />
                                                <CommandList>
                                                    {projects.length === 0 && <CommandEmpty>No Project found</CommandEmpty>}
                                                    <CommandGroup>
                                                        {projects.map((project) => (
                                                            <CommandItem
                                                                key={project.id}
                                                                value={project.project_name}
                                                                onSelect={() => {
                                                                    setValue("project_id", project.id);
                                                                    setValue("project_name", project.project_name); 
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        form.getValues("project_id") === project.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {project.project_name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Select the project for financial data
                                    </FormDescription>
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
                                        <Input type="number" min="2020" {...field} />
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
                                        <Input type="number" min="1" max="12" {...field} />
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
                                        <Input type="number" step="0.01" {...field} />
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
                                        <Input type="number" step="0.01" {...field} />
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
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the revised budget amount (optional)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        <Button type="submit"> Submit</Button>
                    </form>
                </Form>
            </div>
        </div >


    )
}

export default AddFinancialForm;
