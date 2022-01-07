import { useEffect, useRef } from '../lib/teact/teact';

export default function useInterval(
  callback: Function,
  delay: number | undefined,
) {
  const savedCallback = useRef<Function>(() => undefined);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== undefined) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    return () => {};
  }, [delay]);
}
