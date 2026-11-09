// client.js - Resilient API Client with Rate Limiting and Retries
import { fetch } from 'undici';
import { TokenBucketRateLimiter } from './rate-limiter.js';

// Helper: sleep that respects AbortSignal
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export class ApiClient {
  constructor(opts = {}) {
    this.rateLimiter = new TokenBucketRateLimiter(opts.ratePerSecond ?? 10, opts.burst ?? 10);
    this.attemptTimeoutMs = opts.attemptTimeoutMs ?? 1000;
    this.totalDeadlineMs = opts.totalDeadlineMs ?? 5000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseBackoffMs = opts.baseBackoffMs ?? 100;
    this.capBackoffMs = opts.capBackoffMs ?? 5000;
  }

  async get(url, init = {}) {
    return this.request('GET', url, init);
    // Note: POST can be added similarly, but GET is the primary focus for the lab's verification scenario
  }

  async request(method, url, init = {}) {
    // 1. Total deadline controller
    const deadlineController = new AbortController();
    const deadlineTimer = setTimeout(() => deadlineController.abort('TotalDeadlineExceeded'), this.totalDeadlineMs);
    
    // Combine caller's signal with our deadline signal
    const combinedSignal = this._combineSignals(init.signal, deadlineController.signal);

    // 2. Idempotency guard: do not retry POST unless an idempotency key is supplied
    const headers = new Headers(init.headers);
    const isIdempotent = method !== 'POST' || headers.has('Idempotency-Key');
    const effectiveMaxRetries = isIdempotent ? this.maxRetries : 0;

    let lastError;

    // 3. Retry loop
    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      if (combinedSignal.aborted) {
        clearTimeout(deadlineTimer);
        throw new DOMException(combinedSignal.reason || 'Request aborted', 'AbortError');
      }

      try {
        // Acquire rate limit token (FIFO)
        await this.rateLimiter.acquire();

        // Attempt-specific timeout
        const attemptController = new AbortController();
        const attemptTimer = setTimeout(() => attemptController.abort('AttemptTimeout'), this.attemptTimeoutMs);
        
        const fetchSignal = this._combineSignals(combinedSignal, attemptController.signal);

        const response = await fetch(url, {
          ...init,
          method,
          headers,
          signal: fetchSignal,
        });

        clearTimeout(attemptTimer);

        if (response.ok) {
          clearTimeout(deadlineTimer);
          return response; // Success!
        }

        // Check if HTTP status is retryable
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          lastError = new Error(`HTTP ${response.status}`);
          lastError.status = response.status;
          lastError.headers = response.headers;
        } else {
          // Non-retryable HTTP error (e.g., 404)
          clearTimeout(deadlineTimer);
          throw new Error(`HTTP ${response.status} (Non-retryable)`);
        }

      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError' || error === 'TotalDeadlineExceeded' || error === 'AttemptTimeout') {
          clearTimeout(deadlineTimer);
          throw error; // Propagate abort/timeout immediately
        }
        // Network errors (e.g., TypeError: fetch failed) are considered retryable
      }

      // 4. Backoff and retry (if attempts remain)
      if (attempt < effectiveMaxRetries) {
        let backoffMs = this.baseBackoffMs * Math.pow(2, attempt);
        
        // Honor Retry-After header if present (in seconds)
        if (lastError.headers && lastError.headers.has('retry-after')) {
          const retryAfter = lastError.headers.get('retry-after');
          if (/^\d+$/.test(retryAfter)) {
            backoffMs = Math.max(backoffMs, parseInt(retryAfter, 10) * 1000);
          }
        }

        // Full jitter: random(0, min(cap, base * 2^attempt))
        const capped = Math.min(this.capBackoffMs, backoffMs);
        const jitter = Math.random() * capped;
        
        await sleep(jitter, combinedSignal);
      }
    }

    clearTimeout(deadlineTimer);
    throw lastError || new Error('Request failed after max retries');
  }

  // Helper to merge two AbortSignals
  _combineSignals(signal1, signal2) {
    if (!signal1) return signal2;
    if (!signal2) return signal1;
    
    const controller = new AbortController();
    const abort = (reason) => controller.abort(reason);
    signal1.addEventListener('abort', () => abort(signal1.reason));
    signal2.addEventListener('abort', () => abort(signal2.reason));
    return controller.signal;
  }
}