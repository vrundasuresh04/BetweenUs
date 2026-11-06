import Database from 'better-sqlite3';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function req(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runFacultyVerification() {
  console.log('====================================================');
  console.log('BETWEENUS — FINAL FACULTY VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      console.log(`  [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? '--> ' + detail : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const emailA = `devika.sharma.${timestamp}@betweenus.local`;
  const emailB = `rohan.verma.${timestamp}@betweenus.local`;
  const emailC = `unrelated.user.${timestamp}@betweenus.local`;
  const nameA = 'Devika Sharma';
  const nameB = 'Rohan Verma';
  const nameC = 'Unrelated Observer';
  const password = 'SecurePassword123!';

  let tokenA = '';
  let tokenB = '';
  let tokenC = '';
  let userA: any = null;
  let userB: any = null;
  let userC: any = null;
  let coupleId = '';

  // 1. REGISTRATION AND LOGIN
  console.log('--- TEST 1: Registration and Login ---');
  const regA = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: nameA, email: emailA, password }),
  });
  assert(regA.ok && !!regA.data.token, 'Register Partner A', `status: ${regA.status}`);
  tokenA = regA.data.token;
  userA = regA.data.user;

  const regB = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: nameB, email: emailB, password }),
  });
  assert(regB.ok && !!regB.data.token, 'Register Partner B', `status: ${regB.status}`);
  tokenB = regB.data.token;
  userB = regB.data.user;

  const loginA = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password }),
  });
  assert(loginA.ok && loginA.data.user.email === emailA, 'Login Partner A', 'email matched');

  // 2. ARBITRARY USER NAMES
  console.log('\n--- TEST 2: Arbitrary Registered User Names ---');
  assert(userA.full_name === nameA, 'Partner A registered name is arbitrary ("Devika Sharma")', userA.full_name);
  assert(userB.full_name === nameB, 'Partner B registered name is arbitrary ("Rohan Verma")', userB.full_name);
  assert(userA.id.startsWith('usr_') && userB.id.startsWith('usr_'), 'User IDs are internal strings', `${userA.id}, ${userB.id}`);

  // 3. AUTHORIZED PARTNER CONNECTION
  console.log('\n--- TEST 3: Authorized Partner Connection ---');
  // Partner A searches for Partner B by email
  const findRes = await req(`/api/partner/find?email=${encodeURIComponent(emailB)}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(findRes.ok && findRes.data.user.id === userB.id, 'Partner A locates Partner B by exact email', findRes.data.user.email);

  // Partner A sends request to Partner B
  const reqRes = await req('/api/partner/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ email: emailB }),
  });
  assert(reqRes.ok, 'Partner A sends partner request', reqRes.data.message);

  // Partner B views pending incoming requests
  const pendingRes = await req('/api/partner/requests', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(pendingRes.ok && pendingRes.data.incoming?.length > 0, 'Partner B receives incoming request', `count: ${pendingRes.data.incoming?.length}`);
  const requestId = pendingRes.data.incoming[0]?.id;

  // Partner B accepts request
  const acceptRes = await req(`/api/partner/request/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(acceptRes.ok, 'Partner B accepts request', acceptRes.data.message);

  // Verify both profiles show linked partner
  const meA = await req('/api/auth/me', { headers: { Authorization: `Bearer ${tokenA}` } });
  const meB = await req('/api/auth/me', { headers: { Authorization: `Bearer ${tokenB}` } });
  assert(meA.data.partner?.full_name === nameB && meB.data.partner?.full_name === nameA, 'Both partners confirmed linked with correct partner names', `${meA.data.partner?.full_name} <-> ${meB.data.partner?.full_name}`);
  coupleId = meA.data.couple?.id;

  // Verify Dual Demo setup endpoint with dynamic names
  const demoSetup = await req('/api/demo/setup-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(demoSetup.ok && demoSetup.data.isLinked === true && demoSetup.data.partnerA.user.full_name === nameA && demoSetup.data.partnerB.user.full_name === nameB, 'Dual Demo session reflects dynamic registered names', `A: ${demoSetup.data.partnerA.user.full_name}, B: ${demoSetup.data.partnerB.user.full_name}`);

  // 4. TWO-WAY MESSAGING
  console.log('\n--- TEST 4: Two-Way SQLite Messaging ---');
  const msgA = await req('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ text: 'I really appreciated your patience during our discussion today.' }),
  });
  assert(msgA.ok && !!msgA.data.message?.id, 'Partner A sends message to Partner B', msgA.data.message?.id);
  const messageIdA = msgA.data.message?.id;

  const msgB = await req('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ text: 'Thank you, Devika! That means a lot to hear.' }),
  });
  assert(msgB.ok && !!msgB.data.message?.id, 'Partner B replies to Partner A', msgB.data.message?.id);
  const messageIdB = msgB.data.message?.id;

  // 5. MESSAGE PERSISTENCE AFTER REFRESH
  console.log('\n--- TEST 5: Message Persistence After Refresh ---');
  const freshFetchA = await req('/api/messages', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const freshFetchB = await req('/api/messages', {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(freshFetchA.data.messages?.length === 2 && freshFetchB.data.messages?.length === 2, 'Both partners see both persisted messages', `Count: ${freshFetchA.data.messages?.length}`);

  // 6. MEANINGFUL NLP ANALYSIS (Trained GoEmotions Model)
  console.log('\n--- TEST 6: Trained GoEmotions Machine Learning Analysis ---');
  const testAnalysisText = 'I really appreciated your patience during our discussion today.';
  const nlpRes = await req('/api/intelligence/analyze-message', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ text: testAnalysisText }),
  });
  assert(nlpRes.ok && !!nlpRes.data.topEmotion && !!nlpRes.data.observation, 'Trained GoEmotions model predicts tone and produces cautious observation', `Top Emotion: ${nlpRes.data.topEmotion}, Confidence: ${(nlpRes.data.confidence * 100).toFixed(1)}%`);

  // Persist the ML observation explicitly
  const saveNlp = await req('/api/intelligence/save-analysis', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      message_id: messageIdA,
      message_text: testAnalysisText,
      top_emotion: nlpRes.data.topEmotion,
      confidence: nlpRes.data.confidence,
      probabilities: nlpRes.data.probabilities,
      observation: nlpRes.data.observation,
    }),
  });
  assert(saveNlp.ok && !!(saveNlp.data.id || saveNlp.data.savedAnalysis?.id), 'ML observation persisted securely to SQLite saved_message_analyses table', saveNlp.data.id || saveNlp.data.savedAnalysis?.id);

  // Retrieve saved analyses
  const savedAnalyses = await req('/api/intelligence/saved-analyses', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(savedAnalyses.ok && savedAnalyses.data.analyses?.length > 0, 'Saved ML observations retrieved for couple', `Count: ${savedAnalyses.data.analyses?.length}`);

  // 7. INDEPENDENT REFLECTIONS (1-5 Scale & Privacy)
  console.log('\n--- TEST 7: Independent Reflections & Concealment ---');
  const createRef = await req('/api/reflections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ title: 'Evening Discussion Reflection' }),
  });
  assert(createRef.ok && !!createRef.data.sessionId, 'Partner A creates reflection session', createRef.data.sessionId);
  const sessionId = createRef.data.sessionId;

  // Partner A submits ratings (Comm=4, Trust=5, Supp=4, Conf=4)
  const assessA = await req(`/api/reflections/${sessionId}/assess`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ communication: 4, trust: 5, support: 4, conflict: 4 }),
  });
  assert(assessA.ok, 'Partner A submits ratings (4, 5, 4, 4)', assessA.data.message);

  // Check state: only Partner A submitted, PGS should remain pending / concealed
  const refStatusMid = await req('/api/reflections', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const sessionMid = refStatusMid.data.reflections?.find((r: any) => r.id === sessionId);
  assert(sessionMid && sessionMid.hasMyAssessment === true && sessionMid.bothCompleted === false && sessionMid.pgs === null, 'PGS is concealed and session is pending until partner submits', `bothCompleted: ${sessionMid?.bothCompleted}`);

  // Partner B submits ratings (Comm=3, Trust=4, Supp=3, Conf=3)
  const assessB = await req(`/api/reflections/${sessionId}/assess`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ communication: 3, trust: 4, support: 3, conflict: 3 }),
  });
  assert(assessB.ok, 'Partner B submits ratings (3, 4, 3, 3)', assessB.data.message);

  // 8. MATHEMATICALLY CORRECT PERSPECTIVE GAP SCORE (PGS)
  console.log('\n--- TEST 8: Mathematical Verification of PGS ---');
  // Rating Deltas:
  // Comm: |4 - 3| = 1 -> 1^2 = 1
  // Trust: |5 - 4| = 1 -> 1^2 = 1
  // Supp: |4 - 3| = 1 -> 1^2 = 1
  // Conf: |4 - 3| = 1 -> 1^2 = 1
  // Expected PGS = (1 + 1 + 1 + 1) / 4 = 1.0000
  const refStatusDone = await req('/api/reflections', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const sessionDone = refStatusDone.data.reflections?.find((r: any) => r.id === sessionId);
  assert(sessionDone && sessionDone.bothCompleted === true && sessionDone.pgs !== null, 'Both completed, PGS revealed', `PGS: ${sessionDone?.pgs?.pgs}`);
  assert(Math.abs(sessionDone?.pgs?.pgs - 1.00) < 0.001, 'PGS calculation matches exact mathematical formula (1.0000)', `Calculated: ${sessionDone?.pgs?.pgs}`);

  // 9. AUTOMATICALLY UPDATED INSIGHTS DASHBOARD
  console.log('\n--- TEST 9: Dynamic Insights Dashboard ---');
  const analyticsRes = await req('/api/analytics', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(analyticsRes.ok, 'Fetch dynamic analytics', `status: ${analyticsRes.status}`);
  const aData = analyticsRes.data;
  assert(aData.currentPgs === 1.00, 'Insights currentPgs matches latest completed session (1.00)', `currentPgs: ${aData.currentPgs}`);
  assert(aData.averagePgs === 1.00, 'Insights averagePgs is accurate (1.00)', `averagePgs: ${aData.averagePgs}`);
  assert(aData.totalSessions === 1, 'Insights completed sessions count is 1', `totalSessions: ${aData.totalSessions}`);
  assert(aData.pendingSessions === 0, 'Insights pending sessions count is 0', `pendingSessions: ${aData.pendingSessions}`);
  assert(aData.dimensionAverages?.communication_gap === 1.00 && aData.dimensionAverages?.trust_gap === 1.00, 'Dimension gaps accurately reflect Deltas of 1.00', `Comm: ${aData.dimensionAverages?.communication_gap}, Trust: ${aData.dimensionAverages?.trust_gap}`);
  assert(aData.emotionInsights?.totalAnalyzed === 1 && !!aData.emotionInsights?.emotionCounts[nlpRes.data.topEmotion], 'Insights aggregates real GoEmotions message analyses', `Top emotion count: ${aData.emotionInsights?.emotionCounts[nlpRes.data.topEmotion]}`);

  // 10. AUTHORIZED HISTORY DELETION
  console.log('\n--- TEST 10: Authorized History Deletion ---');
  // Unauthorized attempt: Partner B attempts to delete Partner A's message
  const unauthDel = await req(`/api/messages/${messageIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(unauthDel.status === 403, 'Unauthorized cross-user message deletion blocked (403 Forbidden)', `status: ${unauthDel.status}`);

  // Authorized deletion: Partner A deletes their own message
  const authDel = await req(`/api/messages/${messageIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(authDel.ok, 'Author deletes their own message', authDel.data.message);

  // Verify message is removed for both users
  const afterDelA = await req('/api/messages', { headers: { Authorization: `Bearer ${tokenA}` } });
  const afterDelB = await req('/api/messages', { headers: { Authorization: `Bearer ${tokenB}` } });
  assert(!afterDelA.data.messages?.some((m: any) => m.id === messageIdA) && !afterDelB.data.messages?.some((m: any) => m.id === messageIdA), 'Deleted message removed for both partners', `Count: ${afterDelA.data.messages?.length}`);

  // Authorized reflection assessment withdrawal: Partner A withdraws their assessment
  const withdrawRef = await req(`/api/reflections/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(withdrawRef.ok, 'Partner A withdraws their reflection assessment', withdrawRef.data.message);

  // Verify reflection is now pending again, partner B assessment is preserved, and analytics updated
  const afterWithdrawRef = await req('/api/reflections', { headers: { Authorization: `Bearer ${tokenA}` } });
  const sessionAfterWithdraw = afterWithdrawRef.data.reflections?.find((r: any) => r.id === sessionId);
  assert(sessionAfterWithdraw?.hasMyAssessment === false && sessionAfterWithdraw?.hasPartnerAssessment === true && sessionAfterWithdraw?.bothCompleted === false, 'Partner B rating preserved; session re-locked to pending', `bothCompleted: ${sessionAfterWithdraw?.bothCompleted}`);

  const analyticsAfterWithdraw = await req('/api/analytics', { headers: { Authorization: `Bearer ${tokenA}` } });
  assert(analyticsAfterWithdraw.data.totalSessions === 0 && analyticsAfterWithdraw.data.pendingSessions === 1, 'Analytics automatically updated after reflection withdrawal', `Total: ${analyticsAfterWithdraw.data.totalSessions}, Pending: ${analyticsAfterWithdraw.data.pendingSessions}`);

  // 11. DATABASE PERSISTENCE VERIFICATION
  console.log('\n--- TEST 11: SQLite Database Direct Persistence Verification ---');
  const db = new Database(path.resolve(process.cwd(), 'database/betweenus.db'), { readonly: true });
  const dbUserA: any = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(userA.id);
  const dbUserB: any = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(userB.id);
  const dbCouple: any = db.prepare('SELECT id, status FROM couples WHERE id = ?').get(coupleId);
  const dbMsgA: any = db.prepare('SELECT id FROM messages WHERE id = ?').get(messageIdA);
  const dbMsgB: any = db.prepare('SELECT id FROM messages WHERE id = ?').get(messageIdB);
  const dbAssessB: any = db.prepare('SELECT id, communication, trust FROM assessments WHERE interaction_id = ? AND user_id = ?').get(sessionId, userB.id);
  const dbAssessA: any = db.prepare('SELECT id FROM assessments WHERE interaction_id = ? AND user_id = ?').get(sessionId, userA.id);
  db.close();

  assert(!!dbUserA && dbUserA.full_name === nameA, 'User A persisted in SQLite users table', dbUserA?.full_name);
  assert(!!dbUserB && dbUserB.full_name === nameB, 'User B persisted in SQLite users table', dbUserB?.full_name);
  assert(!!dbCouple && dbCouple.status === 'active', 'Couple link persisted in SQLite couples table', dbCouple?.id);
  assert(dbMsgA === undefined, 'Deleted message confirmed purged from SQLite messages table', 'Purged');
  assert(!!dbMsgB, 'Retained message persisted in SQLite messages table', dbMsgB?.id);
  assert(!!dbAssessB && dbAssessB.communication === 3, 'Partner B independent assessment preserved in SQLite', `Comm: ${dbAssessB?.communication}`);
  assert(dbAssessA === undefined, 'Withdrawn assessment confirmed removed from SQLite assessments table', 'Removed');

  // 12. NO CROSS-ACCOUNT DATA LEAKAGE
  console.log('\n--- TEST 12: Multi-User Security & No Cross-Account Leakage ---');
  const regC = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: nameC, email: emailC, password }),
  });
  tokenC = regC.data.token;
  userC = regC.data.user;

  const msgsC = await req('/api/messages', { headers: { Authorization: `Bearer ${tokenC}` } });
  const refsC = await req('/api/reflections', { headers: { Authorization: `Bearer ${tokenC}` } });
  const analyticsC = await req('/api/analytics', { headers: { Authorization: `Bearer ${tokenC}` } });

  assert(msgsC.status === 403 || msgsC.data.messages?.length === 0, 'Unrelated User C cannot view Couple A-B messages (Blocked / 0 messages)', `Status: ${msgsC.status}`);
  assert(refsC.status === 403 || refsC.data.reflections?.length === 0, 'Unrelated User C cannot view Couple A-B reflections (Blocked / 0 reflections)', `Status: ${refsC.status}`);
  assert(analyticsC.data.totalSessions === 0 && analyticsC.data.currentPgs === null, 'Unrelated User C cannot view Couple A-B analytics', `Sessions: ${analyticsC.data.totalSessions}`);

  // 13. PRESERVE REAL HADOOP INTEGRATION
  console.log('\n--- TEST 13: Preserve Real Apache Hadoop MapReduce Integration ---');
  const hadoopSummary = await req('/api/bigdata/hadoop-summary');
  assert(hadoopSummary.ok && hadoopSummary.data.summary.total_couples_processed === 18000, 'Real Hadoop MapReduce summary: 18,000 synthetic couples parsed', `Couples: ${hadoopSummary.data.summary?.total_couples_processed}`);
  assert(hadoopSummary.data.is_offline_synthetic_hadoop === true, 'Hadoop output clearly labeled as offline synthetic analytics', hadoopSummary.data.disclosure);

  const hadoopC100002 = await req('/api/bigdata/hadoop-couple/C100002');
  assert(hadoopC100002.ok && hadoopC100002.data.couple.couple_id === 'C100002', 'Couple C100002 record retrieved from Hadoop results', hadoopC100002.data.couple?.couple_id);
  assert(hadoopC100002.data.couple.mean_pgs === 1.8594, 'Couple C100002 mean PGS matches verified Hadoop output (1.8594)', `mean_pgs: ${hadoopC100002.data.couple.mean_pgs}`);

  // 14. APPLICATION HEALTH & DIAGNOSTICS
  console.log('\n--- TEST 14: Application Health & Deployment Readiness ---');
  const healthRes = await req('/api/health');
  assert(healthRes.ok && healthRes.data.status === 'ok', 'API /api/health endpoint responds with status "ok"', healthRes.data.status);
  assert(healthRes.data.components?.database?.status === 'ok', 'Database health diagnostic verified', healthRes.data.components?.database?.status);
  assert(healthRes.data.components?.nlp_model?.status === 'loaded', 'Trained NLP model artifact loaded and healthy', healthRes.data.components?.nlp_model?.status);
  assert(healthRes.data.components?.hadoop_results?.status === 'available', 'Apache Hadoop TSV output available and healthy', healthRes.data.components?.hadoop_results?.status);

  // CLEANUP TEST USERS FROM DATABASE
  console.log('\n--- CLEANUP: Cleaning Test Fixtures ---');
  const cleanupDb = new Database(path.resolve(process.cwd(), 'database/betweenus.db'));
  cleanupDb.prepare('DELETE FROM saved_message_analyses WHERE couple_id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM messages WHERE couple_id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM analytics_snapshots WHERE couple_id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM assessments WHERE couple_id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM interactions WHERE couple_id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM connection_requests WHERE sender_id IN (?, ?, ?) OR receiver_id IN (?, ?, ?)').run(userA.id, userB.id, userC.id, userA.id, userB.id, userC.id);
  cleanupDb.prepare('DELETE FROM couples WHERE id = ?').run(coupleId);
  cleanupDb.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(userA.id, userB.id, userC.id);
  cleanupDb.close();
  console.log('  [CLEANUP] Successfully purged temporary test accounts and test fixtures.');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFacultyVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
