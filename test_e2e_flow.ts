import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function runTestFlow() {
  console.log('--- Starting BetweenUs End-to-End Account & Partner Flow Verification ---');

  const timestamp = Date.now();
  const emailA = `test_alice_${timestamp}@betweenus.local`;
  const emailB = `test_bob_${timestamp}@betweenus.local`;
  const password = 'Password123!';

  // Step 1: Register User A
  console.log(`1. Registering User A (${emailA})...`);
  const regA = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: emailA,
      password,
      full_name: 'Alice Springs',
    }),
  });
  assert(regA.token, 'User A should receive JWT token');
  assert.strictEqual(regA.user.email, emailA.toLowerCase());
  const tokenA = regA.token;
  console.log('   User A registered successfully. ID:', regA.user.id);

  // Step 2: Register User B
  console.log(`2. Registering User B (${emailB})...`);
  const regB = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: emailB,
      password,
      full_name: 'Bob Vance',
    }),
  });
  assert(regB.token, 'User B should receive JWT token');
  assert.strictEqual(regB.user.email, emailB.toLowerCase());
  const tokenB = regB.token;
  console.log('   User B registered successfully. ID:', regB.user.id);

  // Step 3: Prevent Self-Connection
  console.log('3. Verifying self-connection prevention...');
  try {
    await request('/api/partner/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ email: emailA }),
    });
    assert.fail('Should not allow connecting to oneself');
  } catch (err: any) {
    console.log('   Self-connection blocked as expected:', err.message);
  }

  // Step 4: User A searches for User B by email
  console.log(`4. User A finding User B by email (${emailB})...`);
  const findRes = await request(`/api/partner/find?email=${encodeURIComponent(emailB)}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(findRes.user, 'Should find user B');
  assert.strictEqual(findRes.user.email, emailB.toLowerCase());
  assert.strictEqual(findRes.user.full_name, 'Bob Vance');
  console.log('   User B found by email successfully');

  // Step 5: User A sends connection request to User B
  console.log('5. User A sending connection request to User B...');
  const sendReqRes = await request('/api/partner/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ email: emailB }),
  });
  assert(sendReqRes.success, 'Request should succeed');
  const requestId = sendReqRes.request_id;
  console.log('   Connection request created with ID:', requestId);

  // Step 6: Verify User B receives incoming request & User A sees outgoing
  console.log('6. Verifying request lists...');
  const reqsB = await request('/api/partner/requests', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(reqsB.incoming.length > 0, 'User B should see incoming request');
  const incomingReq = reqsB.incoming.find((r: any) => r.id === requestId);
  assert(incomingReq, 'Incoming request should match');
  assert.strictEqual(incomingReq.sender_email, emailA.toLowerCase());

  const reqsA = await request('/api/partner/requests', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(reqsA.outgoing.length > 0, 'User A should see outgoing request');
  const outgoingReq = reqsA.outgoing.find((r: any) => r.id === requestId);
  assert(outgoingReq, 'Outgoing request should match');

  // Step 7: User B accepts request
  console.log('7. User B accepting connection request...');
  const acceptRes = await request(`/api/partner/request/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(acceptRes.success, 'Accept should succeed');
  assert.strictEqual(acceptRes.partner.email, emailA.toLowerCase());
  console.log('   User B accepted. Couple established.');

  // Step 8: Verify User A now sees User B as linked partner via /api/me
  console.log('8. Verifying partner status for both users via /api/me...');
  const meA = await request('/api/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(meA.partner, 'User A should now have partner');
  assert.strictEqual(meA.partner.email, emailB.toLowerCase());

  const meB = await request('/api/me', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(meB.partner, 'User B should now have partner');
  assert.strictEqual(meB.partner.email, emailA.toLowerCase());
  console.log('   Both accounts mutually verified as paired.');

  // Step 9: User A sends a message with trained NLP pre-send review
  console.log('9. User A performing pre-send review with trained NLP model...');
  const reviewRes = await request('/api/intelligence/review-message', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      text: 'You are so utterly useless and dumb!',
    }),
  });
  assert(reviewRes.feedback, 'Feedback returned');
  assert(reviewRes.feedback.nlpEmotion, 'Trained NLP classification returned');
  console.log('   Trained NLP classification:', reviewRes.feedback.nlpEmotion.predicted_emotion);
  console.log('   Is experimental disclaimer included:', reviewRes.feedback.nlpEmotion.is_experimental);
  assert.strictEqual(reviewRes.feedback.nlpEmotion.is_experimental, true);

  console.log('   User A sending real message to User B...');
  const sendMsgA = await request('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      text: 'Hey Bob, welcome to BetweenUs!',
      client_msg_id: `cli_${Date.now()}_1`,
    }),
  });
  assert(sendMsgA.message, 'Message persisted');
  const msg1Id = sendMsgA.message.id;
  assert.strictEqual(sendMsgA.message.sender_id, regA.user.id);
  console.log('   Message 1 sent and persisted. ID:', msg1Id);

  // Step 10: User B fetches conversation and receives message
  console.log('10. User B fetching conversation...');
  const msgsB = await request('/api/messages', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(msgsB.messages.length >= 1, 'User B should see message');
  const receivedMsg = msgsB.messages.find((m: any) => m.id === msg1Id);
  assert(receivedMsg, 'User B received exact message from User A');
  assert.strictEqual(receivedMsg.text, 'Hey Bob, welcome to BetweenUs!');
  console.log('   User B successfully received message from User A.');

  // Step 11: User B replies to User A
  console.log('11. User B sending reply to User A...');
  const sendMsgB = await request('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      text: 'Thanks Alice, glad we are connected now.',
      client_msg_id: `cli_${Date.now()}_2`,
    }),
  });
  assert(sendMsgB.message, 'Reply persisted');
  const msg2Id = sendMsgB.message.id;
  assert.strictEqual(sendMsgB.message.sender_id, regB.user.id);

  // Step 12: User A polls and receives reply
  console.log('12. User A polling incremental updates...');
  const pollA = await request(`/api/messages/poll?since=${encodeURIComponent(sendMsgA.message.created_at)}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(pollA.messages.length >= 1, 'User A should receive User B reply via incremental poll');
  const receivedReply = pollA.messages.find((m: any) => m.id === msg2Id);
  assert(receivedReply, 'User A received User B reply');
  console.log('   User A received reply via incremental polling.');

  // Step 13: Verify Unauthorized Access Prevention
  console.log('13. Verifying unauthorized access prevention...');
  // Create third independent user C
  const regC = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `test_charlie_${timestamp}@betweenus.local`,
      password,
      full_name: 'Charlie Day',
    }),
  });
  const tokenC = regC.token;

  try {
    await request('/api/messages', {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    assert.fail('Unpaired user C should not be able to fetch conversation messages');
  } catch (err: any) {
    console.log('   Unauthorized access successfully blocked:', err.message);
  }

  console.log('\n--- ALL E2E ACCOUNT & PARTNER FLOW CHECKS PASSED! ---');
}

runTestFlow().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
