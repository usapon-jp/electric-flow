import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
let playwright;
try { playwright=createRequire(import.meta.url)('playwright'); }
catch { playwright=createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT || import.meta.url)('playwright'); }
const {chromium}=playwright;
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
for(const device of [{name:'desktop',width:1440,height:1000},{name:'tablet',width:834,height:1194},{name:'mobile',width:390,height:844}]){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.name!=='desktop',isMobile:device.name==='mobile'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const click=async selector=>{const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();if(device.name==='desktop')await el.click();else await el.tap();};
 const node=async id=>click(`[data-node="${id}"] .terminal-dot`);
 const pair=async(a,b)=>{await node(a);await node(b);};
 const next=async()=>{await page.locator('[data-action="next"]:not(:disabled)').waitFor();await click('[data-action="next"]');};
 const choose=async(k,v)=>click(`[data-choice="${k}"][data-value="${v}"]`);
 const shot=async name=>{await page.screenshot({path:`artifacts/${device.name}-${name}.png`,fullPage:true});};
 const assertWidth=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${device.name} horizontal overflow`);
 try{
 await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173');if(await page.locator('.orientation-guide').isVisible())await click('[data-action="portrait-continue"]');await assertWidth();await shot('01-start');
 // Wire an intentional short, then undo. No programmatic application-state changes.
 await pair('p','n');await click('.switch-target');
 assert.match(await page.locator('.circuit-area').innerText(),/ショート/);
 await click('[data-action="undo"]');await click('[data-action="undo"]');await click('[data-action="undo"]');
 // Finish actual initial circuit.
 for(const [a,b]of [['p','a'],['b','sr'],['sl','n']])await pair(a,b);
 await click('.switch-target');await page.locator('.is-flowing').waitFor();await shot('02-connected');
 // Reload retains the circuit and progress.
 await page.reload();await page.locator('.is-flowing').waitFor();await next();
 // Flow and symbols.
 await choose('flow','電球の後だけ止まる');assert.ok(await page.locator('[data-action="next"]').isDisabled());
 await choose('flow','止まる');await click('.switch-target');await click('.switch-target');await click('[data-view="diagram"]');await next();
 // Current.
 await node('p');assert.match(await page.locator('.feedback').innerText(),/導線の途中/);
 await click('[data-slot="before"] .slot-disc');await click('[data-slot="after"] .slot-disc');await choose('current','同じ');await shot('03-current');await next();
 // Voltage: resistor, battery, a conductor.
 await pair('a','b');assert.match(await page.locator('.meter-value').textContent(),/1.50/);
 await pair('p','n');await pair('p','a');assert.match(await page.locator('.meter-value').textContent(),/0.00/);await shot('04-voltage');await next();
 // Series and parallel, predictions and removal.
 await choose('branch','もう一つは、つく');await click('[data-action="remove"]');
 await click('[data-topology="parallel"]');await click('[data-action="remove"]');await shot('05-parallel');await next();
 // Unequal branches: current and voltage in both topologies.
 for(const slot of ['before','branch1','branch2'])await click(`[data-slot="${slot}"] .slot-disc`);
 await choose('sum','0.60 A');await click('[data-tool="voltage"]');await pair('a','b');await pair('c','d');
 await click('[data-topology="series"]');await click('[data-tool="current"]');await click('[data-slot="before"] .slot-disc');await click('[data-slot="after"] .slot-disc');
 await click('[data-tool="voltage"]');await pair('a','b');await pair('c','d');await pair('p','n');await shot('06-comparison');await assertWidth();await next();
 // Graph automatically records stable readings.
 await click('[data-action="measure-start"]');await page.waitForTimeout(600);
 await click('[data-voltage="2"]');await page.waitForTimeout(600);
 await click('[data-voltage="3"]');await page.waitForTimeout(600);
 assert.equal(await page.locator('.samples tbody tr').count(),3);
 await click('[data-plot="0.2"] circle:nth-child(2)');assert.ok(await page.locator('[data-action="next"]').isDisabled());
 await click('[data-plot="0.4"] circle:nth-child(2)');await shot('07-graph');await next();
 // Resistance and calculation. Wrong answer does not pass.
 await click('[data-resistance="20"]');await click('[data-resistance="30"]');
 await page.locator('#resistance-answer').fill('2');await click('[data-form="resistance"] button');assert.ok(await page.locator('[data-action="next"]').isDisabled());
 await page.locator('#resistance-answer').fill('２０');await click('[data-form="resistance"] button');await shot('08-ohm');await next();
 // Bridge problem, all five questions.
 await pair('p','n');await click('[data-action="check-connection"]');assert.equal(await page.locator('[data-action="next-question"]').count(),0);
 await pair('a','b');await click('[data-action="check-connection"]');await click('[data-action="next-question"]');
 await click('[data-plot="0.3"] circle:nth-child(2)');await click('[data-action="next-question"]');
 await page.locator('[data-form="exam"] input').fill('10');await click('[data-form="exam"] button');await click('[data-action="next-question"]');
 await page.locator('[data-form="exam"] input').fill('0.4');await click('[data-form="exam"] button');await click('[data-action="next-question"]');
 await choose('exam','抵抗器');await click('[data-action="next-question"]');
 await page.getByRole('heading',{name:'回路から、答えまで。'}).waitFor();await assertWidth();await shot('09-complete');
 await page.reload();await page.getByRole('heading',{name:'回路から、答えまで。'}).waitFor();
 // Revisiting experiments preserves data and returning restores the finished problem.
 await click('.stage-track [data-stage="6"]');assert.equal(await page.locator('.samples tbody tr').count(),3);
 await page.reload();await click('.stage-track [data-stage="8"]');await page.getByRole('heading',{name:'回路から、答えまで。'}).waitFor();
 await click('[data-action="about"]');await page.locator('#reduce-motion').check();
 assert.equal(await page.locator('.flow').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.modal').count(),0);
 assert.equal(errors.length,0,errors.join('\n'));
 results.push({device:device.name,viewport:[device.width,device.height],allStages:'passed',pageErrors:errors.length});
 console.log(`${device.name}: all 9 stages passed`);
 }catch(e){await shot('failure');console.error(device.name,e);throw e;}finally{await context.close();}
}
await writeFile('artifacts/browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),browser:'Google Chrome / Playwright',results},null,2));
}finally{await browser.close();}
