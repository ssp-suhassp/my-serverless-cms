import { buildServer } from '../src/index';
import { extractCredentialsFromEnvTest, PATHS } from '../src/config';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

interface TestStepResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestStepResult[] = [];

function record(step: string, passed: boolean, details?: string) {
  results.push({ step, passed, details });
  const status = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${status} ${step}${details ? ` - ${details}` : ''}`);
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('  RUNNING PHASE 2 AUTOMATED TEST SUITE: @cms/server');
  console.log('='.repeat(70));

  const server = await buildServer();
  const testPort = 4001;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  try {
    await server.listen({ port: testPort, host: '127.0.0.1' });
    console.log(`[Test Daemon] Started on ${baseUrl}\n`);

    // 1. Health Check
    try {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();
      const passed = res.status === 200 && data.status === 'ok' && data.service === 'cms-server';
      record('1. Server boot and health probe', passed, `HTTP ${res.status}`);
    } catch (err: any) {
      record('1. Server boot and health probe', false, err.message);
    }

    // 2. Authentication with PAT
    try {
      const { token } = extractCredentialsFromEnvTest();
      if (!token) {
        record('2. GitHub PAT authentication', false, 'No token in References/.env-test');
      } else {
        const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const verifyData = await verifyRes.json();
        const passed = verifyRes.status === 200 && verifyData.success && verifyData.user?.login;
        record(
          '2. GitHub PAT authentication',
          passed,
          passed ? `Authenticated as: @${verifyData.user.login}` : `Error: ${JSON.stringify(verifyData)}`
        );
      }
    } catch (err: any) {
      record('2. GitHub PAT authentication', false, err.message);
    }

    // 3. Schema Rejection on Malformed Frontmatter
    try {
      const invalidPost = {
        frontmatter: {
          title: 'Hi', // min 3 required
          slug: 'INVALID SLUG WITH SPACES', // lowercase alphanumeric regex required
          date: 'invalid-date-format', // YYYY-MM-DD required
        },
      };

      const rejectRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPost),
      });

      const rejectData = await rejectRes.json();
      const passed =
        rejectRes.status === 400 &&
        rejectData.error === 'Validation failed' &&
        Array.isArray(rejectData.issues) &&
        rejectData.issues.length >= 2;

      record(
        '3. Schema rejection on malformed post frontmatter',
        passed,
        `HTTP 400 received with ${rejectData.issues?.length || 0} validation issue(s)`
      );
    } catch (err: any) {
      record('3. Schema rejection on malformed post frontmatter', false, err.message);
    }

    // 4. Create, Read, and Delete Post with Valid Frontmatter
    const testPostSlug = 'automated-test-phase2-post';
    try {
      const validPost = {
        frontmatter: {
          title: 'Automated Test Post for Phase 2',
          slug: testPostSlug,
          date: '2026-11-03',
          author: 'Systems Engineer',
          excerpt: 'Verifying end-to-end CRUD operations and Zod schema serialization.',
          tags: ['testing', 'phase-2', 'fastify'],
          draft: false,
        },
        body: '## Phase 2 Verification\n\nThis content is generated during automated integration testing.',
      };

      // Create
      const createRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPost),
      });
      const createData = await createRes.json();
      const createOk = createRes.status === 200 && createData.success;

      // Read back
      const readRes = await fetch(`${baseUrl}/api/posts/${testPostSlug}`);
      const readData = await readRes.json();
      const readOk =
        readRes.status === 200 &&
        readData.slug === testPostSlug &&
        readData.frontmatter.title === validPost.frontmatter.title &&
        readData.body.includes('Phase 2 Verification');

      // Delete test post
      const delRes = await fetch(`${baseUrl}/api/posts/${testPostSlug}`, {
        method: 'DELETE',
      });
      const delData = await delRes.json();
      const delOk = delRes.status === 200 && delData.success;

      const allOk = createOk && readOk && delOk;
      record(
        '4. Content CRUD lifecycle (Create, Read, Delete post)',
        allOk,
        `Create: ${createRes.status}, Read: ${readRes.status}, Delete: ${delRes.status}`
      );
    } catch (err: any) {
      record('4. Content CRUD lifecycle (Create, Read, Delete post)', false, err.message);
    }

    // 5. Landing Page Retrieval & Verification
    try {
      const pageRes = await fetch(`${baseUrl}/api/pages/home`);
      const pageData = await pageRes.json();
      const passed =
        pageRes.status === 200 &&
        pageData.slug === 'home' &&
        Array.isArray(pageData.blocks) &&
        pageData.blocks.length > 0;
      record(
        '5. Landing page schema retrieval (home.json block tree)',
        passed,
        `Retrieved ${pageData.blocks?.length || 0} blocks`
      );
    } catch (err: any) {
      record('5. Landing page schema retrieval (home.json block tree)', false, err.message);
    }

    // 6. Media Optimization Pipeline via Sharp
    let uploadedMediaFilename: string | undefined;
    try {
      const syntheticPng = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 4,
          background: { r: 99, g: 102, b: 241, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([syntheticPng], { type: 'image/png' }),
        'benchmark-diagram.png'
      );

      const uploadRes = await fetch(`${baseUrl}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      uploadedMediaFilename = uploadData.media?.filename;

      const fileExists =
        uploadedMediaFilename &&
        fs.existsSync(path.join(PATHS.uploads, uploadedMediaFilename));

      const passed =
        uploadRes.status === 200 &&
        uploadData.success &&
        uploadData.media?.format === 'webp' &&
        fileExists;

      record(
        '6. Media transcoding pipeline (Sharp PNG -> WebP)',
        passed,
        `Transcoded to: ${uploadedMediaFilename} (${uploadData.media?.width}x${uploadData.media?.height} WebP)`
      );

      // Clean up uploaded test media
      if (uploadedMediaFilename) {
        await fetch(`${baseUrl}/api/media/${uploadedMediaFilename}`, {
          method: 'DELETE',
        });
      }
    } catch (err: any) {
      record('6. Media transcoding pipeline (Sharp PNG -> WebP)', false, err.message);
    }

    // 7. Git Status Engine Probe
    try {
      const gitRes = await fetch(`${baseUrl}/api/git/status`);
      const gitData = await gitRes.json();
      const passed =
        gitRes.status === 200 &&
        typeof gitData.isClean === 'boolean' &&
        typeof gitData.branch === 'string';

      record(
        '7. Git engine status probe',
        passed,
        `Branch: ${gitData.branch}, Clean: ${gitData.isClean}, Staged: ${gitData.staged?.length || 0}`
      );
    } catch (err: any) {
      record('7. Git engine status probe', false, err.message);
    }
  } finally {
    await server.close();
    console.log('\n[Test Daemon] Shut down cleanly.');
  }

  console.log('\n' + '='.repeat(70));
  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log(`  PHASE 2 VALIDATION SUCCESSFUL: ${results.length}/${results.length} TESTS PASSED`);
    console.log('='.repeat(70));
    process.exit(0);
  } else {
    const failedCount = results.filter((r) => !r.passed).length;
    console.error(`  PHASE 2 VALIDATION FAILED: ${failedCount} FAILURES DETECTED`);
    console.log('='.repeat(70));
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

