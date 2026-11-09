export const toPublicUser = <T extends { password?: string }>(user: T): Omit<T, 'password'> => {
    const { password: _password, ...publicUser } = user;
    return publicUser;
};
