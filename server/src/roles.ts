export const getAdminRole = () => 'Administrator' as const;

export const getBuiltInRoles = () => ['Read-only', 'Contributor', getAdminRole()] as const;

export const isBuiltInRole = (role_name: string) => getBuiltInRoles().some((role) => role === role_name);
