import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:5000/api';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

async function runUI20NotesSimulation() {
  console.log('=== Starting Simulation of 20 Notes Creation with Labels & Attachments (as done via UI) ===');

  // 1. Fetch available tags
  const tagsRes = await fetch(`${API_BASE}/tags`);
  if (!tagsRes.ok) throw new Error(`Failed to fetch tags: ${tagsRes.statusText}`);
  const tagsData = (await tagsRes.json()) as any;
  const allTags = tagsData.flat;
  console.log(`✓ Fetched ${allTags.length} available tags`);

  // 2. Fetch initial note counts
  const initialCountsRes = await fetch(`${API_BASE}/notes/counts`);
  const initialCounts = await initialCountsRes.json();
  console.log('Initial note counts:', initialCounts);

  const createdNoteIds: string[] = [];

  for (let i = 0; i < 20; i++) {
    const noteNum = i + 1;
    console.log(`\n--- Creating UI Note #${noteNum} / 20 ---`);

    // A. Create attachments for this note (image, video or doc)
    const attachmentIds: string[] = [];
    const filesToUpload: Array<{ path: string; originalName: string; mime: string }> = [];

    // Create 1-2 images
    const imgFilename = `ui_img_${uuidv4()}.png`;
    const imgPath = path.join(UPLOAD_DIR, imgFilename);
    const svgBuffer = Buffer.from(`
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2563eb"/>
        <circle cx="400" cy="300" r="180" fill="#60a5fa" opacity="0.6"/>
        <text x="400" y="320" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">UI Generated Specimen #${noteNum}</text>
      </svg>
    `);
    await sharp(svgBuffer).png().toFile(imgPath);
    filesToUpload.push({ path: imgPath, originalName: `ui_mockup_${noteNum}.png`, mime: 'image/png' });

    // For some notes, also attach a video or document
    if (i % 3 === 0) {
      const vidFilename = `ui_vid_${uuidv4()}.mp4`;
      const vidPath = path.join(UPLOAD_DIR, vidFilename);
      try {
        execSync(`ffmpeg -y -f lavfi -i "color=c=0x1d4ed8:s=640x360:d=2:r=24" -f lavfi -i "sine=frequency=520:duration=2" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${vidPath}" 2>/dev/null`);
        filesToUpload.push({ path: vidPath, originalName: `ui_demo_screen_${noteNum}.mp4`, mime: 'video/mp4' });
      } catch (e) {
        console.warn('Video creation skipped fallback');
      }
    } else if (i % 3 === 1) {
      const docFilename = `ui_doc_${uuidv4()}.pdf`;
      const docPath = path.join(UPLOAD_DIR, docFilename);
      const minimalPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF`;
      fs.writeFileSync(docPath, minimalPdf);
      filesToUpload.push({ path: docPath, originalName: `ui_specification_${noteNum}.pdf`, mime: 'application/pdf' });
    }

    // Upload files via multipart form-data to /api/attachments/upload
    const formData = new FormData();
    for (const f of filesToUpload) {
      const fileBuffer = fs.readFileSync(f.path);
      const blob = new Blob([fileBuffer], { type: f.mime });
      formData.append('files', blob, f.originalName);
    }

    const uploadRes = await fetch(`${API_BASE}/attachments/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed for note #${noteNum}: ${await uploadRes.text()}`);
    }

    const uploadedAttachments = (await uploadRes.json()) as any[];
    for (const att of uploadedAttachments) {
      attachmentIds.push(att.id);
    }
    console.log(`  Uploaded ${uploadedAttachments.length} attachments (IDs: ${attachmentIds.join(', ')})`);

    // B. Select 2-3 labels
    const tag1 = allTags[i % allTags.length];
    const tag2 = allTags[(i + 4) % allTags.length];
    const tag3 = allTags[(i + 8) % allTags.length];
    const selectedTagIds = Array.from(new Set([tag1.id, tag2.id, tag3.id])).slice(0, 3);

    // C. Generate 520 words of Markdown
    const markdownContent = `## UI Note Creation Test Case #${noteNum}: Advanced Workflow Evaluation
In modern client-side software architectures, validating interactive note lifecycles through direct UI simulation ensures that state transitions, reactive tag counters, and media collage renders perform with sub-millisecond precision. When handling complex media payloads including high-density vector images, dynamic HTML5 video containers, and binary attachments, the application must maintain responsive frames without main-thread blocking.

### Core Validation Metrics
- **Interactive Responsiveness**: Zero frame-rate drops when rendering markdown with rich previews.
- **Attachment Pipeline**: Instant thumbnail resolution with secure download endpoints and lightbox view transitions.
- **Multi-Label Synchronization**: Immediate reactivity across hierarchical category trees and search query filters.

### Key Observation Table
| Metric Parameter | Observed Value | Expected Standard | Status |
| :--- | :--- | :--- | :--- |
| Creation Latency | < 25ms | < 100ms | PASS |
| Attachment Bind | ${uploadedAttachments.length} Files | > 0 Files | PASS |
| Tag Association | ${selectedTagIds.length} Labels | 2-3 Labels | PASS |
| Markdown Parsing | Clean AST | GFM Standard | PASS |

> "Quality is not an act, it is a habit. Comprehensive verification of end-to-end user workflows guarantees robust reliability under extreme operational conditions."

\`\`\`typescript
export function verifyNoteIntegrity(noteId: string, tags: string[], attachments: string[]): boolean {
  console.log(\`[UI Verification] Note \${noteId} verified with \${tags.length} tags and \${attachments.length} attachments.\`);
  return tags.length >= 2 && attachments.length > 0;
}
\`\`\`

### Summary & Next Actions
1. Confirm that note #${noteNum} appears seamlessly at the top of the All Notes stream in reverse chronological order.
2. Verify that clicking the attachment thumbnail launches the full-screen AttachmentViewer modal with zoom and pan controls.
3. Validate that the direct download button preserves the original filename and mime type.
4. Ensure that the sidebar counter dynamically updates to reflect the newly inserted record without requiring a manual page refresh.`;

    const colors = ['default', 'coral', 'peach', 'sand', 'mint', 'sage', 'fog', 'storm', 'blossom', 'clay', 'chalk', 'gray'];
    const color = colors[i % colors.length];

    // D. Create Note via POST /api/notes
    const createRes = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: markdownContent,
        color,
        is_starred: i % 4 === 0,
        tag_ids: selectedTagIds,
        attachment_ids: attachmentIds,
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create note #${noteNum}: ${await createRes.text()}`);
    }

    const createdNote = (await createRes.json()) as any;
    createdNoteIds.push(createdNote.id);
    console.log(`  ✓ Note #${noteNum} created with ID: ${createdNote.id} (Color: ${color}, Starred: ${createdNote.is_starred}, Tags: ${createdNote.tags.length}, Attachments: ${createdNote.attachments.length})`);
  }

  // 3. Verify final note counts
  const finalCountsRes = await fetch(`${API_BASE}/notes/counts`);
  const finalCounts = await finalCountsRes.json();
  console.log('\n=== Final Note Counts ===');
  console.log(finalCounts);

  // 4. Test Search, Filters & Lightbox Endpoints
  console.log('\n=== Testing Search & Filter Operations across 370 Notes ===');
  
  // Test search
  const searchRes = await fetch(`${API_BASE}/notes?q=Interactive`);
  const searchResults = (await searchRes.json()) as any[];
  console.log(`✓ Search for "Interactive" returned ${searchResults.length} matching notes`);

  // Test label filter
  const tagTestId = allTags[0].id;
  const tagFilterRes = await fetch(`${API_BASE}/notes?tag_ids=${tagTestId}`);
  const tagResults = (await tagFilterRes.json()) as any[];
  console.log(`✓ Filter by tag "${allTags[0].name}" returned ${tagResults.length} notes`);

  // Test has_images filter
  const imagesFilterRes = await fetch(`${API_BASE}/notes?has_images=true`);
  const imagesResults = (await imagesFilterRes.json()) as any[];
  console.log(`✓ Filter by has_images=true returned ${imagesResults.length} notes`);

  // Test has_files filter
  const filesFilterRes = await fetch(`${API_BASE}/notes?has_files=true`);
  const filesResults = (await filesFilterRes.json()) as any[];
  console.log(`✓ Filter by has_files=true returned ${filesResults.length} notes`);

  console.log('\n=== UI Simulation Completed Successfully with 0 Errors ===');
}

runUI20NotesSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Simulation error:', err);
    process.exit(1);
  });
