// crawler-naive.js - Task 2: Naive Parallel Crawler


const BASE_URL = 'http://localhost:4000';
const MAX_PAGES = 2000; // 💡 Try changing this to 2000 later to see it break!

async function crawlNaiveParallel() {
    const visited = new Set();
    let queue = [`${BASE_URL}/0`];
    visited.add(`${BASE_URL}/0`);

    let crawledCount = 0;

    console.time('Naive Parallel Crawler Time');

    while (queue.length > 0 && crawledCount < MAX_PAGES) {
        // Take the current batch and fire ALL of them at the exact same time!
        const currentBatch = [...queue];
        queue = []; // Clear queue for the next wave

        // Map each URL to a Promise and fire them ALL simultaneously
        const promises = currentBatch.map(async (url) => {
            try {
                const response = await fetch(url);
                const html = await response.text();
                crawledCount++;

                // Parse links
                const linkRegex = /<a href="\/(\d+)">/g;
                let match;
                while ((match = linkRegex.exec(html)) !== null) {
                    const newPath = `${BASE_URL}/${match[1]}`;
                    if (!visited.has(newPath)) {
                        visited.add(newPath);
                        queue.push(newPath);
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${url}:`, error.message);
            }
        });

        // Wait for the ENTIRE wave to finish before starting the next wave
        await Promise.all(promises);
    }

    console.timeEnd('Naive Parallel Crawler Time');
    console.log(`✅ Crawled ${crawledCount} pages. Total URLs discovered: ${visited.size}`);
}

crawlNaiveParallel();