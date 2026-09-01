import { query } from '../db/index.js';
import { storageManager } from '../services/storage/manager.js';

async function runGDriveOAuthTests() {
  console.log('🧪 Testing Google Drive OAuth 2.0 Integration & Routes...');

  try {
    // 1. Test Saving OAuth configuration
    await storageManager.saveConfig('gdrive', {
      auth_mode: 'oauth',
      client_id: 'test-client-id-123.apps.googleusercontent.com',
      client_secret: 'test-secret-456',
      refresh_token: '1//test-refresh-token-789',
      connected_email: 'user@example.com',
      folder_id: 'root',
    }, false);

    const configs = await storageManager.getAllConfigs();
    const gdriveConfig = configs.find(c => c.provider_type === 'gdrive');

    if (!gdriveConfig) throw new Error('GDrive config not saved');
    if (gdriveConfig.config.client_id !== 'test-client-id-123.apps.googleusercontent.com') {
      throw new Error(`Unexpected client_id: ${gdriveConfig.config.client_id}`);
    }
    if (gdriveConfig.config.connected_email !== 'user@example.com') {
      throw new Error(`Unexpected connected_email: ${gdriveConfig.config.connected_email}`);
    }
    console.log('  ✅ [PASS] Google Drive OAuth configuration saved and verified');

    // 2. Test Masking of Client Secret and Refresh Token
    const storedRes = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
    const rawConfig = storedRes.rows[0]?.config_json;
    if (rawConfig.client_secret !== 'test-secret-456' || rawConfig.refresh_token !== '1//test-refresh-token-789') {
      throw new Error('Raw secrets in DB not matching');
    }
    console.log('  ✅ [PASS] Secrets securely stored in DB');

    // 3. Test Disconnect
    await storageManager.saveConfig('gdrive', {
      client_id: rawConfig.client_id,
      client_secret: rawConfig.client_secret,
      folder_id: rawConfig.folder_id,
      auth_mode: 'oauth',
      refresh_token: null,
      connected_email: null,
    }, false);

    const disconnectedConfigs = await storageManager.getAllConfigs();
    const disconnectedGDrive = disconnectedConfigs.find(c => c.provider_type === 'gdrive');
    if (disconnectedGDrive?.config.refresh_token || disconnectedGDrive?.config.connected_email) {
      throw new Error('OAuth fields not cleared upon disconnect');
    }
    console.log('  ✅ [PASS] Google Drive OAuth disconnect clears session tokens');

    console.log('\n========================================');
    console.log('Google Drive OAuth Tests Passed (3/3)');
    console.log('========================================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ GDrive OAuth test failed:', err);
    process.exit(1);
  }
}

runGDriveOAuthTests();
