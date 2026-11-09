// tests/client.test.js
import { test, mock, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { TokenBucketRateLimiter } from '../rate-limiter.js';

describe('TokenBucketRateLimiter with Fake Clock', () => {
  // Enable ALL fake timers by default (Date, setTimeout, setInterval, etc.)
  beforeEach(() => {
    mock.timers.enable();
  });

  // Reset timers after each test so they don't leak into other tests
  afterEach(() => {
    mock.timers.reset();
  });

  test('should allow burst up to capacity immediately', async () => {
    const limiter = new TokenBucketRateLimiter(10, 5); // 10/sec, burst 5
    
    // All 5 should resolve instantly without advancing time
    const promises = Array.from({ length: 5 }, () => limiter.acquire());
    await Promise.all(promises);
    
    assert.ok(true, 'All burst requests resolved immediately');
  });

  test('should delay requests when tokens are exhausted and refill over time', async () => {
    const limiter = new TokenBucketRateLimiter(10, 1); // 10/sec, burst 1
    
    await limiter.acquire(); // Consume the 1 burst token

    let resolved = false;
    const waitPromise = limiter.acquire().then(() => { resolved = true; });

    // Advance time by 50ms (0.05s * 10 tokens/sec = 0.5 tokens). Not enough!
    mock.timers.tick(50);
    
    // Yield to the microtask queue to let any pending timers fire
    await new Promise(setImmediate);
    assert.strictEqual(resolved, false, 'Should not resolve at 50ms');

    // Advance another 50ms (total 100ms = 1 full token)
    mock.timers.tick(50);
    await new Promise(setImmediate);
    
    assert.strictEqual(resolved, true, 'Should resolve after 100ms');
  });

  test('should process waiters in strict FIFO order', async () => {
    const limiter = new TokenBucketRateLimiter(10, 1);
    await limiter.acquire(); // Consume burst

    const order = [];
    limiter.acquire().then(() => order.push(1));
    limiter.acquire().then(() => order.push(2));
    limiter.acquire().then(() => order.push(3));

    // Advance 100ms (1 token generated)
    mock.timers.tick(100);
    await new Promise(setImmediate);
    assert.deepStrictEqual(order, [1], 'First waiter gets the token');

    // Advance another 100ms (1 more token generated)
    mock.timers.tick(100);
    await new Promise(setImmediate);
    assert.deepStrictEqual(order, [1, 2], 'Second waiter gets the token');
  });
});