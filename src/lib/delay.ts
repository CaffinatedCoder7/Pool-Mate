/** Simulated network latency for mock services, so loading states are exercised. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
