import {POINTS} from './physics.js';
import {pathFor} from './circuit.js';

// Demonstrations share the real circuit's coordinates and never change lesson state.
export const coachSteps={
 wiring:[
  {pair:['p','a'],text:'電池の＋ → 左の端子 Aをタップ',kind:'wire'},
  {pair:['b','sr'],text:'右の端子 B → スイッチの右端子をタップ',kind:'wire'},
  {pair:['sl','n'],text:'スイッチの左端子 → 電池の−をタップ',kind:'wire'},
  {pair:[],text:'3本つないだら、スイッチをタップして閉じる',kind:'switch'}
 ],
 current:[
  {point:[90,220],text:'電球の前の「＋」をタップ → 電流計が入る',kind:'meter'},
  {point:[625,220],text:'電球の後の「＋」もタップして、値を比べる',kind:'meter'}
 ],
 voltage:[
  {pair:['a','b'],text:'左の端子 A → 右の端子 Bをタップ',kind:'probe'},
  {pair:['p','n'],text:'電池の＋ → −をタップして、電池をはかる',kind:'probe'},
  {pair:['p','a'],text:'電池の＋ → 左の端子 Aで、導線をはかる',kind:'probe'}
 ]
};
export function coachControls(type,index){
 const steps=coachSteps[type];
 const summary={wiring:'3本つないで、スイッチを閉じる。',current:'Aを回路の途中へ運ぶ。次は自分で電球の前と後をはかろう。',voltage:'電圧計は、はかりたいものの両端を1つずつ選ぶ。'};
 return `<section class="coach-controls" data-demo="${type}" aria-label="操作の見本"><div class="panel-eyebrow">操作の見本 · ${index<steps.length?`${index+1} / ${steps.length}`:'完了'}</div><p class="coach-instruction" aria-live="polite">${index<steps.length?steps[index].text:summary[type]}</p>${index===steps.length?'<div class="coach-buttons"><button class="secondary" data-action="demo-restart">もう一度</button><button class="primary" data-action="close-demo">やってみる</button></div>':''}</section>`;
}
function ring(p,n){return `<g class="coach-target" data-coach-point="${p.join(',')}"><circle cx="${p[0]}" cy="${p[1]}" r="20"/><text x="${p[0]-20}" y="${p[1]-24}">${n}</text></g>`;}
function hand(a,b){return `<g class="coach-hand" style="--from-x:${a[0]}px;--from-y:${a[1]}px;--to-x:${b[0]}px;--to-y:${b[1]}px"><path d="M0 38V4c0-6 8-6 8 0v17c5-6 10-2 10 3 6-5 10-1 10 4 6-4 10 0 10 5v13c0 14-10 23-23 20C6 63-2 52-8 43c-4-7 2-11 8-5Z"/></g>`;}
export function coachOverlay(type,index){
 const step=coachSteps[type][index];
 let content='';
 if(type==='wiring')content=coachSteps.wiring.slice(0,index).filter(v=>v.kind==='wire').map(v=>`<path class="coach-line settled" d="${pathFor(...v.pair,'single')}"/>`).join('');
 if(step.kind==='wire'||step.kind==='probe'){
  const [a,b]=step.pair.map(id=>POINTS[id]);
  content+=ring(a,1)+ring(b,2);
  if(step.kind==='wire')content+=`<path class="coach-line coach-draw" pathLength="1" d="${pathFor(...step.pair,'single')}"/>`;
  else content+=`<path class="coach-line coach-probe-first" pathLength="1" d="M${a}Q${a[0]} 409 318 400"/><path class="coach-line coach-draw" pathLength="1" d="M${b}Q${b[0]} 409 362 400"/><circle class="coach-meter-disc" cx="340" cy="400" r="22"/><text class="coach-meter-letter" x="340" y="407">V</text>`;
  content+=hand(a,b);
 }else if(step.kind==='meter'){
  const [x,y]=step.point;
  const start=[340,385];
  content+=ring(step.point,'ここ')+`<g class="coach-meter-moving" style="--from-x:${start[0]}px;--from-y:${start[1]}px;--to-x:${x}px;--to-y:${y}px"><circle class="coach-meter-disc" r="22"/><text class="coach-meter-letter" y="7">A</text></g>`+hand(start,step.point);
 }else content+=ring([537,94],'タップ')+`<path class="coach-line coach-draw" pathLength="1" d="M495 108H569"/>`+hand([537,94],[537,94]);
 return `<g class="coach-overlay" aria-hidden="true">${content}</g>`;
}
