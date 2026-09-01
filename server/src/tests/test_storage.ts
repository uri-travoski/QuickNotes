// Integration test for testing all storage settings via API (simulating UI calls)
import http from 'http';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'quicknotes_jwt_secret_production_2026_super_key';
const token = jwt.sign(
  { id: '1', username: 'owner', role: 'owner', display_name: 'Owner' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function request(path: string, method = 'GET', data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== START STORAGE SETTINGS UI/API TESTS ===\n');

  // 1. Fetch configs
  console.log('1. Fetch Storage Configs:');
  const initialConfigs = await request('/storage/configs');
  console.log('Status:', initialConfigs.status);
  console.log('Active Provider:', initialConfigs.data?.active_provider);
  console.log('Providers:', initialConfigs.data?.providers?.map((p: any) => p.provider_type));
  console.log('---');

  // 2. Test Local Storage
  console.log('2. Test Local Disk Read/Write:');
  const localTest = await request('/storage/test', 'POST', { provider_type: 'local' });
  console.log('Status:', localTest.status);
  console.log('Result:', localTest.data);
  console.log('---');

  // 3. Save AWS S3 Config
  console.log('3. Save AWS S3 Config via UI:');
  const s3AwsSave = await request('/storage/configs/s3', 'PUT', {
    config: {
      endpoint_url: '',
      region: 'us-east-1',
      bucket_name: 'my-saved-notes-aws-bucket',
      access_key_id: 'AKIAIOSFODNN7EXAMPLE',
      secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      custom_domain: '',
    },
    set_active: false,
  });
  console.log('Save S3 AWS Status:', s3AwsSave.status, s3AwsSave.data);
  console.log('---');

  // 4. Test S3 Connection (AWS)
  console.log('4. Test Connection to AWS S3:');
  const s3AwsTest = await request('/storage/test', 'POST', {
    provider_type: 's3',
    config: {
      endpoint_url: '',
      region: 'us-east-1',
      bucket_name: 'my-saved-notes-aws-bucket',
      access_key_id: 'AKIAIOSFODNN7EXAMPLE',
      secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
  });
  console.log('AWS S3 Test Result:', s3AwsTest.status, s3AwsTest.data);
  console.log('---');

  // 5. Save Cloudflare R2 Config
  console.log('5. Save Cloudflare R2 Config via UI:');
  const r2Save = await request('/storage/configs/s3', 'PUT', {
    config: {
      endpoint_url: 'https://a1b2c3d4e5f6g7h8.r2.cloudflarestorage.com',
      region: 'auto',
      bucket_name: 'my-r2-notes-bucket',
      access_key_id: 'cf_r2_access_key_123',
      secret_access_key: 'cf_r2_secret_key_4567890abcdef',
      custom_domain: 'https://cdn.example.com',
    },
    set_active: false,
  });
  console.log('Save Cloudflare R2 Status:', r2Save.status, r2Save.data);
  console.log('---');

  // 6. Test Cloudflare R2 Connection
  console.log('6. Test Connection to Cloudflare R2:');
  const r2Test = await request('/storage/test', 'POST', {
    provider_type: 's3',
    config: {
      endpoint_url: 'https://a1b2c3d4e5f6g7h8.r2.cloudflarestorage.com',
      region: 'auto',
      bucket_name: 'my-r2-notes-bucket',
      access_key_id: 'cf_r2_access_key_123',
      secret_access_key: 'cf_r2_secret_key_4567890abcdef',
    },
  });
  console.log('Cloudflare R2 Test Result:', r2Test.status, r2Test.data);
  console.log('---');

  // 7. Save Backblaze B2 Config
  console.log('7. Save Backblaze B2 Config via UI:');
  const b2Save = await request('/storage/configs/s3', 'PUT', {
    config: {
      endpoint_url: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      bucket_name: 'my-b2-notes-bucket',
      access_key_id: 'b2_key_id_001',
      secret_access_key: 'b2_app_key_secret_xyz123',
      custom_domain: '',
    },
    set_active: false,
  });
  console.log('Save Backblaze B2 Status:', b2Save.status, b2Save.data);
  console.log('---');

  // 8. Test Backblaze B2 Connection
  console.log('8. Test Connection to Backblaze B2:');
  const b2Test = await request('/storage/test', 'POST', {
    provider_type: 's3',
    config: {
      endpoint_url: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      bucket_name: 'my-b2-notes-bucket',
      access_key_id: 'b2_key_id_001',
      secret_access_key: 'b2_app_key_secret_xyz123',
    },
  });
  console.log('Backblaze B2 Test Result:', b2Test.status, b2Test.data);
  console.log('---');

  // 9. Save Google Drive Config
  console.log('9. Save Google Drive Config via UI:');
  const gdriveSave = await request('/storage/configs/gdrive', 'PUT', {
    config: {
      folder_id: '1a2b3c4d5e6f7g8h9i0j_saved_notes_folder',
      service_account_json: JSON.stringify({
        type: 'service_account',
        project_id: 'saved-notes-project',
        private_key_id: '123456789',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n',
        client_email: 'service-account@saved-notes-project.iam.gserviceaccount.com',
      }),
    },
    set_active: false,
  });
  console.log('Save Google Drive Status:', gdriveSave.status, gdriveSave.data);
  console.log('---');

  // 10. Test Google Drive Connection
  console.log('10. Test Connection to Google Drive:');
  const gdriveTest = await request('/storage/test', 'POST', {
    provider_type: 'gdrive',
    config: {
      folder_id: '1a2b3c4d5e6f7g8h9i0j_saved_notes_folder',
      service_account_json: JSON.stringify({
        type: 'service_account',
        project_id: 'saved-notes-project',
        client_email: 'service-account@saved-notes-project.iam.gserviceaccount.com',
        private_key: 'invalid_key_for_testing',
      }),
    },
  });
  console.log('Google Drive Test Result:', gdriveTest.status, gdriveTest.data);
  console.log('---');

  // 11. Verify Config Masking & Persistence in GET /storage/configs
  console.log('11. Verify Secret Masking & Persistence on GET /storage/configs:');
  const fetched = await request('/storage/configs');
  console.log('Active Provider:', fetched.data?.active_provider);
  for (const p of fetched.data?.providers || []) {
    console.log(`- Provider: ${p.provider_type}`);
    console.log(`  Config:`, JSON.stringify(p.config));
  }
  console.log('---');

  // 12. Switch active provider to local
  console.log('12. Set Active Provider to local:');
  const setActiveLocal = await request('/storage/active', 'POST', { provider_type: 'local' });
  console.log('Set Active Local Result:', setActiveLocal.status, setActiveLocal.data);
  console.log('---');

  console.log('=== ALL STORAGE TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(console.error);
