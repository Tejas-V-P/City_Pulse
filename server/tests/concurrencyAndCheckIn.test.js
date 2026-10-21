import assert from 'assert';
import { reserveSeatLock, releaseSeatLock, verifySeatLock, getActiveHoldCount } from '../utils/redisLock.js';
import { checkInRegistration, createRegistration } from '../models/registrationModel.js';
import { generateQRCodeDataUrl } from '../utils/ticketGenerator.js';

async function runTests() {
  console.log('🧪 Starting Concurrency Control, QR Generation & Check-In Test Suite...');

  const testEventId = `test-evt-${Date.now()}`;
  const userA = `test-user-alice-${Date.now()}`;
  const userB = `test-user-bob-${Date.now()}`;

  // 1. Test Seat Hold Reservation
  console.log('1️⃣ Testing Seat Hold Reservation Lock...');
  const lockA = await reserveSeatLock(testEventId, userA, 600);
  assert.strictEqual(lockA.success, true, 'User A should successfully reserve seat');
  assert.strictEqual(lockA.remainingSeconds, 600, 'Hold timer should initialize to 600s');

  const checkA = await verifySeatLock(testEventId, userA);
  assert.strictEqual(checkA.held, true, 'User A lock should be verified as held');

  const heldCount = await getActiveHoldCount(testEventId);
  assert.strictEqual(heldCount >= 1, true, 'Active hold count should reflect reserved seat');
  console.log('   ✅ Seat Hold Lock verified successfully!');

  // 2. Test Lock Release
  console.log('2️⃣ Testing Seat Lock Release...');
  await releaseSeatLock(testEventId, userA);
  const checkReleased = await verifySeatLock(testEventId, userA);
  assert.strictEqual(checkReleased.held, false, 'User A lock should be cleared after release');
  console.log('   ✅ Seat Lock released successfully!');

  // 3. Test QR Code Data URL Generation
  console.log('3️⃣ Testing High-Resolution QR Code Generation...');
  const qrDataUrl = await generateQRCodeDataUrl({
    ticketCode: 'TKT-SF-99999',
    eventId: testEventId,
    userEmail: 'alice@example.com'
  });
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code should be a valid PNG base64 data URL');
  console.log('   ✅ QR Code generated successfully!');

  // 4. Test Check-In Scanner & Duplicate Prevention
  console.log('4️⃣ Testing Host Check-In & Duplicate Prevention...');
  const regResult = createRegistration({
    eventId: testEventId,
    userId: userB,
    userName: 'Bob Tester',
    userEmail: 'bob@example.com',
    cityCode: 'SF'
  });
  const ticketCode = regResult.registration.ticketCode;

  // First Check-In: Expect Success
  const checkIn1 = checkInRegistration(ticketCode, testEventId);
  assert.strictEqual(checkIn1.success, true, 'First check-in should succeed');
  assert.strictEqual(checkIn1.registration.status, 'Checked-In', 'Status should be Checked-In');

  // Second Check-In with same code: Expect Duplicate Rejection
  const checkIn2 = checkInRegistration(ticketCode, testEventId);
  assert.strictEqual(checkIn2.alreadyCheckedIn, true, 'Duplicate check-in should be flagged');
  console.log('   ✅ Check-In verification and duplicate protection verified!');

  console.log('\n🎉 ALL 4 CORE ARCHITECTURAL TESTS PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
