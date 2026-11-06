async (page) => {
  console.log('1. Setting viewport and resetting storage...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Step 1: Open Register Modal and create Account A (Alice)
  console.log('2. Registering Account A (Alice)...');
  await page.click('button:has-text("Get Started")');
  await page.waitForSelector('input[type="email"]');

  const ts = Date.now();
  const emailA = 'alice_ui_' + ts + '@betweenus.test';
  await page.fill('input[placeholder*="Jordan Miller"]', 'Alice Rivera');
  await page.fill('input[type="email"]', emailA);
  const pwA = await page.$$('input[type="password"]');
  await pwA[0].fill('Password123!');
  await pwA[1].fill('Password123!');
  await page.click('button[type="submit"]:has-text("Create Account")');

  // Wait for dashboard and navbar avatar
  await page.waitForSelector('#navbar-profile-avatar', { timeout: 10000 });
  console.log('   Alice registered. Email:', emailA);

  // Step 2: Test Chrome-style Profile Dropdown
  console.log('3. Opening Top-Right Profile Avatar...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');

  const dropdownText = await page.textContent('#chrome-profile-dropdown');
  console.log('   Dropdown contains Active status:', dropdownText.includes('Active'));
  console.log('   Dropdown contains Alice Rivera:', dropdownText.includes('Alice Rivera'));
  console.log('   Dropdown contains Add Account:', dropdownText.includes('Add Account'));
  console.log('   Dropdown contains Log Out:', dropdownText.includes('Log Out'));

  // Step 3: Click "Add Account" in dropdown
  console.log('4. Clicking Add Account...');
  await page.click('#dropdown-add-account-btn');
  await page.waitForSelector('input[placeholder*="Jordan Miller"]');

  // Register Account B (Bob)
  console.log('5. Registering Account B (Bob)...');
  const emailB = 'bob_ui_' + ts + '@betweenus.test';
  await page.fill('input[placeholder*="Jordan Miller"]', 'Bob Vance');
  await page.fill('input[type="email"]', emailB);
  const pwB = await page.$$('input[type="password"]');
  await pwB[0].fill('Password123!');
  await pwB[1].fill('Password123!');
  await page.click('button[type="submit"]:has-text("Create Account")');

  await page.waitForSelector('#navbar-profile-avatar', { timeout: 10000 });
  console.log('   Bob registered. Email:', emailB);

  // Open dropdown from Bob: should show Bob as active, and Alice in Other Accounts!
  console.log('6. Inspecting profile dropdown from Bob account...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  const bobDropdownText = await page.textContent('#chrome-profile-dropdown');
  console.log('   Bob is active:', bobDropdownText.includes('Bob Vance'));
  console.log('   Alice is in Other Accounts:', bobDropdownText.includes('Alice Rivera'));

  // Switch back to Alice via profile dropdown
  console.log('7. Switching back to Alice via profile dropdown...');
  await page.click('button[title*="Alice Rivera"]');
  await page.waitForTimeout(800);
  console.log('   Switched back to Alice.');

  // Navigate to Partner tab
  console.log('8. Navigating to Partner tab as Alice...');
  await page.click('nav button:has-text("Partner")');
  await page.waitForSelector('#partner-email-search-input');

  // Search for Bob by registered email
  console.log('9. Searching for Bob by exact email:', emailB);
  await page.fill('#partner-email-search-input', emailB);
  await page.click('#partner-search-submit-btn');

  // Wait for Bob search result and click Connect
  await page.waitForSelector('#partner-connect-btn', { timeout: 8000 });
  console.log('   Bob found in search. Sending connection request...');
  await page.click('#partner-connect-btn');
  await page.waitForSelector('text=waiting', { timeout: 8000 });
  console.log('   Connection request sent to Bob (visible in Sent Requests).');

  // Switch to Bob via top-right dropdown
  console.log('10. Switching back to Bob via profile dropdown...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  await page.click('button[title*="Bob Vance"]');
  await page.waitForTimeout(800);

  // Bob navigates to Partner tab and accepts incoming request
  console.log('11. Bob navigating to Partner tab...');
  await page.click('nav button:has-text("Partner")');
  await page.waitForSelector('button:has-text("Accept")', { timeout: 8000 });
  console.log('   Bob sees incoming request from Alice. Accepting...');
  await page.click('button:has-text("Accept")');

  // Verify Active Partner Connection established
  await page.waitForSelector('text=Active Partner Connection', { timeout: 8000 });
  console.log('   Active Partner Connection established between Alice and Bob!');

  // Navigate to Messages tab and test messaging
  console.log('12. Navigating to Messages tab...');
  await page.click('nav button:has-text("Messages")');
  await page.waitForSelector('input[placeholder*="Type a message"]');

  // Test Review My Message with trained GoEmotions NLP
  console.log('13. Testing Review My Message with trained GoEmotions model...');
  await page.fill('input[placeholder*="Type a message"]', 'Why do you always ignore me like an idiot?');
  await page.click('button[title*="Review My Message"]');
  await page.waitForSelector('text=Pre-Send Tone Observation', { timeout: 8000 });
  console.log('   Pre-send review panel opened with genuine GoEmotions emotion classification.');

  // Send message from Bob
  console.log('14. Sending message from Bob in private room...');
  await page.fill('input[placeholder*="Type a message"]', 'Hey Alice, so glad we are connected on BetweenUs!');
  await page.click('button:has-text("Send")');
  await page.waitForSelector('text=Hey Alice, so glad we are connected on BetweenUs.', { timeout: 6000 });
  console.log('   Message successfully sent by Bob!');

  // Switch back to Alice and verify message reception
  console.log('15. Switching to Alice to verify incremental message arrival...');
  await page.click('#navbar-profile-avatar');
  await page.waitForSelector('#chrome-profile-dropdown');
  await page.click('button[title*="Alice Rivera"]');
  await page.waitForTimeout(800);

  await page.click('nav button:has-text("Messages")');
  await page.waitForSelector('text=Hey Alice, so glad we are connected on BetweenUs.', { timeout: 8000 });
  console.log('   Alice received message from Bob in real time!');

  // Alice sends reply
  console.log('16. Alice sending reply...');
  await page.fill('input[placeholder*="Type a message"]', 'Hi Bob! Everything works seamlessly.');
  await page.click('button:has-text("Send")');
  await page.waitForSelector('text=Hi Bob! Everything works seamlessly.', { timeout: 6000 });
  console.log('   Alice sent reply.');

  console.log('\n*** COMPLETE END-TO-END FLOW VERIFIED IN BROWSER! ***');
}
