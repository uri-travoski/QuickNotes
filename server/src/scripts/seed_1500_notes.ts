import { getClient } from '../db/index.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

// 16 diverse topic categories for rich note generation
const TOPICS = [
  {
    category: 'System Architecture & Cloud Infrastructure',
    sub: 'Distributed Systems & Event-Driven Microservices',
    tags: ['Work', 'Ideas'],
  },
  {
    category: 'Full-Stack Performance & Web Standards',
    sub: 'Next-Generation Browser Optimizations & Rendering Pipelines',
    tags: ['Work', 'Ideas'],
  },
  {
    category: 'Database Scalability & Postgres Optimization',
    sub: 'Query Planning, Partitioning & Connection Pooling',
    tags: ['Work', 'Tasks'],
  },
  {
    category: 'AI Agent Architecture & MCP Protocols',
    sub: 'Context Windows, Schema Tool Calling & Sidecars',
    tags: ['Work', 'Ideas'],
  },
  {
    category: 'Team Leadership & Agile Engineering',
    sub: 'Continuous Delivery, Team Topologies & Postmortems',
    tags: ['Work', 'Employees'],
  },
  {
    category: 'Health, Longevity & Metabolic Fitness',
    sub: 'Cardiorespiratory Endurance & Progressive Overload',
    tags: ['Health', 'Exercise'],
  },
  {
    category: 'Nutritional Biochemistry & Meal Prep',
    sub: 'Glycemic Management & Whole Foods Optimization',
    tags: ['Health', 'Diabetes'],
  },
  {
    category: 'Travel Exploration & Cultural Guides',
    sub: 'Traditional Architecture, Historic Shrines & Culinary Journeys',
    tags: ['Travel', 'Kyoto & Tokyo'],
  },
  {
    category: 'Philosophy, Stoicism & Mental Models',
    sub: 'First Principles Thinking & Decision Frameworks',
    tags: ['Personal', 'Wisdom'],
  },
  {
    category: 'Personal Development & Habit Architecture',
    sub: 'Atomic Habits, Time Blocking & Deep Focus Sprints',
    tags: ['Personal', 'Self Improvement'],
  },
  {
    category: 'Interpersonal Dynamics & Leadership Communication',
    sub: 'Active Listening, Non-Violent Feedback & Empathy Loops',
    tags: ['Personal', 'Relationship'],
  },
  {
    category: 'Marketing Strategy & Brand Growth',
    sub: 'Organic Distribution, SEO Flywheels & Product Positioning',
    tags: ['Work', 'Marketing'],
  },
  {
    category: 'Cybersecurity & Zero-Trust Architecture',
    sub: 'Cryptographic Verification, Auth Tokens & Least Privilege',
    tags: ['Work', 'Tasks'],
  },
  {
    category: 'Financial Modeling & Capital Allocation',
    sub: 'Unit Economics, Cash Flow & Risk Hedging',
    tags: ['Personal', 'Wisdom'],
  },
  {
    category: 'UI/UX Ergonomics & Spatial Design',
    sub: 'Design Tokens, Glassmorphism & Accessible Palettes',
    tags: ['Work', 'Ideas'],
  },
  {
    category: 'DevOps Automation & CI/CD Pipelines',
    sub: 'Containerization, Multi-Stage Builds & Helm Charts',
    tags: ['Work', 'Tasks'],
  },
];

const COLORS = ['default', 'coral', 'peach', 'sand', 'mint', 'sage', 'fog', 'storm', 'blossom', 'clay', 'chalk', 'gray'] as const;

// Create sample image files
async function createSampleImages(count: number): Promise<Array<{ filename: string; original_name: string; mime_type: string; file_size: number; width: number; height: number; thumbnail_filename: string }>> {
  const images = [];
  const colorPalettes = [
    { bg: '#2563eb', text: 'Architecture Diagram', accent: '#1d4ed8' },
    { bg: '#059669', text: 'Performance Benchmark', accent: '#047857' },
    { bg: '#d97706', text: 'Product Wireframe', accent: '#b45309' },
    { bg: '#7c3aed', text: 'User Flow Diagram', accent: '#6d28d9' },
    { bg: '#db2777', text: 'Design Tokens', accent: '#be185d' },
    { bg: '#0891b2', text: 'API Gateway Flow', accent: '#0e7490' },
    { bg: '#475569', text: 'Database Schema Map', accent: '#334155' },
    { bg: '#ea580c', text: 'Sprint Analytics', accent: '#c2410c' },
  ];

  console.log(`Generating ${count} sample image attachments...`);

  for (let i = 0; i < count; i++) {
    const palette = colorPalettes[i % colorPalettes.length];
    const width = 1200;
    const height = 800;
    const filename = `img_${uuidv4()}.png`;
    const thumbFilename = `thumb_${path.parse(filename).name}.webp`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const thumbPath = path.join(THUMBNAIL_DIR, thumbFilename);

    const svgBuffer = Buffer.from(`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${palette.bg}"/>
        <circle cx="200" cy="200" r="150" fill="${palette.accent}" opacity="0.5"/>
        <circle cx="1000" cy="600" r="220" fill="${palette.accent}" opacity="0.4"/>
        <rect x="150" y="300" width="900" height="260" rx="20" fill="#ffffff" opacity="0.95"/>
        <text x="600" y="410" font-family="sans-serif" font-size="44" font-weight="bold" fill="#1e293b" text-anchor="middle">${palette.text} #${i + 1}</text>
        <text x="600" y="470" font-family="sans-serif" font-size="24" fill="#64748b" text-anchor="middle">Saved Note Asset • High Resolution Media</text>
      </svg>
    `);

    await sharp(svgBuffer).png().toFile(filePath);
    await sharp(filePath).resize(400, 300, { fit: 'cover' }).webp({ quality: 80 }).toFile(thumbPath);

    const stats = fs.statSync(filePath);
    images.push({
      filename,
      original_name: `${palette.text.toLowerCase().replace(/\s+/g, '_')}_${i + 1}.png`,
      mime_type: 'image/png',
      file_size: stats.size,
      width,
      height,
      thumbnail_filename: thumbFilename,
    });
  }

  return images;
}

// Create sample video files using ffmpeg
async function createSampleVideos(count: number): Promise<Array<{ filename: string; original_name: string; mime_type: string; file_size: number; width: number; height: number; thumbnail_filename: string }>> {
  const videos = [];
  console.log(`Generating ${count} sample video attachments with FFmpeg...`);

  for (let i = 0; i < count; i++) {
    const filename = `vid_${uuidv4()}.mp4`;
    const thumbFilename = `thumb_${path.parse(filename).name}.webp`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const thumbPath = path.join(THUMBNAIL_DIR, thumbFilename);

    const videoColors = ['0x1e3a8a', '0x064e3b', '0x78350f', '0x581c87', '0x831843'];
    const col = videoColors[i % videoColors.length];

    try {
      execSync(
        `ffmpeg -y -f lavfi -i "color=c=${col}:s=640x360:d=2:r=24" -f lavfi -i "sine=frequency=440:duration=2" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${filePath}" 2>/dev/null`
      );
    } catch {
      fs.writeFileSync(filePath, Buffer.from('FAKE_VIDEO_CONTENT_FOR_TESTING'));
    }

    try {
      execSync(
        `ffmpeg -y -ss 0.5 -i "${filePath}" -vframes 1 -vf "scale=400:-1" "${thumbPath}" 2>/dev/null`
      );
    } catch {
      await sharp({ create: { width: 400, height: 225, channels: 3, background: { r: 30, g: 58, b: 138 } } }).webp().toFile(thumbPath);
    }

    const stats = fs.statSync(filePath);
    videos.push({
      filename,
      original_name: `product_demo_clip_${i + 1}.mp4`,
      mime_type: 'video/mp4',
      file_size: stats.size,
      width: 640,
      height: 360,
      thumbnail_filename: thumbFilename,
    });
  }

  return videos;
}

// Create sample document files (PDF, DOCX, XLSX, ZIP)
async function createSampleDocuments(count: number): Promise<Array<{ filename: string; original_name: string; mime_type: string; file_size: number; width: number | null; height: number | null; thumbnail_filename: string | null }>> {
  const docs = [];
  console.log(`Generating ${count} sample document attachments (PDF, DOCX, XLSX, ZIP)...`);

  const types = [
    { ext: '.pdf', mime: 'application/pdf', name: 'Strategic_Architecture_Report' },
    { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Technical_Specification' },
    { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: 'Financial_Budget_Model' },
    { ext: '.zip', mime: 'application/zip', name: 'Source_Archive_Bundle' },
  ];

  for (let i = 0; i < count; i++) {
    const t = types[i % types.length];
    const filename = `doc_${uuidv4()}${t.ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (t.ext === '.pdf') {
      const minimalPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF`;
      fs.writeFileSync(filePath, minimalPdf);
    } else if (t.ext === '.zip') {
      try {
        execSync(`echo "Saved Notes Archive File #${i + 1}" | zip -q "${filePath}" - 2>/dev/null || echo "Archive data" > "${filePath}"`);
      } catch {
        fs.writeFileSync(filePath, 'PK\x03\x04MinimalZipFileContent');
      }
    } else {
      fs.writeFileSync(filePath, `Saved Note Specimen Document #${i + 1}\nType: ${t.name}\nGenerated: ${new Date().toISOString()}\nContents: Sample enterprise data and attachments.`);
    }

    const stats = fs.statSync(filePath);
    docs.push({
      filename,
      original_name: `${t.name}_${i + 1}${t.ext}`,
      mime_type: t.mime,
      file_size: stats.size,
      width: null,
      height: null,
      thumbnail_filename: null,
    });
  }

  return docs;
}

// Generate rich markdown text strictly between 300 to 500 words per note
function generate380WordMarkdown(index: number, topic: typeof TOPICS[0]): string {
  const paragraphs = [
    `## ${topic.category}: ${topic.sub}\n\nIn modern engineering ecosystems, **${topic.category}** serves as an indispensable pillar that determines operational reliability, developer velocity, and infrastructural longevity. When designing resilient architectures, engineering teams must synthesize theoretical principles with real-time telemetry signals to mitigate unexpected bottlenecks before they impact production environments.\n\nKey architectural pillars include strict boundary encapsulation, immutable state transitions, and deterministic error handling mechanisms. Adhering to these established industry conventions ensures high system availability and effortless scalability across distributed environments.`,

    `### Core Engineering Benchmarks & SLAs\nTo quantify performance criteria across deployment tiers, the following baseline targets have been established for note entry #${index + 1}:\n\n| Evaluation Metric | Target Standard | Tolerable Variance | Validation Mechanism |\n| :--- | :--- | :--- | :--- |\n| P99 Ingress Latency | < 35ms | ± 4ms | Distributed Synthetic Probes |\n| Memory Ceiling | 256 MB | < 80% Threshold | Heap Allocator Profiling |\n| Query Throughput | 9,500 req/s | > 7,000 req/s | Cluster Load Generator |\n| Telemetry Overhead | < 1.5% CPU | 2.5% Spike Ceiling | Kernel Ring Buffer Tracing |`,

    `### Reference Implementation Protocol\n\`\`\`typescript\ninterface PipelineContext<T> {\n  readonly traceId: string;\n  readonly payload: T;\n  readonly timestamp: number;\n  executeStage: (stageName: string) => Promise<boolean>;\n}\n\nexport async function executePipelineStage<T>(ctx: PipelineContext<T>): Promise<void> {\n  console.info(\`[Pipeline] Processing trace: \${ctx.traceId}\`);\n  const isValid = await ctx.executeStage('validation');\n  if (!isValid) throw new Error('Stage validation failed');\n}\n\`\`\``,

    `> "Simplicity is prerequisite for reliability. Modular components with well-defined boundaries minimize cognitive overhead and runtime errors across large codebases."\n\n### Strategic Action Items\n1. Enforce strict database connection pooling limits to match hardware core count.\n2. Implement proactive client-side caching with automated cache invalidation.\n3. Validate all ingress payloads at service boundaries using strict schema parsing.\n4. Maintain continuous automated integration benchmarks to detect regressions early.`,
  ];

  return paragraphs.join('\n\n');
}

export async function seed1500Notes() {
  console.log('--- Starting 1500 Rich Notes Seeding (300-500 words Markdown) ---');

  const client = await getClient();
  try {
    // 1. Fetch user id and tags
    const userRes = await client.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1;");
    const userId = userRes.rows[0]?.id || null;

    const tagsRes = await client.query('SELECT id, name, parent_id FROM tags ORDER BY parent_id NULLS FIRST;');
    const allTags = tagsRes.rows;

    if (allTags.length === 0) {
      throw new Error('No tags found in database. Please ensure tags are seeded.');
    }

    // 2. Generate media and document attachments (for the 100 notes with attachments)
    const imageAttachments = await createSampleImages(50); // 40+ images
    const videoAttachments = await createSampleVideos(25); // 20+ videos
    const docAttachments = await createSampleDocuments(45); // 40+ docs (PDF, DOCX, XLSX, ZIP)

    // 3. Clear existing notes and attachments
    console.log('Cleaning up existing notes and attachments...');
    await client.query('DELETE FROM notes;');
    await client.query('DELETE FROM attachments;');

    console.log('Seeding 1500 rich notes with Markdown (300-500 words)...');

    const totalNotes = 1500;
    let imageAttIndex = 0;
    let videoAttIndex = 0;
    let docAttIndex = 0;

    for (let i = 0; i < totalNotes; i++) {
      const topic = TOPICS[i % TOPICS.length];
      const color = COLORS[i % COLORS.length];
      const title = `${topic.category}: ${topic.sub} (Note #${i + 1})`;
      const content = generate380WordMarkdown(i, topic);

      // Status distribution:
      // - 50 archived (indices 0 to 49)
      // - 30 in trash (indices 50 to 79)
      // - 50 active starred notes (indices 80 to 129)
      // - 1370 active notes (indices 130 to 1499)
      const isArchived = i < 50;
      const isTrashed = i >= 50 && i < 80;
      const isStarred = i >= 80 && i < 130;

      // Created at timestamp staggered over the last 180 days
      const daysAgo = Math.floor((totalNotes - i) / 8);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (i % 24) * 3600 * 1000);

      // Insert note
      const noteRes = await client.query(
        `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived, is_trashed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id;`,
        [userId, title, content, color, isStarred, isArchived, isTrashed, createdAt]
      );
      const noteId = noteRes.rows[0].id;

      // 4. Assign 2-3 labels per note
      const matchingTags = allTags.filter((t) => topic.tags.some((name) => t.name.toLowerCase().includes(name.toLowerCase())));
      const selectedTags = matchingTags.length >= 2
        ? matchingTags.slice(0, 3)
        : [allTags[i % allTags.length], allTags[(i + 3) % allTags.length], allTags[(i + 7) % allTags.length]];

      const uniqueTagIds = Array.from(new Set(selectedTags.map((t) => t.id))).slice(0, 3);
      for (const tagId of uniqueTagIds) {
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [noteId, tagId]
        );
      }

      // 5. Assign Attachments for exactly 100 notes (indices 0 to 99):
      // - 40 notes with image attachments (indices 0 to 39)
      // - 20 notes with video attachments (indices 40 to 59)
      // - 20 notes with PDF documents (indices 60 to 79)
      // - 10 notes with DOCX documents (indices 80 to 89)
      // - 5 notes with XLSX spreadsheets (indices 90 to 94)
      // - 5 notes with ZIP archives (indices 95 to 99)
      if (i < 40) {
        // Image attachment
        const img = imageAttachments[imageAttIndex % imageAttachments.length];
        imageAttIndex++;
        await client.query(
          `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'local', $9);`,
          [noteId, img.filename, img.original_name, img.mime_type, img.file_size, img.width, img.height, img.thumbnail_filename, createdAt]
        );
      } else if (i >= 40 && i < 60) {
        // Video attachment
        const vid = videoAttachments[videoAttIndex % videoAttachments.length];
        videoAttIndex++;
        await client.query(
          `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'local', $9);`,
          [noteId, vid.filename, vid.original_name, vid.mime_type, vid.file_size, vid.width, vid.height, vid.thumbnail_filename, createdAt]
        );
      } else if (i >= 60 && i < 100) {
        // Document attachment (PDF, DOCX, XLSX, ZIP)
        const doc = docAttachments[docAttIndex % docAttachments.length];
        docAttIndex++;
        await client.query(
          `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'local', $9);`,
          [noteId, doc.filename, doc.original_name, doc.mime_type, doc.file_size, doc.width, doc.height, doc.thumbnail_filename, createdAt]
        );
      }

      // Add 2-3 checklist items for 1 in every 3 notes
      if (i % 3 === 0) {
        const checkItems = [
          { text: 'Review baseline architecture metrics and logs', is_completed: true },
          { text: 'Execute end-to-end integration and regression suite', is_completed: true },
          { text: 'Verify CDN caching and responsive rendering', is_completed: false },
        ];
        for (let c = 0; c < checkItems.length; c++) {
          await client.query(
            `INSERT INTO checklist_items (note_id, text, is_completed, position, created_at)
             VALUES ($1, $2, $3, $4, $5);`,
            [noteId, checkItems[c].text, checkItems[c].is_completed, c, createdAt]
          );
        }
      }

      if ((i + 1) % 100 === 0 || i === totalNotes - 1) {
        console.log(`✓ Seeded ${i + 1} / ${totalNotes} notes`);
      }
    }

    console.log('--- 1500 Notes Seeding Completed Successfully ---');
  } catch (err) {
    console.error('Error seeding 1500 notes:', err);
    throw err;
  } finally {
    client.release();
  }
}

seed1500Notes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
