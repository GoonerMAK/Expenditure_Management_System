import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";

import { Button } from "../components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "../components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "./ui/collapsible"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "../components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "./ui/command"
import { Popover, PopoverContent, PopoverTrigger, } from "./ui/popover";
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from '../lib/utils';

import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Toaster } from './ui/sonner';

import {useGetRolesQuery, useAddRoleMutation, useGetUsersByRolesQuery, useGetAssignedRolesByUserIdQuery, useGetUnassignedRolesByUserIdQuery}  from '../redux/role-api';
import { useGetUsernamesQuery, useUpdateUserMutation } from '../redux/user-api';


interface Role {
  id: string;
  role_name: string;
}

interface RoleWithUsers {
  role_name: string;
  users: string[];
}

interface Username {
  id: string;
  username: string,
}

const UserRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [unassignedRoles, setUnassignedRoles] = useState<Role[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);
  const [usernames, setUsernames] = useState<Username[]>([]);
  const [rolesWithUsers, setRolesWithUsers] = useState<RoleWithUsers[]>([]);

  const [selectedUserIdAssign, setSelectedUserIdAssign] = useState<string>("");
  const [selectedUserIdRevoke, setSelectedUserIdRevoke] = useState<string>("");

  const [openUsernameAssign, setOpenUsernameAssign] = useState(false);
  const [openRoleAssign, setOpenRoleAssign] = useState(false);
  const [openUsernameRevoke, setOpenUsernameRevoke] = useState(false);
  const [openRoleRevoke, setOpenRoleRevoke] = useState(false);


  const addRoleForm = useForm<Role>({
    defaultValues: {
      role_name: '',
    },
    mode: 'onSubmit',
  });

  const selectRoleFormAssign = useForm<Role & Username>({
    defaultValues: {
      id: '',
      username: '',
      role_name: '',
    },
    mode: 'onSubmit',
  });

  const selectRoleFormRevoke = useForm<Role & Username>({
    defaultValues: {
      id: '',
      username: '',
      role_name: '',
    },
    mode: 'onSubmit',
  });


  const { setValue: setSelectRoleValueAssign } = selectRoleFormAssign;
  const { setValue: setSelectUsernameAssign } = selectRoleFormAssign;

  const { setValue: setSelectRoleValueRevoke } = selectRoleFormRevoke;
  const { setValue: setSelectUsernameRevoke } = selectRoleFormRevoke;

  
  const { data: rolesData, refetch: refetchRoles } = useGetRolesQuery();
  const { data: rolesWithUsersData, refetch: refetchRolesWithUsers } = useGetUsersByRolesQuery();
  const { data: usernamesData } = useGetUsernamesQuery();

  const [addRole] = useAddRoleMutation();
  const [updateUser] = useUpdateUserMutation();

  const { data: unassignedRolesData } = useGetUnassignedRolesByUserIdQuery(selectedUserIdAssign, { skip: !selectedUserIdAssign });
  const { data: assignedRolesData } = useGetAssignedRolesByUserIdQuery(selectedUserIdRevoke, { skip: !selectedUserIdRevoke });
 

  useEffect(() => {
    if (rolesData) {
      console.log('Fetched Roles Data:', rolesData);
      setRoles(rolesData);
    }
    if (usernamesData) {
      console.log('Fetched Usernames Data:', usernamesData);
      setUsernames(usernamesData);
    }
    if (rolesWithUsersData) {
      console.log('Fetched Roles With Users Data:', rolesWithUsersData);
      const transformedRolesWithUsers = rolesWithUsersData.map(roleWithUsers => {
        return {
          role_name: roleWithUsers[0], 
          users: roleWithUsers.slice(1) 
        };
      });
      setRolesWithUsers(transformedRolesWithUsers);
    }
  }, [rolesData, usernamesData, rolesWithUsersData]);

  useEffect(() => {
    if (unassignedRolesData) setUnassignedRoles(unassignedRolesData);
    console.log('Fetched Unassigned Roles Data:', unassignedRolesData);
  }, [unassignedRolesData]);

  useEffect(() => {
    if (Array.isArray(assignedRolesData)) {
      setAssignedRoles(assignedRolesData);
    } else if (assignedRolesData) {
      setAssignedRoles([assignedRolesData]);
    } else {
      setAssignedRoles([]);
    }
  }, [assignedRolesData]);


  const onAddRoleSubmit = async (data: Role) => {
    try {
      await addRole(data).unwrap();
      refetchRoles();
      toast.success('Successfully created Role');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      toast.error('Error Creating Role ' + error);
      console.error('Error response:', error);
    }
  };


  const onSelectRoleSubmitAssign = async (data: Role & Username) => {
    try {
      const selectedUser = usernames.find(user => user.username === data.username);
      if (!selectedUser) {
        toast.error('User not found');
        return;
      }

      const selectedRole = roles.find(role => role.role_name === data.role_name);
      if (!selectedRole) {
        toast.error('Role not found');
        return;
      }
      console.log('Selected User ID:', selectedUser.id);
      console.log('Selected Role:', data.role_name);

      const payload = {
        data: {
          role_id: selectedRole.id,
          role_name: data.role_name
        }
      };

      await updateUser({ id: selectedUser.id, data: payload }).unwrap();
      refetchRolesWithUsers();

      toast.success('Role assigned successfully');
      setTimeout(() => {
        window.location.reload(); 
      }, 2000);
    } catch (error) {
      toast.error('Error assigning role');
      console.error('Error response:', error);
    }
  };


  const onSelectRoleSubmitRevoke = async (data: Role & Username) => {
    try {
      const selectedUser = usernames.find(user => user.username === data.username);
      if (!selectedUser) {
        toast.error('User not found');
        return;
      }

      console.log('Selected User ID:', selectedUser.id);

      const payload = {
        data: {
          role_name: "Read-only"
        }
      };

      await updateUser({ id: selectedUser.id, data: payload }).unwrap();
  
      toast.success('Role revoked successfully');
      setTimeout(() => {
        window.location.reload(); 
      }, 3000);
    } catch (error) {
      toast.error('Error revoking role');
      console.error('Error response:', error);
    }
  };


  return (
    <div className="flex space-x-6 p-12 ml-10">
      <Toaster />

      <div className="w-1/3">

      <div>
        <Form {...addRoleForm}>
          <form onSubmit={addRoleForm.handleSubmit(onAddRoleSubmit)} className="flex-col space-y-6">
            <FormField
              control={addRoleForm.control}

              name="role_name"
              rules={{ required: 'Role name is required', minLength: { value: 2, message: 'Role name must be at least two character long' } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter role name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name of the role.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </div>

      <br></br><br></br><br></br>

      <div >
        <h1 className='text-2xl mb-4'>Assign Roles</h1>
        <Form {...selectRoleFormAssign}>
          <form onSubmit={selectRoleFormAssign.handleSubmit(onSelectRoleSubmitAssign)} className="flex-col space-y-6">
            
          <FormField
              control={selectRoleFormAssign.control}
              name="username"
              render={() => (
                <FormItem className=''>
                  <FormLabel>Username</FormLabel>
                  <Popover open={openUsernameAssign} onOpenChange={setOpenUsernameAssign}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUsernameAssign}
                        className="w-[200px] justify-between flex"
                      >
                        {selectRoleFormAssign.getValues("username") || "Select Username"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search Username..." />
                        <CommandList>
                          {usernames.length === 0 && <CommandEmpty>No Username found</CommandEmpty>}
                          <CommandGroup>
                            {usernames.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={user.username}
                                onSelect={(currentValue) => {
                                  const selectedUsername = usernames.find(u => u.username === currentValue);
                                  if (selectedUsername) {
                                    setSelectUsernameAssign("username", selectedUsername.username); 
                                    setSelectedUserIdAssign(selectedUsername.id);
                                    setSelectRoleValueAssign("role_name", ""); 
                                  }
                                  setOpenUsernameAssign(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectRoleFormAssign.getValues("username") === user.username ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.username}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    These are the different roles a user can have
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={selectRoleFormAssign.control}
              name="role_name"
              render={() => (
                <FormItem className=''>
                  <FormLabel>Role Name</FormLabel>
                  <Popover open={openRoleAssign} onOpenChange={setOpenRoleAssign}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRoleAssign}
                        className="w-[200px] justify-between flex"
                      >
                        {selectRoleFormAssign.getValues("role_name") || "Select Role"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search Role..." />
                        <CommandList>
                          {unassignedRoles.length === 0 && <CommandEmpty>No Roles found</CommandEmpty>}
                          <CommandGroup>
                            {unassignedRoles.map((role) => (
                              <CommandItem
                                key={role.id}
                                value={role.role_name}
                                onSelect={(currentValue) => {
                                  const selectedRole = unassignedRoles.find(r => r.role_name === currentValue);
                                  if (selectedRole) {
                                    setSelectRoleValueAssign("role_name", selectedRole.role_name);
                                  }
                                  setOpenRoleAssign(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectRoleFormAssign.getValues("role_name") === role.role_name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {role.role_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    These are the different roles a user can have
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit">Assign</Button>
          </form>
        </Form>
      </div> <br></br><br></br>

      <div >
        <h1 className='text-2xl mb-4'>Revoke Access</h1>
        <Form {...selectRoleFormRevoke}>
          <form onSubmit={selectRoleFormRevoke.handleSubmit(onSelectRoleSubmitRevoke)} className="flex-col space-y-6">
            
          <FormField
              control={selectRoleFormRevoke.control}
              name="username"
              render={() => (
                <FormItem className=''>
                  <FormLabel>Username</FormLabel>
                  <Popover open={openUsernameRevoke} onOpenChange={setOpenUsernameRevoke}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUsernameRevoke}
                        className="w-[200px] justify-between flex"
                      >
                        {selectRoleFormRevoke.getValues("username") || "Select Username"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search Username..." />
                        <CommandList>
                          {usernames.length === 0 && <CommandEmpty>No Username found</CommandEmpty>}
                          <CommandGroup>
                            {usernames.map((user) => (
                              <CommandItem
                                key={user.username}
                                value={user.username}
                                onSelect={(currentValue) => {
                                  const selectedUsername = usernames.find(u => u.username === currentValue);
                                  if (selectedUsername) {
                                    setSelectUsernameRevoke("username", selectedUsername.username);
                                    setSelectedUserIdRevoke(selectedUsername.id);
                                    setSelectRoleValueRevoke("role_name", "");
                                  }
                                  setOpenUsernameRevoke(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectRoleFormRevoke.getValues("username") === user.username ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.username}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    These are the different roles a user can have
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            
            <FormField
              control={selectRoleFormRevoke.control}
              name="role_name"
              render={() => (
                <FormItem className=''>
                  <FormLabel>Role Name</FormLabel>
                  <Popover open={openRoleRevoke} onOpenChange={setOpenRoleRevoke}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRoleRevoke}
                        className="w-[200px] justify-between flex"
                      >
                        {selectRoleFormRevoke.getValues("role_name") || "Select Role"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search Role..." />
                        <CommandList>
                          {assignedRoles.length === 0 && <CommandEmpty>No Roles found</CommandEmpty>}
                          <CommandGroup>
                            {assignedRoles.map((role)  => (
                              <CommandItem
                                key={role.id}
                                value={role.role_name}
                                onSelect={(currentValue) => {
                                  const selectedRole = assignedRoles.find(r => r.role_name === currentValue);
                                  if (selectedRole) {
                                    setSelectRoleValueRevoke("role_name", selectedRole.role_name);
                                  }
                                  setOpenRoleRevoke(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectRoleFormRevoke.getValues("role_name") === role.role_name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {role.role_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    These are the different roles a user can have
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit">Revoke</Button>
          </form>
        </Form>
      </div>

      </div>

      <div className="w-2/3">
        <Table className="ml-60 w-1/2">
          <TableCaption></TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center text-xl">A list of your existing Roles</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Collapsible>
                    <CollapsibleTrigger>{role.role_name}</CollapsibleTrigger>
                    <CollapsibleContent>
                      <p className="text-center text-s font-medium text-muted-foreground mt-2">List of users under this role</p>
                      <ul>
                        {rolesWithUsers.find(r => r.role_name === role.role_name)?.users.map(user => (
                          <li className="py-1" key={user}>{user}</li>
                        )) || <li className="py-1">No users found</li>}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>


    </div>

  );
};

export default UserRoles;
