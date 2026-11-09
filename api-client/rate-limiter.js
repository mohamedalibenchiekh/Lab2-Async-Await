// rate-limiter.js - Token Bucket Implementation
export class TokenBucketRateLimiter {
  constructor(ratePerSecond, burstCapacity) {
    this.ratePerSecond = ratePerSecond;
    this.burstCapacity = burstCapacity;
    this.tokens = burstCapacity;
    this.lastRefillTime = Date.now();
    this.waitQueue = []; // FIFO queue for waiting callers
  }

  // Refill tokens based on elapsed time
  _refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.ratePerSecond;
    
    this.tokens = Math.min(this.burstCapacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  // Acquire a token. Resolves when a token is available.
  async acquire() {
    this._refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return; // Got a token immediately
    }

    // Not enough tokens: calculate wait time and queue the caller
    const tokensNeeded = 1 - this.tokens;
    const waitTimeMs = (tokensNeeded / this.ratePerSecond) * 1000;

    return new Promise((resolve) => {
      this.waitQueue.push({ resolve, waitTimeMs });
      
      // Only start the timer if this is the first in queue
      if (this.waitQueue.length === 1) {
        this._processQueue();
      }
    });
    // Note: A robust production version would also handle AbortSignal here 
    // to remove the caller from the queue if they cancel, but this meets the lab's core requirement.
  }

  _processQueue() {
    if (this.waitQueue.length === 0) return;

    const nextCaller = this.waitQueue[0];
    
    setTimeout(() => {
      this._refill();
      this.tokens -= 1;
      this.waitQueue.shift(); // Remove the resolved caller
      nextCaller.resolve();
      
      // Process the next caller in line
      this._processQueue();
    }, nextCaller.waitTimeMs);
    // Note: In a real app with fake timers for testing, we'd inject the setTimeout/sleep function.
  }
}