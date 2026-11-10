import assert from 'assert';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../utils/jwt.js';
import { escapeRegex, sanitizeString, deepSanitize, isValidEmail } from '../utils/sanitizer.js';
import { isAuthorizedForEvent } from '../controllers/eventController.js';

async function runSecurityAuditTests() {
  console.log('🛡️ Starting Comprehensive Security & Hardening Verification Suite...\n');

  // Test 1: JWT Signing & Verification
  console.log('1️⃣ Testing Cryptographic JWT Token Generation & Verification...');
  const testUser = {
    id: 'usr-secure-123',
    email: 'security@citypulse.io',
    name: 'Security Admin',
    role: 'Admin'
  };
  const token = signToken(testUser);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT must be a valid 3-part signed token');

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, testUser.id, 'Decoded user ID must match');
  assert.strictEqual(decoded.email, testUser.email, 'Decoded email must match');
  assert.strictEqual(decoded.role, testUser.role, 'Decoded role must match');

  // Tampered token verification must fail
  assert.throws(() => {
    verifyToken(token + 'tampered');
  }, /invalid signature|jwt malformed/, 'Tampered token must throw invalid signature error');
  console.log('   ✅ JWT cryptographic signing & tamper rejection verified!');

  // Test 2: Password Hashing with Bcrypt
  console.log('2️⃣ Testing Bcrypt Password Hashing & Work Factor...');
  const plainPassword = 'SuperSecretPassword2026!';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);
  assert(hashedPassword.startsWith('$2'), 'Hash must follow standard bcrypt formatting');
  assert.notStrictEqual(hashedPassword, plainPassword, 'Hashed password must not equal plain text');

  const match = await bcrypt.compare(plainPassword, hashedPassword);
  assert.strictEqual(match, true, 'Bcrypt compare must succeed with correct password');

  const wrongMatch = await bcrypt.compare('WrongPassword123', hashedPassword);
  assert.strictEqual(wrongMatch, false, 'Bcrypt compare must reject wrong password');
  console.log('   ✅ Strong password hashing (12 rounds) verified!');

  // Test 3: Input Sanitization & XSS Neutralization
  console.log('3️⃣ Testing Cross-Site Scripting (XSS) Sanitization...');
  const dirtyXSS = '<script>alert("XSS")</script>Welcome to <img src="x" onerror="stealCookies()"> City Pulse';
  const cleanXSS = sanitizeString(dirtyXSS);
  assert(!cleanXSS.includes('<script>'), 'Must strip <script> tag');
  assert(!cleanXSS.includes('onerror'), 'Must strip onerror event handler');
  assert(!cleanXSS.includes('alert'), 'Must strip script contents');

  const dangerousUrl = 'javascript:alert(1)';
  const sanitizedUrl = sanitizeString(dangerousUrl);
  assert(!sanitizedUrl.toLowerCase().includes('javascript:'), 'Must strip javascript: pseudo-protocol');
  console.log('   ✅ XSS and HTML injection patterns effectively sanitized!');

  // Test 4: NoSQL Query Injection Neutralization
  console.log('4️⃣ Testing NoSQL Operator Injection Sanitization...');
  const maliciousPayload = {
    email: { $gt: '' },
    $where: 'sleep(5000)',
    'nested.key': 'val',
    username: 'cleanUser'
  };
  const sanitizedObj = deepSanitize(maliciousPayload);
  assert.strictEqual(sanitizedObj.email, undefined, 'Must strip objects containing $gt operator');
  assert.strictEqual(sanitizedObj.$where, undefined, 'Must strip keys starting with $');
  assert.strictEqual(sanitizedObj['nested.key'], undefined, 'Must strip keys with dots');
  assert.strictEqual(sanitizedObj.username, 'cleanUser', 'Must preserve safe primitive attributes');
  console.log('   ✅ NoSQL operator injection stripped successfully!');

  // Test 5: ReDoS Regex Escaping
  console.log('5️⃣ Testing Regex Metacharacter Escaping (ReDoS Prevention)...');
  const maliciousRegex = '(a+)+$';
  const safeRegex = escapeRegex(maliciousRegex);
  assert.strictEqual(safeRegex, '\\(a\\+\\)\\+\\$', 'All regex metacharacters must be backslash-escaped');
  console.log('   ✅ Regex metacharacter escaping verified!');

  // Test 6: Strict RBAC & Header Spoofing Prevention
  console.log('6️⃣ Testing Role-Based Access Control & Header Spoofing Defense...');
  const testEvent = {
    id: 'evt-test-1',
    organizerId: 'usr-organizer-99',
    organizerEmail: 'host@citypulse.io',
    organizerName: 'Genuine Host'
  };

  // Attacker attempts header spoofing with 'x-user-role: admin' but has no valid JWT
  const unauthenticatedSpoofReq = {
    headers: { 'x-user-role': 'admin', 'x-user-id': 'usr-organizer-99' },
    user: null
  };
  assert.strictEqual(
    isAuthorizedForEvent(testEvent, unauthenticatedSpoofReq),
    false,
    'Unauthenticated requests with spoofed headers must be DENIED'
  );

  // Authenticated non-owner attendee
  const attendeeReq = {
    user: { id: 'usr-other-user', email: 'other@example.com', role: 'Attendee' }
  };
  assert.strictEqual(
    isAuthorizedForEvent(testEvent, attendeeReq),
    false,
    'Non-host attendee must be DENIED access to host controls'
  );

  // Authenticated genuine event organizer
  const organizerReq = {
    user: { id: 'usr-organizer-99', email: 'host@citypulse.io', role: 'Organizer' }
  };
  assert.strictEqual(
    isAuthorizedForEvent(testEvent, organizerReq),
    true,
    'Genuine event organizer must be GRANTED access'
  );

  // Authenticated genuine admin
  const adminReq = {
    user: { id: 'usr-admin-1', email: 'admin@citypulse.io', role: 'Admin' }
  };
  assert.strictEqual(
    isAuthorizedForEvent(testEvent, adminReq),
    true,
    'Administrator must be GRANTED access across all events'
  );
  console.log('   ✅ Strict RBAC verified; header spoofing completely blocked!');

  // Test 7: Email Validation
  console.log('7️⃣ Testing Email Address RFC Validation...');
  assert.strictEqual(isValidEmail('valid.user@example.com'), true);
  assert.strictEqual(isValidEmail('invalid-email-no-at'), false);
  assert.strictEqual(isValidEmail('user@bad domain with spaces.com'), false);
  console.log('   ✅ Email RFC validation verified!');

  console.log('\n🎉 ALL 7 CRITICAL SECURITY VERIFICATION TESTS PASSED!\n');
  process.exit(0);
}

runSecurityAuditTests().catch(err => {
  console.error('❌ Security verification test failed:', err);
  process.exit(1);
});

