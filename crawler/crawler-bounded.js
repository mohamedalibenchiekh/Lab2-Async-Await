// crawler-bounded.js - Task 3: Bounded Crawler (Worker Pool)

// With this (Node 20+ has global fetch):
// No import needed - fetch is global in Node 20+

const BASE_URL = 'http://localhost:4000';
const MAX_PAGES = 2000; // Test with 2000 to compare with naive!

const visited = new Set();
const queue = [];
let active = 0;
let crawledCount = 0;
let errorCount = 0;

async function crawl(seed, maxDepth, concurrency) {
  queue.push({ url: seed, depth: 0 });
  visited.add(seed);

  async function worker() {
    while (true) {
      // 1. Get next item from queue
      const item = queue.shift();
      
      // 2. If queue is empty and no workers are active, we are done
      if (!item) {
        if (active === 0) return; 
        // Otherwise, wait a tiny bit and check again (simple busy-wait)
        await new Promise(r => setTimeout(r, 10));
        continue;
      }

      active++;

      try {
        // 3. Fetch with a 2-second timeout (Lab Hint: AbortSignal.timeout)
        const response = await fetch(item.url, { 
          signal: AbortSignal.timeout(2000) 
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        crawledCount++;

        // 4. Parse links and enqueue if depth allows
        if (item.depth < maxDepth) {
          const linkRegex = /<a href="\/(\d+)">/g;
          let match;
          while ((match = linkRegex.exec(html)) !== null) {
            const newPath = `${BASE_URL}/${match[1]}`;
            // Thread-safe in JS: this check-and-add is synchronous!
            if (!visited.has(newPath) && crawledCount + queue.length < MAX_PAGES) {
              visited.add(newPath);
              queue.push({ url: newPath, depth: item.depth + 1 });
            }
          }
        }
      } catch (e) {
        // 5. Error isolation: record error but keep crawling
        errorCount++;
        // console.warn(`Failed ${item.url}: ${e.message}`);
      } finally {
        active--;
      }
    }
  }

  // Start exactly 'concurrency' number of workers
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

// --- Run and Measure ---
// Reads N from the command line, defaults to 10 if not provided
const concurrencyToTest = Number(process.argv[2] || 10); 

console.log(`Starting bounded crawler with concurrency N=${concurrencyToTest}...`);
console.time(`Bounded Crawler (N=${concurrencyToTest})`);

await crawl(`${BASE_URL}/0`, 10, concurrencyToTest); // depth 10 is plenty for 2000 pages

console.timeEnd(`Bounded Crawler (N=${concurrencyToTest})`);
console.log(`✅ Crawled: ${crawledCount} | Errors: ${errorCount} | Total Discovered: ${visited.size}`);