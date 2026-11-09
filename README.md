# Lab 2 — Async/Await & Promise-Based Programming

[![CI/CD Pipeline](https://github.com/mohamedalibenchiekh/Lab2-Async-Await/actions/workflows/ci.yml/badge.svg)](https://github.com/mohamedalibenchiekh/Lab2-Async-Await/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Student:** Mohamed Ali Ben Chiekh  
**Course:** RCAP-401 (Programmation réactive et concurrente)  
**Teacher:** Mohamed Amine Marzouk

## 📋 Overview

This repository contains my solutions for Lab 2, focusing on async/await patterns, promise-based programming, and event-loop mechanics in Node.js.

##  Project Structure

```
Lab2-Async-Await/
├── .github/workflows/
│   └── ci.yml                 # CI/CD pipeline
├── crawler/                   # Exercise 2: Async Web Crawler
│   ├── mock-server.js         # Local test server
│   ├── crawler.js             # Sequential crawler
│   ├── crawler-naive.js       # Naive parallel crawler
│   └── crawler-bounded.js     # Bounded concurrency crawler
├── api-client/                # Exercise 3: Resilient API Client
│   ├── rate-limiter.js        # Token bucket implementation
│   ├── client.js              # Resilient API client
│   └── tests/
│       └── client.test.js     # Fake-clock tests
├── bonus/                     # Bonus: 10k Requests & Loop Lag
│   ├── server.js              # HTTP server with /cpu endpoint
│   └── worker.js              # Worker thread for CPU tasks
└── REPORT.md                  # Timing tables, diagrams, reflections
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Install crawler dependencies
cd crawler
npm install

# Install API client dependencies
cd ../api-client
npm install

# Install bonus dependencies
cd ../bonus
npm install
```

### Running Tests

```bash
# Run API client tests with fake clock
cd api-client
npm test
```

### Running the Crawler

```bash
# Start mock server (Terminal 1)
cd crawler
node mock-server.js

# Run bounded crawler (Terminal 2)
cd crawler
node crawler-bounded.js 10  # concurrency N=10
```

### Running Load Tests (Bonus)

```bash
# Start server (Terminal 1)
cd bonus
node server.js

# Run load test (Terminal 2)
npx autocannon -c 10000 -d 20 http://localhost:3000/
```

## 📊 Key Results

### Crawler Performance (2000 pages)
| Concurrency | Time | Speedup |
|------------|------|---------|
| N=1 (Sequential) | ~401s | 1x |
| N=10 | ~41s | ~10x |
| N=50 | ~9.1s | ~44x |

### API Client
- ✅ Token bucket rate limiter (10 req/s)
- ✅ Exponential backoff with full jitter
- ✅ Cancellation support via AbortSignal
- ✅ Deterministic fake-clock tests

### Bonus: Event-Loop Lag
- **Before (sync fib):** p99=343ms, Max=11,233ms
- **After (worker thread):** p99=262ms, Max=10,641ms

## 🎓 Learning Objectives Completed

- ✅ Predict and verify event-loop execution order
- ✅ Build async web crawler with bounded concurrency
- ✅ Build resilient API client (timeouts, retries, cancellation)
- ✅ Implement async rate limiter (token bucket)
- ✅ Measure event-loop lag and recognize loop blocking

##  Report

See [REPORT.md](REPORT.md) for:
- Detailed timing tables
- Mermaid sequence diagrams
- Reflection answers

## 🔧 CI/CD Pipeline

This project uses GitHub Actions to:
- Run tests on Node.js 20 and 22
- Validate code syntax
- Check project structure
- Audit dependencies for security vulnerabilities

## 📝 License

MIT License - Educational project for RCAP-401 course
