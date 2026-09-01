import { pool, query } from '../db/index.js';

const API_HOST = 'http://localhost:5000/api';

async function testAutoTitle() {
  console.log('🧪 Testing Auto-Title Generation & Manual Override...\n');
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

  const createdNoteIds: string[] = [];

  try {
    // 1. Create note without title (only multi-line content)
    console.log('--- Test 1: Auto-title from first line of content ---');
    const content1 = 'Grocery List for Tomorrow\n- Milk\n- Eggs\n- Sourdough Bread';
    const res1 = await fetch(`${API_HOST}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content1 }),
    });
    const data1 = await res1.json();
    createdNoteIds.push(data1.id);
    assert(res1.status === 201 && data1.title === 'Grocery List for Tomorrow', 'First line of content automatically becomes note title');

    // 2. Create note with explicit title override
    console.log('\n--- Test 2: User manual title override ---');
    const content2 = 'First line in text body\nSecond line in text body';
    const res2 = await fetch(`${API_HOST}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Custom Overridden Title', content: content2 }),
    });
    const data2 = await res2.json();
    createdNoteIds.push(data2.id);
    assert(res2.status === 201 && data2.title === 'Custom Overridden Title', 'Explicit user title overrides first-line auto-title');

    // 3. Create checklist note without title
    console.log('\n--- Test 3: Auto-title from first checklist item ---');
    const res3 = await fetch(`${API_HOST}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checklist_items: [
          { text: 'Launch QuickNotes 2026 App', is_completed: false },
          { text: 'Verify Docker Containers', is_completed: true },
        ],
      }),
    });
    const data3 = await res3.json();
    createdNoteIds.push(data3.id);
    assert(res3.status === 201 && data3.title === 'Launch QuickNotes 2026 App', 'First checklist item automatically becomes note title');

    // 4. Update note with empty title & new content
    console.log('\n--- Test 4: Updating note with empty title auto-derives from new content ---');
    const updatedContent = 'Updated Meeting Agenda\n1. Review Q3 results\n2. Plan Q4 milestones';
    const res4 = await fetch(`${API_HOST}/notes/${data1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', content: updatedContent }),
    });
    const data4 = await res4.json();
    assert(res4.status === 200 && data4.title === 'Updated Meeting Agenda', 'Updating with empty title auto-derives title from updated content');

    // 5. Update note with explicit title override
    console.log('\n--- Test 5: Updating note with explicit override ---');
    const res5 = await fetch(`${API_HOST}/notes/${data1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Final Executive Summary' }),
    });
    const data5 = await res5.json();
    assert(res5.status === 200 && data5.title === 'Final Executive Summary', 'Manual title edit successfully updates title');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    // Cleanup test notes
    for (const id of createdNoteIds) {
      await fetch(`${API_HOST}/notes/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    console.log(`\n========================================`);
    console.log(`Auto-Title Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testAutoTitle();
