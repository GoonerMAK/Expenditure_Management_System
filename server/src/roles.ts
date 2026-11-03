export const getAdminRole = () => 'Administrator' as const;

export const getDefaultRole = () => 'Read-only' as const;

export const getContributorRole = () => 'Contributor' as const;

export const getBuiltInRoles = () => [getDefaultRole(), getContributorRole(), getAdminRole()] as const;

export const isBuiltInRole = (role_name: string) => getBuiltInRoles().some((role) => role === role_name);

export class LastAdminError extends Error {
    constructor() {
        super('The last Administrator cannot be demoted or deleted.');
    }
}
