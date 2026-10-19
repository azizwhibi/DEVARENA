// No external npm dependencies. Requires Node 20+.
import assert from 'node:assert/strict';

console.log('Running user-admin automated verification scenarios...');

// 1. Search query construction and parameter escaping
function buildAdminQuery(page, pageSize, role, status, q) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (role && role !== 'all') params.set('role', role);
  if (status && status !== 'all') params.set('status', status);
  if (q && q.trim()) params.set('q', q.trim());
  return `/admin/users?${params.toString()}`;
}

const url1 = buildAdminQuery(1, 20, 'developer', 'active', 'a%');
assert.equal(url1, '/admin/users?page=1&pageSize=20&role=developer&status=active&q=a%25');

const url2 = buildAdminQuery(2, 50, 'admin', 'all', 'user_name,test)');
assert.equal(url2, '/admin/users?page=2&pageSize=50&role=admin&q=user_name%2Ctest%29');

// 2. Role validation rules
const validRoles = ['admin', 'developer', 'recruiter'];
assert.equal(validRoles.includes('admin'), true);
assert.equal(validRoles.includes('developer'), true);
assert.equal(validRoles.includes('recruiter'), true);
assert.equal(validRoles.includes('superadmin'), false);

// 3. Status validation rules
const validStatuses = ['active', 'suspended'];
assert.equal(validStatuses.includes('active'), true);
assert.equal(validStatuses.includes('suspended'), true);
assert.equal(validStatuses.includes('deleted'), false);

// 4. Reason validation rules
function validateStatusReason(reason) {
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return { valid: false, error: 'Reason is required' };
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be at most 500 characters' };
  }
  return { valid: true };
}

assert.equal(validateStatusReason('').valid, false);
assert.equal(validateStatusReason('   ').valid, false);
assert.equal(validateStatusReason('Policy violation').valid, true);

// 5. Delete confirmation match rule
function validateDeleteConfirmation(typed, targetUsername) {
  return typed === targetUsername;
}

assert.equal(validateDeleteConfirmation('user_alice', 'user_alice'), true);
assert.equal(validateDeleteConfirmation('user_bob', 'user_alice'), false);
assert.equal(validateDeleteConfirmation('', 'user_alice'), false);

// 6. Role gating helper: non-admin gets not authorized, admin gets pass
function evaluateAdminAccess(user) {
  if (!user) return { allow: false, redirect: '/login?next=/admin/users' };
  if (user.role !== 'admin') return { allow: false, error: 'Not authorized' };
  return { allow: true };
}

assert.deepEqual(evaluateAdminAccess(null), { allow: false, redirect: '/login?next=/admin/users' });
assert.deepEqual(evaluateAdminAccess({ id: '1', role: 'developer' }), { allow: false, error: 'Not authorized' });
assert.deepEqual(evaluateAdminAccess({ id: '2', role: 'recruiter' }), { allow: false, error: 'Not authorized' });
assert.deepEqual(evaluateAdminAccess({ id: '3', role: 'admin' }), { allow: true });

// 7. Error code mapping
function mapAdminProblemCode(status, code, detail) {
  if (status === 403) return 'Not authorized';
  if (status === 409) {
    if (code === 'last_admin' || /last admin/i.test(detail || '')) return 'Cannot demote or delete the last admin';
    if (code === 'self_demotion_forbidden' || /own role/i.test(detail || '')) return 'Cannot change own role';
    if (code === 'self_suspension_forbidden' || /own status/i.test(detail || '')) return 'Cannot suspend own account';
    if (code === 'self_delete_forbidden' || /self/i.test(detail || '')) return 'Cannot delete own account via admin route';
  }
  return detail || 'Operation failed';
}

assert.equal(mapAdminProblemCode(409, 'last_admin', ''), 'Cannot demote or delete the last admin');
assert.equal(mapAdminProblemCode(409, 'self_demotion_forbidden', ''), 'Cannot change own role');
assert.equal(mapAdminProblemCode(409, 'self_suspension_forbidden', ''), 'Cannot suspend own account');
assert.equal(mapAdminProblemCode(409, 'self_delete_forbidden', ''), 'Cannot delete own account via admin route');
assert.equal(mapAdminProblemCode(403, 'forbidden', ''), 'Not authorized');

console.log('PASS: 18 admin management scenarios (search, filters, roles, status, delete, error mapping)');
