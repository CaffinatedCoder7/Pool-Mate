/**
 * Injectable clock. Everything time-dependent in the services reads from here
 * so behaviour such as offer expiry can be driven deterministically in tests
 * instead of waiting on the wall clock.
 */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

/** Mutable only so tests can substitute a fixed clock; app code never sets it. */
let active: Clock = systemClock;

export const clock: Clock = { now: () => active.now() };

export const nowMs = (): number => active.now();
export const nowIso = (): string => new Date(active.now()).toISOString();

/** Test seam: install a deterministic clock. */
export function setClock(next: Clock): void {
  active = next;
}

/** Test seam: restore the real clock. */
export function resetClock(): void {
  active = systemClock;
}

/** A clock whose time only moves when the test advances it. */
export function fixedClock(startMs: number): Clock & { advance(ms: number): void; set(ms: number): void } {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (ms: number) => {
      current = ms;
    },
  };
}
