import { getServerMessage } from './utils';

type RequestError = { status?: number | string; code?: string; response?: { status?: number } } | null | undefined;

export const getCategorySaveFailedMessage = () => 'Something went wrong while saving the category. Try again.';

const getStatus = (error: unknown) => {
  const err = error as RequestError;
  return err?.status ?? err?.response?.status;
};

const isNetworkError = (error: unknown) => {
  const err = error as RequestError;
  return err?.status === 'FETCH_ERROR' || err?.code === 'ERR_NETWORK';
};

export const getCategoryErrorMessage = (error: unknown, roleName?: string | null) => {
  if (isNetworkError(error)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  switch (getStatus(error)) {
    case 400:
    case 409:
      return getServerMessage(error) ?? getCategorySaveFailedMessage();
    case 401:
      return 'Your session has expired. Log in again.';
    case 403:
      return roleName ? `Your role (${roleName}) can't manage categories.` : "Your role can't manage categories.";
    case 404:
      return 'This category no longer exists. Refresh the list.';
    default:
      return getCategorySaveFailedMessage();
  }
};
