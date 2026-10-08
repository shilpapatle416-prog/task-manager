const assert = require('assert');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

// Ensure test port
process.env.PORT = '5001';

const server = require('./server');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Starting Supabase PostgreSQL Migration Verification Suite...\n');

  try {
    // 1. Health check
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(health.status, 200, 'Health check should return 200');
    assert.strictEqual(health.data.database, 'supabase-postgresql', 'Health check should mention supabase-postgresql');
    console.log('✅ 1. Health Check Endpoint passed');

    // 2. User Registration
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Supabase Tester',
        email: testEmail,
        password: 'password123'
      }
    );
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert(regRes.data.token, 'Registration should return JWT token');
    assert(regRes.data.user.id, 'Registration should return user id');
    console.log('✅ 2. User Registration passed');

    const authToken = regRes.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    };

    // 3. Duplicate Registration Check
    const dupRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Duplicate User',
        email: testEmail,
        password: 'password123'
      }
    );
    assert.strictEqual(dupRes.status, 400, 'Duplicate registration should return 400');
    console.log('✅ 3. Duplicate User Prevention passed');

    // 4. User Login
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testEmail,
        password: 'password123'
      }
    );
    assert.strictEqual(loginRes.status, 200, 'Login should return 200');
    assert(loginRes.data.token, 'Login should return token');
    console.log('✅ 4. User Login passed');

    // 5. Invalid Login
    const badLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testEmail,
        password: 'wrongpassword'
      }
    );
    assert.strictEqual(badLoginRes.status, 401, 'Invalid login should return 401');
    console.log('✅ 5. Invalid Login Guard passed');

    // 6. Get Me (Profile)
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/me',
      method: 'GET',
      headers: authHeaders
    });
    assert.strictEqual(meRes.status, 200, '/api/auth/me should return 200');
    assert.strictEqual(meRes.data.user.email, testEmail, 'Profile email should match');
    assert.strictEqual(meRes.data.user.password, undefined, 'Password should not be exposed');
    console.log('✅ 6. Get Current User passed');

    // 7. Update Profile
    const updateProfRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/profile',
        method: 'PUT',
        headers: authHeaders
      },
      {
        name: 'Supabase Tester Renamed'
      }
    );
    assert.strictEqual(updateProfRes.status, 200, 'Update profile should return 200');
    assert.strictEqual(updateProfRes.data.user.name, 'Supabase Tester Renamed', 'Name should be updated');
    console.log('✅ 7. Update User Profile passed');

    // 8. Create Task
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createTaskRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/tasks',
        method: 'POST',
        headers: authHeaders
      },
      {
        title: 'Complete PostgreSQL Integration Test',
        description: 'Verify all table schemas and query transformations work reliably.',
        priority: 'High',
        category: 'Project',
        status: 'Pending',
        dueDate: tomorrow
      }
    );
    assert.strictEqual(createTaskRes.status, 201, 'Create task should return 201');
    const createdTask = createTaskRes.data.task;
    assert(createdTask.id || createdTask._id, 'Task should have ID');
    assert.strictEqual(createdTask.priority, 'High');
    const taskId = createdTask.id || createdTask._id;
    console.log(`✅ 8. Task Creation passed (Task ID: ${taskId})`);

    // 9. Get Single Task By ID
    const singleTaskRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/tasks/${taskId}`,
      method: 'GET',
      headers: authHeaders
    });
    assert.strictEqual(singleTaskRes.status, 200, 'Get single task should return 200');
    assert.strictEqual(singleTaskRes.data.task.title, 'Complete PostgreSQL Integration Test');
    console.log('✅ 9. Get Task By ID passed');

    // 10. List Tasks with Filters & Search
    const listRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/tasks?search=PostgreSQL&priority=High',
      method: 'GET',
      headers: authHeaders
    });
    assert.strictEqual(listRes.status, 200, 'List tasks should return 200');
    assert.strictEqual(listRes.data.tasks.length, 1, 'Should find 1 task matching search and priority');
    assert(listRes.data.tasks[0]._id, 'Task in list should have _id for frontend compatibility');
    console.log('✅ 10. Task Search & Filtering passed');

    // 11. Task Stats
    const statsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/tasks/stats',
      method: 'GET',
      headers: authHeaders
    });
    assert.strictEqual(statsRes.status, 200, 'Stats should return 200');
    assert.strictEqual(statsRes.data.stats.total, 1, 'Total tasks should be 1');
    assert.strictEqual(statsRes.data.stats.pending, 1, 'Pending tasks should be 1');
    assert.strictEqual(statsRes.data.stats.completed, 0, 'Completed tasks should be 0');
    console.log('✅ 11. Task Stats & Metrics passed');

    // 12. Quick Status Patch
    const patchRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/tasks/${taskId}/status`,
        method: 'PATCH',
        headers: authHeaders
      },
      {
        status: 'Completed'
      }
    );
    assert.strictEqual(patchRes.status, 200, 'Status patch should return 200');
    assert.strictEqual(patchRes.data.task.status, 'Completed');
    assert(patchRes.data.task.completedAt, 'completedAt should be recorded');
    console.log('✅ 12. Task Status Toggle passed');

    // 13. Update Task Details
    const updateTaskRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api/tasks/${taskId}`,
        method: 'PUT',
        headers: authHeaders
      },
      {
        title: 'Complete PostgreSQL Integration Test (Updated)',
        priority: 'Low',
        status: 'In Progress'
      }
    );
    assert.strictEqual(updateTaskRes.status, 200, 'Update task should return 200');
    assert.strictEqual(updateTaskRes.data.task.title, 'Complete PostgreSQL Integration Test (Updated)');
    assert.strictEqual(updateTaskRes.data.task.priority, 'Low');
    assert.strictEqual(updateTaskRes.data.task.status, 'In Progress');
    console.log('✅ 13. Task Update Details passed');

    // 14. Delete Task
    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/tasks/${taskId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert.strictEqual(deleteRes.status, 200, 'Delete task should return 200');
    console.log('✅ 14. Task Deletion passed');

    // 15. Verify Task is Gone (404)
    const verifyDeleteRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/tasks/${taskId}`,
      method: 'GET',
      headers: authHeaders
    });
    assert.strictEqual(verifyDeleteRes.status, 404, 'Deleted task lookup should return 404');
    console.log('✅ 15. Deleted Task 404 Verification passed');

    console.log('\n======================================================');
    console.log('🎉 ALL 15 MIGRATION & INTEGRATION TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
};

runTests();
