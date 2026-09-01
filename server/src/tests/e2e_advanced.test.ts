import { pool } from '../db/index.js';
import { login, fetchCurrentUser } from '../api/client.js';
import { generateApiKey, hashApiKey, generateToken } from '../services/auth.js';
import { createBackup, verifyBackup, restoreBackup } from '../services/backup.js';
import { storageManager } from '../services/storage/manager.js';

const API_HOST = process.env.API_HOST || 'http://localhost:3000/api';

async function runE2E() {
  console.log('🚀 Running Comprehensive E2E Advanced Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`, detail || '');
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // 1. Auth & Token Generation
    // ----------------------------------------------------
    console.log('--- Suite 1: Authentication & Token Lifecycle ---');
    const ownerLoginRes = await fetch(`${API_HOST}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'quicknotes_owner_password_2026' }),
    });
    const ownerLoginData = await ownerLoginRes.json();
    assert(ownerLoginRes.status === 200 && !!ownerLoginData.token, 'Owner login succeeds with JWT');
    const ownerToken = ownerLoginData.token;

    // Verify API user CANNOT login to UI auth endpoint (Must be 403 Forbidden)
    const apiLoginRes = await fetch(`${API_HOST}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'api_user', password: 'quicknotes_api_password_2026' }),
    });
    assert(apiLoginRes.status === 403, 'API User login to UI endpoint is rejected (403 Forbidden)');

    // Owner creates an API key for api_user
    const usersRes = await fetch(`${API_HOST}/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const usersData = await usersRes.json();
    const apiUserRecord = usersData.find((u: any) => u.role === 'api');

    const apiKeyRes = await fetch(`${API_HOST}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'E2E Agent API Key', user_id: apiUserRecord?.id }),
    });
    const apiKeyData = await apiKeyRes.json();
    const apiKey = apiKeyData.apiKey;
    assert(apiKeyRes.status === 201 && !!apiKey && apiKey.startsWith('sk_qn_'), 'Owner created API key for agent access');

    const apiHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    // ----------------------------------------------------
    // 2. RBAC Enforcement
    // ----------------------------------------------------
    console.log('\n--- Suite 2: Role-Based Access Control (RBAC) ---');
    // Note created by API User using API Key
    const createNoteRes = await fetch(`${API_HOST}/notes`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ title: 'Agent Created Note', content: 'Autonomous task log', color: 'storm' }),
    });
    const createdNote = await createNoteRes.json();
    assert(createNoteRes.status === 201 && !!createdNote.id, 'API user CAN create notes with API key');

    // API User tries to DELETE note (Must be Forbidden 403)
    const deleteAttempt = await fetch(`${API_HOST}/notes/${createdNote.id}`, {
      method: 'DELETE',
      headers: apiHeaders,
    });
    assert(deleteAttempt.status === 403, 'API user CANNOT delete notes (403 Forbidden enforced)');

    // API User tries to empty trash (Must be Forbidden 403)
    const emptyTrashAttempt = await fetch(`${API_HOST}/notes/empty-trash`, {
      method: 'POST',
      headers: apiHeaders,
    });
    assert(emptyTrashAttempt.status === 403, 'API user CANNOT empty trash (403 Forbidden enforced)');

    // API User tries to access /api/users (Must be Forbidden 403)
    const usersAttempt = await fetch(`${API_HOST}/users`, {
      headers: apiHeaders,
    });
    assert(usersAttempt.status === 403, 'API user CANNOT access Settings/Users (403 Forbidden enforced)');

    // API User tries to access /api/storage/configs (Must be Forbidden 403)
    const storageAttempt = await fetch(`${API_HOST}/storage/configs`, {
      headers: apiHeaders,
    });
    assert(storageAttempt.status === 403, 'API user CANNOT access Settings/Storage (403 Forbidden enforced)');

    // API User tries to access /api/backups (Must be Forbidden 403)
    const backupAttempt = await fetch(`${API_HOST}/backups`, {
      headers: apiHeaders,
    });
    assert(backupAttempt.status === 403, 'API user CANNOT access Settings/Backups (403 Forbidden enforced)');

    // API User CAN manage labels under /api/tags
    const labelCreateRes = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ name: 'Agent Label', color: 'fog' }),
    });
    assert(labelCreateRes.status === 201, 'API user CAN access Settings/Labels and create labels');
    const agentLabel = await labelCreateRes.json();

    // Owner CAN delete the note
    const ownerDeleteRes = await fetch(`${API_HOST}/notes/${createdNote.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(ownerDeleteRes.status === 200, 'Owner CAN delete notes');

    // ----------------------------------------------------
    // 3. 2-Step Nested Labels
    // ----------------------------------------------------
    console.log('\n--- Suite 3: 2-Step Nested Labels Hierarchy ---');
    // Create Root Label
    const rootTagRes = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Engineering', color: 'storm' }),
    });
    const rootTag = await rootTagRes.json();
    assert(rootTagRes.status === 201 && rootTag.parent_id === null, 'Root label created with parent_id = NULL');

    // Create Sub-Label under Engineering
    const subTagRes = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Database', parent_id: rootTag.id, color: 'storm' }),
    });
    const subTag = await subTagRes.json();
    assert(subTagRes.status === 201 && subTag.parent_id === rootTag.id, 'Sub-label created under root label');

    // Attempt to create 3rd level sub-label under Database (Must be rejected with 400)
    const level3Res = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Postgres 18', parent_id: subTag.id, color: 'storm' }),
    });
    assert(level3Res.status === 400, '3rd level nested label rejected (max 2 levels enforced)');

    // ----------------------------------------------------
    // 4. Center Search & Multi-Label / Date Filters
    // ----------------------------------------------------
    console.log('\n--- Suite 4: Search & Multi-Label / Date Range Filtering ---');
    const multiTagRes = await fetch(`${API_HOST}/notes?tag_ids=${rootTag.id},${subTag.id}&tag_match=or`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(multiTagRes.status === 200, 'Multi-label filtering with tag_match=or succeeds');

    const dateFilterRes = await fetch(`${API_HOST}/notes?date_from=2026-01-01&date_to=2026-12-31`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(dateFilterRes.status === 200, 'Date range filtering succeeds');

    // ----------------------------------------------------
    // 5. API Keys & AI Agent Tools
    // ----------------------------------------------------
    console.log('\n--- Suite 5: AI Agent Tool Schemas & API Keys ---');
    const aiToolsRes = await fetch(`${API_HOST}/docs/ai-tools`);
    const aiToolsData = await aiToolsRes.json();
    assert(aiToolsRes.status === 200 && Array.isArray(aiToolsData.tools) && aiToolsData.tools.length >= 4, 'AI tool schemas returned for OpenAI/Gemini/Claude');

    const specRes = await fetch(`${API_HOST}/docs/spec`);
    const specData = await specRes.json();
    assert(specRes.status === 200 && specData.openapi === '3.1.0', 'OpenAPI 3.1 specification returned');

    // ----------------------------------------------------
    // 6. Storage Providers & Backup / Restore Wizard
    // ----------------------------------------------------
    console.log('\n--- Suite 6: Storage Drivers & Backup/Restore Wizard ---');
    const localTestRes = await fetch(`${API_HOST}/storage/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ provider_type: 'local' }),
    });
    const localTestData = await localTestRes.json();
    assert(localTestData.success === true, 'Local disk storage connection test passes');

    const createBackupRes = await fetch(`${API_HOST}/backups/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ storage_provider: 'local' }),
    });
    const backupData = await createBackupRes.json();
    assert(createBackupRes.status === 201 && (backupData.backup.isVerified === true || backupData.backup.is_verified === true), 'Backup created and SHA256 verified');

    const verifyBackupRes = await fetch(`${API_HOST}/backups/${backupData.backup.id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const verifyData = await verifyBackupRes.json();
    assert(verifyData.details.checksumValid === true, 'Backup verification endpoint confirms valid checksum');

    const restoreBackupRes = await fetch(`${API_HOST}/backups/${backupData.backup.id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const restoreData = await restoreBackupRes.json();
    assert(restoreBackupRes.status === 200 && restoreData.result.success === true, 'Backup restore completes successfully');

    // Clean up test tags
    await fetch(`${API_HOST}/tags/${subTag.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });
    await fetch(`${API_HOST}/tags/${rootTag.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });
    await fetch(`${API_HOST}/tags/${agentLabel.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });
    await fetch(`${API_HOST}/backups/${backupData.backup.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });

  } catch (err) {
    console.error('Fatal E2E error:', err);
    failed++;
  } finally {
    console.log(`\n========================================`);
    console.log(`E2E Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2E();
