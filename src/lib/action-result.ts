/**
 * The shape every officer Server Action returns. The UI shows `errorMessage`
 * and can branch on `error`, so a failure is always a code plus a sentence.
 */
export interface ActionResult<T = unknown, E extends string = string> {
  success: boolean;
  data?: T;
  error?: E;
  errorMessage?: string;
}

export function ok(): ActionResult<never, never>;
export function ok<T>(data: T): ActionResult<T, never>;
export function ok<T>(data?: T): ActionResult<T, never> {
  return data === undefined ? { success: true } : { success: true, data };
}

export function fail<E extends string>(error: E, errorMessage: string): ActionResult<never, E> {
  return { success: false, error, errorMessage };
}
