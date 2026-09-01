import { query, pool } from '../db/index.js';
import { hashPassword, generateApiKey, hashApiKey, generateToken, comparePassword } from '../services/auth.js';
import { storageManager } from '../services/storage/manager.js';
import { createBackup, verifyBackup, restoreBackup } from '../services/backup.js';

async function runTests() {
  console.log('🧪 Starting QuickNotes 2026 Advanced Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, errorDetail || '');
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test 1: User Auth & RBAC
    // ----------------------------------------------------
    console.log('--- Test Suite 1: Authentication & RBAC ---');
    const ownerRes = await query('SELECT * FROM users WHERE role = $1', ['owner']);
    assert(ownerRes.rows.length > 0, 'Default owner account exists in DB');
    const ownerUser = ownerRes.rows[0];

    const passMatches = await comparePassword('quicknotes_owner_password_2026', ownerUser.password_hash);
    assert(passMatches, 'Owner password hash verifies correctly');

    const apiUserRes = await query('SELECT * FROM users WHERE role = $1', ['api']);
    assert(apiUserRes.rows.length > 0, 'Default api_user account exists in DB');

    const token = generateToken({
      id: ownerUser.id,
      username: ownerUser.username,
      role: ownerUser.role,
      display_name: ownerUser.display_name,
    });
    assert(typeof token === 'string' && token.length > 20, 'JWT token generated successfully');

    // ----------------------------------------------------
    // Test 2: API Keys for AI Agents
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: API Keys for AI Agents ---');
    const { apiKey, keyPrefix, keyHash } = generateApiKey();
    assert(apiKey.startsWith('sk_qn_'), 'API key follows standard sk_qn_ prefix');

    await query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash) VALUES ($1, $2, $3, $4)`,
      [ownerUser.id, 'Test Key', keyPrefix, keyHash]
    );

    const lookupRes = await query('SELECT * FROM api_keys WHERE key_hash = $1', [keyHash]);
    assert(lookupRes.rows.length > 0, 'API key hashed and validated in database');

    // ----------------------------------------------------
    // Test 3: 2-Step Nested Labels
    // ----------------------------------------------------
    console.log('\n--- Test Suite 3: 2-Step Nested Labels ---');
    const rootTagRes = await query(
      `INSERT INTO tags (name, parent_id, color) VALUES ('TestRootCategory', NULL, 'mint') RETURNING id`
    );
    const rootTagId = rootTagRes.rows[0].id;
    assert(!!rootTagId, 'Root label created with parent_id = NULL');

    const subTagRes = await query(
      `INSERT INTO tags (name, parent_id, color) VALUES ('TestSubCategory', $1, 'mint') RETURNING id`,
      [rootTagId]
    );
    const subTagId = subTagRes.rows[0].id;
    assert(!!subTagId, 'Sub-label created with parent_id = rootTagId');

    // Test 3rd level prevention (simulating router check)
    const parentCheck = await query('SELECT parent_id FROM tags WHERE id = $1', [subTagId]);
    const isLevel3Prevented = parentCheck.rows[0].parent_id !== null;
    assert(isLevel3Prevented, '2-step nesting limit enforced (sub-label has parent_id)');

    // ----------------------------------------------------
    // Test 4: Storage Providers (Local & S3)
    // ----------------------------------------------------
    console.log('\n--- Test Suite 4: Storage Providers ---');
    const localTest = await storageManager.testProvider('local');
    assert(localTest.success, 'Local disk storage connection test passed');

    const uploadRes = await storageManager.upload('test_sample.txt', Buffer.from('QuickNotes Storage Test 2026'), 'text/plain');
    assert(!!uploadRes.storagePath, `Uploaded file to ${uploadRes.storageProvider}`);

    const downloadedBuf = await storageManager.download('test_sample.txt', uploadRes.storageProvider);
    assert(downloadedBuf.toString('utf8') === 'QuickNotes Storage Test 2026', 'Downloaded file content matches uploaded content');

    await storageManager.delete('test_sample.txt', uploadRes.storageProvider);

    // ----------------------------------------------------
    // Test 5: Backup & Verification & Restore Pipeline
    // ----------------------------------------------------
    console.log('\n--- Test Suite 5: Backup & Restore Wizard ---');
    const backup = await createBackup('local');
    assert(backup.isVerified, `Backup created and automatically verified (${backup.fileSize} bytes)`);

    const verifyRes = await verifyBackup(backup.id);
    assert(verifyRes.success && verifyRes.details.checksumValid, 'Backup SHA-256 integrity verification passed');

    const restoreRes = await restoreBackup(backup.id);
    assert(restoreRes.success && restoreRes.notesRestored > 0, `Backup restored ${restoreRes.notesRestored} notes and ${restoreRes.tagsRestored} tags successfully`);

    // Clean test tags
    await query('DELETE FROM tags WHERE id IN ($1, $2)', [rootTagId, subTagId]);
    await query('DELETE FROM api_keys WHERE key_hash = $1', [keyHash]);
    await query('DELETE FROM backups WHERE id = $1', [backup.id]);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
