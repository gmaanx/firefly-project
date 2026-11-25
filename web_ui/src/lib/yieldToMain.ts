/**
 * Cooperative main-thread task yielding (`modern-web-guidance`: `break-up-long-tasks` & `performance`).
 * Uses `window.scheduler.yield()` where supported so continuations resume at the front of the queue,
 * falling back to `setTimeout(..., 0)` on Safari / older browsers.
 */
interface SchedulerWithYield {
  yield?: () => Promise<void>;
}

export async function yieldToMain(): Promise<void> {
  if (typeof window !== 'undefined' && 'scheduler' in window) {
    const sched = (window as Window & { scheduler?: SchedulerWithYield }).scheduler;
    if (sched && typeof sched.yield === 'function') {
      await sched.yield();
      return;
    }
  }
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

/**
 * Time-sliced 50ms task budget helper: yields to the browser main thread whenever
 * elapsed execution crosses the Long Task threshold (`budgetMs`, default 42ms).
 */
export function createTaskBudget(budgetMs = 42): () => Promise<void> {
  let deadline =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) +
    budgetMs;

  return async () => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now >= deadline) {
      await yieldToMain();
      const resumed =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      deadline = resumed + budgetMs;
    }
  };
}
