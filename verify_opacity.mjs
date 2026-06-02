import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:5174/?country=kenya';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,1000']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });

const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGE ERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));
await page.$$eval('.collapsible-header', els => {
  const t = els.find(e => e.textContent?.includes('Change in crop yield'));
  t?.click();
});
await new Promise(r => setTimeout(r, 300));
await page.$$eval('.collapsible-content .keuzes', els => {
  const t = els.find(e => e.textContent?.includes('Maize (long rains)'));
  t?.querySelector('input')?.click();
});
// Wait longer for the 3.6 MB fetch to complete in puppeteer's Edge
await new Promise(r => setTimeout(r, 10000));

async function readPolygonFillOpacity(label) {
  const sample = await page.evaluate(() => {
    const allPaths = Array.from(document.querySelectorAll('path'));
    const interactive = Array.from(document.querySelectorAll('path.leaflet-interactive'));
    const withFill = allPaths.filter(p => {
      const f = p.getAttribute('fill');
      return f && f !== 'transparent' && f !== 'none' && f !== '#000000';
    });
    // Show first three samples regardless of class
    const samples = withFill.slice(0, 3).map(p => ({
      class: p.className.baseVal || p.getAttribute('class'),
      fill: p.getAttribute('fill'),
      fillOpacity: p.getAttribute('fill-opacity'),
      stroke: p.getAttribute('stroke'),
      strokeWidth: p.getAttribute('stroke-width')
    }));
    return {
      totalPaths: allPaths.length,
      interactiveCount: interactive.length,
      withFillCount: withFill.length,
      samples
    };
  });
  console.log(`${label}: ${JSON.stringify(sample, null, 2)}`);
  return sample;
}

await readPolygonFillOpacity('Initial (slider=100%)');

// Move slider to 50%
await page.evaluate(() => {
  const slider = /** @type {HTMLInputElement|null} */ (document.querySelector('#opacity'));
  if (slider) {
    slider.value = '0.5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
await new Promise(r => setTimeout(r, 500));
await readPolygonFillOpacity('After slider=50%');

// Move slider to 20%
await page.evaluate(() => {
  const slider = /** @type {HTMLInputElement|null} */ (document.querySelector('#opacity'));
  if (slider) {
    slider.value = '0.2';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
await new Promise(r => setTimeout(r, 500));
await readPolygonFillOpacity('After slider=20%');

// Move back to 100%
await page.evaluate(() => {
  const slider = /** @type {HTMLInputElement|null} */ (document.querySelector('#opacity'));
  if (slider) {
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
await new Promise(r => setTimeout(r, 500));
await readPolygonFillOpacity('Back to slider=100%');

console.log('errors: ' + (errs.length || 'none'));
errs.forEach(e => console.log('  ! ' + e));
await browser.close();
console.log('DONE');
