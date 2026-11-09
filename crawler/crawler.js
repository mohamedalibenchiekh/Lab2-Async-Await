// crawler.js - Task 1: Sequential Crawler
 // Node 20+ has global fetch, but undici is reliable

const BASE_URL = 'http://localhost:4000';
const MAX_PAGES = 200;

async function crawlSequential() {
  const visited = new Set();
  const queue = [`${BASE_URL}/0`];
  visited.add(`${BASE_URL}/0`);
  
  let crawledCount = 0;
  
  console.time('Sequential Crawler Time');
  
  // The "bad" way: for...of with await processes one URL at a time
  for (let i = 0; i < queue.length && crawledCount < MAX_PAGES; i++) {
    const url = queue[i];
    
    try {
      // 1. Fetch the page (waits here before moving to the next iteration)
      const response = await fetch(url);
      const html = await response.text();
      crawledCount++;
      
      // 2. Parse links (regex matches the mock server's format: <a href="/123">)
      const linkRegex = /<a href="\/(\d+)">/g;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const newPath = `${BASE_URL}/${match[1]}`;
        // 3. Add to queue if not already visited
        if (!visited.has(newPath)) {
          visited.add(newPath);
          queue.push(newPath);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
    }
  }
  
  console.timeEnd('Sequential Crawler Time');
  console.log(`✅ Crawled ${crawledCount} pages. Total URLs discovered: ${queue.length}`);
}

crawlSequential();