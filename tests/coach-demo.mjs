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
 assert.match(await wiring.innerText(),/電池の＋ → 左の端子 A/);
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('electric-flow-v1')).state);
 for(let i=0;i<3;i++)await page.locator('[data-action="demo-next"]').tap();
 assert.match(await wiring.innerText(),/スイッチをタップ/);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('electric-flow-v1')).state),original,'demo changed the learner circuit');
 await wiring.locator('[data-action="close-demo"]').tap();
 assert.equal(await wiring.count(),0);
 await page.reload();
 assert.equal(await page.locator('[data-demo="wiring"]').count(),0,'wiring demo repeats after reload');

 await page.locator('[data-action="replay-demo"]').tap();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  const placement=await page.evaluate(()=>{
   const target=document.querySelector('.coach-target circle');
   const terminal=document.querySelector('[data-node="p"] .terminal-dot');
   const center=el=>{const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};
   return {target:center(target),terminal:center(terminal),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.ok(Math.hypot(placement.target[0]-placement.terminal[0],placement.target[1]-placement.terminal[1])<1,'overlay moved away from actual terminal');
  assert.equal(placement.overflow,false);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.coach-hand').evaluate(el=>getComputedStyle(el).display),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-action="close-demo"]').tap();
 await page.locator('[data-action="home"]').tap();
 await page.locator('[data-material="measure"]').tap();
 await page.locator('[data-action="begin-practice"]').tap();
 await page.locator('[data-range="3A"]').tap();
 const current=page.locator('[data-demo="current"]');
 await current.waitFor();
 assert.match(await current.innerText(),/電球の前の「＋」/);
 await current.locator('[data-action="close-demo"]').tap();

 for(const slot of ['before','after']) await page.locator(`[data-slot="${slot}"] .slot-disc`).tap();
 await page.locator('[data-choice="current"][data-value="同じ"]').tap();
 await page.locator('[data-action="next"]:not(:disabled)').tap();

 const voltage=page.locator('[data-demo="voltage"]');
 await voltage.waitFor();
 assert.match(await voltage.innerText(),/左の端子 A → 右の端子 B/);
 const handBox=await page.locator('.coach-hand').boundingBox();
 assert.ok(handBox&&handBox.x>0&&handBox.y>0,'coach hand is positioned');
 await voltage.locator('[data-action="close-demo"]').tap();
 await page.reload();
 assert.equal(await page.locator('[data-demo="voltage"]').count(),0,'voltage demo repeats after reload');

 assert.equal(errors.length,0,errors.join('\n'));
 console.log('first-time wiring/current/voltage coach demos: passed');
}finally{await browser.close();}
