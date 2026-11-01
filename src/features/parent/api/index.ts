import { isParentApiMocked } from '../config';
import { HttpParentApi } from './HttpParentApi';
import type { ParentApi } from './ParentApi';

export type { InvoiceListQuery, OptionalServiceRequest, ParentApi } from './ParentApi';

/**
 * The sample data, loaded only when the mock is switched on, so its module
 * stays out of the production bundle. Every ParentApi method returns a
 * promise, so a lazy wrapper keeps the same shape.
 */
const lazyMockParentApi = new Proxy({} as ParentApi, {
  get:
    (_target, method: keyof ParentApi) =>
    async (...args: unknown[]) => {
      const { mockParentApi } = await import('./mock');
      return (mockParentApi[method] as (...a: unknown[]) => Promise<unknown>)(...args);
    },
});

/** The one way screens reach parent data: the backend, or sample data in mock mode. */
export const parentApi: ParentApi = isParentApiMocked ? lazyMockParentApi : new HttpParentApi();
