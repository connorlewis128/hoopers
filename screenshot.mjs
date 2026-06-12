import puppeteer from 'puppeteer-core';
import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = join(__dirname, 'temporary screenshots');

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const exists = async (p) => { try { await access(p, constants.F_OK); return true; } catch { return false; } };

if (!(await exists(SCREENSHOTS_DIR))) await mkdir(SCREENSHOTS_DIR, { recursive: true });

let n = 1;
const name = () => `screenshot-${n}${label ? '-' + label : ''}.png`;
while (await exists(join(SCREENSHOTS_DIR, name()))) n++;
const outPath = join(SCREENSHOTS_DIR, name());

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Scroll to trigger IntersectionObserver reveals
await page.evaluate(async () => {
  await new Promise(resolve => {
    let pos = 0;
    const step = () => {
      pos += 400;
      window.scrollTo(0, pos);
      if (pos < document.body.scrollHeight) requestAnimationFrame(step);
      else { window.scrollTo(0, 0); setTimeout(resolve, 400); }
    };
    requestAnimationFrame(step);
  });
});
await new Promise(r => setTimeout(r, 600));

const screenshot = await page.screenshot({ fullPage: true });
await writeFile(outPath, screenshot);
await browser.close();
console.log('Saved:', outPath);
