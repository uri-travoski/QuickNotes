import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { pool, getClient } from './index.js';
import { processAttachment } from '../services/thumbnail.js';
import { hashPassword, hashApiKey } from '../services/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

async function createSampleImage(title: string, color1: string, color2: string, filename: string): Promise<string> {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(THUMBNAIL_DIR)) fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });

  const filePath = path.join(UPLOAD_DIR, filename);
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const svg = `
    <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="700" cy="80" r="140" fill="white" opacity="0.1" />
      <circle cx="100" cy="420" r="180" fill="white" opacity="0.08" />
      <rect x="60" y="60" width="680" height="380" rx="16" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
      <text x="400" y="240" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">
        ${safeTitle}
      </text>
      <text x="400" y="290" font-family="sans-serif" font-size="18" fill="rgba(255,255,255,0.9)" text-anchor="middle">
        QuickNotes • 2026 Attachment Preview
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filePath);

  return filePath;
}

function createSampleDoc(filename: string, content: string) {
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

export async function seed() {
  console.log('Seeding QuickNotes database with 2-user accounts, 2-step nested labels, and Google Keep sample notes...');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Clean existing data
    await client.query('DELETE FROM note_tags');
    await client.query('DELETE FROM attachments');
    await client.query('DELETE FROM checklist_items');
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM api_keys');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM storage_configs');

    // 1. Create Default Users (Owner and API User)
    const ownerUsername = process.env.DEFAULT_OWNER_USERNAME || process.env.INITIAL_ADMIN_USER || 'owner';
    const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || 'quicknotes_owner_password_2026';
    const apiUsername   = process.env.DEFAULT_API_USERNAME || 'api_user';
    const apiPassword   = process.env.DEFAULT_API_PASSWORD || 'quicknotes_api_password_2026';

    const ownerPassHash = await hashPassword(ownerPassword);
    const apiPassHash   = await hashPassword(apiPassword);

    const ownerRes = await client.query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ownerUsername, ownerPassHash, 'owner', 'App Owner']
    );
    const ownerId = ownerRes.rows[0].id;

    const apiUserRes = await client.query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [apiUsername, apiPassHash, 'api', 'AI Agent Assistant']
    );
    const apiUserId = apiUserRes.rows[0].id;

    // 2. Create Default API Key for AI Agents
    const sampleApiKey = 'sk_qn_demo_agent_key_2026_test123';
    const sampleKeyHash = hashApiKey(sampleApiKey);
    await client.query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
       VALUES ($1, $2, $3, $4)`,
      [apiUserId, 'Primary AI Agent Key', 'sk_qn_demo_ag', sampleKeyHash]
    );

    // 3. Create Default Storage Config (Local Disk)
    await client.query(
      `INSERT INTO storage_configs (id, provider_type, is_active, config_json)
       VALUES ('local', 'local', TRUE, '{"baseDir": "./uploads"}'::jsonb)`
    );

    // 4. Create 2-Step Nested Labels
    // Level 1: Root Labels
    const personalRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Personal', NULL, 'storm', 0) RETURNING id`
    );
    const healthRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Health', NULL, 'blossom', 1) RETURNING id`
    );
    const recipeRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Recipe', NULL, 'coral', 2) RETURNING id`
    );
    const aiRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('AI', NULL, 'mint', 3) RETURNING id`
    );
    const relRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Relationships', NULL, 'sand', 4) RETURNING id`
    );
    const booksRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Books', NULL, 'storm', 5) RETURNING id`
    );
    const githubRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Github', NULL, 'fog', 6) RETURNING id`
    );
    const businessRoot = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Business', NULL, 'mint', 7) RETURNING id`
    );

    // Level 2: Sub-labels
    const wisdomSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Wisdom', $1, 'storm', 0) RETURNING id`,
      [personalRoot.rows[0].id]
    );
    const selfImpSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Self improvement', $1, 'storm', 1) RETURNING id`,
      [personalRoot.rows[0].id]
    );
    const spiritualSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Spiritual', $1, 'storm', 2) RETURNING id`,
      [personalRoot.rows[0].id]
    );
    const orgSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Organise-Declutter', $1, 'storm', 3) RETURNING id`,
      [personalRoot.rows[0].id]
    );
    const studySub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Study', $1, 'storm', 4) RETURNING id`,
      [personalRoot.rows[0].id]
    );

    const diabSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Diabetes', $1, 'blossom', 0) RETURNING id`,
      [healthRoot.rows[0].id]
    );
    const exerSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Exercise', $1, 'blossom', 1) RETURNING id`,
      [healthRoot.rows[0].id]
    );

    const masalaSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('masala', $1, 'coral', 0) RETURNING id`,
      [recipeRoot.rows[0].id]
    );

    const claudeSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('claude', $1, 'mint', 0) RETURNING id`,
      [aiRoot.rows[0].id]
    );
    const aiAgentSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('AI Agent', $1, 'mint', 1) RETURNING id`,
      [aiRoot.rows[0].id]
    );

    const partnerSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Partner', $1, 'sand', 0) RETURNING id`,
      [relRoot.rows[0].id]
    );
    const kidsSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Kids', $1, 'sand', 1) RETURNING id`,
      [relRoot.rows[0].id]
    );

    const localSeoSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Local seo', $1, 'mint', 0) RETURNING id`,
      [businessRoot.rows[0].id]
    );
    const empSub = await client.query(
      `INSERT INTO tags (name, parent_id, color, sort_order) VALUES ('Employees', $1, 'mint', 1) RETURNING id`,
      [businessRoot.rows[0].id]
    );

    // 5. Note 1: Trip to Kyoto (Starred, Coral, Images, Checklist, Nested Labels)
    const img1File = `${uuidv4()}.png`;
    const img2File = `${uuidv4()}.png`;
    const img3File = `${uuidv4()}.png`;

    await createSampleImage('Kyoto Fushimi Inari ⛩️', '#ff5858', '#f09819', img1File);
    await createSampleImage('Arashiyama Bamboo Grove 🎋', '#11998e', '#38ef7d', img2File);
    await createSampleImage('Kinkaku-ji Golden Pavilion ✨', '#f7971e', '#ffd200', img3File);

    const thumb1 = await processAttachment(path.join(UPLOAD_DIR, img1File), img1File, 'image/png', UPLOAD_DIR);
    const thumb2 = await processAttachment(path.join(UPLOAD_DIR, img2File), img2File, 'image/png', UPLOAD_DIR);
    const thumb3 = await processAttachment(path.join(UPLOAD_DIR, img3File), img3File, 'image/png', UPLOAD_DIR);

    const note1Res = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        ownerId,
        'Trip to Kyoto & Tokyo 🌸',
        'Exploring traditional shrines, tea houses, and modern design hubs.',
        'coral',
        true,
        false,
      ]
    );
    const note1Id = note1Res.rows[0].id;

    await client.query(
      `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename)
       VALUES 
       ($1, $2, 'fushimi_inari_gates.png', 'image/png', 45200, $3, $4, $5),
       ($1, $6, 'arashiyama_bamboo.png', 'image/png', 48100, $7, $8, $9),
       ($1, $10, 'kinkakuji_golden.png', 'image/png', 52300, $11, $12, $13)`,
      [
        note1Id,
        img1File, thumb1.width, thumb1.height, thumb1.thumbnailFilename,
        img2File, thumb2.width, thumb2.height, thumb2.thumbnailFilename,
        img3File, thumb3.width, thumb3.height, thumb3.thumbnailFilename,
      ]
    );

    const n1Checks = [
      { text: 'Book Shinkansen express train tickets', done: true, pos: 0 },
      { text: 'Reserve tea ceremony at Uji', done: true, pos: 1 },
      { text: 'Visit Fushimi Inari shrine at sunrise', done: false, pos: 2 },
      { text: 'Gion evening photography walk', done: false, pos: 3 },
      { text: 'Try authentic Kyoto matcha parfait', done: false, pos: 4 },
    ];
    for (const c of n1Checks) {
      await client.query(
        'INSERT INTO checklist_items (note_id, text, is_completed, position) VALUES ($1, $2, $3, $4)',
        [note1Id, c.text, c.done, c.pos]
      );
    }
    await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2), ($1, $3)', [
      note1Id,
      personalRoot.rows[0].id,
      wisdomSub.rows[0].id,
    ]);

    // 6. Note 2: Weekly Meal Prep (Sand, Checklist, Recipe Image, Nested Label)
    const recipeImg = `${uuidv4()}.png`;
    await createSampleImage('Avocado Green Goddess Bowl 🥑', '#56ab2f', '#a8e063', recipeImg);
    const thumbRecipe = await processAttachment(path.join(UPLOAD_DIR, recipeImg), recipeImg, 'image/png', UPLOAD_DIR);

    const note2Res = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        ownerId,
        'Weekly Grocery & Healthy Meal Prep 🥑',
        'Ingredients for Mediterranean grain bowls and fresh smoothies.',
        'sand',
        true,
        false,
      ]
    );
    const note2Id = note2Res.rows[0].id;

    await client.query(
      `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename)
       VALUES ($1, $2, 'green_goddess_bowl.png', 'image/png', 38900, $3, $4, $5)`,
      [note2Id, recipeImg, thumbRecipe.width, thumbRecipe.height, thumbRecipe.thumbnailFilename]
    );

    const n2Checks = [
      { text: 'Organic baby spinach & kale', done: true, pos: 0 },
      { text: 'Ripe avocados (x4)', done: true, pos: 1 },
      { text: 'Greek yogurt & oat milk', done: false, pos: 2 },
      { text: 'Quinoa & farro grains', done: false, pos: 3 },
      { text: 'Extra virgin olive oil', done: false, pos: 4 },
    ];
    for (const c of n2Checks) {
      await client.query(
        'INSERT INTO checklist_items (note_id, text, is_completed, position) VALUES ($1, $2, $3, $4)',
        [note2Id, c.text, c.done, c.pos]
      );
    }
    await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2), ($1, $3)', [
      note2Id,
      healthRoot.rows[0].id,
      exerSub.rows[0].id,
    ]);

    // 7. Note 3: 2026 System Architecture (Mint, PDF Doc, Work / Employees label)
    const docFile = `architecture_spec_${uuidv4().substring(0, 8)}.pdf`;
    createSampleDoc(docFile, '%PDF-1.4 QuickNotes App System Architecture Specification 2026');

    const note3Res = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        ownerId,
        '2026 Microservices Architecture Spec ⚡',
        'Node.js 26 async runtime with PostgreSQL 18 partitioned storage. Multi-tier storage providers (Local, S3/R2/B2, Google Drive). Automated backup verification pipeline.',
        'mint',
        false,
        false,
      ]
    );
    const note3Id = note3Res.rows[0].id;

    await client.query(
      `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename)
       VALUES ($1, $2, 'architecture_spec_2026.pdf', 'application/pdf', 1048576, NULL, NULL, NULL)`,
      [note3Id, docFile]
    );
    await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2), ($1, $3)', [
      note3Id,
      businessRoot.rows[0].id,
      empSub.rows[0].id,
    ]);

    // 8. Note 4: Design System (Blossom, 2 images, Personal / Self Improvement label)
    const designImg1 = `${uuidv4()}.png`;
    const designImg2 = `${uuidv4()}.png`;
    await createSampleImage('Design System Tokens 🎨', '#8a2387', '#e94057', designImg1);
    await createSampleImage('Fluid Layout & Typography 📐', '#4776e6', '#8e54e9', designImg2);

    const thumbDesign1 = await processAttachment(path.join(UPLOAD_DIR, designImg1), designImg1, 'image/png', UPLOAD_DIR);
    const thumbDesign2 = await processAttachment(path.join(UPLOAD_DIR, designImg2), designImg2, 'image/png', UPLOAD_DIR);

    const note4Res = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        ownerId,
        'QuickNotes Design System & Color Tokens 🎨',
        'Google Keep pastel palette implementation with adaptive dark mode tokens and 2-step nested label hierarchy.',
        'blossom',
        false,
        false,
      ]
    );
    const note4Id = note4Res.rows[0].id;

    await client.query(
      `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename)
       VALUES 
       ($1, $2, 'tokens_spec.png', 'image/png', 64200, $3, $4, $5),
       ($1, $6, 'typography_hierarchy.png', 'image/png', 58300, $7, $8, $9)`,
      [
        note4Id,
        designImg1, thumbDesign1.width, thumbDesign1.height, thumbDesign1.thumbnailFilename,
        designImg2, thumbDesign2.width, thumbDesign2.height, thumbDesign2.thumbnailFilename,
      ]
    );
    await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2), ($1, $3)', [
      note4Id,
      personalRoot.rows[0].id,
      selfImpSub.rows[0].id,
    ]);

    await client.query('COMMIT');
    console.log('Database successfully seeded with Owner & API users, 2-step nested labels, and sample notes!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed database:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
