/**
 * RBAC Parity Test — Owner vs API user privilege verification.
 *
 * Verifies that the 'api' role can do EVERYTHING the 'owner' role can,
 * EXCEPT:
 *   - delete notes (permanent delete, empty trash, move-to-trash / restore via trash endpoint)
 *   - delete labels
 *   - User Management & Roles (/api/users/*)
 *   - Storage settings (/api/storage/*)
 *   - Backups (/api/backups/*)
 *   - API key management (/api/api-keys/*)
 *   - Web UI password login (programmatic access only)
 *
 * Requires a running server (default http://localhost:5000/api, override API_HOST).
 */
import { pool, query } from '../db/index.js';

const API_HOST = process.env.API_HOST || 'http://localhost:5000/api';
const OWNER_USER = process.env.DEFAULT_OWNER_USERNAME || 'owner';
const OWNER_PASS = process.env.DEFAULT_OWNER_PASSWORD || 'quicknotes_owner_password_2026';
const API_USER_NAME = process.env.DEFAULT_API_USERNAME || 'api_user';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}`, detail !== undefined ? `-> got: ${JSON.stringify(detail)}` : '');
    failed++;
    failures.push(name);
  }
}

async function call(
  headers: Record<string, string>,
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_HOST}${path}`, {
    method,
    headers: body instanceof FormData ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// Tiny 1x1 PNG for attachment upload tests
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function testRbacParity() {
  console.log('🧪 RBAC Parity Test: Owner vs API User\n');

  // ------------------------------------------------------------------
  // Setup: authenticate as owner (JWT) and resolve an API user's API key
  // ------------------------------------------------------------------
  console.log('--- Suite 0: Authentication Setup ---');

  const login = await call({}, 'POST', '/auth/login', { username: OWNER_USER, password: OWNER_PASS });
  assert(login.status === 200 && !!login.data.token && login.data.user.role === 'owner', 'Owner can log in to web UI', login.status);
  const ownerH = { Authorization: `Bearer ${login.data.token}` };

  const apiLogin = await call({}, 'POST', '/auth/login', {
    username: API_USER_NAME,
    password: process.env.DEFAULT_API_PASSWORD || 'quicknotes_api_password_2026',
  });
  assert(apiLogin.status === 403, 'API user is blocked from web UI password login', apiLogin.status);

  // Resolve an API key for the api user (owner-only route used for test setup)
  const usersList = await call(ownerH, 'GET', '/users');
  const apiUser = (usersList.data || []).find((u: any) => u.role === 'api');
  assert(!!apiUser, 'An api-role user exists in the database');

  // Verify the seeded demo key works; otherwise mint a fresh one for the test
  let apiKey = 'sk_qn_demo_agent_key_2026_test123';
  let meApi = await call({ 'X-API-Key': apiKey }, 'GET', '/auth/me');
  if (meApi.status !== 200 || !meApi.data.authenticated) {
    const fresh = await call(ownerH, 'POST', '/api-keys', { name: 'rbac_parity_auth_key', user_id: apiUser.id });
    apiKey = fresh.data.apiKey;
  }
  const apiH = { 'X-API-Key': apiKey };
  meApi = await call(apiH, 'GET', '/auth/me');
  assert(meApi.status === 200 && meApi.data.authenticated && meApi.data.user.role === 'api', 'API user authenticates via API key', meApi.status);
  const apiKeyIdToCleanup = apiKey === 'sk_qn_demo_agent_key_2026_test123' ? null : undefined; // resolved later

  const meOwner = await call(ownerH, 'GET', '/auth/me');
  assert(meOwner.status === 200 && meOwner.data.authenticated && meOwner.data.user.role === 'owner', 'Owner /auth/me returns owner role');

  const unauthNotes = await call({}, 'GET', '/notes');
  assert(unauthNotes.status === 401, 'Unauthenticated requests are rejected with 401', unauthNotes.status);

  const logoutOwner = await call(ownerH, 'POST', '/auth/logout');
  const logoutApi = await call(apiH, 'POST', '/auth/logout');
  assert(logoutOwner.status === 200 && logoutApi.status === 200, 'Logout works for both roles');

  // ------------------------------------------------------------------
  // API Docs (public, both roles)
  // ------------------------------------------------------------------
  console.log('\n--- Suite 1: API Documentation ---');
  for (const [name, h] of [['Owner', ownerH], ['API user', apiH]] as const) {
    const spec = await call(h, 'GET', '/docs/spec');
    const tools = await call(h, 'GET', '/docs/ai-tools');
    assert(spec.status === 200 && tools.status === 200, `${name}: can read OpenAPI spec & AI tools`, `${spec.status}/${tools.status}`);
  }

  // ------------------------------------------------------------------
  // Notes — full parity except deletion
  // ------------------------------------------------------------------
  console.log('\n--- Suite 2: Notes - Allowed Operations (parity) ---');
  const createdByOwner: string[] = [];
  const createdByApi: string[] = [];
  const suffix = Math.random().toString(36).substring(2, 7);

  for (const [name, h, bucket] of [['Owner', ownerH, createdByOwner], ['API user', apiH, createdByApi]] as const) {
    const create = await call(h, 'POST', '/notes', {
      title: `RBAC ${name} ${suffix}`,
      content: 'Parity test note',
      color: 'mint',
      is_starred: false,
      checklist_items: [{ text: 'step 1' }, { text: 'step 2', is_completed: true }],
    });
    assert(create.status === 201 && !!create.data.id, `${name}: create note`, create.status);
    bucket.push(create.data.id);
    const noteId = create.data.id;

    const get = await call(h, 'GET', `/notes/${noteId}`);
    assert(get.status === 200 && get.data.id === noteId, `${name}: get single note`, get.status);

    const list = await call(h, 'GET', '/notes');
    assert(list.status === 200 && Array.isArray(list.data) && list.data.some((n: any) => n.id === noteId), `${name}: list notes`, list.status);

    for (const view of ['starred', 'archive', 'trash']) {
      const v = await call(h, 'GET', `/notes?view=${view}`);
      assert(v.status === 200, `${name}: view=${view}`, v.status);
    }

    const search = await call(h, 'GET', `/notes?q=RBAC&has_checklist=true&color=mint`);
    assert(search.status === 200 && search.data.some((n: any) => n.id === noteId), `${name}: search + type/color filters`, search.status);

    const counts = await call(h, 'GET', '/notes/counts');
    assert(counts.status === 200 && typeof counts.data.notes === 'number', `${name}: note counts`, counts.status);

    const update = await call(h, 'PUT', `/notes/${noteId}`, { title: `RBAC ${name} ${suffix} (edited)`, content: 'updated', color: 'storm' });
    assert(update.status === 200 && update.data.title.includes('edited'), `${name}: update note`, update.status);

    const star = await call(h, 'PATCH', `/notes/${noteId}/star`);
    assert(star.status === 200 && star.data.is_starred === true, `${name}: star note`, star.status);

    const archive = await call(h, 'PATCH', `/notes/${noteId}/archive`, { is_archived: true });
    assert(archive.status === 200 && archive.data.is_archived === true, `${name}: archive note`, archive.status);
    await call(h, 'PATCH', `/notes/${noteId}/archive`, { is_archived: false });

    const color = await call(h, 'PATCH', `/notes/${noteId}/color`, { color: 'coral' });
    assert(color.status === 200 && color.data.color === 'coral', `${name}: change note color`, color.status);

    const itemId = get.data.checklist_items?.[0]?.id;
    const check = await call(h, 'PATCH', `/notes/${noteId}/checklist-item/${itemId}`, { is_completed: true });
    assert(check.status === 200, `${name}: toggle checklist item`, check.status);

    const dup = await call(h, 'POST', `/notes/${noteId}/duplicate`);
    assert(dup.status === 201 && !!dup.data.id, `${name}: duplicate note`, dup.status);
    bucket.push(dup.data.id);
  }

  // Restore via PUT is_trashed=false is currently permitted for API users
  const restoreNote = await call(ownerH, 'POST', '/notes', { title: `RBAC restore ${suffix}` });
  createdByOwner.push(restoreNote.data.id);
  await call(ownerH, 'PATCH', `/notes/${restoreNote.data.id}/trash`, { is_trashed: true });
  const apiRestorePut = await call(apiH, 'PUT', `/notes/${restoreNote.data.id}`, { is_trashed: false });
  assert(apiRestorePut.status === 200 && apiRestorePut.data.is_trashed === false, 'API user: un-trash via update (is_trashed=false) allowed', apiRestorePut.status);

  console.log('\n--- Suite 3: Notes - Deletion Restrictions (API blocked, Owner allowed) ---');
  const dNote = await call(ownerH, 'POST', '/notes', { title: `RBAC delete-gate ${suffix}` });
  const dId = dNote.data.id;

  const apiTrash = await call(apiH, 'PATCH', `/notes/${dId}/trash`, { is_trashed: true });
  assert(apiTrash.status === 403, 'API user: move note to trash BLOCKED', apiTrash.status);
  const ownerTrash = await call(ownerH, 'PATCH', `/notes/${dId}/trash`, { is_trashed: true });
  assert(ownerTrash.status === 200 && ownerTrash.data.is_trashed === true, 'Owner: move note to trash', ownerTrash.status);

  const apiUntrash = await call(apiH, 'PATCH', `/notes/${dId}/trash`, { is_trashed: false });
  assert(apiUntrash.status === 403, 'API user: restore via trash endpoint BLOCKED', apiUntrash.status);
  const ownerUntrash = await call(ownerH, 'PATCH', `/notes/${dId}/trash`, { is_trashed: false });
  assert(ownerUntrash.status === 200 && ownerUntrash.data.is_trashed === false, 'Owner: restore note from trash', ownerUntrash.status);

  const apiPutTrash = await call(apiH, 'PUT', `/notes/${dId}`, { is_trashed: true });
  assert(apiPutTrash.status === 403, 'API user: trash via PUT update BLOCKED', apiPutTrash.status);
  const ownerPutTrash = await call(ownerH, 'PUT', `/notes/${dId}`, { is_trashed: true });
  assert(ownerPutTrash.status === 200 && ownerPutTrash.data.is_trashed === true, 'Owner: trash via PUT update', ownerPutTrash.status);

  const apiDelete = await call(apiH, 'DELETE', `/notes/${dId}`);
  assert(apiDelete.status === 403, 'API user: permanently delete note BLOCKED', apiDelete.status);
  const apiEmptyTrash = await call(apiH, 'POST', '/notes/empty-trash');
  assert(apiEmptyTrash.status === 403, 'API user: empty trash BLOCKED', apiEmptyTrash.status);

  const ownerDelete = await call(ownerH, 'DELETE', `/notes/${dId}`);
  assert(ownerDelete.status === 200, 'Owner: permanently delete note', ownerDelete.status);

  const ownerEmptyTrash = await call(ownerH, 'POST', '/notes/empty-trash');
  assert(ownerEmptyTrash.status === 200, 'Owner: empty trash', ownerEmptyTrash.status);

  // Bulk delete (Owner-only privilege exposed to API keys)
  const b1 = await call(ownerH, 'POST', '/notes', { title: `RBAC bulk1 ${suffix}` });
  const b2 = await call(ownerH, 'POST', '/notes', { title: `RBAC bulk2 ${suffix}` });
  const apiBulk = await call(apiH, 'POST', '/notes/bulk-delete', { ids: [b1.data.id, b2.data.id] });
  assert(apiBulk.status === 403, 'API user: bulk-delete notes BLOCKED', apiBulk.status);
  const ownerBulk = await call(ownerH, 'POST', '/notes/bulk-delete', { ids: [b1.data.id, b2.data.id] });
  assert(ownerBulk.status === 200 && ownerBulk.data.deletedCount === 2, 'Owner: bulk-delete notes', ownerBulk.status);
  const ownerBulkBad = await call(ownerH, 'POST', '/notes/bulk-delete', { ids: 'not-an-array' });
  assert(ownerBulkBad.status === 400, 'Owner: bulk-delete validates payload', ownerBulkBad.status);

  console.log('\n--- Suite 4: Labels - list/create/update parity, delete restricted ---');
  let labelId: string | null = null;
  for (const [name, h] of [['Owner', ownerH], ['API user', apiH]] as const) {
    const list = await call(h, 'GET', '/tags');
    assert(list.status === 200 && Array.isArray(list.data.flat), `${name}: list labels`, list.status);

    const create = await call(h, 'POST', '/tags', { name: `RBAC_${name}_${suffix}`, color: 'sage' });
    assert(create.status === 201 && !!create.data.id, `${name}: create label`, create.status);
    labelId = create.data.id;

    const update = await call(h, 'PUT', `/tags/${labelId}`, { name: `RBAC_${name}_${suffix}_v2` });
    assert(update.status === 200, `${name}: update label`, update.status);
  }
  const apiDelLabel = await call(apiH, 'DELETE', `/tags/${labelId}`);
  assert(apiDelLabel.status === 403, 'API user: delete label BLOCKED', apiDelLabel.status);
  const ownerDelLabel = await call(ownerH, 'DELETE', `/tags/${labelId}`);
  assert(ownerDelLabel.status === 200, 'Owner: delete label', ownerDelLabel.status);

  console.log('\n--- Suite 5: Attachments - full parity ---');
  for (const [name, h] of [['Owner', ownerH], ['API user', apiH]] as const) {
    const form = new FormData();
    form.append('files', new Blob([PNG_1X1], { type: 'image/png' }), `rbac_${name}_${suffix}.png`);
    const up = await call(h, 'POST', '/attachments/upload', form);
    assert(up.status === 201 && !!up.data[0]?.id, `${name}: upload attachment`, up.status);
    const attId = up.data[0]?.id;

    if (attId) {
      const dlRes = await fetch(`${API_HOST}/attachments/${attId}/download`, { headers: h });
      assert(dlRes.status === 200, `${name}: download attachment`, dlRes.status);

      const del = await call(h, 'DELETE', `/attachments/${attId}`);
      assert(del.status === 200, `${name}: delete attachment`, del.status);
    }
  }

  // ------------------------------------------------------------------
  // Settings sections - Owner only
  // ------------------------------------------------------------------
  console.log('\n--- Suite 6: Settings > User Management & Roles (Owner only) ---');
  const tempUsername = `rbac_temp_${suffix}`;
  const tempUser = await call(ownerH, 'POST', '/users', { username: tempUsername, password: 'temp_password_123', role: 'api', display_name: 'RBAC Temp' });
  assert(tempUser.status === 201 && !!tempUser.data.id, 'Owner: create user', tempUser.status);
  const tempUserId = tempUser.data.id;

  const apiListUsers = await call(apiH, 'GET', '/users');
  assert(apiListUsers.status === 403, 'API user: list users BLOCKED', apiListUsers.status);
  const ownerListUsers = await call(ownerH, 'GET', '/users');
  assert(ownerListUsers.status === 200, 'Owner: list users', ownerListUsers.status);

  const apiCreateUser = await call(apiH, 'POST', '/users', { username: `rbac_temp2_${suffix}`, password: 'temp_password_123' });
  assert(apiCreateUser.status === 403, 'API user: create user BLOCKED', apiCreateUser.status);

  const apiUpdateUser = await call(apiH, 'PUT', `/users/${tempUserId}`, { display_name: 'Hacked' });
  assert(apiUpdateUser.status === 403, 'API user: update user BLOCKED', apiUpdateUser.status);
  const ownerUpdateUser = await call(ownerH, 'PUT', `/users/${tempUserId}`, { display_name: 'RBAC Temp Edited' });
  assert(ownerUpdateUser.status === 200 && ownerUpdateUser.data.display_name === 'RBAC Temp Edited', 'Owner: update user', ownerUpdateUser.status);

  const apiPass = await call(apiH, 'PATCH', `/users/${tempUserId}/password`, { password: 'new_password_123' });
  assert(apiPass.status === 403, 'API user: change user password BLOCKED', apiPass.status);
  const ownerPass2 = await call(ownerH, 'PATCH', `/users/${tempUserId}/password`, { password: 'new_password_123' });
  assert(ownerPass2.status === 200, 'Owner: change user password', ownerPass2.status);

  const apiDelUser = await call(apiH, 'DELETE', `/users/${tempUserId}`);
  assert(apiDelUser.status === 403, 'API user: delete user BLOCKED', apiDelUser.status);
  const ownerDelUser = await call(ownerH, 'DELETE', `/users/${tempUserId}`);
  assert(ownerDelUser.status === 200, 'Owner: delete user', ownerDelUser.status);

  console.log('\n--- Suite 7: Settings > API Keys (Owner only) ---');
  const apiListKeys = await call(apiH, 'GET', '/api-keys');
  assert(apiListKeys.status === 403, 'API user: list API keys BLOCKED', apiListKeys.status);
  const ownerListKeys = await call(ownerH, 'GET', '/api-keys');
  assert(ownerListKeys.status === 200 && Array.isArray(ownerListKeys.data), 'Owner: list API keys', ownerListKeys.status);

  const apiCreateKey = await call(apiH, 'POST', '/api-keys', { name: 'rbac_forbidden_key' });
  assert(apiCreateKey.status === 403, 'API user: create API key BLOCKED', apiCreateKey.status);
  const ownerCreateKey = await call(ownerH, 'POST', '/api-keys', { name: `rbac_temp_key_${suffix}` });
  assert(ownerCreateKey.status === 201 && !!ownerCreateKey.data.apiKey, 'Owner: create API key', ownerCreateKey.status);

  const apiRevokeKey = await call(apiH, 'DELETE', `/api-keys/${ownerCreateKey.data.id}`);
  assert(apiRevokeKey.status === 403, 'API user: revoke API key BLOCKED', apiRevokeKey.status);
  const ownerRevokeKey = await call(ownerH, 'DELETE', `/api-keys/${ownerCreateKey.data.id}`);
  assert(ownerRevokeKey.status === 200, 'Owner: revoke API key', ownerRevokeKey.status);

  console.log('\n--- Suite 8: Settings > Storage (Owner only) ---');
  const apiStorageCfgs = await call(apiH, 'GET', '/storage/configs');
  assert(apiStorageCfgs.status === 403, 'API user: view storage configs BLOCKED', apiStorageCfgs.status);
  const ownerStorageCfgs = await call(ownerH, 'GET', '/storage/configs');
  assert(ownerStorageCfgs.status === 200 && !!ownerStorageCfgs.data.active_provider, 'Owner: view storage configs', ownerStorageCfgs.status);

  const apiTestStorage = await call(apiH, 'POST', '/storage/test', { provider_type: 'local' });
  assert(apiTestStorage.status === 403, 'API user: test storage provider BLOCKED', apiTestStorage.status);
  const ownerTestStorage = await call(ownerH, 'POST', '/storage/test', { provider_type: 'local' });
  assert(ownerTestStorage.status === 200 && ownerTestStorage.data.success === true, 'Owner: test local storage provider', ownerTestStorage.status);

  const apiSaveCfg = await call(apiH, 'PUT', '/storage/configs/local', { config: {}, set_active: true });
  assert(apiSaveCfg.status === 403, 'API user: save storage config BLOCKED', apiSaveCfg.status);
  const localCfg = (ownerStorageCfgs.data.providers || []).find((p: any) => p.id === 'local')?.config || {};
  const ownerSaveCfg = await call(ownerH, 'PUT', '/storage/configs/local', { config: localCfg, set_active: true });
  assert(ownerSaveCfg.status === 200, 'Owner: save storage config', ownerSaveCfg.status);

  const apiSetActive = await call(apiH, 'POST', '/storage/active', { provider_type: 'local' });
  assert(apiSetActive.status === 403, 'API user: set active provider BLOCKED', apiSetActive.status);
  const ownerSetActive = await call(ownerH, 'POST', '/storage/active', { provider_type: 'local' });
  assert(ownerSetActive.status === 200, 'Owner: set active provider', ownerSetActive.status);

  const apiOauthUrl = await call(apiH, 'GET', '/storage/gdrive/oauth/url');
  assert(apiOauthUrl.status === 403, 'API user: Google Drive OAuth URL BLOCKED', apiOauthUrl.status);
  const ownerOauthUrl = await call(ownerH, 'GET', '/storage/gdrive/oauth/url');
  assert(ownerOauthUrl.status !== 403, 'Owner: Google Drive OAuth URL accessible', ownerOauthUrl.status);

  const apiDisconnect = await call(apiH, 'POST', '/storage/gdrive/oauth/disconnect');
  assert(apiDisconnect.status === 403, 'API user: Google Drive disconnect BLOCKED', apiDisconnect.status);

  const apiSync = await call(apiH, 'POST', '/storage/sync');
  assert(apiSync.status === 403, 'API user: storage sync BLOCKED', apiSync.status);
  const ownerSync = await call(ownerH, 'POST', '/storage/sync');
  assert(ownerSync.status === 400, 'Owner: storage sync reaches handler (400 when local active)', ownerSync.status);

  console.log('\n--- Suite 9: Settings > Backups (Owner only) ---');
  const apiListBak = await call(apiH, 'GET', '/backups');
  assert(apiListBak.status === 403, 'API user: list backups BLOCKED', apiListBak.status);
  const ownerListBak = await call(ownerH, 'GET', '/backups');
  assert(ownerListBak.status === 200, 'Owner: list backups', ownerListBak.status);

  const apiSchedGet = await call(apiH, 'GET', '/backups/schedule');
  assert(apiSchedGet.status === 403, 'API user: view backup schedule BLOCKED', apiSchedGet.status);
  const ownerSchedGet = await call(ownerH, 'GET', '/backups/schedule');
  assert(ownerSchedGet.status === 200, 'Owner: view backup schedule', ownerSchedGet.status);

  const apiSchedPost = await call(apiH, 'POST', '/backups/schedule', {});
  assert(apiSchedPost.status === 403, 'API user: update backup schedule BLOCKED', apiSchedPost.status);
  const ownerSchedPost = await call(ownerH, 'POST', '/backups/schedule', {});
  assert(ownerSchedPost.status === 200, 'Owner: update backup schedule', ownerSchedPost.status);

  const apiCreateBak = await call(apiH, 'POST', '/backups/create', { storage_provider: 'local', backup_type: 'database_only' });
  assert(apiCreateBak.status === 403, 'API user: create backup BLOCKED', apiCreateBak.status);
  const ownerCreateBak = await call(ownerH, 'POST', '/backups/create', { storage_provider: 'local', backup_type: 'database_only' });
  assert(ownerCreateBak.status === 201 && !!ownerCreateBak.data.backup?.id, 'Owner: create backup', ownerCreateBak.status);
  const bakId = ownerCreateBak.data.backup?.id;

  const apiVerify = await call(apiH, 'POST', `/backups/${bakId}/verify`);
  assert(apiVerify.status === 403, 'API user: verify backup BLOCKED', apiVerify.status);
  const ownerVerify = await call(ownerH, 'POST', `/backups/${bakId}/verify`);
  assert(ownerVerify.status === 200 && ownerVerify.data.details?.success !== false, 'Owner: verify backup', ownerVerify.status);

  const apiDownload = await call(apiH, 'GET', `/backups/${bakId}/download`);
  assert(apiDownload.status === 403, 'API user: download backup BLOCKED', apiDownload.status);
  const ownerDlRes = await fetch(`${API_HOST}/backups/${bakId}/download`, { headers: ownerH });
  assert(ownerDlRes.status === 200, 'Owner: download backup', ownerDlRes.status);

  const apiRestore = await call(apiH, 'POST', '/backups/00000000-0000-0000-0000-000000000000/restore', {});
  assert(apiRestore.status === 403, 'API user: restore backup BLOCKED', apiRestore.status);
  const ownerRestoreGate = await call(ownerH, 'POST', '/backups/00000000-0000-0000-0000-000000000000/restore', {});
  assert(ownerRestoreGate.status !== 403, 'Owner: restore endpoint reachable (fails 404/500 for fake id, not 403)', ownerRestoreGate.status);

  const apiUploadRestore = await call(apiH, 'POST', '/backups/upload-restore', new FormData());
  assert(apiUploadRestore.status === 403, 'API user: upload-restore backup BLOCKED', apiUploadRestore.status);
  const ownerUploadRestoreNoFile = await call(ownerH, 'POST', '/backups/upload-restore', new FormData());
  assert(ownerUploadRestoreNoFile.status === 400, 'Owner: upload-restore endpoint reachable (400 without file)', ownerUploadRestoreNoFile.status);

  const apiDelBak = await call(apiH, 'DELETE', `/backups/${bakId}`);
  assert(apiDelBak.status === 403, 'API user: delete backup BLOCKED', apiDelBak.status);
  const ownerDelBak = await call(ownerH, 'DELETE', `/backups/${bakId}`);
  assert(ownerDelBak.status === 200, 'Owner: delete backup', ownerDelBak.status);

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  console.log('\n--- Cleanup ---');
  for (const id of [...createdByOwner, ...createdByApi]) {
    const stillThere = await call(ownerH, 'GET', `/notes/${id}`);
    if (stillThere.status === 200) {
      await call(ownerH, 'DELETE', `/notes/${id}`);
    }
  }
  if (apiKeyIdToCleanup === undefined && apiKey !== 'sk_qn_demo_agent_key_2026_test123') {
    const keys = await call(ownerH, 'GET', '/api-keys');
    const tempKey = (keys.data || []).find((k: any) => k.name === 'rbac_parity_auth_key');
    if (tempKey) await call(ownerH, 'DELETE', `/api-keys/${tempKey.id}`);
  }
  await query(`DELETE FROM tags WHERE name LIKE 'RBAC_%'`);

  console.log(`\n========================================`);
  console.log(`RBAC Parity Summary: ${passed} Passed, ${failed} Failed`);
  if (failures.length) console.log('Failed checks:\n  - ' + failures.join('\n  - '));
  console.log(`========================================\n`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

testRbacParity().catch(async (err) => {
  console.error('Fatal test error:', err);
  await pool.end();
  process.exit(1);
});
