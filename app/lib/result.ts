export type Result<E, T> = { success: true; value: T } | { success: false; error: E };
