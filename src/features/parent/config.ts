/** Runs the portal on the sample data in `api/mock.ts` instead of the backend. */
export const isParentApiMocked = process.env.NEXT_PUBLIC_PARENT_API_MOCK === '1';

/**
 * Portal areas whose backend endpoints exist. Reports went live with results
 * phase 4 (docs/api/results.md); a school without the results module gets a
 * 403, shown as the usual "not turned on" state.
 */
export const parentAreaReady = {
  reports: true,
  attendance: true,
};
