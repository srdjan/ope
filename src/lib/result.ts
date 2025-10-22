// Result type for functional error handling
// Per Light FP principles: "Treat errors as values (Result<T,E>). Throw only at the very edges"

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Helper for exhaustive checking in switch statements
 * @throws Error if called (indicates unhandled discriminated union case)
 */
export function assertNever(x: never): never {
  throw new Error(`Unreachable code reached with value: ${JSON.stringify(x)}`);
}
