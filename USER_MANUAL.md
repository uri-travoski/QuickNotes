# QuickNotes — Comprehensive User Manual & Technical Reference

> **Welcome to QuickNotes** — A fast, modern, Google Keep-inspired personal knowledge and note-taking ecosystem built with rich Markdown formatting, 2-step hierarchical labels, multimedia attachments (images, video, documents), instant multi-dimensional filtering, and seamless cloud/local storage integration.

---

## 📑 Table of Contents
1. [System Architecture & Storage Model](#1-system-architecture--storage-model)
2. [User Interface & Layout Overview](#2-user-interface--layout-overview)
3. [Taking Notes & Rich Markdown Editor](#3-taking-notes--rich-markdown-editor)
4. [Note Cards & Display Mode](#4-note-cards--display-mode)
5. [Editing Notes (The Note Modal)](#5-editing-notes-the-note-modal)
6. [Search & Multi-Dimensional Smart Filters](#6-search--multi-dimensional-smart-filters)
7. [Settings Management Deep-Dive](#7-settings-management-deep-dive)
   - [Labels Management](#71-labels-management)
   - [Appearance & Typography](#72-appearance--typography)
   - [Storage (Local, S3, R2, B2, Google Drive)](#73-storage-local-s3-cloudflare-r2-backblaze-b2-google-drive)
   - [Backups & Disaster Recovery](#74-backups--disaster-recovery)
   - [API Keys & Developer Integrations](#75-api-keys--developer-integrations)
   - [User Management & Roles](#76-user-management--roles)
8. [Critical Gotchas & What NOT to Do](#8-critical-gotchas--what-not-to-do)
9. [Step-by-Step Practical Examples](#9-step-by-step-practical-examples)

---

## 1. System Architecture & Storage Model

QuickNotes uses a decoupled client-server architecture engineered for sub-millisecond response times even with thousands of notes:

```
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend (Port 3000)                  │
│       Vite + Tailwind CSS + Lucide Icons + Progressive UI   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST API
┌──────────────────────────────▼──────────────────────────────┐
│                Express Backend (Port 5000)                  │
│       Node.js 26 + Sharp (Thumbnails) + Multer Uploads      │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│   PostgreSQL 18 (Database)  ││ Binary Storage (Local/Cloud) │
│  • Notes, Checklist Items   ││  • /app/uploads (Local Disk) │
│  • Tags & Hierarchy Tree    ││  • AWS S3 / Cloudflare R2    │
│  • Attachment Metadata      ││  • Backblaze B2              │
│  • Users, Backups & API Keys││  • Google Drive              │
└─────────────────────────────┘└──────────────────────────────┘
```

### The Database vs. Binary Separation Rule
- **PostgreSQL Database**: Stores structured text data and metadata pointers (Note content, titles, colors, tags, checklists, timestamps, attachment sizes, MIME types, dimensions, and cloud object keys).
- **Binary Storage**: Stores actual file contents (PNG/JPEG images, MP4 videos, PDF documents, spreadsheets, zip files, and generated thumbnails).
- **Why this matters**: Backups complete in seconds (~2MB for 1,500 rich notes), database queries execute in ~3ms, and restoring the database dump reconnects all cloud attachments automatically.

---

## 2. User Interface & Layout Overview

### 2.1 Header Bar
- **Side Navigation Button (`PanelLeft` icon)**: 
  - On mobile and tablet screens (`< 1024px`), this button appears only when the sidebar is hidden.
  - Tapping it slides out the sidebar navigation drawer.
- **Brand Logo ("QuickNotes")**: Clicking returns to the primary **All Notes** view and scrolls to top.
- **Search & Smart Filter Bar**: Centered search input (`max-w-[650px]`) with real-time text query and dropdown filter button. Pressing `/` anywhere on the keyboard focuses search.
- **Right Action Menu (3-dot / Menu icon)**:
  - **List / Grid View toggle**: Switches between 4-column masonry grid and single-column list.
  - **Dark / Light Theme toggle**: Switches color modes with instant localStorage sync.
  - **Settings**: Opens the configuration dashboard.
  - **Help**: Opens the Quick Guide & Shortcuts modal.
  - **Signout**: Logs out the current session.

### 2.2 Sidebar Navigation & Views
- **All Notes**: Main active feed of unarchived, non-trashed notes.
- **Starred**: Notes marked as favorite/pinned.
- **Archive**: Stored notes preserved for reference without cluttering the main feed.
- **Trash**: Soft-deleted notes. Contains options to restore or delete forever.
- **Labels Section**:
  - Displays the 2-step hierarchy: **Root Categories** (Level 1) with colored circle badges and expand/collapse chevrons (`ChevronDown`/`ChevronRight`), and **Sub-Labels** (Level 2) indented with vertical guide lines.
  - Shows real-time note counters next to every view and label.
  - Quick gear icon opens **Labels Management** directly.

> [!NOTE]
> **Mobile / Tablet Behavior**: On screens smaller than 1024px, the sidebar is hidden by default. When opened, an overlay backdrop appears. Touching or clicking anywhere outside the sidebar immediately closes it.

---

## 3. Taking Notes & Rich Markdown Editor

### 3.1 Creating a Note (`NoteCreator`)
Located at the top of the notes feed:
1. Click the **"Take a note..."** input bar to expand the full editor.
2. Type or paste your content. Markdown formatting is rendered in real time.
3. Use the **Top Formatting Toolbar** or Markdown syntax for rich styling.
4. Set a background color, toggle star, attach images/documents, and select labels.
5. Click **Done** (or press `Ctrl + Enter` / `Cmd + Enter`) to save.

```
┌─────────────────────────────────────────────────────────────┐
│ [H1][H2][B][I][Checklist][Code][Table]   [Star] [🎨] [📎] [🗑]│
├─────────────────────────────────────────────────────────────┤
│ # Weekly Product Strategy & Roadmap                         │
│                                                             │
│ - [x] Complete database indexing benchmark                  │
│ - [ ] Finalize S3 cloud storage replication                 │
│                                                             │
│ | Milestone | Owner | Target Date |                         │
│ | :--- | :--- | :--- |                                      │
│ | Phase 1   | Alex  | 2026-03-01  |                         │
├─────────────────────────────────────────────────────────────┤
│ [+ Label] [Work] [Engineering]                       [Done] │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Markdown Syntax Reference Table

| Syntax | What it Renders | Example |
| :--- | :--- | :--- |
| `# Title` | Large Heading 1 | `# Project Plan` |
| `## Subheading` | Medium Heading 2 | `## Architecture` |
| `### Section` | Small Heading 3 | `### Action Items` |
| `- [ ] Task` | Interactive Unchecked Task | `- [ ] Review PR` |
| `- [x] Task` | Interactive Completed Task | `- [x] Deploy to Prod` |
| `**text**` | **Bold text** | `**Critical SLA**` |
| `*text*` | *Italic text* | `*Emphasis*` |
| `~~text~~` | ~~Strikethrough~~ | `~~Deprecated API~~` |
| `` `code` `` | `Inline Code Pill` | `` `GET /api/notes` `` |
| ` ```lang ... ``` ` | Syntax-Highlighted Code Block | Code snippet with formatting |
| `> Quote` | Blockquote callout | `> "Keep it simple"` |
| `\| A \| B \|` | Formatted Table Grid | See example above |
| `[Label](url)` | Clickable Hyperlink | `[Docs](https://example.com)` |

### 3.3 Adding Attachments
- **Image & Video Upload**: Click the Paperclip / Image icon or drag and drop files. Supports `.png`, `.jpg`, `.webp`, `.gif`, `.mp4`, `.webm`.
- **Document Upload**: Supports `.pdf`, `.docx`, `.xlsx`, `.zip`, `.txt`.
- **Clipboard Paste**: Press `Ctrl + V` / `Cmd + V` anywhere while the editor is open to paste screenshots directly from your clipboard!

---

## 4. Note Cards & Display Mode

### 4.1 Card Anatomy
Each card in the masonry grid or list view displays:
1. **Top-Right Hover Actions**:
   - ⭐ **Star Button**: Toggles favorite status.
   - ⋮ **3-Dot Menu**: Background color picker, attachment upload, archive/unarchive, and move to trash.
2. **Media Collage**:
   - Single attachment: Full-width cropped preview.
   - 2 attachments: 50/50 split collage.
   - 3+ attachments: Main preview + 2-row thumbnail stack with `+N` count overlay.
   - Videos display an overlay play button badge.
   - Hovering over any media item shows a **direct download button**.
3. **Markdown Body**:
   - Clean, syntax-highlighted prose rendered up to 10 lines (`line-clamp-10`).
   - Interactive Checkboxes: You can check/uncheck tasks directly on the card without opening the editor!
4. **Non-Image Attachment Pills**:
   - Shows file icon, truncated original filename, and direct download icon.
5. **Labels Bar**:
   - Interactive pill tags. Clicking any tag instantly filters the view to that specific label.

### 4.2 Lightbox Media Viewer (`AttachmentViewer`)
- Clicking any image or video thumbnail opens the **Full-Screen Lightbox**.
- Features: Full-resolution image zooming, native video player with controls, left/right keyboard navigation through all media in the note, filename header, and direct download button.
- Press `Escape` or click the backdrop to exit.

---

## 5. Editing Notes (The Note Modal)

When you click anywhere on an existing note card, the **Note Edit Modal** (`NoteModal.tsx`) opens centered on your screen with a backdrop:

### Features of the Note Modal:
- **Full View & Edit**: View the entire note without height clamping.
- **Top Toolbar**: Format markdown, toggle star, change note background color (12 palette options), attach new files, or archive/delete.
- **Attachment Management**: View all media thumbnails and documents. Hover over any attachment to **Download** or click **(X)** to permanently remove it from the note.
- **Label Assignment**: Click `+ Label` to open the hierarchical `TagPicker` popover, or click `(X)` on any applied label to detach it.
- **Auto-Resize**: The textarea expands smoothly as you type.
- **Quick Save**: Click **Done**, press `Ctrl + Enter` / `Cmd + Enter`, press `Escape`, or click the backdrop to save and close.

---

## 6. Search & Multi-Dimensional Smart Filters

Clicking the filter icon inside the search bar opens the expanded, scrollbar-free Smart Filter Panel:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🏷️ Multi-Label Filter (Match: AND/OR)]   [📅 Date Filter (Created/Updated)]│
│  [All Labels (Select multiple) ▼]         [All Dates (Click to filter) ▼]  │
├────────────────────────────────────────────────────────────────────────┤
│ Content Types: [🖼️ Images] [📄 Files] [☑️ Checklists]                    │
│ Colors: [All Colors] (⚪)(🟡)(🟠)(🟢)(🔵)(🟣)(🟤)(⚫)                   │
├────────────────────────────────────────────────────────────────────────┤
│ Active: [🏷️ Work/Engineering ✖] [📅 Last 7 Days ✖]   [🔄 Reset all filters] │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Multi-Label Filter with Logic Matching
- Open the label selector to check multiple root categories and sub-labels simultaneously.
- **AND Match**: Displays only notes that have **all** selected labels.
- **OR Match**: Displays notes that have **at least one** of the selected labels.

### 6.2 Date Range Filter
- Choose between **Created Date** (`created_at`) or **Updated Date** (`updated_at`).
- **Quick Presets**: `Today`, `Last 7 Days`, `Last 30 Days`, `This Month`.
- **Custom Range**: Specify exact `From Date` and `To Date`.

### 6.3 Content Type & Color Filters
- **Types**: Toggle `Images` (has image/video), `Files` (has PDF/doc/archive), or `Checklists` (has markdown `- [ ]` tasks).
- **Colors**: Filter notes matching any of the 12 specific note background hues.

---

## 7. Settings Management Deep-Dive

Access Settings from the top-right menu. The settings interface features simplified tab navigation: `Labels`, `Appearance`, `Storage`, `Backups`, `API`, `Users`.

---

### 7.1 Labels Management
Configure and manage the 2-step hierarchical label taxonomy.

- **Creating a Root Label (Level 1)**:
  1. Enter Label Name (e.g. `Work`, `Personal`, `Projects`).
  2. Select a Color Indicator (Mint, Sand, Coral, Blue, Blossom, etc.).
  3. Leave Parent dropdown as `None (Root Category)`.
  4. Click **Create Label**.
- **Creating a Sub-Label (Level 2)**:
  1. Enter Sub-Label Name (e.g. `Backend`, `Finance`, `Invoices`).
  2. Select the Parent Root Category from the dropdown.
  3. Click **Create Label**.
- **Editing & Deleting**:
  - Click the **Pencil icon** to rename a label or change its parent category.
  - Click the **Trash icon** to delete. Deleting a label unlinks it from notes; notes themselves are **never deleted**.

---

### 7.2 Appearance & Typography
Customize font styles and sizes across the entire application with instant live preview.

- **Typography Dropdown**:
  - `Inter` (Default clean UI sans-serif)
  - `Noto Sans` (Universal readability)
  - `Plus Jakarta Sans` (Modern geometric sans)
  - `Merriweather` (Editorial serif)
  - `Playfair Display` (Elegant high-contrast serif)
  - `Lora` (Contemporary serif for long-form reading)
  - `System Default` (Native OS font stack: San Francisco / Segoe UI / Ubuntu)
- **Font Size Slider**:
  - Adjust slider from `13px` (Small) up to `18px` (Extra Large). Default is `14px`.

---

### 7.3 Storage (Local, S3, Cloudflare R2, Backblaze B2, Google Drive)
QuickNotes features a pluggable, multi-provider storage architecture that completely decouples text metadata from heavy binary files (images, videos, PDFs, spreadsheets, archives).

#### How Storage Works Under the Hood
1. **Upload Pipeline**: When you attach a file or paste an image from your clipboard (`Ctrl+V`), the Express backend receives the stream via Multer, uses Sharp to generate an optimized WebP thumbnail, and writes both the original asset and thumbnail to the active storage provider.
2. **Database Record**: The PostgreSQL `attachments` table records the unique object key (`filename`), thumbnail key, original name, MIME type, file size, dimensions, and the `storage_provider` used at upload time.
3. **Zero-Lock-in Provider Tracking**: Each attachment record stores its own `storage_provider`. If you upload 100 images to Local Disk and later switch to Cloudflare R2, *existing attachments continue to stream from Local Disk while new attachments go to R2*. Nothing breaks!
4. **Streaming & Lightbox**: When opening notes or viewing the full-screen Lightbox, the server streams the file directly from your cloud bucket or local disk using authenticated signed streams.

---

#### Step-by-Step Setup Guides for Storage Providers

##### Option A: Local Disk Storage (Default)
- **Storage Path**: Files are saved to `/app/uploads` with thumbnails in `/app/uploads/thumbnails`.
- **Docker Volume**: Persisted across container restarts using the named volume `quicknotes_uploads`.
- **How to use**: No configuration required. Click **Test Read/Write** to verify filesystem permissions, then click **Set Active**.

##### Option B: AWS S3
1. In the AWS Console, create an S3 bucket (e.g. `my-quicknotes-prod`).
2. Create an IAM User with programmatic access and attach the `AmazonS3FullAccess` policy (or a scoped policy).
3. In **Settings → Storage → S3-Compatible**, enter:
   - **Endpoint URL**: Leave *blank* (AWS S3 uses standard regional endpoints automatically).
   - **Bucket Name**: `my-quicknotes-prod`
   - **Region**: e.g. `us-east-1`, `eu-west-1`
   - **Access Key ID**: Your IAM Access Key
   - **Secret Access Key**: Your IAM Secret Access Key
4. Click **Test Connection** to run a live read/write latency benchmark.
5. Click **Save**, then click **Set Active**.

##### Option C: Cloudflare R2 (Zero Egress Fees)
1. In the Cloudflare Dashboard, go to **R2 Object Storage** and click **Create bucket** (e.g. `quicknotes-r2`).
2. Under **R2 Account Details**, click **Manage R2 API Tokens** → **Create API Token** with *Object Read & Write* permissions.
3. Copy your **Account ID**, **Access Key ID**, and **Secret Access Key**.
4. In **Settings → Storage → S3-Compatible**, enter:
   - **Endpoint URL**: `https://<your-account-id>.r2.cloudflarestorage.com`
   - **Bucket Name**: `quicknotes-r2`
   - **Region**: `auto`
   - **Access Key ID**: Your R2 Access Key ID
   - **Secret Access Key**: Your R2 Secret Access Key
5. Click **Test Connection**, then **Save** and **Set Active**.

##### Option D: Backblaze B2
1. In Backblaze B2, create a bucket with *Private* default visibility.
2. Under **App Keys**, generate an Application Key with read/write access to that bucket.
3. Note the S3 Endpoint listed on your Bucket Details page (e.g. `https://s3.us-west-004.backblazeb2.com`).
4. In **Settings → Storage**, enter Endpoint URL, Bucket Name, Region (e.g. `us-west-004`), Key ID, and Application Key.
5. Click **Test Connection**, **Save**, and **Set Active**.

##### Option E: Google Drive
1. In Google Cloud Console, create a project and enable the **Google Drive API v3**.
2. Create OAuth 2.0 Credentials (or a Service Account) and download credentials.
3. In **Settings → Storage → Google Drive**, enter Client ID, Client Secret, Refresh Token, and the Target Folder ID.
4. Click **Test Connection**, **Save**, and **Set Active**.

> [!TIP]
> **Storage Best Practices (What to Do):**
> - Always click **Test Connection** before clicking "Set Active" to confirm credentials and network latency.
> - Use dedicated IAM or API tokens with permissions restricted strictly to your QuickNotes bucket.
> - Enable CORS on your S3/R2 bucket if configuring direct client uploads.

> [!CAUTION]
> **Storage Critical Gotchas (What NOT to Do):**
> - **DO NOT delete or rename your cloud bucket**: Existing notes store unique object keys pointing to that bucket. Deleting the bucket will break image and document links.
> - **DO NOT delete the `quicknotes_uploads` Docker volume**: If you are using Local storage, deleting the Docker volume deletes your uploaded files.
> - **DO NOT include trailing slashes in Endpoint URLs**: Use `https://<account>.r2.cloudflarestorage.com` without a trailing `/`.
> - **DO NOT enter an Endpoint URL for standard AWS S3**: Leave it blank so the AWS SDK automatically constructs the correct regional endpoint.

---

### 7.4 Backups & Disaster Recovery
QuickNotes includes a built-in automated backup and disaster recovery engine designed to protect your notes, tags, checklists, and attachment metadata against data loss.

#### How Backups Work Under the Hood
1. **Native PostgreSQL Dump**: When a backup is triggered, the backend executes `pg_dump` inside the PostgreSQL container, capturing the complete relational schema, all tables (`notes`, `tags`, `note_tags`, `attachments`, `users`, `storage_configs`), sequences, foreign keys, and indexes into a self-contained `database_dump.sql`.
2. **Metadata Manifest**: The engine generates a `manifest.json` containing the schema version, total note count, tag count, attachment count, timestamp, and storage provider metadata.
3. **Standard ZIP Packaging**: The SQL dump and manifest are packaged into a standard compressed `.zip` archive (e.g. `quicknotes_backup_2026-08-21T05-11-50-861Z.zip`).
4. **Cryptographic SHA-256 Integrity Verification**: The engine calculates a cryptographic SHA-256 checksum of the entire archive and stores it in the `backups` table. Every backup is automatically verified upon creation and can be re-verified at any time with the **ShieldCheck** button.

---

#### Step-by-Step Guide: How to Create a Backup
1. Navigate to **Settings** (top-right menu) → **Backups**.
2. Select the Backup Storage Target: *Local Disk*, *S3 Cloud Bucket*, or *Google Drive*.
3. Click the green **Run Backup Now** button.
4. The process completes in ~1-3 seconds. The new backup appears in the **Backup History** table with a green **"Verified & Valid"** badge.
5. Click the blue backup filename link (e.g. `quicknotes_backup_2026-08-21T05-11-50-861Z.zip`) to download the archive directly to your local computer or offline storage drive.

---

#### Step-by-Step Guide: How to Restore a Backup (3 Methods)

##### Method 1: Instant In-App Restore (from Backup History)
1. In **Settings → Backups**, scroll to the **Backup History** list.
2. Find the backup you wish to restore.
3. Click the **Restore icon** (↺ circular arrow) next to that backup row.
4. Read the confirmation dialog and click **Restore Backup**.
5. The backend extracts `database_dump.sql`, executes the restore inside a transaction, and automatically reloads all notes, tags, and settings.

##### Method 2: In-App Upload & Restore (from External .zip File)
1. In **Settings → Backups**, locate the **Restore from External Archive File** card.
2. Click **Upload & Restore (.zip)** and select any previously downloaded `quicknotes_backup_*.zip` file from your machine.
3. Confirm the dialog. The server uploads the archive, validates the SHA-256 checksum and manifest, restores the PostgreSQL database, and refreshes the application.

##### Method 3: Full Disaster Recovery on a Fresh Server / Host
If your entire server was destroyed or you are migrating to a brand-new cloud VPS, follow these disaster recovery steps:
1. Deploy QuickNotes on the new server using Docker:
   ```bash
   git clone <repo-url> && cd QuickNotes
   docker-compose up -d
   ```
2. Extract your backup archive on your local terminal:
   ```bash
   unzip quicknotes_backup_2026-08-21.zip
   # Extracts: database_dump.sql and manifest.json
   ```
3. Restore the SQL dump into the PostgreSQL container:
   ```bash
   docker exec -i quicknotes_postgres psql -U quicknotes_user -d quicknotes_db < database_dump.sql
   ```
4. Ensure your cloud storage bucket credentials (AWS S3, Cloudflare R2, Backblaze B2, Google Drive) are configured in `.env` or via Settings.
5. Open `http://<server-ip>:3000` in your browser. **All your notes, hierarchical tags, and cloud attachments are 100% restored and fully functional!**

> [!TIP]
> **Backup Best Practices (What to Do):**
> - Download backup `.zip` files regularly to an external hard drive or secure cloud storage.
> - Always verify the backup status shows **"Verified & Valid"** with a valid SHA-256 hash.
> - Store your cloud bucket credentials securely alongside your database backups.
> - Periodically test a restore on a local or staging environment to ensure disaster readiness.

> [!CAUTION]
> **Backup Critical Gotchas (What NOT to Do):**
> - **DO NOT restore a backup while users are actively editing**: Restoring completely replaces the current database with the backup snapshot. Any unsaved edits made since the backup was generated will be overwritten.
> - **DO NOT manually alter `database_dump.sql` or `manifest.json` inside the `.zip`**: Modifying files inside the archive changes its checksum and will trigger a SHA-256 integrity mismatch error upon verification.
> - **DO NOT delete your cloud storage bucket after making a database backup**: The database SQL dump stores all notes, metadata, and object keys (~2MB), while the heavy images and videos reside in your bucket. Both are required for full disaster recovery.

---

### 7.5 API Keys & Developer Integrations
QuickNotes exposes a full REST API for automation, CLI scripts, and third-party tools.

- **Creating an API Key**:
  1. Click **Create API Key**.
  2. Provide a descriptive label (e.g. `Raycast Extension`, `Obsidian Sync`, `Python Backup Script`).
  3. Select Scopes: `Read Only` or `Read / Write`.
  4. Copy the generated Bearer Token (`sk_qn_...`).
- **Using the API**:
  Pass the token in the `Authorization` header:
  ```bash
  curl -H "Authorization: Bearer sk_qn_your_token_here" \
       http://localhost:3000/api/notes
  ```

---

### 7.6 User Management & Roles
Manage team members, permissions, and security.

| Role | Permissions |
| :--- | :--- |
| **Owner** | Full system control: Manage users, change storage providers, API keys, delete system backups. |
| **Admin** | Manage labels, create/restore backups, view all public notes and statistics. |
| **Member** | Create, edit, search, label, and delete own notes and attachments. |
| **API User** | Programmatic access restricted to specified API token scopes. |

---

## 8. Critical Gotchas & What NOT to Do

> [!CAUTION]
> ### 1. Permanent Deletion in Trash
> Moving a note to Trash is a soft delete (it can be restored with the **Restore** button). However, clicking **Delete Forever** or **Empty Trash** removes the note and its database records **permanently**. This cannot be undone unless you restore from a backup archive.

> [!WARNING]
> ### 2. Do NOT Paste Mega-Byte Base64 Strings in Note Text
> While Markdown supports inline base64 images `![img](data:image/png;base64,...)`, pasting multi-megabyte base64 strings directly into the note content will slow down database queries and search indexing. **Always use the Attachment upload or `Ctrl+V` clipboard paste**, which stores the binary efficiently and generates fast thumbnails.

> [!WARNING]
> ### 3. Deleting Labels vs. Deleting Notes
> Deleting a label in **Settings / Labels** removes the label and its tag associations from notes. **It does NOT delete the notes themselves**. Those notes remain intact in All Notes.

> [!IMPORTANT]
> ### 4. Cloud Storage Credentials Matching
> When migrating to a new server or restoring a database backup, ensure your `.env` contains the exact same `S3_BUCKET_NAME` and access credentials. The database contains pointers; if credentials or bucket names don't match, attachments will show metadata but file streaming will fail.

> [!TIP]
> ### 5. Instant Cache Invalidation
> If you ever notice UI changes not appearing after a server upgrade, press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac) to bypass stale browser caches.

---

## 9. Step-by-Step Practical Examples

### Example 1: Creating a Weekly Task Note with Checklists & Labels
1. Click **"Take a note..."** in the top creator bar.
2. Type the title and checklist:
   ```markdown
   # Sprint 34 Deliverables
   - [x] Run database vacuuming and optimization
   - [ ] Implement cloud storage fallback
   - [ ] Conduct user acceptance testing
   ```
3. Click the **Palette icon** and choose **Mint (Green)**.
4. Click `+ Label`, select `Work / Engineering`.
5. Click **Done** or press `Ctrl + Enter`.
6. On the feed card, you can now toggle the checkboxes directly!

---

### Example 2: Attaching Screenshots, Videos & PDFs
1. Click on an existing note card to open the **Note Modal**.
2. Press `Ctrl + V` to paste a screenshot directly from your clipboard.
3. Click the **Paperclip icon** in the top toolbar and select a PDF specification document (`Architecture_Spec.pdf`).
4. The media thumbnail appears in the collage grid and the PDF appears in the attachment list.
5. Click **Done** to save.
6. Click the thumbnail at any time to inspect it in the full-screen Lightbox!

---

### Example 3: Searching by Multiple Labels and Date Ranges
1. Click inside the search bar or press `/`.
2. Click the **Filter icon** on the right side of the search bar.
3. In the **Multi-Label Filter**, check `Work` and `Projects`. Toggle match to `AND`.
4. In the **Date Filter**, select `Last 7 Days`.
5. Under **Content Types**, click `Images`.
6. The notes feed instantly filters down in real time to show only notes matching all three criteria!
7. Click **Reset all filters** when done.

---

### Example 4: Creating a Full Backup and Disaster Recovery
1. Go to **Settings** (top-right menu) → **Backups**.
2. Click **Create Backup Now**.
3. Once generated, click the archive link (e.g. `quicknotes_backup_2026-08-21T05-11-50-861Z.zip`) to download it to your local machine.
4. To restore on a new server:
   - Extract the `.zip` archive.
   - Run: `docker exec -i quicknotes_postgres psql -U quicknotes_user -d quicknotes_db < database_dump.sql`
   - Start the containers with matching storage credentials. All notes, hierarchy, and attachments are instantly live!

---

### Example 5: Creating Notes via Python REST API
```python
import requests

API_URL = "http://localhost:3000/api/notes"
API_TOKEN = "sk_qn_your_token_here"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "title": "Automated Server Health Check",
    "content": "## System Status Report\n- [x] CPU Load < 25%\n- [x] Memory Usage: 3.2 GB / 16 GB\n- [x] Database Latency: 2.4ms",
    "color": "sand",
    "is_starred": True
}

response = requests.post(API_URL, json=payload, headers=headers)
print("Note Created:", response.json())
```

---

*End of Comprehensive Manual. Keep this document handy for operational and developer reference.*
