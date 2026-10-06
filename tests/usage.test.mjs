import test from 'node:test';
import assert from 'node:assert/strict';
import {addUsage,usageSummary,sumUsage,projectFactory} from '../lib/core.js';

test('addUsage acumula total e por tarefa, e guarda a última',()=>{
  const p=projectFactory();
  addUsage(p,'persona',{inputTokens:100,outputTokens:50});
  addUsage(p,'persona',{inputTokens:10,outputTokens:5});
  addUsage(p,'content',{inputTokens:1,outputTokens:2},{failed:true});
  assert.equal(p.usage.calls,3);assert.equal(p.usage.failedCalls,1);
  assert.equal(p.usage.inputTokens,111);assert.equal(p.usage.outputTokens,57);
  assert.equal(p.usage.byTask.persona.calls,2);assert.equal(p.usage.byTask.persona.lastTokens,15);
  const s=usageSummary(p);
  assert.equal(s.totalTokens,168);
  assert.deepEqual(s.byTask.map(x=>x.task),['persona','content']);
  assert.equal(s.byTask[0].label,'Persona estratégica');
});

test('addUsage ignora uso inválido sem quebrar',()=>{
  const p=projectFactory();
  addUsage(p,'persona',{inputTokens:-5,outputTokens:'x'});
  addUsage(p,'persona',null);
  addUsage(p,'persona',{inputTokens:NaN,outputTokens:Infinity});
  assert.equal(p.usage.inputTokens,0);assert.equal(p.usage.outputTokens,0);assert.equal(p.usage.calls,3);
});

test('projeto antigo sem usage devolve resumo vazio',()=>{
  const s=usageSummary({});
  assert.deepEqual(s,{calls:0,failedCalls:0,inputTokens:0,outputTokens:0,totalTokens:0,byTask:[]});
  assert.equal(usageSummary(null).calls,0);
});

test('sumUsage soma todos os projetos e conta os que têm uso',()=>{
  const a=projectFactory(),b=projectFactory('B'),c=projectFactory('C');
  addUsage(a,'persona',{inputTokens:10,outputTokens:5});addUsage(b,'metaAds',{inputTokens:1,outputTokens:1},{failed:true});
  const t=sumUsage([a,b,c,undefined]);
  assert.deepEqual(t,{calls:2,failedCalls:1,inputTokens:11,outputTokens:6,totalTokens:17,projects:2});
});
