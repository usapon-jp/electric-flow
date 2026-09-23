import {POINTS,LABELS,circuitWires,pretty,measuredVoltage,SINGLE_WIRES,sameEdge} from './physics.js';
export const icons={arrow:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',hint:'<svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/></svg>',reset:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4 10-10"/></svg>'};
export function pathFor(a,b,topology) {
  if(topology==='parallel'){
    if(a==='p'&&b==='a')return 'M90 235V292Q90 335 130 335H275';
    if(a==='p'&&b==='c')return 'M90 235H275';
    if(a==='b'&&b==='sr')return 'M405 335H582Q625 335 625 292V235';
    if(a==='d'&&b==='sr')return 'M405 235H625';
  }
  if(a==='p' && (b==='a'||b==='c')){const y=POINTS[b][1];return `M220 112H132Q90 112 90 154V${y-35}Q90 ${y} 130 ${y}H275`;}
  if((a==='b'||a==='d') && b==='sr'){const y=POINTS[a][1];return `M405 ${y}H582Q625 ${y} 625 ${y-43}V154Q625 112 580 112`;}
  if(a==='sl'&&b==='n')return 'M490 112H330';
  if(a==='d'&&b==='a')return 'M405 235H447Q470 235 470 261Q470 283 437 283H252Q228 283 228 306Q228 335 275 335';
  const p=POINTS[a],q=POINTS[b];return `M${p}C${p[0]} ${(p[1]+q[1])/2},${q[0]} ${(p[1]+q[1])/2},${q}`;
}
function bulb(x,y,power,schematic,removed=false,label='',compact=false) {
 const brightness=removed?0:power/(power+.3), lit=brightness>.015;
 return `<g class="load ${removed?'removed':''}">
  <g class="physical" opacity="${schematic?0:1}" transform="${compact?`translate(${x} ${y}) scale(.76) translate(${-x} ${-y})`:''}">
   ${lit?`<ellipse cx="${x}" cy="${y-61}" rx="82" ry="94" fill="url(#aura)" opacity="${brightness}"/>`:''}
   <ellipse cx="${x}" cy="${y+18}" rx="86" ry="13" fill="#2b342a" opacity=".07" filter="url(#soft)"/>
   <rect x="${x-79}" y="${y-13}" width="158" height="33" rx="14" fill="url(#ceramic)" stroke="#d7d5cc"/>
   <ellipse cx="${x}" cy="${y-13}" rx="32" ry="10" fill="#f8f7f0" stroke="#dedcd0"/>
   <path d="M${x-20} ${y-15}v-24h40v24q-20 13-40 0" fill="url(#metal)"/>
   <path d="M${x-20} ${y-35}q0-10-11-22a39 39 0 1 1 62 0q-11 12-11 22Z" fill="${lit?'url(#glassOn)':'url(#glassOff)'}" stroke="${lit?'#e6bd78':'#cfccc1'}" stroke-width="1.5"/>
   <path d="M${x-19} ${y-91}q-10 4-11 19" stroke="white" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>
   <path d="M${x-9} ${y-35}l-6-37 9 8 6-8 6 8 9-8-6 37" fill="none" stroke="${lit?'#fff9ce':'#a29376'}" stroke-width="${lit?2.5:1.2}"/>
   ${lit?`<path d="M${x-15} ${y-72}l9 8 6-8 6 8 9-8" fill="none" stroke="#ffdb77" stroke-width="5" filter="url(#soft)"/>`:''}
   <path d="M${x-18} ${y-29}h36m-36 6h36" stroke="#635c4e" opacity=".55"/>
  </g>
  <g class="symbol" opacity="${schematic?1:0}" stroke="#475851" stroke-width="2.5" fill="#f9f8f4">
   <path d="M${x-65} ${y}h40m50 0h40"/><circle cx="${x}" cy="${y}" r="25"/><path d="m${x-17} ${y-17} 34 34m0-34-34 34"/>
  </g>
  ${label?`<text x="${compact?x+114:x}" y="${compact?y+25:y+49}" class="part-label">${label}</text>`:''}
 </g>`;
}
function resistor(x,y,schematic,label) {
return `<g><g class="physical" opacity="${schematic?0:1}"><path d="M${x-65} ${y}h130" stroke="#9c9c90" stroke-width="5"/><rect x="${x-41}" y="${y-19}" width="82" height="38" rx="14" fill="url(#resistor)" stroke="#c3b48f"/><path d="M${x-24} ${y-18}v36m14-36v36m16-36v36" stroke="#896e45" stroke-width="6"/><path d="M${x+28} ${y-17}v34" stroke="#b79b51" stroke-width="4"/></g><g class="symbol" opacity="${schematic?1:0}" stroke="#475851" stroke-width="2.5" fill="#f9f8f4"><path d="M${x-65} ${y}h35m60 0h35"/><rect x="${x-30}" y="${y-14}" width="60" height="28"/></g><text x="${x}" y="${y+49}" class="part-label">${label}</text></g>`;
}
export function circuitView(s,r,{exam=false,overlay=''}={}) {
const schematic=s.schematic, active=r.current>.0001&&!r.short, resistance=s.stage>=6;
const wires=circuitWires(s.topology,s.wires).map(e=>s.topology==='single'?(SINGLE_WIRES.find(w=>sameEdge(w,e))||e):e);
const nodes=Object.keys(POINTS).filter(k=>s.topology!=='single'||!['c','d'].includes(k));
const slots=[{id:'before',x:90,y:220,label:'電球の前',value:r.current},{id:'after',x:625,y:220,label:'電球の後',value:r.current}];
if(s.topology==='parallel'){slots[0].y=167;slots[0].label='全体';slots[1]={id:'branch1',x:180,y:335,label:'下の枝',value:r.currents.lamp1||0};slots.push({id:'branch2',x:180,y:235,label:'上の枝',value:r.currents.lamp2||0});}
let voltage=measuredVoltage(r,s.probes);
return `<svg class="circuit-svg ${active?'is-flowing':''} ${schematic?'is-schematic':''}" viewBox="0 0 680 440" role="group" aria-label="${schematic?'回路図':'実物風の回路'}">
 <defs>
 <linearGradient id="battery" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#56615b"/><stop offset=".28" stop-color="#303b36"/><stop offset=".8" stop-color="#1e2924"/><stop offset="1" stop-color="#4b554e"/></linearGradient>
 <linearGradient id="gold" x2="0" y2="1"><stop stop-color="#f7df9f"/><stop offset=".4" stop-color="#b6914c"/><stop offset=".75" stop-color="#d9b978"/><stop offset="1" stop-color="#9e7e41"/></linearGradient>
 <linearGradient id="ceramic" x2="0" y2="1"><stop stop-color="#fffef9"/><stop offset=".6" stop-color="#f0eee5"/><stop offset="1" stop-color="#d6d3c7"/></linearGradient>
 <linearGradient id="metal" x2="1" y2="0"><stop stop-color="#615d50"/><stop offset=".3" stop-color="#c6b892"/><stop offset=".6" stop-color="#8c8065"/><stop offset="1" stop-color="#4c493f"/></linearGradient>
 <radialGradient id="glassOn"><stop stop-color="#fffef0"/><stop offset=".45" stop-color="#fff5c9"/><stop offset="1" stop-color="#fbd9a4" stop-opacity=".65"/></radialGradient>
 <radialGradient id="glassOff"><stop stop-color="#ffffff" stop-opacity=".45"/><stop offset="1" stop-color="#dadbd3" stop-opacity=".45"/></radialGradient>
 <radialGradient id="aura"><stop stop-color="#ffd687" stop-opacity=".65"/><stop offset="1" stop-color="#ffe5b0" stop-opacity="0"/></radialGradient>
 <linearGradient id="resistor" x2="0" y2="1"><stop stop-color="#f4e9cd"/><stop offset="1" stop-color="#d7c79e"/></linearGradient>
 <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="shadow" x="-30%" y="-40%" width="170%" height="220%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#383a2e" flood-opacity=".12"/></filter>
 </defs>
 <ellipse cx="348" cy="365" rx="230" ry="35" fill="#e6e3d7" opacity="${schematic?0:.25}" filter="url(#soft)"/>
 <g class="wires">${wires.map(([a,b],i)=>{
 const path=pathFor(a,b,s.topology);let current=r.current;if(s.topology==='parallel'&&(a==='a'||b==='a'||a==='b'))current=r.currents.lamp1||0;if(s.topology==='parallel'&&(a==='c'||b==='c'||a==='d'))current=r.currents.lamp2||0;
 return `<path d="${path}" class="wire-shadow" opacity="${schematic?0:1}"/><path d="${path}" class="wire ${a==='p'?'positive':''}"/><path d="${path}" class="flow" style="opacity:${active&&current>.0001?.75:0};animation-duration:${Math.max(.8,2.2/(current/.2||1))}s"/>`;}).join('')}${s.topology==='parallel'?['M220 112H132Q90 112 90 154V235','M625 235V154Q625 112 580 112'].map((d,i)=>`<path d="${d}" class="wire ${i===0?'positive':''}"/><path d="${d}" class="flow" style="opacity:${active?.75:0};animation-duration:${Math.max(.8,2.2/(r.current/.2||1))}s"/>`).join('')+'<circle cx="90" cy="235" r="5" fill="#a66d52"/><circle cx="625" cy="235" r="5" fill="#525d54"/>':''}</g>
 <g class="physical" opacity="${schematic?0:1}" filter="url(#shadow)">
  <rect x="222" y="86" width="106" height="52" rx="8" fill="url(#battery)"/><rect x="222" y="86" width="21" height="52" rx="5" fill="url(#gold)"/><rect x="317" y="88" width="11" height="48" rx="3" fill="url(#gold)"/><rect x="216" y="103" width="7" height="18" rx="2" fill="url(#metal)"/><path d="M250 91h56" stroke="white" opacity=".15"/>
  <rect x="478" y="98" width="113" height="33" rx="9" fill="url(#ceramic)" stroke="#d7d5cc"/>
 </g>
 <g class="symbol" opacity="${schematic?1:0}" fill="none" stroke="#475851" stroke-width="2.5"><path d="M220 112h48m0-29v58m14-45v32m0-16h48"/></g>
 <text x="217" y="69" class="polarity">＋</text><text x="333" y="69" class="polarity">−</text>
 <g class="switch-art"><rect x="501" y="56" width="65" height="98" fill="transparent"/><path d="M495 108L${s.closed?'569 108':'558 69'}" stroke="${schematic?'#475851':'#4b5750'}" stroke-width="${schematic?3:9}" stroke-linecap="round"/><circle cx="495" cy="108" r="5" fill="#c1bda9"/><circle cx="571" cy="108" r="5" fill="#c1bda9"/></g>
 ${resistance?resistor(340,335,schematic,exam?'抵抗器 R':`抵抗器 R · ${s.resistance} Ω`):bulb(340,335,r.powers.lamp1||0,schematic,false,s.topology==='single'?'':'電球 A',s.topology!=='single')}
 ${s.topology!=='single'?bulb(340,235,r.powers.lamp2||0,schematic,s.removed,'電球 B',true):''}
 ${nodes.map(id=>{const [x,y]=POINTS[id];const selected=s.selected===id||s.probes.includes(id)||s.examConnections.includes(id);return `<g class="terminal ${selected?'selected':''} ${s.stage===0||s.tool==='voltage'||exam?'connectable':''}" data-node="${id}" tabindex="0" role="button" aria-label="${LABELS[id]}" aria-pressed="${selected}"><circle class="terminal-hit" cx="${x}" cy="${y}" r="41" fill="transparent"/><circle class="terminal-halo" cx="${x}" cy="${y}" r="15"/><circle cx="${x}" cy="${y}" r="6" class="terminal-dot"/><circle cx="${x-1}" cy="${y-1}" r="2" fill="#fff" opacity=".6"/>${exam?`<text x="${x}" y="${y+30}" class="node-letter">${id==='a'?'A':id==='b'?'B':id==='p'?'C':id==='n'?'D':''}</text>`:''}</g>`}).join('')}
 <g class="switch-target" data-action="switch" tabindex="0" role="button" aria-label="スイッチを${s.closed?'開く':'閉じる'}" aria-pressed="${s.closed}"><rect x="513" y="62" width="52" height="69" fill="transparent"/></g>
 ${s.tool==='current'&&!exam?slots.map(slot=>`<g class="meter-slot ${s.meter===slot.id?'chosen':''}" data-slot="${slot.id}" tabindex="0" role="button" aria-label="${slot.label}の電流をはかる"><circle cx="${slot.x}" cy="${slot.y}" r="42" fill="transparent"/><circle cx="${slot.x}" cy="${slot.y}" r="21" class="slot-disc"/><text x="${slot.x}" y="${slot.y+6}" class="slot-letter">${s.meter===slot.id?'A':'＋'}</text>${s.records[`${s.topology}-${slot.id}`]!==undefined?`<g class="meter-tag"><rect x="${slot.x-41}" y="${slot.y+28}" width="82" height="26" rx="8"/><text x="${slot.x}" y="${slot.y+46}">${pretty(slot.value)} A</text></g>`:''}</g>`).join(''):''}
 ${s.tool==='voltage'&&s.probes.length===2&&!exam?`<g class="voltmeter"><path d="M${POINTS[s.probes[0]]}Q${POINTS[s.probes[0]][0]} 409 318 400M${POINTS[s.probes[1]]}Q${POINTS[s.probes[1]][0]} 409 362 400" fill="none" stroke="#a48b66" stroke-width="2" stroke-dasharray="4 4"/><rect x="294" y="383" width="92" height="38" rx="12" fill="#fdfcf9" stroke="#d9d9cf"/><text x="340" y="407" class="meter-value">${pretty(voltage)} V</text></g>`:''}
 ${r.short?'<g><rect x="218" y="181" width="244" height="42" rx="12" fill="#f5e9dd"/><text x="340" y="208" class="short-label">ショート · アプリ内で通電停止</text></g>':''}
 ${overlay}</svg>`;
}
export function graphView(samples,{guess=false,selected=null,exam=false,complete=false}={}){
 const w=360,h=220,left=45,bottom=181,right=335,top=20;
 const px=v=>left+v/5*(right-left), py=i=>bottom-i/.5*(bottom-top);
 const points=exam?[{v:3,i:.1},{v:3,i:.3},{v:3,i:.5}]:guess?[{v:4,i:.2},{v:4,i:.4},{v:4,i:.5}]:[];
 return `<svg class="graph" viewBox="0 0 ${w} ${h}" role="group" aria-label="電圧と電流のグラフ。横軸は電圧 V、縦軸は電流 A。">
 ${[0,1,2,3,4,5].map(n=>`<path d="M${px(n)} ${top}V${bottom}" class="grid-line"/><text x="${px(n)}" y="${bottom+20}" class="axis-label">${n}</text>`).join('')}
 ${[0,.1,.2,.3,.4,.5].map(n=>`<path d="M${left} ${py(n)}H${right}" class="grid-line"/><text x="${left-18}" y="${py(n)+4}" class="axis-label">${n===0?0:n.toFixed(1)}</text>`).join('')}
 <path d="M45 20V181H335" class="axis-line"/><text x="45" y="12" class="axis-title">電流 (A)</text><text x="310" y="217" class="axis-title">電圧 (V)</text>
 ${complete?`<path d="M${px(0)} ${py(0)}L${px(5)} ${py(.5)}" class="graph-line"/>`:''}
 ${samples.map(p=>`<circle cx="${px(p.v)}" cy="${py(p.i)}" r="5" class="data-point"><title>${p.v} V、${pretty(p.i)} A</title></circle>`).join('')}
 ${points.map(p=>`<g class="graph-choice ${selected===p.i?'selected':''}" tabindex="0" role="button" aria-label="${p.v} V、${pretty(p.i)} Aの点" data-plot="${p.i}"><circle cx="${px(p.v)}" cy="${py(p.i)}" r="21" fill="transparent"/><circle cx="${px(p.v)}" cy="${py(p.i)}" r="9"/><text x="${px(p.v)+22}" y="${py(p.i)+4}" class="axis-label">${pretty(p.i)}</text></g>`).join('')}
 </svg>`;
}
