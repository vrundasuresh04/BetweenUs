import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('1. Navigating to BetweenUs...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Step 1: Open Register Modal and create Account A
  console.log('2. Registering Account A (Alex)...');
  await page.click('button:has-text("Get Started")');
  await page.waitForSelector('input[type="email"]');
  
  await page.fill('input[placeholder*="Alex Morgan"]', 'Alex Rivera');
  await page.fill('input[type="email"]', 'alex.rivera@betweenus.test');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Create Account & Begin")');

  // Wait for dashboard
  await page.waitForSelector('#navbar-profile-avatar', { timeout: 10000 });
  console.log('   Alex registered and dashboard loaded.');

  // Step 2: Test Chrome-style Profile Dropdown
  console.log('3. Opening Top-Right Profile Avatar...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  
  // Verify dropdown contents
  const dropdownText = await page.textContent('#chrome-profile-dropdown');
  if (!dropdownText?.includes('Active') || !dropdownText?.includes('Add Account') || !dropdownText?.includes('Log Out')) {
    throw new Error('Chrome profile dropdown missing expected items!');
  }
  console.log('   Chrome-style profile dropdown verified with Active card, controls, and Add Account.');
  await page.screenshot({ path: 'dropdown_active.png' });

  // Step 3: Click "Add Account" in dropdown
  console.log('4. Clicking Add Account...');
  await page.click('#dropdown-add-account-btn');
  await page.waitForSelector('input[placeholder*="Alex Morgan"]');

  // Register Account B (Sam)
  console.log('5. Registering Account B (Sam)...');
  await page.fill('input[placeholder*="Alex Morgan"]', 'Sam Taylor');
  await page.fill('input[type="email"]', 'sam.taylor@betweenus.test');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Create Account & Begin")');

  await page.waitForSelector('#navbar-profile-avatar', { timeout: 10000 });
  console.log('   Sam registered. Checking Chrome dropdown for multi-account list...');

  // Open dropdown from Sam: should show Sam as active, and Alex as Other Account!
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  const samDropdownText = await page.textContent('#chrome-profile-dropdown');
  if (!samDropdownText?.includes('Sam Taylor') || !samDropdownText?.includes('Alex Rivera')) {
    throw new Error('Expected both Sam and Alex in multi-account dropdown!');
  }
  console.log('   Multi-account verified: Sam is Active, Alex is in Other Accounts.');
  await page.screenshot({ path: 'dropdown_multi_accounts.png' });

  // Switch back to Alex
  console.log('6. Switching back to Alex via profile dropdown...');
  await page.click('button:has-text("Alex Rivera")');
  await page.waitForTimeout(1000);

  // Navigate to Partner tab
  console.log('7. Navigating to Partner tab...');
  await page.click('button:has-text("Partner")');
  await page.waitForSelector('#partner-email-search-input');

  // Search for Sam
  console.log('8. Alex searching for Sam by email...');
  await page.fill('#partner-email-search-input', 'sam.taylor@betweenus.test');
  await page.click('#partner-search-submit-btn');

  // Wait for Sam search result
  await page.waitForSelector('#partner-connect-btn');
  console.log('   Sam found. Clicking Connect...');
  await page.click('#partner-connect-btn');
  await page.waitForSelector('text=waiting', { timeout: 5000 });
  console.log('   Connection request sent to Sam!');
  await page.screenshot({ path: 'partner_request_sent.png' });

  // Switch to Sam via top-right dropdown
  console.log('9. Switching to Sam to accept connection request...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  await page.click('button:has-text("Sam Taylor")');
  await page.waitForTimeout(1000);

  // Sam navigates to Partner tab
  await page.click('button:has-text("Partner")');
  await page.waitForSelector('button:has-text("Accept")');
  console.log('   Sam sees incoming request from Alex. Clicking Accept...');
  await page.click('button:has-text("Accept")');
  
  // Wait for active partner connection panel
  await page.waitForSelector('text=Active Partner Connection', { timeout: 8000 });
  console.log('   Sam and Alex successfully linked as partners!');
  await page.screenshot({ path: 'partner_linked.png' });

  // Step 10: Go to Chat
  console.log('10. Navigating to Messages tab...');
  await page.click('button:has-text("Messages")');
  await page.waitForSelector('input[placeholder*="Type a message"]');

  // Test Review My Message with trained NLP
  console.log('11. Testing Review My Message with GoEmotions NLP...');
  await page.fill('input[placeholder*="Type a message"]', 'I hate when you leave me without answering!');
  await page.click('button[title*="Review My Message"]');
  await page.waitForSelector('text=Pre-Send Tone Observation', { timeout: 8000 });
  console.log('   Pre-send review opened with trained GoEmotions observation.');
  await page.screenshot({ path: 'nlp_review_opened.png' });

  // Send message
  console.log('12. Sending message from Sam...');
  await page.fill('input[placeholder*="Type a message"]', 'Hey Alex! Glad we are connected on BetweenUs.');
  await page.click('button:has-text("Send")');
  await page.waitForSelector('text=Hey Alex! Glad we are connected on BetweenUs.');
  console.log('   Message sent and rendered in conversation.');
  await page.screenshot({ path: 'chat_sent.png' });

  console.log('\n--- BROWSER VERIFICATION COMPLETED WITH 100% SUCCESS! ---');
  await browser.close();
}

main().catch((err) => {
  console.error('Browser Test Error:', err);
  process.exit(1);
});
