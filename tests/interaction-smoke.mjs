import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
let pw;try{pw=createRequire(import.meta.url)('playwright');}catch{pw=createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT||import.meta.url)('playwright');}
const browser=await pw.chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:320,height:780}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173');await page.locator('[data-action="start-course"]').click();
 for(const [a,b]of [['p','a'],['b','sr'],['sl','n']]){await page.locator(`[data-node="${a}"]`).focus();await page.keyboard.press('Enter');await page.locator(`[data-node="${b}"]`).focus();await page.keyboard.press('Space');}
 await page.locator('.switch-target').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.is-flowing').count(),1);
 await page.locator('[data-view="diagram"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.symbol')].every(el=>getComputedStyle(el).opacity==='1'));
 assert.equal(await page.locator('.symbol').first().evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.locator('[data-view="real"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.physical')].every(el=>getComputedStyle(el).opacity==='1'));
 assert.equal(await page.locator('.physical').first().evaluate(el=>getComputedStyle(el).opacity),'1');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[data-action="reset"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.is-flowing').count(),1);
 await page.locator('[data-action="reset"]').click();await page.locator('[data-action="confirm-reset"]').click();assert.equal(await page.locator('.is-flowing').count(),0);
 await page.locator('[data-material="measure"]').click();
 await page.locator('[data-action="begin-practice"]').click();await page.locator('[data-range="3A"]').click();
 await page.locator('[data-drag-meter]').dragTo(page.locator('[data-slot="before"]'));
 assert.match(await page.locator('[data-slot="before"]').textContent(),/0.20 A/);
 await page.locator('[data-drag-meter]').dragTo(page.locator('[data-slot="after"]'));
 await page.locator('[data-choice="current"][data-value="同じ"]').click();await page.locator('[data-action="next"]').click();
 await page.locator('[data-drag-probe]').dragTo(page.locator('[data-node="a"]'));
 await page.locator('[data-drag-probe]').dragTo(page.locator('[data-node="b"]'));
 assert.match(await page.locator('.meter-value').textContent(),/1.50 V/);
 assert.equal(errors.length,0);
 console.log('320px, keyboard wiring, visual transitions, reset/cancel, mouse ammeter and voltmeter drag: passed');
}finally{await browser.close();}
