import { useCallback, useEffect, useRef, useState, type AnimationEvent } from 'react'

/** Runs a box's exit animation. `closing` stays true from beginClose until the
 *  element's own animationend or a backstop timer (a timer is all a
 *  reduced-motion environment leaves us with, where the animation never
 *  fires); the element stays mounted while it is true. */
export function useExitAnimation(durationMs: number) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const beginClose = useCallback(() => {
    setClosing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setClosing(false), durationMs + 80);
  }, [durationMs]);
  const endClose = useCallback((event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setClosing(false);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { closing, beginClose, endClose };
}
