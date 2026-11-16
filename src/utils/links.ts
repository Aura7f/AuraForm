/** Builds an absolute public link for a form, preserving the app's base path. */
export const buildFormUrl = (formId: string): string => {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('form', formId);
  return url.toString();
};
