const puppeteer = require('C:/Users/jesti/AppData/Local/npm-cache/_npx/55158e48eb5c59f7/node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox', '--disable-gpu']});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/')) return request.respond({status: 401, contentType: 'application/json', body: '{}'});
    request.continue();
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewport({width, height: 1000});
    await page.goto('http://127.0.0.1:5175/', {waitUntil: 'networkidle2'});
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({viewport: innerWidth, page: document.documentElement.scrollWidth}));
    if (dimensions.page > width) throw new Error('Horizontal overflow at ' + width + ': ' + JSON.stringify(dimensions));
    if (width === 1440 || width === 390) await page.screenshot({path: `landing-${width}.local.png`, fullPage: true});
    console.log('Responsive width passed: ' + width);
  }
  await page.locator('.lp-menu-toggle').click();
  if (!await page.$('#lp-mobile-nav')) throw new Error('Mobile menu did not open');
  await page.locator('#lp-mobile-nav a[href="#pipeline"]').click();
  if (await page.$('#lp-mobile-nav')) throw new Error('Mobile menu did not close');
  const buttons = await page.$$('.lp-step');
  for (let i = 0; i < buttons.length; i++) {
    await buttons[i].click();
    const expanded = await buttons[i].evaluate(el => el.getAttribute('aria-expanded'));
    const label = await page.$eval('.lp-plan-header', el => el.textContent);
    if (expanded !== 'true' || !label.includes(['Your plan', 'Your subscription', 'Your invoice'][i])) throw new Error('Step failed: ' + i);
  }
  const hrefs = await page.$$eval('.lp-button', links => links.map(a => a.getAttribute('href')));
  if (hrefs.some(href => href !== '/register')) throw new Error('Incorrect guest CTA');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Mobile navigation, all workflow steps, guest CTAs, and runtime checks passed.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
