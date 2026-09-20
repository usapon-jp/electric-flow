import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
let pw;try{pw=createRequire(import.meta.url)('playwright');}catch{pw=createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT||import.meta.url)('playwright');}
const browser=await pw.chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173');
 await page.locator('[data-action="start-course"]').tap();
 assert.equal(await page.locator('.orientation-guide').count(),0);
 assert.ok(!await page.locator('main').evaluate(el=>el.inert));
 await page.locator('[data-node="p"] .terminal-dot').tap();
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-node="p"]').getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-node="p"]').getAttribute('aria-pressed'),'true');
 await page.reload();assert.equal(await page.locator('.orientation-guide').count(),0);
 assert.equal(await page.locator('[data-node="p"]').getAttribute('aria-pressed'),'true');
 assert.equal(errors.length,0);
 console.log('Portrait starts immediately, preserves operation and reload: passed');
}finally{await browser.close();}
