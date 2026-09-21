import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:4173');

 await page.locator('[data-action="start-course"]').tap();
 const wiring=page.locator('[data-demo="wiring"]');
 await wiring.waitFor();
 assert.match(await wiring.innerText(),/端子を2つ、順番にタップ/);
 await wiring.locator('[data-action="close-demo"]').tap();
 assert.equal(await wiring.count(),0);
 await page.reload();
 assert.equal(await page.locator('[data-demo="wiring"]').count(),0,'wiring demo repeats after reload');

 await page.locator('[data-action="home"]').tap();
 await page.locator('[data-material="measure"]').tap();
 await page.locator('[data-action="begin-practice"]').tap();
 await page.locator('[data-range="3A"]').tap();
 const current=page.locator('[data-demo="current"]');
 await current.waitFor();
 assert.match(await current.innerText(),/電流計は、丸い「＋」へ/);
 await current.locator('[data-action="close-demo"]').tap();

 for(const slot of ['before','after']) await page.locator(`[data-slot="${slot}"] .slot-disc`).tap();
 await page.locator('[data-choice="current"][data-value="同じ"]').tap();
 await page.locator('[data-action="next"]:not(:disabled)').tap();

 const voltage=page.locator('[data-demo="voltage"]');
 await voltage.waitFor();
 assert.match(await voltage.innerText(),/Vの線を、両端につなぐ/);
 const handBox=await voltage.locator('.coach-hand').boundingBox();
 assert.ok(handBox&&handBox.x>0&&handBox.y>0,'coach hand is positioned');
 await voltage.locator('[data-action="close-demo"]').tap();
 await page.reload();
 assert.equal(await page.locator('[data-demo="voltage"]').count(),0,'voltage demo repeats after reload');

 assert.equal(errors.length,0,errors.join('\n'));
 console.log('first-time wiring/current/voltage coach demos: passed');
}finally{await browser.close();}
