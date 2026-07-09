export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  abort(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs = 1000,
): Debounced<A> {
  let timerId = 0;
  const ret = (...args: A) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
    }, delayMs) as unknown as number;
  };
  ret.abort = () => {
    clearTimeout(timerId);
  };
  return ret;
}
