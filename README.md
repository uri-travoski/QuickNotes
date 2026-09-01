# QuickNotes — Modern Notes Web App (2026 Edition)

QuickNotes is a full-featured Google Keep-style notes web application built with a modern 2026 tech stack. It supports rich note management, checklists, pastel color themes, multi-image attachment collages with sharp WebP thumbnails, **2-step nested labels**, **AI agent readiness with OpenAPI 3.1 & tool schemas**, **2-tier RBAC**, **Storage providers (Local, S3/R2/B2, Google Drive)**, and a **Backup & Restore Wizard with automated SHA-256 verification**.

---

## ⚡ Tech Stack

- **Frontend**: Node.js, React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Date-fns
- **Backend**: Node.js 26, Express, TypeScript, Sharp (WebP thumbnail generation), Bcryptjs, JWT, Archiver, Unzipper
- **Database**: PostgreSQL 18
- **Deployment**: Docker Compose & Multi-stage container builds

---

## 🚀 Key Features

### 1. 🤖 AI Agent Ready (`Settings / API`)
- **API Key Management**: Generate `sk_qn_...` API keys for AI assistants with secret reveal modals and prefix tracking.
- **OpenAPI 3.1 Specification**: Exposed at `/api/docs/spec`.
- **AI Agent Tool Schemas**: Exposed at `/api/docs/ai-tools` with 1-click JSON schemas ready for **OpenAI**, **Anthropic Claude**, and **Google Gemini** function calling.

### 2. 👥 2-User Roles & Strict RBAC (`Settings / Users`)
- **Owner**: Full administrative access (create/delete users, API key management, storage configuration, backup & restore, permanent note deletion).
- **API User**: Restricted role for automated assistants. **Cannot** delete notes, **cannot** empty trash, and **cannot** access settings (users, storage, backups), but **can** access `Settings / Labels` for label management.
- **Default Accounts**:
  - **Owner**: `owner` / `quicknotes_owner_password_2026`
  - **API User**: `api_user` / `quicknotes_api_password_2026`

### 3. 🏷️ 2-Step Nested Labels (`Settings / Labels`)
- True 2-step hierarchy: **Root Categories** (Level 1) & **Sub-Labels** (Level 2).
- Automatic depth enforcement: sub-labels cannot have children (preventing arbitrary nesting depth).
- Tree hierarchy in sidebar with collapsible folders and note count badges.

### 4. 🔍 Center-Aligned Search & Advanced Filters
- Prominently positioned in the center above notes.
- **Full-Text Search**: Matches title, body content, checklist items, and attachment filenames.
- **Multi-Label Filtering**: Select multiple labels with **Match ALL (AND)** or **Match ANY (OR)** toggle.
- **Date Range Filtering**: Filter between dates on `created_at`, `updated_at`, or `reminder_at` with quick presets (Today, Last 7 Days, Last 30 Days, This Month).
- **Type Pills**: Filter by images, files, checklists, or reminders.
- **Color Swatches**: Filter by Google Keep pastel color palettes.

### 5. 💾 Storage Providers (`Settings / Storage`)
- **Local Disk Storage**: `./uploads` directory.
- **S3-Compatible Object Storage**: AWS S3, Cloudflare R2, Backblaze B2, and MinIO with AWS SigV4 signed requests.
- **Google Drive Storage**: Direct integration via Google Drive API v3 (Service Account JSON & OAuth2).
- **Live Connection Testing**: Test read/write latency and connectivity with 1 click.

### 6. 🛡️ Backup & Restore Wizard (`Settings / Backups`)
- **Backup Wizard**: Generates full zip archives containing database dump + attachments to Local, S3, or Google Drive.
- **Automated Verification**: Automatically computes SHA-256 checksum, validates archive structure, and verifies integrity.
- **Restore Wizard**: 1-click rollback from stored backups or uploaded `.zip` archives.

### 7. 📱 Mobile & PWA Ready
- Responsive layout with fluid grids and drawer sidebar.
- Web App Manifest (`manifest.webmanifest`) and Service Worker (`sw.js`) for PWA installation.

---

## 🏃 Quick Start (Local Development)

### 1. Start PostgreSQL
```bash
docker run --name quicknotes_postgres -e POSTGRES_DB=quicknotes_db -e POSTGRES_USER=quicknotes_user -e POSTGRES_PASSWORD=quicknotes_password_2026 -p 5434:5432 -d postgres:18-alpine
```

### 2. Backend Setup
```bash
cd server
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:3001` (or `http://localhost:3000`).

---

## 🐳 Docker Compose Deployment (Single Unified Container)

Run the unified production container (Frontend UI + Backend API on single port `3000`):

```yaml
services:
  app:
    image: ghcr.io/uri-travoski/quicknotes:latest
    container_name: quicknotes_app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PORT: 3000
      DATABASE_URL: postgresql://quicknotes_user:quicknotes_password_2026@postgres:5432/quicknotes_db
      MAX_FILE_SIZE_MB: 100
      DEFAULT_OWNER_USERNAME: owner
      DEFAULT_OWNER_PASSWORD: quicknotes_owner_password_2026
      DEFAULT_API_USERNAME: api_user
      DEFAULT_API_PASSWORD: quicknotes_api_password_2026
    volumes:
      - quicknotes_uploads:/app/uploads
      - quicknotes_backups:/app/backups
    ports:
      - "3000:3000"

  postgres:
    image: postgres:18-alpine
    container_name: quicknotes_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: quicknotes_db
      POSTGRES_USER: quicknotes_user
      POSTGRES_PASSWORD: quicknotes_password_2026
    volumes:
      - quicknotes_pgdata:/var/lib/postgresql
    ports:
      - "5434:5432"

volumes:
  quicknotes_pgdata:
  quicknotes_uploads:
  quicknotes_backups:
```

### Start Container
```bash
docker compose up -d
```

Access the application at `http://localhost:3000`.

### 🔑 Initial Login Credentials (Configurable via Environment Variables)

When deploying for the first time, default accounts are initialized automatically via environment variables in `docker-compose.yml`:

| Role | Environment Variable | Default Username | Default Password |
| :--- | :--- | :--- | :--- |
| **👑 App Owner** | `DEFAULT_OWNER_USERNAME` / `DEFAULT_OWNER_PASSWORD` | `owner` | `quicknotes_owner_password_2026` |
| **🤖 API User** | `DEFAULT_API_USERNAME` / `DEFAULT_API_PASSWORD` | `api_user` | `quicknotes_api_password_2026` |

#### 📦 Available Docker Image:
- **Unified App (Frontend + Backend)**: `ghcr.io/uri-travoski/quicknotes:latest` (`v1.5.7`, `1.5.7`, `v1.5`, `1.5`)

---

## 🧪 Running Automated Tests

```bash
# Run backend integration tests
npm --prefix server run test

# Run full E2E verification
npx --prefix server tsx server/src/tests/e2e_advanced.test.ts

# Run label management tests
npx --prefix server tsx server/src/tests/label_management.test.ts
```
