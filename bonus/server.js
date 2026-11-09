// bonus/server.js
import http from 'node:http';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Event Loop Lag Monitor ---
let last = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint();
  const lagMs = Number(now - last) / 1e6 - 100; // Expected interval is 100ms
  if (lagMs > 20) {
    console.warn(`⚠️ Event-loop lag: ${lagMs.toFixed(0)} ms`);
  }
  last = now;
}, 100);

const server = http.createServer((req, res) => {
  if (req.url === '/cpu') {
    // console.log('🔥 Offloading fib(35) to worker thread...');
    
    // Spawn a worker thread to do the heavy lifting
    const worker = new Worker(join(__dirname, 'worker.js'));
    
    worker.postMessage(35);
    
    worker.on('message', (result) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`fib(35) = ${result} (computed in worker)`);
      worker.terminate(); // Clean up the worker to prevent memory leaks
    });

    worker.on('error', (err) => {
      console.error('Worker error:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
      worker.terminate();
    });
    
    return; // Main thread is NOT blocked!
  }

  // Simulated 50ms I/O call
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }, 50);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Test with: autocannon -c 10000 -d 20 http://localhost:${PORT}/`);
});