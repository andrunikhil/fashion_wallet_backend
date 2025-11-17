import { v4 as uuidv4 } from 'uuid';

/**
 * Job interface for queue operations
 */
export interface MockJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts?: any;
  attemptsMade?: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  returnvalue?: any;
}

/**
 * Mock Queue for testing background job operations
 * Provides in-memory job queue simulation
 *
 * @example
 * ```typescript
 * const queueMock = new QueueMock();
 *
 * // Add job
 * const job = await queueMock.add('email', { to: 'test@example.com' });
 *
 * // Process jobs
 * queueMock.process('email', async (job) => {
 *   console.log('Processing:', job.data);
 * });
 *
 * // Get jobs
 * const jobs = await queueMock.getJobs(['waiting', 'active']);
 * ```
 */
export class QueueMock {
  private jobs: Map<string, MockJob[]> = new Map();
  private processors: Map<string, Function> = new Map();
  private activeJobs: MockJob[] = [];
  private completedJobs: MockJob[] = [];
  private failedJobs: MockJob[] = [];

  /**
   * Add a job to the queue
   */
  add = jest.fn(async <T = any>(
    name: string,
    data: T,
    opts?: any
  ): Promise<MockJob<T>> => {
    if (!this.jobs.has(name)) {
      this.jobs.set(name, []);
    }

    const job: MockJob<T> = {
      id: uuidv4(),
      name,
      data,
      opts,
      attemptsMade: 0
    };

    this.jobs.get(name)!.push(job);

    // Auto-process if processor is registered
    if (this.processors.has(name)) {
      setImmediate(() => this.processJob(job));
    }

    return job;
  });

  /**
   * Add multiple jobs in bulk
   */
  addBulk = jest.fn(async (
    jobs: Array<{ name: string; data: any; opts?: any }>
  ): Promise<MockJob[]> => {
    const addedJobs: MockJob[] = [];
    for (const jobData of jobs) {
      const job = await this.add(jobData.name, jobData.data, jobData.opts);
      addedJobs.push(job);
    }
    return addedJobs;
  });

  /**
   * Register a job processor
   */
  process = jest.fn((name: string, handler: Function) => {
    this.processors.set(name, handler);

    // Process any waiting jobs
    const waitingJobs = this.jobs.get(name) || [];
    waitingJobs.forEach(job => {
      setImmediate(() => this.processJob(job));
    });
  });

  /**
   * Process a single job
   */
  private async processJob(job: MockJob): Promise<void> {
    const processor = this.processors.get(job.name);
    if (!processor) {
      return;
    }

    // Move to active
    const waitingJobs = this.jobs.get(job.name) || [];
    const index = waitingJobs.findIndex(j => j.id === job.id);
    if (index >= 0) {
      waitingJobs.splice(index, 1);
    }
    this.activeJobs.push(job);

    job.processedOn = Date.now();
    job.attemptsMade = (job.attemptsMade || 0) + 1;

    try {
      const result = await processor(job);
      job.returnvalue = result;
      job.finishedOn = Date.now();

      // Move to completed
      const activeIndex = this.activeJobs.findIndex(j => j.id === job.id);
      if (activeIndex >= 0) {
        this.activeJobs.splice(activeIndex, 1);
      }
      this.completedJobs.push(job);
    } catch (error) {
      job.failedReason = error instanceof Error ? error.message : String(error);
      job.finishedOn = Date.now();

      // Move to failed
      const activeIndex = this.activeJobs.findIndex(j => j.id === job.id);
      if (activeIndex >= 0) {
        this.activeJobs.splice(activeIndex, 1);
      }
      this.failedJobs.push(job);
    }
  }

  /**
   * Get jobs by status
   */
  getJobs = jest.fn(async (
    types: Array<'waiting' | 'active' | 'completed' | 'failed'>
  ): Promise<MockJob[]> => {
    let jobs: MockJob[] = [];

    for (const type of types) {
      switch (type) {
        case 'waiting':
          for (const waitingJobs of this.jobs.values()) {
            jobs = jobs.concat(waitingJobs);
          }
          break;
        case 'active':
          jobs = jobs.concat(this.activeJobs);
          break;
        case 'completed':
          jobs = jobs.concat(this.completedJobs);
          break;
        case 'failed':
          jobs = jobs.concat(this.failedJobs);
          break;
      }
    }

    return jobs;
  });

  /**
   * Get job by ID
   */
  getJob = jest.fn(async (jobId: string): Promise<MockJob | null> => {
    // Search in all job lists
    for (const waitingJobs of this.jobs.values()) {
      const job = waitingJobs.find(j => j.id === jobId);
      if (job) return job;
    }

    const activeJob = this.activeJobs.find(j => j.id === jobId);
    if (activeJob) return activeJob;

    const completedJob = this.completedJobs.find(j => j.id === jobId);
    if (completedJob) return completedJob;

    const failedJob = this.failedJobs.find(j => j.id === jobId);
    if (failedJob) return failedJob;

    return null;
  });

  /**
   * Get waiting jobs count
   */
  getWaitingCount = jest.fn(async (): Promise<number> => {
    let count = 0;
    for (const jobs of this.jobs.values()) {
      count += jobs.length;
    }
    return count;
  });

  /**
   * Get active jobs count
   */
  getActiveCount = jest.fn(async (): Promise<number> => {
    return this.activeJobs.length;
  });

  /**
   * Get completed jobs count
   */
  getCompletedCount = jest.fn(async (): Promise<number> => {
    return this.completedJobs.length;
  });

  /**
   * Get failed jobs count
   */
  getFailedCount = jest.fn(async (): Promise<number> => {
    return this.failedJobs.length;
  });

  /**
   * Remove a job by ID
   */
  removeJob = jest.fn(async (jobId: string): Promise<void> => {
    // Remove from waiting jobs
    for (const [name, waitingJobs] of this.jobs.entries()) {
      const index = waitingJobs.findIndex(j => j.id === jobId);
      if (index >= 0) {
        waitingJobs.splice(index, 1);
        return;
      }
    }

    // Remove from other lists
    let index = this.activeJobs.findIndex(j => j.id === jobId);
    if (index >= 0) {
      this.activeJobs.splice(index, 1);
      return;
    }

    index = this.completedJobs.findIndex(j => j.id === jobId);
    if (index >= 0) {
      this.completedJobs.splice(index, 1);
      return;
    }

    index = this.failedJobs.findIndex(j => j.id === jobId);
    if (index >= 0) {
      this.failedJobs.splice(index, 1);
    }
  });

  /**
   * Clean jobs by status and age
   */
  clean = jest.fn(async (
    grace: number,
    status?: 'completed' | 'failed'
  ): Promise<MockJob[]> => {
    const now = Date.now();
    const cleaned: MockJob[] = [];

    const cleanList = (list: MockJob[]) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const job = list[i];
        if (job.finishedOn && now - job.finishedOn > grace) {
          cleaned.push(job);
          list.splice(i, 1);
        }
      }
    };

    if (!status || status === 'completed') {
      cleanList(this.completedJobs);
    }
    if (!status || status === 'failed') {
      cleanList(this.failedJobs);
    }

    return cleaned;
  });

  /**
   * Empty the queue (remove all jobs)
   */
  empty = jest.fn(async (): Promise<void> => {
    this.jobs.clear();
  });

  /**
   * Pause queue processing
   */
  pause = jest.fn(async (): Promise<void> => {
    // Mock implementation - doesn't actually pause in mock
  });

  /**
   * Resume queue processing
   */
  resume = jest.fn(async (): Promise<void> => {
    // Mock implementation - doesn't actually resume in mock
  });

  /**
   * Clear all data
   */
  clear(): void {
    this.jobs.clear();
    this.processors.clear();
    this.activeJobs = [];
    this.completedJobs = [];
    this.failedJobs = [];
  }

  /**
   * Get all jobs (for testing purposes)
   */
  getAllJobs(): {
    waiting: Map<string, MockJob[]>;
    active: MockJob[];
    completed: MockJob[];
    failed: MockJob[];
  } {
    return {
      waiting: this.jobs,
      active: this.activeJobs,
      completed: this.completedJobs,
      failed: this.failedJobs
    };
  }
}
