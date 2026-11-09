// tests/client.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TokenBucketRateLimiter } from '../rate-limiter.js';

describe('TokenBucketRateLimiter with Injected Fake Clock', () => {
  
  // Helper to create a fresh fake clock for each test
  const createFakeClock = () => {
    let fakeTime = 0;
    const timers = [];
    const fakeNow = () => fakeTime;
    const fakeSetTimeout = (fn, delay) => {
      timers.push({ fn, fireTime: fakeTime + delay });
    };
    const tick = (ms) => {
      fakeTime += ms;
      // Fire all timers whose time has come
      while (timers.length > 0 && timers[0].fireTime <= fakeTime) {
        const timer = timers.shift();
        timer.fn();
      }
    };
    return { fakeNow, fakeSetTimeout, tick };
  };

  test('should allow burst up to capacity immediately', async () => {
    const { fakeNow, fakeSetTimeout } = createFakeClock();
    const limiter = new TokenBucketRateLimiter(10, 5, { now: fakeNow, setTimeout: fakeSetTimeout });
    
    const promises = Array.from({ length: 5 }, () => limiter.acquire());
    await Promise.all(promises);
    
    assert.ok(true, 'All burst requests resolved immediately');
  });

  test('should delay requests when tokens are exhausted and refill over time', async () => {
    const { fakeNow, fakeSetTimeout, tick } = createFakeClock();
    const limiter = new TokenBucketRateLimiter(10, 1, { now: fakeNow, setTimeout: fakeSetTimeout });
    
    await limiter.acquire(); // Consume the 1 burst token

    let resolved = false;
    limiter.acquire().then(() => { resolved = true; });

    // Advance time by 50ms. Not enough to get a token (needs 100ms).
    tick(50);
    await Promise.resolve(); // Flush microtasks
    
    assert.strictEqual(resolved, false, 'Should not resolve at 50ms');

    // Advance another 50ms (total 100ms = 1 full token)
    tick(50);
    await Promise.resolve(); // Flush microtasks
    
    assert.strictEqual(resolved, true, 'Should resolve after 100ms');
  });

  test('should process waiters in strict FIFO order', async () => {
    const { fakeNow, fakeSetTimeout, tick } = createFakeClock();
    const limiter = new TokenBucketRateLimiter(10, 1, { now: fakeNow, setTimeout: fakeSetTimeout });
    
    await limiter.acquire(); // Consume burst

    const order = [];
    limiter.acquire().then(() => order.push(1));
    limiter.acquire().then(() => order.push(2));
    limiter.acquire().then(() => order.push(3));

    // Advance 100ms (1 token generated)
    tick(100);
    await Promise.resolve();
    assert.deepStrictEqual(order, [1], 'First waiter gets the token');

    // Advance another 100ms (1 more token generated)
    tick(100);
    await Promise.resolve();
    assert.deepStrictEqual(order, [1, 2], 'Second waiter gets the token');
  });
});