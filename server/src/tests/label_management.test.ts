import { pool, query } from '../db/index.js';

const API_HOST = process.env.API_HOST || 'http://localhost:3000/api';

async function testLabelManagement() {
  console.log('🧪 Testing Full UI Label Management Flows...\n');
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

  const testSuffix = Math.random().toString(36).substring(2, 7);
  const rootName = `Dev_${testSuffix}`;
  const sub1Name = `Backend_${testSuffix}`;
  const sub2Name = `Frontend_${testSuffix}`;

  let rootId: string | null = null;
  let sub1Id: string | null = null;
  let sub2Id: string | null = null;
  let noteId: string | null = null;

  try {
    // 0. Authenticate as Owner
    const loginRes = await fetch(`${API_HOST}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'quicknotes_owner_password_2026' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(loginRes.status === 200 && !!token, 'Owner logged in successfully');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Create Root Label
    console.log('\n--- Suite 1: Root Label Creation ---');
    const rootRes = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: rootName, color: 'storm' }),
    });
    const rootData = await rootRes.json();
    rootId = rootData.id;
    assert(rootRes.status === 201 && rootData.name === rootName && rootData.parent_id === null, 'Root label created');

    // 2. Create Sub-Label under Development (2-step nested)
    console.log('\n--- Suite 2: 2-Step Sub-Label Creation ---');
    const subRes = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: sub1Name, parent_id: rootId, color: 'storm' }),
    });
    const subData = await subRes.json();
    sub1Id = subData.id;
    assert(subRes.status === 201 && subData.name === sub1Name && subData.parent_id === rootId, 'Sub-label created under root label');

    // 3. Create Second Sub-Label
    const sub2Res = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: sub2Name, parent_id: rootId, color: 'storm' }),
    });
    const sub2Data = await sub2Res.json();
    sub2Id = sub2Data.id;
    assert(sub2Res.status === 201 && sub2Data.name === sub2Name, 'Second sub-label created');

    // 4. Verify 3rd-Level Nesting is Blocked
    console.log('\n--- Suite 3: 3rd-Level Nesting Limitation ---');
    const sub3Res = await fetch(`${API_HOST}/tags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: `SubSub_${testSuffix}`, parent_id: sub2Id, color: 'storm' }),
    });
    assert(sub3Res.status === 400, '3rd level nesting blocked (max 2 levels enforced)');

    // 5. Fetch Hierarchy Tree
    console.log('\n--- Suite 4: Hierarchy Tree Structure ---');
    const tagsRes = await fetch(`${API_HOST}/tags`, { headers: authHeaders });
    const tagsData = await tagsRes.json();
    const devTree = tagsData.tree.find((t: any) => t.id === rootId);
    assert(
      devTree && Array.isArray(devTree.children) && devTree.children.length === 2,
      'Hierarchical tree returns root with 2 nested sub-labels'
    );

    // 6. Update Label Name
    console.log('\n--- Suite 5: Label Renaming & Reparenting ---');
    const renamed = `${sub1Name}_Renamed`;
    const updateRes = await fetch(`${API_HOST}/tags/${sub1Id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ name: renamed, parent_id: rootId }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.name === renamed, 'Sub-label successfully renamed');

    // 7. Assign Labels to a Note and Filter
    console.log('\n--- Suite 6: Note Labeling & Multi-Label Filter ---');
    const noteRes = await fetch(`${API_HOST}/notes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: `API Note ${testSuffix}`,
        content: 'Testing tag filtering',
        tag_ids: [sub1Id, sub2Id],
      }),
    });
    const noteData = await noteRes.json();
    noteId = noteData.id;
    assert(noteRes.status === 201 && noteData.tags.length === 2, 'Note created and labeled with 2 sub-labels');

    // Filter by tag_ids with match=and
    const filterAndRes = await fetch(`${API_HOST}/notes?tag_ids=${sub1Id},${sub2Id}&tag_match=and`, { headers: authHeaders });
    const filterAndData = await filterAndRes.json();
    const notesList = Array.isArray(filterAndData) ? filterAndData : filterAndData.notes || [];
    assert(filterAndRes.status === 200 && notesList.some((n: any) => n.id === noteId), 'Multi-label filtering with match=and returns labeled note');

    // 8. Delete Sub-Label
    console.log('\n--- Suite 7: Deletion & Cascading ---');
    const delSubRes = await fetch(`${API_HOST}/tags/${sub1Id}`, { method: 'DELETE', headers: authHeaders });
    assert(delSubRes.status === 200, 'Sub-label deleted successfully');

    // 9. Delete Root Label (Cascades)
    const delRootRes = await fetch(`${API_HOST}/tags/${rootId}`, { method: 'DELETE', headers: authHeaders });
    assert(delRootRes.status === 200, 'Root label and cascaded children deleted successfully');

    // Clean up note
    if (noteId) {
      await fetch(`${API_HOST}/notes/${noteId}`, { method: 'DELETE', headers: authHeaders });
    }

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    // Clean up any stray tags from test
    if (rootId) {
      await query('DELETE FROM tags WHERE id = $1 OR parent_id = $1', [rootId]);
    }
    console.log(`\n========================================`);
    console.log(`Label Management Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testLabelManagement();
