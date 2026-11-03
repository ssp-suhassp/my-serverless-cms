# Local-First, Git-Backed Headless CMS

> An enterprise-grade, serverless content management platform pairing local-first authoring with Git version control, GitHub Actions CI/CD automation, and GitHub Pages static JSON API delivery at zero infrastructure cost.

---

## Academic & Engineering Credits

- **Course:** Software Engineering & Project Management (V Semester)
- **Project Team:**
  - **Suhas SP**
  - **Tanush M Turamari**
  - **Tejas HV**
  - **Vishnu MS**

---

## 1. System Architecture

The platform separates the **Authoring Experience** (running locally on `localhost` with zero cloud credentials or exposed databases) from the **Production Edge** (deployed globally across GitHub's CDN with static HTML and static REST JSON APIs).

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     LOCAL AUTHORING ENVIRONMENT                        │
 │                                                                        │
 │  ┌─────────────────────────┐          ┌─────────────────────────────┐  │
 │  │      @cms/studio        │  REST    │         @cms/server         │  │
 │  │   React 18 + Vite       │ ───────> │     Fastify 5 Daemon        │  │
 │  │   (Port 5173)           │ <─────── │     (Port 4000)             │  │
 │  │                         │          │                             │  │
 │  │  • Split-Pane Editor    │          │  • Content CRUD Service     │  │
 │  │  • Tiptap WYSIWYG       │          │  • Zod Schema Validator     │  │
 │  │  • Visual Block Builder │          │  • Sharp WebP Transcoder    │  │
 │  │  • Live Astro Preview   │          │  • Simple-Git Engine        │  │
 │  │  • 1-Click Rollback     │          │  • GitHub Device Flow Auth  │  │
 │  └─────────────────────────┘          └──────────────┬──────────────┘  │
 └──────────────────────────────────────────────────────┼─────────────────┘
                                                        │
                                   git push origin main │ (via authenticated PAT)
                                                        ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    GITHUB CLOUD INFRASTRUCTURE                         │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │  GitHub Repository (main branch)                                 │  │
 │  │  • packages/site-template/src/content/posts/*.md                 │  │
 │  │  • packages/site-template/src/content/pages/*.json                │  │
 │  │  • packages/site-template/public/uploads/*.webp                  │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     │                                  │
 │                                     ▼ Triggers .github/workflows/deploy.yml
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │  GitHub Actions CI/CD Runner (ubuntu-latest)                     │  │
 │  │  1. Node.js 20 Setup & Workspace Dependencies Cache             │  │
 │  │  2. Build @cms/shared & @cms/site-template (Astro 5 SSG)        │  │
 │  │  3. Emit dist/ (Static HTML + dist/api/*.json)                   │  │
 │  │  4. Deploy to GitHub Pages                                       │  │
 │  └──────────────────────────────────┬───────────────────────────────┘  │
 │                                     │                                  │
 │                                     ▼ Global Edge Delivery             │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │  GitHub Pages Edge CDN (https://<owner>.github.io/<repo>/)       │  │
 │  │  • Static Responsive Site (Landing Pages, Blog Post Viewers)     │  │
 │  │  • Static Headless REST JSON API (/api/posts.json, etc.)         │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Features & Engineering Highlights

| Feature | Description |
|---|---|
| **Zero-Database Git Storage** | Articles are stored as standard Markdown with YAML frontmatter (`.md`), and landing pages are stored as JSON block trees (`.json`). All content revisions are committed directly into Git history. |
| **Strict Zod Validation Gate** | Enforced across both client and server via `@cms/shared`. Any frontmatter violation (e.g. malformed slugs, dates, titles) is caught and rejected with HTTP 400 before touching the filesystem. |
| **1-Click GitHub Provisioning** | Automatically creates repositories via GitHub API, sets Pages build source to `workflow`, and configures subpath routing with zero manual dashboard configuration. |
| **Sharp WebP Media Pipeline** | Uploaded images (PNG, JPEG, TIFF) are automatically transcoded to WebP (max width 1920px, quality 85), reducing payload sizes by up to 80%. |
| **Orphan Asset Cleaner** | Automatically scans all Markdown posts and JSON pages for active `/uploads/` references; deletes unreferenced `.webp` assets to prevent repository bloat. |
| **Modular Block Builder** | Supports composable landing pages using discriminated union blocks: `Hero`, `Features`, `RichText`, and `CallToAction (CTA)`. |
| **Non-Destructive Git Rollback** | Review full commit history and revert content files to any prior snapshot with one click. Generates a new forward atomic commit (`chore(cms): rollback content to <hash>`), avoiding messy rebases or merge conflicts. |
| **Bidirectional WYSIWYG & Markdown** | Seamless switching between visual Tiptap editing and raw Markdown syntax with image insertion and formatting preservation. |
| **Live CI/CD Deployment Badge** | Studio header polls GitHub Actions workflow runs, providing real-time deployment feedback (`Building`, `Live Deployed`, or `Failed`). |

---

## 3. Monorepo Structure

```text
serverless-cms/
├── .github/workflows/deploy.yml       # GitHub Actions CI/CD workflow for Pages
├── .gitignore                         # Ignores secrets, caches, and test artifacts
├── package.json                       # Root workspaces configuration and npm scripts
├── tsconfig.base.json                 # Monorepo strict TypeScript configuration
├── README.md                          # Project documentation
└── packages/
    ├── shared/                        # [@cms/shared] Zod schemas & TypeScript types
    │   ├── src/index.ts               # PostFrontmatterSchema, PageSchema, PageBlockSchema
    │   └── dist/                      # Compiled ESM modules and declaration types
    ├── server/                        # [@cms/server] Fastify 5 Local CMS Daemon (Port 4000)
    │   ├── src/index.ts               # Fastify bootstrap with CORS, multipart, and static uploads
    │   ├── src/config.ts              # Local state management (.cms-config.json)
    │   ├── src/services/              # GitHub OAuth, Git engine, Content CRUD, Sharp pipeline
    │   ├── src/routes/                # REST endpoints: /api/auth, /setup, /posts, /pages, /media, /git
    │   └── scripts/test-e2e.ts        # Automated 10-step integration suite
    ├── studio/                        # [@cms/studio] React 18 + Vite Local Authoring UI (Port 5173)
    │   ├── src/components/Topbar.tsx       # Status bar: branch, uncommitted count, CI/CD badge
    │   ├── src/components/PostsView.tsx    # Tiptap WYSIWYG / Markdown split-pane editor
    │   ├── src/components/PagesView.tsx    # Drag-and-drop / modular block builder
    │   ├── src/components/MediaView.tsx    # WebP gallery & orphan cleanup console
    │   ├── src/components/HistoryModal.tsx # Git timeline viewer & 1-click content rollback
    │   ├── src/components/PublishModal.tsx # Commit dialog with conflict detection & sync
    │   └── src/components/SettingsView.tsx # GitHub Device Flow auth & Headless API tester
    └── site-template/                 # [@cms/site-template] Astro 5 Static Engine & JSON API
        ├── astro.config.mjs           # Subpath base URL routing for GitHub Pages
        ├── src/content/config.ts      # Astro content collections validated via @cms/shared
        ├── src/components/            # BlockRenderer.astro & BaseLayout.astro
        └── src/pages/api/             # Static Headless REST JSON API generator
```

---

## 4. Headless Static REST JSON API Specification

When `@cms/site-template` builds, Astro generates static JSON endpoints into `dist/api/`:

### A. List Posts (`GET /api/posts.json`)
Filters out drafts in production builds, sorts chronologically descending, and provides metadata and resource links:
```json
{
  "generatedAt": "2026-11-03T17:49:26.877Z",
  "total": 1,
  "posts": [
    {
      "title": "Building a Serverless Headless CMS with Git and Astro",
      "slug": "building-serverless-headless-cms-with-git-and-astro",
      "date": "2026-11-01",
      "author": "Admin",
      "excerpt": "Architectural deep-dive into creating a zero-cloud-cost CMS.",
      "tags": ["architecture", "git", "astro", "serverless"],
      "draft": false,
      "url": "/blog/building-serverless-headless-cms-with-git-and-astro",
      "apiUrl": "/api/posts/building-serverless-headless-cms-with-git-and-astro.json"
    }
  ]
}
```

### B. Single Post (`GET /api/posts/[slug].json`)
Returns full frontmatter, compiled HTML body, raw markdown body, reading time estimate, and navigation links:
```json
{
  "title": "Building a Serverless Headless CMS with Git and Astro",
  "slug": "building-serverless-headless-cms-with-git-and-astro",
  "date": "2026-11-01",
  "author": "Admin",
  "content": "<p>Compiled HTML...</p>",
  "rawMarkdown": "## Markdown...",
  "readingTime": "3 min read"
}
```

### C. Landing Page Blocks (`GET /api/pages/[slug].json`)
Returns structured block arrays for consumption by any front-end framework (React, Vue, mobile apps):
```json
{
  "title": "Welcome to GitCMS",
  "slug": "home",
  "description": "Next-generation serverless headless CMS",
  "blocks": [
    {
      "id": "c138db59-86e5-4f40-9289-4b36d0139bca",
      "type": "hero",
      "heading": "Write Locally. Deploy Globally.",
      "alignment": "center"
    }
  ]
}
```

### D. Tag Taxonomy (`GET /api/tags.json`)
Returns all active tags, occurrence counts, and associated post slugs:
```json
{
  "totalTags": 4,
  "tags": [
    {
      "tag": "architecture",
      "count": 1,
      "postSlugs": ["building-serverless-headless-cms-with-git-and-astro"],
      "url": "/api/posts.json?tag=architecture"
    }
  ]
}
```

---

## 5. Getting Started & Development

### Prerequisites
- **Node.js:** $\ge$ 20.0.0
- **npm:** $\ge$ 10.0.0
- **Git:** Installed and available on system PATH

### Installation
Clone the repository and install all monorepo dependencies:
```bash
git clone <repository-url>
cd serverless-cms
npm install
```

### Local Development
Launch all three applications concurrently:
```bash
npm run dev
```
- **Local CMS Daemon:** `http://127.0.0.1:4000`
- **React Authoring Studio:** `http://localhost:5173`
- **Astro Site Preview:** `http://localhost:4321`

### Running the End-to-End Integration Suite
Execute the automated 10-step verification suite:
```bash
npm test
```
The test suite boots an isolated test daemon on port `4002` and automatically verifies:
1. Server health probe
2. GitHub token authentication & identity lookup
3. Post frontmatter schema validation & Zod rejection
4. Post CRUD lifecycle & filesystem synchronization
5. Page block schema validation & safety guards
6. Media WebP transcoding & orphan asset cleaner
7. Git engine status & CI/CD deployment monitor
8. Git commit timeline history (`GET /api/git/history`)
9. Static Astro Headless JSON API build generation
10. React Studio production bundle compilation

### Production Build & Typecheck
Verify strict TypeScript compilation and compile all workspaces for deployment:
```bash
# Typecheck across all 4 workspaces (shared, server, studio, site-template)
npm run typecheck

# Full production build
npm run build
```

---

## 6. License
MIT License. Created for the V Semester Software Engineering & Project Management curriculum.

