import { env } from '../config/env';

export interface GqlError {
  message: string;
  path?: Array<string | number>;
  extensions?: { code?: string; [key: string]: unknown };
}

export interface GqlResult<T> {
  /** HTTP status. Apollo returns 200 for resolver errors, so ALWAYS check `errors` too. */
  status: number;
  data: T | null;
  errors?: GqlError[];
}

export interface RestResult<T> {
  status: number;
  body: T;
}

const authHeader = (token?: string): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<GqlResult<T>> {
  const res = await fetch(new URL(env.bff.graphqlPath, env.bff.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T | null; errors?: GqlError[] };
  return { status: res.status, data: body.data ?? null, errors: body.errors };
}

export async function rest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<RestResult<T>> {
  const res = await fetch(new URL(path, env.bff.url), {
    method,
    headers: { 'content-type': 'application/json', ...authHeader(opts.token) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

/** Fail with the server's own message instead of "cannot read property of null". */
export function assertNoGqlErrors<T>(res: GqlResult<T>, context: string): T {
  if (res.errors?.length || !res.data) {
    throw new Error(`${context} failed (HTTP ${res.status}): ${JSON.stringify(res.errors ?? res.data)}`);
  }
  return res.data;
}

export const errorCodes = (res: GqlResult<unknown>): string[] =>
  (res.errors ?? []).map((e) => String(e.extensions?.code ?? 'NO_CODE'));
