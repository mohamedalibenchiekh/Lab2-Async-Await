// bonus/worker.js
import { parentPort } from 'node:worker_threads';

function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// Listen for messages from the main thread
parentPort.on('message', (n) => {
  // console.log(`Worker computing fib(${n})...`); // Optional: keep console clean during load test
  const result = fib(n);
  parentPort.postMessage(result);
});