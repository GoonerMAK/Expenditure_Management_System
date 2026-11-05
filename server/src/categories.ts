export class DuplicateCategoryError extends Error {
    constructor(category_name: string) {
        super(`A category named "${category_name}" already exists.`);
    }
}

export class CategoryNotFoundError extends Error {
    constructor() {
        super('This category no longer exists. Refresh the list.');
    }
}

export const getCategorySaveFailedMessage = () => 'Something went wrong while saving the category. Try again.';
