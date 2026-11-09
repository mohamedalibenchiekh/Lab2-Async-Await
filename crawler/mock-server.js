   import http from 'node:http';

   const pages = Number(process.env.PAGES ?? 200);

   http.createServer((req, res) => {
     const n = Number(new URL(req.url, 'http://x').pathname.slice(1)) || 0;
     
     // Generate links to the next two pages, if they are within the total page count
     const links = [n * 2 + 1, n * 2 + 2]
       .filter(x => x < pages)
       .map(x => `<a href="/${x}">p${x}</a>`)
       .join(' ');

     // Simulate 100–300 ms latency
     setTimeout(() => {
       res.writeHead(200, { 'Content-Type': 'text/html' });
       res.end(`<html><body>Page ${n} ${links}</body></html>`);
     }, 100 + Math.random() * 200);
   }).listen(4000, () => console.log('Mock server running on: http://localhost:4000'));