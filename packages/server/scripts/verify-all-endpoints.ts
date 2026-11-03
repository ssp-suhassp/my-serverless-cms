import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

interface CheckResult {
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number[];
  passed: boolean;
  durationMs: number;
  sampleBody: string;
}

async function verifyLiveEndpoints() {
  console.log('='.repeat(80));
  console.log('  LIVE ENDPOINTS & HEALTH VERIFICATION (http://127.0.0.1:4000 & :5173)');
  console.log('='.repeat(80));

  const endpoints = [
    // Core Server (Port 4000)
    { url: 'http://127.0.0.1:4000/health', method: 'GET', expected: [200], desc: 'Daemon Health Probe' },
    { url: 'http://127.0.0.1:4000/api/setup/status', method: 'GET', expected: [200], desc: 'Setup Status & Auth Gate' },
    { url: 'http://127.0.0.1:4000/api/setup/config', method: 'GET', expected: [200], desc: 'CMS Config Snapshot' },
    { url: 'http://127.0.0.1:4000/api/auth/user', method: 'GET', expected: [401], desc: 'Unauthenticated User Check (Expect 401)' },
    { url: 'http://127.0.0.1:4000/api/posts', method: 'GET', expected: [200], desc: 'List Posts Collection' },
    { url: 'http://127.0.0.1:4000/api/posts/building-serverless-headless-cms-with-git-and-astro', method: 'GET', expected: [200], desc: 'Fetch Post by Slug' },
    { url: 'http://127.0.0.1:4000/api/pages', method: 'GET', expected: [200], desc: 'List Pages Collection' },
    { url: 'http://127.0.0.1:4000/api/pages/home', method: 'GET', expected: [200], desc: 'Fetch Home Page Data' },
    { url: 'http://127.0.0.1:4000/api/media', method: 'GET', expected: [200], desc: 'Media Gallery Listing' },
    { url: 'http://127.0.0.1:4000/api/git/status', method: 'GET', expected: [200], desc: 'Git Engine Status' },
    { url: 'http://127.0.0.1:4000/api/git/deploy-status', method: 'GET', expected: [200], desc: 'Live Deployment Status Probe' },
    { url: 'http://127.0.0.1:4000/api/git/history', method: 'GET', expected: [200], desc: 'Git Commit History' },

    // Studio Vite Proxy (Port 5173 -> 4000 proxy verification)
    { url: 'http://localhost:5173/api/setup/status', method: 'GET', expected: [200], desc: 'Vite Proxy /api/setup/status' },
    { url: 'http://localhost:5173/api/posts', method: 'GET', expected: [200], desc: 'Vite Proxy /api/posts' },
    { url: 'http://localhost:5173/api/pages/home', method: 'GET', expected: [200], desc: 'Vite Proxy /api/pages/home' },
  ];

  const results: CheckResult[] = [];

  for (const ep of endpoints) {
    const start = performance.now();
    try {
      const res = await fetch(ep.url, { method: ep.method });
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();
      let sample = text;
      try {
        const json = JSON.parse(text);
        sample = JSON.stringify(json);
      } catch {}

      const passed = ep.expected.includes(res.status);
      results.push({
        endpoint: ep.url,
        method: ep.method,
        status: res.status,
        expectedStatus: ep.expected,
        passed,
        durationMs,
        sampleBody: sample.slice(0, 100),
      });

      const tag = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`${tag} ${ep.method} ${ep.url}`);
      console.log(`       Status: HTTP ${res.status} (expected ${ep.expected.join('/')}) in ${durationMs}ms`);
      console.log(`       Desc: ${ep.desc}`);
      console.log(`       Payload: ${sample.slice(0, 90)}${sample.length > 90 ? '...' : ''}\n`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      results.push({
        endpoint: ep.url,
        method: ep.method,
        status: 0,
        expectedStatus: ep.expected,
        passed: false,
        durationMs,
        sampleBody: err.message,
      });
      console.log(`\x1b[31m[FAIL]\x1b[0m ${ep.method} ${ep.url} - Error: ${err.message}\n`);
    }
  }

  // Verify Static JSON API Endpoints
  console.log('-'.repeat(80));
  console.log('  STATIC JSON API ENDPOINTS IN SITE-TEMPLATE DIST');
  console.log('-'.repeat(80));

  const staticFiles = [
    'packages/site-template/dist/api/posts.json',
    'packages/site-template/dist/api/pages/home.json',
    'packages/site-template/dist/api/tags.json',
    'packages/site-template/dist/api/posts/building-serverless-headless-cms-with-git-and-astro.json',
    'packages/site-template/dist/.nojekyll',
  ];

  let staticPassed = 0;
  for (const rel of staticFiles) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      staticPassed++;
      console.log(`\x1b[32m[PASS]\x1b[0m Static file: ${rel} (${fs.statSync(full).size} bytes)`);
    } else {
      console.log(`\x1b[31m[FAIL]\x1b[0m Missing file: ${rel}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  const epPassed = results.filter((r) => r.passed).length;
  console.log(`  VERIFICATION RESULTS:`);
  console.log(`  - Live Endpoints: ${epPassed}/${results.length} PASSED`);
  console.log(`  - Static Dist Files: ${staticPassed}/${staticFiles.length} PASSED`);
  console.log('='.repeat(80));

  if (epPassed === results.length && staticPassed === staticFiles.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyLiveEndpoints().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
