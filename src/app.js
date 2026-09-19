import {solveCircuit, measuredVoltage, sameEdge, SINGLE_WIRES, LABELS, pretty} from './physics.js';
import {stages,initialStage,examQuestions} from './stages.js';
import {circuitView,graphView,icons} from './circuit.js';

const KEY='electric-flow-v1', app=document.querySelector('#app');
let portraitContinue=false;
try{portraitContinue=sessionStorage.getItem('electric-flow-portrait')==='continue';}catch{}
let s=initialStage(0), completed=[], stageStates={}, drawer=false, modal=null, history=[], saveAvailable=true, measureTimer;
function restoreState(raw) {
 if(!raw || !Number.isInteger(raw.stage) || raw.stage<0 || raw.stage>8)return null;
 const base=initialStage(raw.stage);
 for(const key of ['schematic','closed','removed','hint','confirmed'])if(typeof raw[key]==='boolean')base[key]=raw[key];
 if(['single','series','parallel'].includes(raw.topology))base.topology=raw.topology;
 if([1,1.5,2,3,4,5].includes(raw.voltage))base.voltage=raw.voltage;
 if([7.5,10,20,30].includes(raw.resistance))base.resistance=raw.resistance;
 if([null,'current','voltage'].includes(raw.tool))base.tool=raw.tool;
 if([null,'before','after','branch1','branch2'].includes(raw.meter))base.meter=raw.meter;
 if(raw.selected===null||Object.hasOwn(LABELS,raw.selected))base.selected=raw.selected;
 if(Array.isArray(raw.wires))base.wires=raw.wires.filter(e=>Array.isArray(e)&&e.length===2&&e.every(n=>Object.hasOwn(LABELS,n))).slice(0,28);
 for(const key of ['probes','examConnections'])if(Array.isArray(raw[key]))base[key]=raw[key].filter(n=>Object.hasOwn(LABELS,n)).slice(0,2);
 if(Array.isArray(raw.seen))base.seen=raw.seen.filter(v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,30}$/.test(v)).slice(0,50);
 for(const key of ['records','answers'])if(raw[key]&&typeof raw[key]==='object'&&!Array.isArray(raw[key]))for(const [k,v]of Object.entries(raw[key]))if(/^[a-zA-Z0-9-]{1,40}$/.test(k)&&((typeof v==='number'&&Number.isFinite(v))||(key==='answers'&&typeof v==='string'&&v.length<40)))base[key][k]=v;
 if(Array.isArray(raw.samples))base.samples=raw.samples.filter(p=>[1,2,3,4,5].includes(p.v)&&Number.isFinite(p.i)&&p.i>=0&&p.i<=.5).slice(0,5);
 if(Number.isInteger(raw.question)&&raw.question>=0&&raw.question<=5)base.question=raw.question;
 if(typeof raw.feedback==='string')base.feedback=raw.feedback.slice(0,160);
 if([null,.1,.2,.3,.4,.5].includes(raw.graphGuess))base.graphGuess=raw.graphGuess;
 return base;
}
try {
 const saved=JSON.parse(localStorage.getItem(KEY));
 if(saved?.version===1){
  s=restoreState(saved.state)||s;
  completed=Array.isArray(saved.completed)?saved.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<9):[];
  if(saved.stageStates&&typeof saved.stageStates==='object')for(const [k,v]of Object.entries(saved.stageStates)){const restored=restoreState(v);if(restored&&String(restored.stage)===k)stageStates[k]=restored;}
 }
}catch{}

const escaped=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=v=>s.seen.includes(v);
const see=v=>{if(!has(v))s.seen.push(v);};
const model=()=>solveCircuit({...s,secondResistance:s.stage===5?15:s.resistance});
function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,state:s,completed,stageStates}));saveAvailable=true;}catch{saveAvailable=false;}}
function recordVoltage(result){if(s.probes.length!==2||result.short||result.current<=0)return;const v=measuredVoltage(result,s.probes);if(v===null)return;const pairs={battery:['p','n'],lamp1:['a','b'],lamp2:['c','d'],wire:['p','a']};for(const [key,pair] of Object.entries(pairs))if(sameEdge(pair,s.probes))s.records[`${s.topology}-V-${key}`]=v;}
const recorded=k=>s.records[k]!==undefined;
function finished(){
 switch(s.stage){
 case 0:return model().current>0&&!model().short&&s.wires.length===3&&SINGLE_WIRES.every(e=>s.wires.some(w=>sameEdge(e,w)));
 case 1:return s.answers.flow==='止まる'&&has('opened')&&has('reclosed')&&has('diagram');
 case 2:return recorded('single-before')&&recorded('single-after')&&s.answers.current==='同じ';
 case 3:return ['lamp1','battery','wire'].every(k=>recorded(`single-V-${k}`));
 case 4:return ['series','parallel','removed-series','removed-parallel'].every(has)&&s.answers.branch==='もう一つは、つく';
 case 5:return ['parallel-before','parallel-branch1','parallel-branch2','series-before','series-after','series-V-lamp1','series-V-lamp2','series-V-battery','parallel-V-lamp1','parallel-V-lamp2'].every(recorded)&&s.answers.sum==='0.60 A';
 case 6:return [1,2,3].every(v=>s.samples.some(p=>p.v===v))&&s.answers.graph===.4;
 case 7:return [10,20,30].every(v=>has(`R${v}`))&&s.answers.resistance==='20';
 case 8:return s.question>=examQuestions.length;
 }
}
function choice(key,items){return `<div class="choices">${items.map(v=>`<button class="choice ${s.answers[key]===v?'correct':''}" data-choice="${key}" data-value="${escaped(v)}">${escaped(v)}${s.answers[key]===v?icons.check:''}</button>`).join('')}</div>`;}
function checks(items){return `<div class="checklist">${items.map(([text,ok])=>`<div class="check-item ${ok?'done':''}"><span>${ok?icons.check:'<i></i>'}</span>${text}</div>`).join('')}</div>`;}
function topologyControls(){return `<div class="segmented topology">${[['series','直列'],['parallel','並列']].map(([v,t])=>`<button data-topology="${v}" class="${s.topology===v?'active':''}" aria-pressed="${s.topology===v}">${t}</button>`).join('')}</div>`;}
function reading(label,value,unit){return `<div class="reading"><span>${label}</span><strong>${value}<small>${unit}</small></strong></div>`;}
function measurementTools(){return `<div class="tool-picker"><button data-tool="current" class="${s.tool==='current'?'active':''}" aria-pressed="${s.tool==='current'}"><span class="meter-icon">A</span>電流計</button><button data-tool="voltage" class="${s.tool==='voltage'?'active':''}" aria-pressed="${s.tool==='voltage'}"><span class="meter-icon">V</span>電圧計</button></div>`;}
function sampleTable(samples){return `<table class="samples"><caption class="sr-only">測定した電圧と電流</caption><thead><tr><th scope="col">電圧 <small>V</small></th><th scope="col">電流 <small>A</small></th></tr></thead><tbody>${samples.length?samples.map(p=>`<tr><td>${p.v.toFixed(1)}</td><td>${pretty(p.i)}</td></tr>`).join(''):'<tr><td colspan="2" class="empty-table">測った値が、ここに。</td></tr>'}</tbody></table>`;}
function controls(r){
 const done=finished();
 switch(s.stage){
 case 0:return `<div class="panel-eyebrow">YOUR FIRST CIRCUIT</div><h2>小さな実験室へ。</h2><p class="panel-copy">つないで、スイッチを入れる。<br>そこから、はじめよう。</p>${checks([['電池 → 電球',s.wires.some(e=>sameEdge(e,['p','a']))],['電球 → スイッチ',s.wires.some(e=>sameEdge(e,['b','sr']))],['スイッチ → 電池',s.wires.some(e=>sameEdge(e,['sl','n']))]])}<div class="live-readings">${reading('電池',pretty(s.voltage,1),'V')}${reading('回路全体',pretty(r.current),'A')}</div>`;
 case 1:return `<div class="panel-eyebrow">PREDICT & TRY</div><h2>スイッチを開くと？</h2>${choice('flow',['全部の流れが止まる','電球の後だけ止まる'].map((t,i)=>i===0?'止まる':t))}${s.answers.flow?checks([['開いて、閉じてみる',has('opened')&&has('reclosed')],['回路図でも見る',has('diagram')]]):'<p class="panel-copy">予想したら、回路で確かめよう。</p>'}${reading('回路全体',pretty(r.current),'A')}`;
 case 2:return `<div class="panel-eyebrow">CURRENT</div><h2>途中に入れて、はかる。</h2><p class="panel-copy">丸い「＋」が、電流計の入る場所。</p>${checks([['電球の前',recorded('single-before')],['電球の後',recorded('single-after')]])}${recorded('single-before')&&recorded('single-after')?`<div class="mini-question">前と後の電流は？</div>${choice('current',['同じ','後のほうが小さい'])}`:''}`;
 case 3:return `<div class="panel-eyebrow">VOLTAGE</div><h2>両端に、そっと触れる。</h2><p class="panel-copy">一方を選んで、もう一方へ。</p>${checks([['電球の両端',recorded('single-V-lamp1')],['電池の両端',recorded('single-V-battery')],['左の導線の両端',recorded('single-V-wire')]])}<div class="live-readings">${reading('測った電圧',pretty(measuredVoltage(r,s.probes)),'V')}</div>`;
 case 4:return `<div class="panel-eyebrow">TWO PATHS</div><h2>道が違うと、どうなる？</h2>${topologyControls()}${checks([['直列でくらべる',has('series')&&has('removed-series')],['並列でくらべる',has('parallel')&&has('removed-parallel')]])}<div class="mini-question">並列で、電球 Bを外すと？</div>${choice('branch',['もう一つは、つく','どちらも消える'])}<button class="secondary wide" data-action="remove">${s.removed?'電球 Bを戻す':'電球 Bを外す'}</button>${reading('回路全体',pretty(r.current),'A')}`;
 case 5:{const parallel=s.topology==='parallel';return `<div class="panel-eyebrow">MEASURE & COMPARE</div><h2>${parallel?'分かれた電流を足すと？':'一つの道を、はかる。'}</h2>${topologyControls()}${measurementTools()}${checks(parallel?[
 ['全体・上の枝・下の枝の電流',['before','branch1','branch2'].every(k=>recorded('parallel-'+k))],['電球 A・Bの電圧',['lamp1','lamp2'].every(k=>recorded('parallel-V-'+k))]
 ]:[['電球の前・後の電流',['before','after'].every(k=>recorded('series-'+k))],['電球 A・B・電池の電圧',['lamp1','lamp2','battery'].every(k=>recorded('series-V-'+k))]])}
 ${s.tool==='voltage'?`<div class="voltage-records">${['lamp1','lamp2','battery'].map((k,i)=>`<span>${['A','B','電池'][i]} <b>${pretty(s.records[`${s.topology}-V-${k}`])}</b> V</span>`).join('')}</div>`:''}
 <p class="quiet-note">性質の違う2つの電球で比較。</p>
 ${['parallel-before','parallel-branch1','parallel-branch2'].every(recorded)?`<div class="mini-question">枝が 0.40 A と 0.20 A。全体は？</div>${choice('sum',['0.20 A','0.40 A','0.60 A'])}`:''}`;}
 case 6:return `<div class="panel-eyebrow">FIND A PATTERN</div><h2>電圧だけを、変える。</h2><p class="panel-copy">ここからは抵抗器で、正確に。</p><div class="voltage-control">${reading('電圧',pretty(s.voltage,1),'V')}<input aria-label="電圧" type="range" id="voltage" min="1" max="5" step="1" value="${s.voltage}"><div class="voltage-steps">${[1,2,3,4,5].map(v=>`<button data-voltage="${v}" class="${s.voltage===v?'selected':''}">${v}<small> V</small></button>`).join('')}</div></div>${reading('電流',pretty(r.current),'A')}${!has('measuring')?'<button class="secondary wide" data-action="measure-start">測定をはじめる</button>':'<p class="recording"><i></i> 値が落ち着くと、自動で記録</p>'}${checks([['1・2・3 Vを記録',[1,2,3].every(v=>s.samples.some(p=>p.v===v))]])}${s.samples.length>=3?`<div class="mini-question">4 Vの点は、どこ？</div><p class="panel-copy">グラフの点を選んで予想。</p>`:''}`;
 case 7:return `<div class="panel-eyebrow">OHM’S LAW</div><h2>電圧は、そのままで。</h2>${reading('電圧','3.0','V')}<div class="resistance-picker">${[10,20,30].map(v=>`<button data-resistance="${v}" class="${s.resistance===v?'active':''}" aria-pressed="${s.resistance===v}">${v}<small> Ω</small></button>`).join('')}</div>${reading('電流',pretty(r.current),'A')}${checks([['3つの抵抗をくらべる',[10,20,30].every(v=>has(`R${v}`))]])}${[10,20,30].every(v=>has(`R${v}`))?`<div class="formula"><span>抵抗</span><strong>R = V ÷ I</strong></div><label class="mini-question" for="resistance-answer">3.0 Vで0.15 A。抵抗は？</label><form data-form="resistance"><div class="answer-input"><input id="resistance-answer" name="answer" inputmode="decimal" autocomplete="off" aria-label="抵抗の答え" required><span>Ω</span><button aria-label="抵抗の答えを確かめる">${icons.arrow}</button></div></form>`:''}`;
 case 8:return examControls();
 }
}
function examControls(){
 if(finished())return `<div class="panel-eyebrow">EXPERIMENT COMPLETE</div><h2>回路から、答えまで。</h2><p class="panel-copy">つないだことも、測ったことも。<br>同じ実験の、違う見え方。</p><div class="completion-line"><span>5</span><small>つの問いを確認</small></div><button class="secondary wide" data-action="retry-exam">別の配置でもう一度</button><button class="text-button wide" data-action="review">学んだことを振り返る ${icons.arrow}</button>`;
 const q=examQuestions[s.question];
 return `<div class="panel-eyebrow">QUESTION ${s.question+1} / 5</div><h2>${q.title}</h2><p class="panel-copy">${q.note}</p>
 ${q.kind==='connection'?`<div class="probe-status"><span class="meter-icon">V</span><span>${s.examConnections.map(n=>({a:'A',b:'B',p:'C',n:'D'}[n]||'端子')).join(' — ')||'2点を選ぶ'}</span></div><button class="secondary wide" data-action="check-connection" ${s.examConnections.length!==2?'disabled':''}>確かめる</button>`:''}
 ${q.kind==='number'?`<form data-form="exam"><div class="answer-input"><input name="answer" inputmode="decimal" autocomplete="off" aria-label="${q.title}" required><span>${q.unit}</span><button aria-label="答えを確かめる">${icons.arrow}</button></div></form>`:''}
 ${q.kind==='choice'?choice('exam',q.choices):''}
 ${s.confirmed?`<button class="primary wide" data-action="next-question">${s.question===4?'実験を終える':'次の問いへ'} ${icons.arrow}</button>`:''}`;
}
function graphPanel(){
 const exam=s.stage===8;
 const samples=exam?[{v:1,i:.1},{v:2,i:.2},{v:3,i:.3}]:s.samples;
 return `<section class="data-section ${exam?'exam-data':''}" aria-label="測定結果"><div class="data-table"><div class="panel-eyebrow">${exam?'実験の記録':'YOUR MEASUREMENTS'}</div>${sampleTable(samples)}</div><div class="data-graph">${graphView(exam?(s.question===1?[]:samples):samples,{guess:!exam&&samples.length>=3&&!s.answers.graph,exam:exam&&s.question===1&&!s.confirmed,selected:s.graphGuess,complete:!exam&&Boolean(s.answers.graph)})}</div></section>`;
}
function stageSteps(){return `<div class="stage-track" aria-label="学習の進み具合">${stages.map((st,i)=>`<button data-stage="${i}" class="${i===s.stage?'current':''} ${completed.includes(i)?'completed':''}" aria-label="${i+1}. ${st.name}" ${i>s.stage&&!completed.includes(i)&&!completed.includes(i-1)?'disabled':''} ${i===s.stage?'aria-current="step"':''}><span>${completed.includes(i)?'✓':String(i+1).padStart(2,'0')}</span></button>`).join('')}</div>`;}
function render({focusTitle=false}={}){
 const focused=document.activeElement;let restoreSelector=null;
 if(focused?.id)restoreSelector='#'+CSS.escape(focused.id);
 else if(focused?.dataset){for(const key of ['node','slot','view','tool','topology','choice','voltage','resistance','action','plot'])if(focused.dataset[key]){restoreSelector=`[data-${key}="${CSS.escape(focused.dataset[key])}"]`;if(key==='choice')restoreSelector+=`[data-value="${CSS.escape(focused.dataset.value)}"]`;break;}}
 app.className=`stage-${s.stage}`;
 const r=model(),st=stages[s.stage],done=finished(); if(done&&!completed.includes(s.stage))completed.push(s.stage);save();
 const isExam=s.stage===8;
 app.innerHTML=`<header class="site-header"><a class="brand" href="#" aria-label="電気の流れ、現在の実験"><span>電気の流れ<span class="brand-dot"></span></span><small>A LITTLE CIRCUIT LAB</small></a><nav aria-label="学習の章">${['つなぐ','はかる','ためす','問題'].map((t,i)=>`<button data-section="${i}" class="${st.section===i?'active':''}" ${st.section===i?'aria-current="page"':''}>${t}</button>`).join('')}</nav><button class="icon-button menu-button" data-action="menu" aria-label="学習ステップを開く" aria-expanded="${drawer}"><svg viewBox="0 0 24 24" fill="none"><path d="M5 8h14M5 16h14"/></svg></button></header>
 <main><div class="chapter-line"><span>CHAPTER ${String(st.section+1).padStart(2,'0')}</span><span class="chapter-dash"></span><span>${st.name}</span><span class="stage-count">${String(s.stage+1).padStart(2,'0')} / 09</span></div><div class="title-row"><div><h1 tabindex="-1">${done&&isExam?'見え方が変わっても、同じ回路。':st.title}</h1><p class="subtitle">${isExam?'抵抗器 Rの電圧を変え、流れる電流を調べた。':st.intro}</p></div><button class="hint-button" data-action="hint" aria-expanded="${s.hint}">${icons.hint}<span>ヒント</span></button></div>
 ${s.hint?`<div class="hint-strip" role="note">${st.hint}<button data-action="hint" aria-label="ヒントを閉じる">×</button></div>`:''}
 ${isExam?'<p class="experiment-text">抵抗器 Rに加える電圧を変え、流れる電流を調べた。結果は下の表のようになった。</p>':''}
 <div class="workbench ${s.stage===6||isExam?'has-data':''} ${isExam?'exam':''}"><section class="circuit-area" aria-label="回路を操作する"><div class="canvas-toolbar"><span class="canvas-label"><i class="${r.current>0?'on':''}"></i>${r.short?'通電停止':r.current>0?'電流が流れています':'電流は流れていません'}</span><div class="view-toggle" aria-label="回路の表示"><button data-view="real" aria-pressed="${!s.schematic}" class="${!s.schematic?'active':''}">実物</button><button data-view="diagram" aria-pressed="${s.schematic}" class="${s.schematic?'active':''}">回路図</button></div></div>
 <div class="circuit-wrap ${isExam&&has('rearranged')?'rearranged':''}">${circuitView(s,r,{exam:isExam})}</div><div class="circuit-readings" aria-label="電源と回路全体の測定値"><span>電池 <b>${pretty(s.voltage,1)}</b> V</span><span>全体 <b>${pretty(r.current)}</b> A</span></div><div class="canvas-bottom"><span>${s.stage===0?(s.selected?'もう一方の端子をタップ':'端子 → 端子'):s.stage===3||s.tool==='voltage'?'2点を選んで測定':s.stage===2||s.stage===5?'丸い＋をタップ':s.stage>=6?'電圧と電流の関係を観察':'スイッチをタップ'}</span><div class="canvas-actions"><button data-action="undo" class="icon-button" aria-label="操作を一つ戻す" ${history.length?'':'disabled'}><svg viewBox="0 0 24 24" fill="none"><path d="m9 6-5 5 5 5M4 11h10a5 5 0 0 1 0 10"/></svg></button><button data-action="reset" class="icon-button" aria-label="このステージをやり直す">${icons.reset}</button></div></div></section>
 <aside class="control-panel" aria-label="実験の操作と問い">${controls(r)}</aside>
 ${s.stage===6||isExam?graphPanel():''}</div>
 <div class="feedback ${s.feedback?'visible':''}" role="status" aria-live="polite">${escaped(s.feedback)}</div>
 <footer class="lesson-footer"><div class="lesson-insight ${done?'revealed':''}">${done?`<span class="insight-mark">${icons.check}</span><p>${st.insight}</p>`:`<span class="quiet-label">${s.stage===0?'まずは、触れることから。':'自分のペースで、確かめよう。'}</span>`}</div>${s.stage<8?`<button class="primary next-button" data-action="next" ${done?'':'disabled'}>次へ ${icons.arrow}</button>`:`<button class="primary next-button" data-action="${done?'review':'back-to-experiment'}">${done?'振り返る':'実験で確かめる'} ${icons.arrow}</button>`}</footer>
 ${stageSteps()}<div class="bottom-meta"><span>中学2年 理科 <b>·</b> 回路と電流</span><button class="text-button" data-action="about">この実験について</button><span>${saveAvailable?'この端末に自動保存':'保存できません · この画面では続けられます'}</span></div></main>
 ${drawer?`<div class="drawer-backdrop" data-action="close-menu"></div><aside class="step-drawer" role="dialog" aria-modal="true" aria-label="学習ステップ"><div class="drawer-heading"><span>学習の道すじ</span><button class="icon-button" data-action="close-menu" aria-label="閉じる">×</button></div>${stages.map((t,i)=>`<button data-stage="${i}" class="drawer-step ${s.stage===i?'active':''}" ${i>s.stage&&!completed.includes(i)&&!completed.includes(i-1)?'disabled':''}><small>${String(i+1).padStart(2,'0')}</small><span>${t.name}</span>${completed.includes(i)?icons.check:''}</button>`).join('')}<button class="text-button wide" data-action="about">この実験について</button></aside>`:''}
 ${modal?modalView():''}${!portraitContinue?`<div class="orientation-guide" role="dialog" aria-modal="true" aria-label="横向きで使う"><div class="rotate-symbol" aria-hidden="true">↻</div><h2>画面を横向きに。</h2><p>回路と数値を、ひと目に。</p><button data-action="portrait-continue" class="secondary">縦向きで続ける</button></div>`:''}`;
 fitCircuitViewport();
 if(focusTitle)document.querySelector('h1').focus({preventScroll:true});
 else if(restoreSelector)document.querySelector(restoreSelector)?.focus({preventScroll:true});
 if(drawer)document.querySelector('.step-drawer button')?.focus({preventScroll:true});
 if(modal)document.querySelector('.modal button')?.focus({preventScroll:true});
}
function modalView(){return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" data-action="close-modal" aria-label="閉じる">×</button><div class="panel-eyebrow">A LITTLE CIRCUIT LAB</div><h2 id="modal-title">${modal==='reset'?'この実験を、はじめから。':modal==='about'?'この実験について':'ここまでに、見えたこと。'}</h2>${modal==='reset'?'<p>このステージの操作と測定記録を戻します。ほかのステージの進み具合は残ります。</p><button class="primary wide" data-action="confirm-reset">やり直す</button><button class="text-button wide" data-action="close-modal">そのまま続ける</button>':modal==='about'?'<p>中学2年の回路・電流・電圧・オームの法則を扱う体験教材です。電力・電力量・磁界は、この版には含みません。</p><p>導線と電源の内部抵抗は0、電流計は抵抗0、電圧計は電流を流さない理想的な計器として計算しています。</p><p>豆電球は抵抗一定の簡略モデルです。実際の豆電球は温度で抵抗が変わるため、比例の実験には抵抗器を使っています。光の粒は電流の模式表現で、電子や実際の速さを表しません。</p><p>測定は絶対値表示です。実物の計器の極性・測定範囲・目盛り操作は、この版では扱いません。</p><p>測定記録と学習の進み具合は、この端末のブラウザに保存します。外部送信はありません。</p><label class="motion-option"><input type="checkbox" id="reduce-motion" '+(document.documentElement.dataset.motion==='reduce'?'checked':'')+'> 動きを控えめにする</label>':`<div class="review-list">${stages.slice(0,8).map((t,i)=>`<button data-stage="${i}" ${completed.includes(i)?'':'disabled'}><small>${String(i+1).padStart(2,'0')}</small><span>${t.insight}</span>${icons.arrow}</button>`).join('')}</div><p class="quiet-note">次に開いたときも、続きから。</p>`}</section></div>`;}
function changeStage(n,{reset=false}={}){clearTimeout(measureTimer);stageStates[s.stage]=structuredClone(s);s=!reset&&stageStates[n]?structuredClone(stageStates[n]):initialStage(n);history=[];if(n===4)see('series');if(n===7){s.voltage=3;see('R10');}drawer=false;modal=null;render({focusTitle:true});scheduleMeasurement();window.scrollTo({top:0,behavior:'instant'});}
function remember(){history.push(structuredClone(s));if(history.length>30)history.shift();s.feedback='';}
function scheduleMeasurement(){clearTimeout(measureTimer);if(s.stage!==6||!has('measuring'))return;measureTimer=setTimeout(()=>{if(s.stage!==6)return;const r=model();if(r.current<=0||r.short)return;s.samples=s.samples.filter(p=>p.v!==s.voltage);s.samples.push({v:s.voltage,i:r.current});s.samples.sort((a,b)=>a.v-b.v);render();},450);}
function handleNode(id){
 if(s.stage===0){if(s.selected===id){s.selected=null;return;}if(!s.selected){s.selected=id;return;}const edge=[s.selected,id];const match=s.wires.findIndex(w=>sameEdge(w,edge));if(match>=0)s.wires.splice(match,1);else s.wires.push(edge);s.selected=null;if(model().short)s.feedback='電池の＋と−を、直接つながないように。';}
 else if(s.stage===8&&s.question===0&&!s.confirmed){if(s.examConnections.includes(id))s.examConnections=s.examConnections.filter(n=>n!==id);else s.examConnections=s.examConnections.length>=2?[id]:[...s.examConnections,id];}
 else if(s.tool==='voltage'){s.probes=s.probes.length>=2?[id]:s.probes.includes(id)?[]:[...s.probes,id];recordVoltage(model());if(s.probes.length===1)s.feedback='もう一方の端子へ。';}
 else if(s.tool==='current'){s.feedback='電流計は、導線の途中の「＋」へ。';}
}
function selectChoice(key,value){
 const answers={flow:'止まる',current:'同じ',branch:'もう一つは、つく',sum:'0.60 A',exam:'抵抗器'};
 if(value===answers[key]){s.answers[key]=value;s.feedback={flow:'回路で確かめよう。',current:'どちらも 0.20 A。',branch:'二つのつなぎ方で、電球 Bを外してみよう。',sum:'0.40 ＋ 0.20 ＝ 0.60 A。',exam:'抵抗器を変えずに、電圧だけを変える。'}[key];if(key==='exam')s.confirmed=true;}
 else{s.feedback={flow:'スイッチを開いて、電球の前と後を見てみよう。',current:'前と後の、二つの数値を見くらべよう。',branch:'並列にして、電球 Bを外してみよう。',sum:'二つの枝を流れる電流を足してみよう。',exam:'調べたいのは、同じ抵抗器の電圧と電流の関係。'}[key];}
}
app.addEventListener('click',e=>{
 const el=e.target.closest('button,[data-node],[data-slot],[data-plot],[data-action]');if(!el||el.disabled||el.closest('form'))return;
 const node=el.dataset.node,slot=el.dataset.slot,action=el.dataset.action;
 if(action==='portrait-continue'){portraitContinue=true;try{sessionStorage.setItem('electric-flow-portrait','continue');}catch{}render();return;}
 if(el.dataset.stage!==undefined){const n=Number(el.dataset.stage);if(n===s.stage){drawer=false;modal=null;render();}else changeStage(n);return;}
 if(el.dataset.section!==undefined){const first=[0,2,4,8][Number(el.dataset.section)];if(first<=s.stage||completed.includes(first)||completed.includes(first-1))changeStage(first);else{drawer=true;render();}return;}
 if(action==='menu'||action==='close-menu'){drawer=!drawer;render();return;}
 if(action==='about'||action==='review'||action==='reset'){drawer=false;modal=action;render();return;}
 if(action==='close-modal'){modal=null;render();return;}
 if(action==='confirm-reset'){changeStage(s.stage,{reset:true});return;}
 if(action==='next'&&finished()){changeStage(s.stage+1);return;}
 if(action==='undo'){if(history.length){s=history.pop();render();scheduleMeasurement();}return;}
 if(action==='back-to-experiment'){s.feedback='表の値を、前の実験で確かめられます。';modal='review';render();return;}
 remember();
 if(node)handleNode(node);
 if(slot){s.meter=slot;const r=model();const v=slot==='branch1'?r.currents.lamp1:slot==='branch2'?r.currents.lamp2:r.current;if(v>0)s.records[`${s.topology}-${slot}`]=v;else s.feedback='スイッチを閉じて、流れている電流をはかろう。';}
 if(action==='switch'){
  if(s.stage===8){s.feedback='この問題では、スイッチを閉じた回路を使います。';}
  else{s.closed=!s.closed;if(!s.closed)see('opened');else if(has('opened'))see('reclosed');if(s.tool==='voltage')recordVoltage(model());}
 }
 if(el.dataset.view){s.schematic=el.dataset.view==='diagram';if(s.schematic)see('diagram');}
 if(el.dataset.topology){s.topology=el.dataset.topology;s.probes=[];s.meter=null;s.removed=false;see(s.topology);}
 if(el.dataset.tool){s.tool=el.dataset.tool;s.probes=[];s.meter=null;}
 if(action==='remove'){s.removed=!s.removed;if(s.removed)see(`removed-${s.topology}`);}
 if(el.dataset.choice)selectChoice(el.dataset.choice,el.dataset.value);
 if(action==='hint')s.hint=!s.hint;
 if(el.dataset.voltage){s.voltage=Number(el.dataset.voltage);scheduleMeasurement();}
 if(action==='measure-start'){see('measuring');scheduleMeasurement();}
 if(el.dataset.resistance){s.resistance=Number(el.dataset.resistance);see(`R${s.resistance}`);}
 if(el.dataset.plot){const value=Number(el.dataset.plot);s.graphGuess=value;if(s.stage===6){if(value===.4){s.answers.graph=value;s.feedback='4 Vなら 0.40 A。原点を通る直線になる。';}else s.feedback='電圧が2倍なら、電流も2倍。2 Vの点を見てみよう。';}else if(s.stage===8){if(value===.3){s.confirmed=true;s.feedback='表の 3.0 V、0.30 Aと対応しています。';}else s.feedback='表の「3.0 V」の行から、電流を読み取ろう。';}}
 if(action==='check-connection'){if(sameEdge(s.examConnections,['a','b'])){s.confirmed=true;s.feedback='抵抗器 Rの両端につながりました。';}else s.feedback='はかるのは、抵抗器 Rの両端の電圧。';}
 if(action==='next-question'&&s.confirmed){s.question++;s.confirmed=false;s.graphGuess=null;s.feedback='';}
 if(action==='retry-exam'){const rearranged=!has('rearranged');s=initialStage(8);if(rearranged)see('rearranged');history=[];}
 render();
 if(el.dataset.view && document.documentElement.dataset.motion!=='reduce' && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.querySelectorAll('.circuit-svg .physical,.circuit-svg .symbol').forEach(g=>{const target=Number(g.getAttribute('opacity'));g.animate([{opacity:1-target},{opacity:target}],{duration:380,easing:'ease-in-out'});});
 }
 if(action==='switch')scheduleMeasurement();
});
app.addEventListener('input',e=>{
 if(e.target.id==='voltage'){
  remember();s.voltage=Number(e.target.value);
  document.querySelector('.circuit-readings').innerHTML=`<span>電池 <b>${pretty(s.voltage,1)}</b> V</span><span>全体 <b>${pretty(model().current)}</b> A</span>`;
  document.querySelector('.voltage-control .reading strong').innerHTML=`${pretty(s.voltage,1)}<small>V</small>`;
  document.querySelector('.control-panel > .reading strong').innerHTML=`${pretty(model().current)}<small>A</small>`;
  document.querySelectorAll('[data-voltage]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.voltage)===s.voltage));
  save();scheduleMeasurement();
 }
 if(e.target.id==='reduce-motion'){document.documentElement.dataset.motion=e.target.checked?'reduce':'auto';try{localStorage.setItem(KEY+'-motion',document.documentElement.dataset.motion);}catch{}}
});
app.addEventListener('change',e=>{if(e.target.id==='voltage'){render();scheduleMeasurement();}});

app.addEventListener('submit',e=>{e.preventDefault();const form=e.target;const raw=new FormData(form).get('answer')?.toString().trim().replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace('．','.');const n=Number(raw);remember();if(!raw||!Number.isFinite(n)){s.feedback='数値を入れてください。';}else if(form.dataset.form==='resistance'){if(Math.abs(n-20)<1e-8){s.answers.resistance='20';s.feedback='3.0 ÷ 0.15 ＝ 20 Ω。';}else s.feedback='3.0 ÷ 0.15 を計算してみよう。';}else if(form.dataset.form==='exam'){const answer=examQuestions[s.question].answer;if(Math.abs(n-answer)<1e-8){s.confirmed=true;s.feedback=s.question===2?'1.0 ÷ 0.10 ＝ 10 Ω。':'4.0 ÷ 10 ＝ 0.40 A。';}else s.feedback=s.question===2?'電圧 ÷ 電流。表の一組の値を使おう。':'電流 ＝ 電圧 ÷ 抵抗。抵抗は10 Ω。';}render();});
app.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const target=e.target.closest('[data-node],[data-slot],[data-plot],.switch-target');if(target){e.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(drawer||modal)){drawer=false;modal=null;render();}if(e.key==='Tab'&&(drawer||modal)){const box=document.querySelector(drawer?'.step-drawer':'.modal');const targets=[...box.querySelectorAll('button:not(:disabled),input,a[href]')];const first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
try{document.documentElement.dataset.motion=localStorage.getItem(KEY+'-motion')||'auto';}catch{}
render();scheduleMeasurement();

function fitCircuitViewport(){
 const compact=matchMedia('(orientation:landscape) and (max-height:650px)').matches;
 const veryShort=matchMedia('(orientation:landscape) and (max-height:430px)').matches;
 // At phone landscape height, omit only SVG's unused outer margins. This makes
 // the real parts and their terminals larger without stretching their shapes.
 const viewBox=veryShort?(s.tool==='voltage'||s.stage===8?'50 50 590 375':'50 50 590 315'):(compact?'35 50 635 385':'0 0 680 440');
 document.querySelector('.circuit-svg')?.setAttribute('viewBox',viewBox);
 const rotate=!portraitContinue&&matchMedia('(orientation:portrait) and (max-width:900px)').matches;
 document.querySelectorAll('.site-header,main').forEach(el=>el.inert=rotate);
 if(rotate&&!document.activeElement?.closest('.orientation-guide'))document.querySelector('[data-action="portrait-continue"]')?.focus({preventScroll:true});
}
window.addEventListener('resize',fitCircuitViewport);
