import { buildServer } from '../src/index';
import { PATHS } from '../src/config';
import { resolvePagesUrlAndBasePath } from '../src/services/github';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

function extractCredentialsFromEnvTest(): { token?: string; owner?: string } {
  const envTestPath = path.join(PATHS.root, 'References', '.env-test');
  if (!fs.existsSync(envTestPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(envTestPath, 'utf-8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let token: string | undefined;
    let owner: string | undefined;
    for (const line of lines) {
      if (/^(gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/.test(line)) {
        token = line;
      } else if (line.includes('github.com/')) {
        const match = line.match(/github\.com\/([a-zA-Z0-9_-]+)/);
        if (match) owner = match[1];
      } else if (line.startsWith('GITHUB_TOKEN=') || line.startsWith('GITHUB_PAT=')) {
        token = line.split('=')[1]?.trim();
      } else if (line.startsWith('REPO_OWNER=')) {
        owner = line.split('=')[1]?.trim();
      }
    }
    return { token, owner };
  } catch {
    return {};
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runE2ESuite() {
  console.log('='.repeat(75));
  console.log('  RUNNING PHASE 5 FULL END-TO-END INTEGRATION TEST SUITE');
  console.log('='.repeat(75));

  const server = await buildServer();
  const testPort = 4002;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  try {
    await server.listen({ port: testPort, host: '127.0.0.1' });
    console.log(`[Test Daemon] Started on ${baseUrl}\n`);

    // ---------------------------------------------------------
    // 1. Health Probe
    // ---------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();
      const passed = res.status === 200 && data.status === 'ok' && data.service === 'cms-server';
      record('1. Server health probe', passed, `HTTP ${res.status} service: ${data.service}`);
    } catch (err: any) {
      record('1. Server health probe', false, err.message);
    }

    // ---------------------------------------------------------
    // 2. GitHub Authentication & Onboarding Gate Verification
    // ---------------------------------------------------------
    try {
      const { token } = extractCredentialsFromEnvTest();
      if (!token) {
        record('2. GitHub PAT authentication & onboarding gate', false, 'Missing token in References/.env-test');
      } else {
        const res = await fetch(`${baseUrl}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        const verifyOk = res.status === 200 && data.success && !!data.user?.login;

        const setupRes = await fetch(`${baseUrl}/api/setup/status`);
        const setupData = await setupRes.json();
        const setupOk =
          setupRes.status === 200 &&
          typeof setupData.authenticated === 'boolean' &&
          typeof setupData.configured === 'boolean' &&
          setupData.config !== undefined;

        const passed = verifyOk && setupOk;
        record(
          '2. GitHub PAT authentication & onboarding gate',
          passed,
          passed
            ? `Verified identity: @${data.user.login}, Setup Gate: auth=${setupData.authenticated}, configured=${setupData.configured}`
            : `Auth failure: ${JSON.stringify(data)}`
        );
      }
    } catch (err: any) {
      record('2. GitHub PAT authentication & onboarding gate', false, err.message);
    }

    // ---------------------------------------------------------
    // 3. Post Frontmatter Validation Engine (Zod Negative Test)
    // ---------------------------------------------------------
    try {
      const invalidPost = {
        frontmatter: {
          title: 'X', // violates min(3)
          slug: 'INVALID SLUG WITH SPACES & UPPERCASE', // violates regex
          date: 'not-a-date', // violates YYYY-MM-DD
        },
        body: 'Malformed test body',
      };

      const res = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPost),
      });
      const data = await res.json();
      const passed =
        res.status === 400 &&
        data.error === 'Validation failed' &&
        Array.isArray(data.issues) &&
        data.issues.length >= 3;

      record(
        '3. Post validation engine (Zod rejects malformed frontmatter)',
        passed,
        `Rejected with HTTP 400 and ${data.issues?.length || 0} validation issue(s)`
      );
    } catch (err: any) {
      record('3. Post validation engine (Zod rejects malformed frontmatter)', false, err.message);
    }

    // ---------------------------------------------------------
    // 4. Post CRUD Lifecycle (Create, Read, Update, Delete)
    // ---------------------------------------------------------
    const testPostSlug = 'e2e-automated-test-article';
    try {
      const newPost = {
        frontmatter: {
          title: 'Automated E2E Integration Article',
          slug: testPostSlug,
          date: '2026-11-03',
          author: 'Autonomous Principal Engineer',
          excerpt: 'Comprehensive validation of local content authoring and serialization.',
          tags: ['e2e', 'automation', 'test'],
          draft: true,
        },
        body: '## E2E Post Content\n\nThis is an automated test post to verify end-to-end CRUD operations.',
      };

      // Create
      const createRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
      const createData = await createRes.json();
      const createOk = createRes.status === 200 && createData.success;

      // Read back
      const readRes = await fetch(`${baseUrl}/api/posts/${testPostSlug}`);
      const readData = await readRes.json();
      const readOk =
        readRes.status === 200 &&
        readData.slug === testPostSlug &&
        readData.frontmatter.title === newPost.frontmatter.title &&
        readData.body.includes('E2E Post Content');

      // Update
      const updatedPost = {
        frontmatter: {
          ...newPost.frontmatter,
          title: 'Automated E2E Integration Article (Updated)',
          draft: false,
        },
        body: '## E2E Post Content\n\nUpdated markdown content verifying PUT persistence.',
      };
      const updateRes = await fetch(`${baseUrl}/api/posts/${testPostSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      });
      const updateData = await updateRes.json();
      const updateOk =
        updateRes.status === 200 &&
        updateData.success &&
        updateData.post?.frontmatter?.title === updatedPost.frontmatter.title;

      // Verify file on disk
      const filePath = path.join(PATHS.posts, `${testPostSlug}.md`);
      const fileExistsOnDisk = fs.existsSync(filePath);

      // Delete
      const deleteRes = await fetch(`${baseUrl}/api/posts/${testPostSlug}`, {
        method: 'DELETE',
      });
      const deleteData = await deleteRes.json();
      const deleteOk = deleteRes.status === 200 && deleteData.success;
      const fileRemovedFromDisk = !fs.existsSync(filePath);

      const passed =
        createOk && readOk && updateOk && fileExistsOnDisk && deleteOk && fileRemovedFromDisk;
      record(
        '4. Post CRUD lifecycle (Create, Read, Update, Delete & disk sync)',
        passed,
        `Create: ${createRes.status}, Read: ${readRes.status}, Update: ${updateRes.status}, Delete: ${deleteRes.status}`
      );
    } catch (err: any) {
      record('4. Post CRUD lifecycle (Create, Read, Update, Delete & disk sync)', false, err.message);
    }

    // ---------------------------------------------------------
    // 5. Page Block Schema Engine (Zod Discriminated Union & CRUD)
    // ---------------------------------------------------------
    const testPageSlug = 'e2e-showcase-landing';
    try {
      // Negative test: invalid block
      const invalidPage = {
        title: 'Invalid Page',
        slug: 'invalid-page',
        description: 'Should fail validation',
        updatedAt: '2026-11-03',
        blocks: [
          {
            id: randomUUID(),
            type: 'unknown_block_type', // Invalid type
          },
        ],
      };
      const rejectRes = await fetch(`${baseUrl}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPage),
      });
      const rejectData = await rejectRes.json();
      const negativePassed = rejectRes.status === 400 && rejectData.error === 'Validation failed';

      // Positive test: valid page with all 4 block types
      const validPage = {
        title: 'E2E Showcase Landing',
        slug: testPageSlug,
        description: 'Verifying discriminated union page blocks',
        updatedAt: '2026-11-03',
        blocks: [
          {
            id: randomUUID(),
            type: 'hero',
            heading: 'Serverless Git-Backed CMS',
            subheading: 'Blazing fast static generation with local authoring.',
            ctaText: 'Get Started',
            ctaLink: '/docs',
            alignment: 'center',
          },
          {
            id: randomUUID(),
            type: 'features',
            title: 'Core Architecture',
            items: [
              { icon: 'Shield', title: 'Zero Secrets', description: 'Zero secrets stored in cloud databases.' },
              { icon: 'Zap', title: 'Static JSON API', description: 'Deliver blazing fast responses from edge CDN.' },
            ],
          },
          {
            id: randomUUID(),
            type: 'richtext',
            markdown: '### Deep Dive\n\nExperience true developer autonomy with Git-backed storage.',
          },
          {
            id: randomUUID(),
            type: 'cta',
            heading: 'Deploy Today',
            buttonText: 'Start Building',
            buttonUrl: 'https://github.com',
          },
        ],
      };

      // Create page
      const createRes = await fetch(`${baseUrl}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPage),
      });
      const createData = await createRes.json();
      const createOk = createRes.status === 200 && createData.success;

      // Read back
      const readRes = await fetch(`${baseUrl}/api/pages/${testPageSlug}`);
      const readData = await readRes.json();
      const readOk =
        readRes.status === 200 &&
        readData.slug === testPageSlug &&
        Array.isArray(readData.blocks) &&
        readData.blocks.length === 4;

      // Clean up test page
      const deleteRes = await fetch(`${baseUrl}/api/pages/${testPageSlug}`, {
        method: 'DELETE',
      });
      const deleteData = await deleteRes.json();
      const deleteOk = deleteRes.status === 200 && deleteData.success;

      // Verify home page protection
      const homeDelRes = await fetch(`${baseUrl}/api/pages/home`, {
        method: 'DELETE',
      });
      const homeProtected = homeDelRes.status === 400;

      const passed = negativePassed && createOk && readOk && deleteOk && homeProtected;
      record(
        '5. Page block schema engine & safety guards',
        passed,
        `Rejection: ${rejectRes.status}, Create: ${createRes.status}, Read: 4 blocks, Home protected: ${homeProtected}`
      );
    } catch (err: any) {
      record('5. Page block schema engine & safety guards', false, err.message);
    }

    // ---------------------------------------------------------
    // 6. Media Pipeline & Orphan Asset Cleanup
    // ---------------------------------------------------------
    try {
      // Create synthetic PNG
      const syntheticPng = await sharp({
        create: {
          width: 320,
          height: 240,
          channels: 4,
          background: { r: 16, g: 185, b: 129, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([syntheticPng], { type: 'image/png' }),
        'e2e-synthetic-orphan.png'
      );

      // Upload
      const uploadRes = await fetch(`${baseUrl}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const uploadedFilename = uploadData.media?.filename;
      const uploadOk =
        uploadRes.status === 200 &&
        uploadData.success &&
        uploadData.media?.format === 'webp' &&
        !!uploadedFilename;

      // Check existence
      const mediaOnDisk =
        uploadedFilename && fs.existsSync(path.join(PATHS.uploads, uploadedFilename));

      // Check media listing
      const listRes = await fetch(`${baseUrl}/api/media`);
      const listData = await listRes.json();
      const listed =
        listRes.status === 200 &&
        Array.isArray(listData.files) &&
        listData.files.some((f: any) => f.filename === uploadedFilename);

      // Trigger orphan cleanup: since no post or page references this file, it must be removed
      const cleanupRes = await fetch(`${baseUrl}/api/media/cleanup-orphans`, {
        method: 'POST',
      });
      const cleanupData = await cleanupRes.json();
      const cleanupOk =
        cleanupRes.status === 200 &&
        cleanupData.success &&
        cleanupData.removedCount >= 1 &&
        cleanupData.removedFiles?.includes(uploadedFilename);

      // Verify file is gone from disk
      const removedFromDisk =
        uploadedFilename && !fs.existsSync(path.join(PATHS.uploads, uploadedFilename));

      const passed = uploadOk && mediaOnDisk && listed && cleanupOk && removedFromDisk;
      record(
        '6. Media optimization & orphan asset cleanup pipeline',
        passed,
        `Transcoded to WebP, listed in gallery, detected as orphan & deleted (removed: ${cleanupData.removedCount || 0})`
      );
    } catch (err: any) {
      record('6. Media optimization & orphan asset cleanup pipeline', false, err.message);
    }

    // ---------------------------------------------------------
    // 7. Git Engine Status & Deployment Monitor Probe
    // ---------------------------------------------------------
    try {
      const gitRes = await fetch(`${baseUrl}/api/git/status`);
      const gitData = await gitRes.json();
      const gitOk =
        gitRes.status === 200 &&
        typeof gitData.branch === 'string' &&
        typeof gitData.isClean === 'boolean' &&
        typeof gitData.suggestedMessage === 'string';

      const deployRes = await fetch(`${baseUrl}/api/git/deploy-status`);
      const deployData = await deployRes.json();
      const deployOk =
        deployRes.status === 200 &&
        typeof deployData.totalRuns === 'number';

      const passed = gitOk && deployOk;
      record(
        '7. Git engine status & suggested commit probe',
        passed,
        `Branch: '${gitData.branch}', Clean: ${gitData.isClean}, Suggested: "${gitData.suggestedMessage}"`
      );
    } catch (err: any) {
      record('7. Git engine status & suggested commit probe', false, err.message);
    }

    // ---------------------------------------------------------
    // 8. Self-Matching Intelligent Commit Generator Engine
    // ---------------------------------------------------------
    try {
      const { detectContextualCommitMessage } = await import('../src/services/git');
      const postMsg = detectContextualCommitMessage(['packages/site-template/src/content/posts/sample.md']);
      const pageMsg = detectContextualCommitMessage(['packages/site-template/src/content/pages/home.json']);
      const mediaMsg = detectContextualCommitMessage(['packages/site-template/public/uploads/cover.webp']);

      const passed =
        postMsg.includes('(post):') &&
        pageMsg === 'layout(pages): update "home" blocks' &&
        mediaMsg.includes('asset(media): upload cover.webp');

      record(
        '8. Self-matching intelligent commit generator engine',
        passed,
        `Post: "${postMsg}", Page: "${pageMsg}", Media: "${mediaMsg}"`
      );
    } catch (err: any) {
      record('8. Self-matching intelligent commit generator engine', false, err.message);
    }

    // ---------------------------------------------------------
    // 9. Git Commit History Probe (GET /api/git/history)
    // ---------------------------------------------------------
    try {
      const historyRes = await fetch(`${baseUrl}/api/git/history`);
      const historyData = await historyRes.json();
      const passed =
        historyRes.status === 200 &&
        Array.isArray(historyData.commits) &&
        historyData.commits.length > 0 &&
        typeof historyData.commits[0].hash === 'string' &&
        typeof historyData.commits[0].shortHash === 'string';

      record(
        '9. Git commit timeline history probe',
        passed,
        `Retrieved ${historyData.commits?.length || 0} commits, latest: [${historyData.commits?.[0]?.shortHash || 'n/a'}]`
      );
    } catch (err: any) {
      record('9. Git commit timeline history probe', false, err.message);
    }

    // ---------------------------------------------------------
    // 10. Static Site Template & Headless JSON API Verification
    // ---------------------------------------------------------
    try {
      const distDir = path.resolve(__dirname, '../../site-template/dist');
      const postsJsonPath = path.join(distDir, 'api/posts.json');
      const homeJsonPath = path.join(distDir, 'api/pages/home.json');
      const tagsJsonPath = path.join(distDir, 'api/tags.json');
      const indexHtmlPath = path.join(distDir, 'index.html');

      // If distDir does not exist yet or we want a fresh verification build:
      if (!fs.existsSync(postsJsonPath) || !fs.existsSync(indexHtmlPath)) {
        console.log('   Building @cms/site-template to verify SSG & JSON API output...');
        execSync('npm run build -w @cms/site-template', { stdio: 'pipe' });
      }

      const hasIndexHtml = fs.existsSync(indexHtmlPath);
      const hasPostsJson = fs.existsSync(postsJsonPath);
      const hasHomeJson = fs.existsSync(homeJsonPath);
      const hasTagsJson = fs.existsSync(tagsJsonPath);

      let parsedPostsData: any = {};
      let parsedHome: any = {};
      let parsedTagsData: any = {};

      if (hasPostsJson) {
        parsedPostsData = JSON.parse(fs.readFileSync(postsJsonPath, 'utf-8'));
      }
      if (hasHomeJson) {
        parsedHome = JSON.parse(fs.readFileSync(homeJsonPath, 'utf-8'));
      }
      if (hasTagsJson) {
        parsedTagsData = JSON.parse(fs.readFileSync(tagsJsonPath, 'utf-8'));
      }

      const passed =
        hasIndexHtml &&
        hasPostsJson &&
        Array.isArray(parsedPostsData.posts) &&
        hasHomeJson &&
        parsedHome.slug === 'home' &&
        Array.isArray(parsedHome.blocks) &&
        hasTagsJson &&
        Array.isArray(parsedTagsData.tags);

      record(
        '10. Astro Headless JSON API & static site build verification',
        passed,
        `API outputs: posts.json (${parsedPostsData.posts?.length || 0} posts), home.json (${parsedHome.blocks?.length || 0} blocks), tags.json (${parsedTagsData.tags?.length || 0} tags)`
      );
    } catch (err: any) {
      record('10. Astro Headless JSON API & static site build verification', false, err.message);
    }

    // ---------------------------------------------------------
    // 11. React Studio Production Build Verification
    // ---------------------------------------------------------
    try {
      const studioDistHtml = path.resolve(__dirname, '../../studio/dist/index.html');
      if (!fs.existsSync(studioDistHtml)) {
        console.log('   Building @cms/studio to verify Vite production bundle...');
        execSync('npm run build -w @cms/studio', { stdio: 'pipe' });
      }

      const studioHtmlContent = fs.existsSync(studioDistHtml)
        ? fs.readFileSync(studioDistHtml, 'utf-8')
        : '';
      const passed = fs.existsSync(studioDistHtml) && studioHtmlContent.includes('<div id="root">');

      record(
        '11. React CMS Studio production build bundle verification',
        passed,
        `Studio dist/index.html verified (${studioHtmlContent.length} bytes)`
      );
    } catch (err: any) {
      record('11. React CMS Studio production build bundle verification', false, err.message);
    }

    // ---------------------------------------------------------
    // 12. GitHub Pages (github.io) URL, BasePath & .nojekyll Verification
    // ---------------------------------------------------------
    try {
      const projectSite = resolvePagesUrlAndBasePath('owner', 'my-blog');
      const userSite = resolvePagesUrlAndBasePath('owner', 'owner.github.io');

      const projectOk =
        projectSite.isUserSite === false &&
        projectSite.basePath === '/my-blog' &&
        projectSite.pagesUrl === 'https://owner.github.io/my-blog/';

      const userOk =
        userSite.isUserSite === true &&
        userSite.basePath === '/' &&
        userSite.pagesUrl === 'https://owner.github.io/';

      const publicNoJekyll = path.join(PATHS.root, 'packages/site-template/public/.nojekyll');
      const distNoJekyll = path.join(PATHS.root, 'packages/site-template/dist/.nojekyll');

      const noJekyllOk = fs.existsSync(publicNoJekyll) || fs.existsSync(distNoJekyll);
      const passed = projectOk && userOk && noJekyllOk;

      record(
        '12. GitHub Pages (github.io) URL derivation & .nojekyll asset guard',
        passed,
        `Project: ${projectSite.pagesUrl} (${projectSite.basePath}), User: ${userSite.pagesUrl} (${userSite.basePath}), .nojekyll: verified`
      );
    } catch (err: any) {
      record('12. GitHub Pages (github.io) URL derivation & .nojekyll asset guard', false, err.message);
    }
  } finally {
    await server.close();
    if (fs.existsSync(PATHS.config)) {
      try {
        fs.unlinkSync(PATHS.config);
      } catch {}
    }
    console.log('\n[Test Daemon] Shut down cleanly. Cleaned up .cms-config.json.');
  }

  console.log('\n' + '='.repeat(75));
  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log(`  ALL E2E INTEGRATION TESTS PASSED: ${results.length}/${results.length} VERIFIED`);
    console.log('='.repeat(75));
    process.exit(0);
  } else {
    const failedCount = results.filter((r) => !r.passed).length;
    console.error(`  E2E TEST FAILURES: ${failedCount} of ${results.length} checks failed.`);
    console.log('='.repeat(75));
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error('Fatal error during E2E test execution:', err);
  process.exit(1);
});
