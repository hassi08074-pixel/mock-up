export type QueueTask = () => Promise<void> | void;

export class AsyncQueue {
  private queue: QueueTask[] = [];

  private processing = false;

  private idleResolvers: Array<() => void> = [];

  enqueue(task: QueueTask): void {
    this.queue.push(task);
    if (!this.processing) {
      this.scheduleProcessing();
    }
  }

  async onIdle(): Promise<void> {
    if (!this.processing && this.queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private scheduleProcessing(): void {
    setImmediate(() => {
      void this.process();
    });
  }

  private async process(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) {
        continue;
      }
      try {
        await task();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('AsyncQueue task failed', error);
      }
    }
    this.processing = false;
    this.resolveIdle();
  }

  private resolveIdle(): void {
    if (this.queue.length === 0) {
      const resolvers = [...this.idleResolvers];
      this.idleResolvers = [];
      resolvers.forEach((resolve) => resolve());
    }
  }
}

export const asyncQueue = new AsyncQueue();
