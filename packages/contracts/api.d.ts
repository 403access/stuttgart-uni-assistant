export type ApiMethod = 'GET' | 'POST';

export interface ApiOperation {
  id: string;
  method: ApiMethod;
  path: string;
  replay: boolean;
  acceptsElementId?: boolean;
  acceptsCourseId?: boolean;
}

export interface ApiCatalog {
  operations: ApiOperation[];
}

export const API_OPERATIONS: ApiOperation[];
export function apiCatalog(): ApiCatalog;
