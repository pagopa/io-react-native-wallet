/**
 * Fetch implementation used by the app for every network request.
 */
const appFetch: typeof fetch = (request, options) => fetch(request, options);

export default appFetch;
