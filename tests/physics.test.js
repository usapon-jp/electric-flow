import test from 'node:test';
import assert from 'node:assert/strict';
import {solveCircuit,measuredVoltage,SINGLE_WIRES} from '../src/physics.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('closed circuit, open switch and wire break',()=>{close(solveCircuit({}).current,.2);close(solveCircuit({closed:false}).current,0);close(solveCircuit({wires:SINGLE_WIRES.slice(1)}).current,0);});
test('unequal series resistors preserve current and split voltage',()=>{const r=solveCircuit({topology:'series',voltage:3,resistance:10,secondResistance:20});close(r.current,.1);close(r.currents.lamp1,r.currents.lamp2);close(measuredVoltage(r,['a','b']),1);close(measuredVoltage(r,['c','d']),2);});
test('parallel branches add currents and share voltage',()=>{const r=solveCircuit({topology:'parallel',voltage:3,resistance:10,secondResistance:20});close(r.current,.45);close(r.currents.lamp1,.3);close(r.currents.lamp2,.15);close(measuredVoltage(r,['a','b']),3);close(measuredVoltage(r,['c','d']),3);});
test('removing a series lamp interrupts all current, parallel preserves other branch',()=>{close(solveCircuit({topology:'series',removed:true}).current,0);const r=solveCircuit({topology:'parallel',removed:true});close(r.current,.2);close(r.currents.lamp1,.2);});
test('short circuits are stopped instead of generating infinite values',()=>{const r=solveCircuit({wires:[['p','n']]});assert.equal(r.short,true);assert.equal(r.current,0);assert.equal(measuredVoltage(r,['p','n']),null);});
test('same conductor measures zero, battery has voltage when open',()=>{close(measuredVoltage(solveCircuit({}),['p','a']),0);close(measuredVoltage(solveCircuit({closed:false}),['p','n']),1.5);});
test('Ohm graph points are proportional and inverse resistance works',()=>{for(const voltage of [1,2,3,4,5])close(solveCircuit({voltage,resistance:10}).current,voltage/10);close(solveCircuit({voltage:3,resistance:20}).current,.15);});
test('load power matches source power for the supported topologies',()=>{for(const topology of ['single','series','parallel']){const r=solveCircuit({topology,voltage:3,resistance:10,secondResistance:20});close(Object.values(r.powers).reduce((a,b)=>a+b,0),3*r.current);}});

// Check the actual values used in lesson 6, not only arbitrary resistors.
test('lesson branch values, voltage sums and brightness stay distinguishable',async()=>{
 const {initialStage}=await import('../src/stages.js');
 const {circuitView}=await import('../src/circuit.js');
 const s=initialStage(5), parallel=solveCircuit({...s,secondResistance:15});
 close(parallel.current,.6);close(parallel.currents.lamp1,.4);close(parallel.currents.lamp2,.2);
 close(measuredVoltage(parallel,['a','b']),3);close(measuredVoltage(parallel,['c','d']),3);
 const series=solveCircuit({...s,topology:'series',secondResistance:15});
 close(series.current,2/15);close(measuredVoltage(series,['a','b']),1);close(measuredVoltage(series,['c','d']),2);
 const glow=[...circuitView(s,parallel).matchAll(/fill="url\(#aura\)" opacity="([0-9.]+)"/g)].map(m=>Number(m[1]));
 assert.equal(glow.length,2);assert.ok(glow[0]>glow[1]&&glow[0]<1&&glow[1]>0,'different power must not saturate to identical brightness');
});
test('an open circuit can have voltage: battery and open switch, but not the lamp',()=>{
 const r=solveCircuit({closed:false});close(r.current,0);
 close(measuredVoltage(r,['p','n']),1.5);close(measuredVoltage(r,['sl','sr']),1.5);close(measuredVoltage(r,['a','b']),0);
});
