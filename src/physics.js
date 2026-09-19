// Ideal DC model. Light bulbs are explicitly an approximation, not used for Ohm's law.
export const POINTS = {
  p: [220,112], n: [330,112], sl:[490,112], sr:[580,112],
  a:[275,335], b:[405,335], c:[275,235], d:[405,235],
};
export const LABELS = {p:'電池の＋端子', n:'電池の−端子', sl:'スイッチの左端子', sr:'スイッチの右端子', a:'左の端子 A', b:'右の端子 B', c:'左の端子 C', d:'右の端子 D'};
export const sameEdge = (a,b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
export const SINGLE_WIRES = [['p','a'],['b','sr'],['sl','n']];
export function circuitWires(topology, custom = SINGLE_WIRES) {
  if (topology === 'series') return [['p','c'],['d','a'],['b','sr'],['sl','n']];
  if (topology === 'parallel') return [['p','a'],['p','c'],['b','sr'],['d','sr'],['sl','n']];
  return custom;
}
export function circuitLoads(topology, resistance, secondResistance=resistance) {
  return [{id:'lamp1',a:'a',b:'b',r:resistance}, ...(topology !== 'single' ? [{id:'lamp2',a:'c',b:'d',r:secondResistance}] : [])];
}
export function solveCircuit({voltage=1.5, resistance=7.5, secondResistance=resistance, topology='single', wires=SINGLE_WIRES, closed=true, removed=false}) {
  const ids = Object.keys(POINTS), parent = Object.fromEntries(ids.map(id=>[id,id]));
  const find = x => parent[x] === x ? x : (parent[x]=find(parent[x]));
  const union = (a,b) => {parent[find(a)] = find(b);};
  const edges = circuitWires(topology,wires);
  edges.forEach(([a,b])=>union(a,b)); if (closed) union('sl','sr');
  const pos=find('p'), neg=find('n');
  if (pos === neg) return {short:true,current:0,currents:{lamp1:0,lamp2:0},potentials:{},powers:{lamp1:0,lamp2:0}};
  const loads=circuitLoads(topology,resistance,secondResistance).filter(l=>!removed || l.id!=='lamp2');
  const roots=[...new Set(ids.map(find))];
  const adjacency=Object.fromEntries(roots.map(x=>[x,[]]));
  for (const l of loads) {const a=find(l.a), b=find(l.b);adjacency[a].push(b);adjacency[b].push(a);}
  const reached=new Set([pos,neg]), queue=[pos,neg];
  while(queue.length) {for(const n of adjacency[queue.shift()]) if(!reached.has(n)) {reached.add(n);queue.push(n);}}
  const unknown=roots.filter(r=>reached.has(r) && r!==pos && r!==neg), index=Object.fromEntries(unknown.map((r,i)=>[r,i]));
  const matrix=unknown.map(()=>Array(unknown.length+1).fill(0));
  for(const l of loads) {
    const a=find(l.a),b=find(l.b); if(a===b)continue;
    for(const [u,v] of [[a,b],[b,a]]) if(index[u]!==undefined) {
      const row=matrix[index[u]], g=1/l.r;row[index[u]]+=g;
      if(index[v]!==undefined)row[index[v]]-=g;else if(v===pos)row[unknown.length]+=g*voltage;
    }
  }
  for(let i=0;i<unknown.length;i++) {
    let pivot=i;for(let j=i+1;j<unknown.length;j++)if(Math.abs(matrix[j][i])>Math.abs(matrix[pivot][i]))pivot=j;
    [matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];
    const div=matrix[i][i];if(Math.abs(div)<1e-12)continue;
    for(let k=i;k<=unknown.length;k++)matrix[i][k]/=div;
    for(let j=0;j<unknown.length;j++)if(j!==i){const f=matrix[j][i];for(let k=i;k<=unknown.length;k++)matrix[j][k]-=f*matrix[i][k];}
  }
  const values={[pos]:voltage,[neg]:0};unknown.forEach((n,i)=>values[n]=matrix[i][unknown.length]);
  const potentials=Object.fromEntries(ids.map(id=>[id,values[find(id)] ?? null]));
  const currents={},powers={};let current=0;
  loads.forEach(l=>{const a=find(l.a),b=find(l.b); const signed=(potentials[l.a]!==null && potentials[l.b]!==null)?(potentials[l.a]-potentials[l.b])/l.r:0;currents[l.id]=Math.abs(signed);powers[l.id]=signed*signed*l.r;if(a===pos)current+=signed;if(b===pos)current-=signed;});
  return {short:false,current:Math.max(0,current),currents,powers,potentials};
}
export function measuredVoltage(result, pair) {
  if(result.short || pair.length!==2)return null;
  const [a,b]=pair.map(id=>result.potentials[id]);return a===null||b===null?null:Math.abs(a-b);
}
export const pretty = (n, digits=2) => Number.isFinite(n) ? n.toFixed(digits) : '—';
