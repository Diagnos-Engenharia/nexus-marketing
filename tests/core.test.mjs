import test from 'node:test';
import assert from 'node:assert/strict';
import {calcBudget,parseCSV,normalizeRows,metrics,classifySearchTerm,evaluateExperiment,projectFactory,markArtifact,artifactStatus,projectHealth,qualityEngine} from '../lib/core.js';

test('matriz busca/micro',()=>{const x=calcBudget(1500,'busca','micro',50);assert.equal(x.google,1200);assert.equal(x.meta,300);assert.equal(x.gbp,600)});
test('matriz híbrida/alto',()=>{const x=calcBudget(10000,'hibrido','alto',40);assert.equal(x.google,3500);assert.equal(x.meta,6500);assert.equal(x.gbp,1400)});
test('CSV pt-BR',()=>{const rows=normalizeRows(parseCSV('Campanha;Valor gasto;Impressões;Cliques;Leads;Receita\nSearch;1.200,50;10000;500;25;6000'));assert.equal(rows[0].spend,1200.5);assert.equal(rows[0].leads,25)});
test('métricas',()=>{const m=metrics([{spend:100,impressions:1000,clicks:100,leads:10,revenue:500}]);assert.equal(m.ctr,10);assert.equal(m.cpl,10);assert.equal(m.roas,5)});
test('termos',()=>{assert.equal(classifySearchTerm('curso grátis engenharia'),'negativo');assert.equal(classifySearchTerm('empresa de vistoria sorocaba'),'alta intenção')});
test('experimento',()=>assert.equal(evaluateExperiment({metric:'cpl',a:50,b:40}).winner,'B'));
test('versionamento',()=>{const p=projectFactory('X');markArtifact(p,'persona');assert.equal(artifactStatus(p,'persona'),'current');p.niche='Outro';assert.equal(artifactStatus(p,'persona'),'stale')});
test('projeto vazio não recebe prontidão de briefing',()=>{const p=projectFactory('X');assert.equal(p.specialty,'');assert.equal(p.niche,'');assert.equal(projectHealth(p).checks.find(x=>x.key==='business').ok,false)});

test('quality gate A-F',()=>{const p=projectFactory('X');const q=qualityEngine(p);assert.deepEqual(Object.keys(q.gates),['A','B','C','D','E','F']);assert.ok(q.summary.blockers>=1)});
test('novo workspace não simula performance real',()=>{const p=projectFactory('X');assert.equal(p.performanceRows.length,0)});
