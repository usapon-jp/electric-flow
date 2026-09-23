import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
await mkdir('artifacts',{recursive:true});
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
 assert.equal(await wiring.count(),0,'wiring demo should open from 見本');
 await page.locator('.panel-copy [data-action="replay-demo"]').tap();
 await wiring.waitFor();
 assert.match(await wiring.innerText(),/電池の＋ → 左の端子 A/);
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('electric-flow-v1')).state);
 for(const step of ['2 / 4','3 / 4','4 / 4','完了'])await wiring.getByText(step,{exact:false}).waitFor();
 assert.equal(await wiring.locator('[data-action="demo-next"]').count(),0);
 assert.equal(await wiring.locator('[data-action="demo-restart"]').innerText(),'もう一度');
 assert.equal(await wiring.locator('[data-action="close-demo"]').innerText(),'やってみる');
 assert.match(await page.locator('.circuit-readings').innerText(),/0.20 A/);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('electric-flow-v1')).state),original,'demo changed the learner circuit');
 await wiring.locator('[data-action="close-demo"]').tap();
 assert.equal(await wiring.count(),0);
 await page.reload();
 assert.equal(await page.locator('[data-demo="wiring"]').count(),0,'wiring demo repeats after reload');

 await page.locator('.panel-copy [data-action="replay-demo"]').tap();
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
 await wiring.locator('[data-action="demo-restart"]').waitFor();
 await wiring.locator('[data-action="demo-restart"]').tap();
 assert.match(await wiring.innerText(),/電池の＋ → 左の端子 A/);
 await wiring.locator('[data-action="close-demo"]').waitFor();
 await wiring.locator('[data-action="close-demo"]').tap();
 await page.setViewportSize({width:834,height:1194});
 await page.locator('[data-action="home"]').tap();
 await page.locator('[data-material="measure"]').tap();
 await page.locator('[data-action="begin-practice"]').tap();
 await page.locator('[data-range="3A"]').tap();
 const current=page.locator('[data-demo="current"]');
 await current.waitFor();
 assert.match(await current.innerText(),/電球の前の「＋」/);
 await current.getByText('2 / 2',{exact:false}).waitFor();
 await current.getByText('完了',{exact:false}).waitFor();
 await current.locator('[data-action="close-demo"]').tap();
 await page.screenshot({path:'artifacts/tablet-current-ready.png',fullPage:true});
 await page.locator('[data-action="meter-help"]').tap();
 assert.match(await page.locator('.meter-help').innerText(),/導線を流れる電流の大きさ/);
 assert.match(await page.locator('.meter-help').innerText(),/回路と一列につなぎます/);
 await page.screenshot({path:'artifacts/tablet-current-help.png',fullPage:true});
 await page.locator('.meter-help [data-action="close-modal"]').last().tap();

 await page.locator('[data-drag-meter]').scrollIntoViewIfNeeded();
 const dragSource=await page.locator('[data-drag-meter]').boundingBox();
 const dragTarget=await page.locator('[data-slot="before"] .slot-disc').boundingBox();
 await page.mouse.move(dragSource.x+dragSource.width/2,dragSource.y+dragSource.height/2);
 await page.mouse.down();
 await page.mouse.move(dragTarget.x+dragTarget.width/2,dragTarget.y+dragTarget.height/2,{steps:8});
 assert.equal(await page.locator('.drag-ghost').innerText(),'A');
 assert.equal(await page.locator('[data-slot="before"].drag-target').count(),1);
 await page.screenshot({path:'artifacts/tablet-current-drag.png',fullPage:true});
 await page.mouse.up();
 assert.equal(await page.locator('.drag-ghost').count(),0);
 assert.match(await page.locator('[data-slot="before"]').textContent(),/0.20 A/);
 await page.setViewportSize({width:390,height:844});

 await page.locator('[data-slot="after"] .slot-disc').tap();
 await page.locator('[data-choice="current"][data-value="同じ"]').tap();
 await page.locator('[data-action="next"]:not(:disabled)').tap();

 const voltage=page.locator('[data-demo="voltage"]');
 await voltage.waitFor();
 assert.match(await voltage.innerText(),/左の端子 A → 右の端子 B/);
 const handBox=await page.locator('.coach-hand').boundingBox();
 assert.ok(handBox&&handBox.x>0&&handBox.y>0,'coach hand is positioned');
 await voltage.getByText('完了',{exact:false}).waitFor();
 await voltage.locator('[data-action="close-demo"]').tap();
 await page.reload();
 assert.equal(await page.locator('[data-demo="voltage"]').count(),0,'voltage demo repeats after reload');

 assert.equal(errors.length,0,errors.join('\n'));
 console.log('first-time wiring/current/voltage coach demos: passed');
}finally{await browser.close();}
