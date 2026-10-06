import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFactory} from '../lib/core.js';
import {lifecycle,briefReady,journeySteps,nextStep,preflight,preflightJourney,JOURNEY_TASKS,newJourneyRun,journeyResumePoint} from '../lib/journey.js';

// projectFactory('Diagnos Engenharia') já vem com nicho, especialidade e localização; um nome genérico vem vazio.
const won=()=>{const p=projectFactory('Cliente');p.commercialStage='won';return p};

test('lifecycle e etapas nas duas fases',()=>{
  const p=projectFactory();
  assert.equal(lifecycle(p),'prospecting');
  let j=journeySteps(p);
  assert.equal(j.phase,'prospeccao');assert.deepEqual(j.steps.map(s=>s.key),['brief','approach','plan','proposal','decision']);
  p.name='Acme';p.specialty='x';p.niche='y';p.location='z';
  assert.ok(briefReady(p));assert.equal(journeySteps(p).current,1);
  p.approach={};p.marketingPlan={};p.proposal={status:'Em negociação'};
  assert.equal(lifecycle(p),'proposal');assert.equal(journeySteps(p).current,4);
  const w=won();j=journeySteps(w);
  assert.equal(j.phase,'gestao');assert.deepEqual(j.steps.map(s=>s.key),['persona','content','ads','media','results']);
  assert.equal(j.current,0);assert.equal(j.complete,false);
  w.persona={};w.content={items:[1]};w.metaAds={};w.mediaPlanConfirmed=true;w.performanceRows=[{}];
  assert.equal(journeySteps(w).complete,true);
});

test('declinado usa a fase de prospecção com a decisão concluída',()=>{
  const p=projectFactory();p.commercialStage='declined';
  const j=journeySteps(p);assert.equal(j.phase,'prospeccao');assert.equal(j.steps.at(-1).done,true);
});

test('nextStep segue a ordem e abre Fontes para importar resultados',()=>{
  const p=won();
  p.name='Acme';p.specialty='x';p.niche='y';p.location='z';
  assert.deepEqual([nextStep(p).view,nextStep(p).sub],['brand','persona']);
  p.persona={};assert.equal(nextStep(p).view,'content');
  p.content={items:[1]};assert.deepEqual([nextStep(p).view,nextStep(p).sub],['ads','meta']);
  p.metaAds={};assert.deepEqual([nextStep(p).view,nextStep(p).sub],['campaigns','planning']);
  p.mediaPlanConfirmed=true;assert.deepEqual([nextStep(p).view,nextStep(p).sub],['performance','sources']);
  p.performanceRows=[{}];const done=nextStep(p);assert.equal(done.key,'done');assert.equal(done.sub,'diagnostics');
  const blank=won();blank.name='';assert.deepEqual([nextStep(blank).view,nextStep(blank).sub],['brand','brief']);
  const pro=projectFactory();pro.name='A';pro.specialty='x';pro.niche='y';pro.location='z';
  assert.deepEqual([nextStep(pro).view,nextStep(pro).sub],['prospecting','approach']);
  pro.approach={};assert.equal(nextStep(pro).view,'plan');pro.marketingPlan={};assert.deepEqual([nextStep(pro).view,nextStep(pro).sub],['prospecting','proposal']);
  const dec=projectFactory();dec.commercialStage='declined';assert.deepEqual([nextStep(dec).view,nextStep(dec).sub],['prospecting','proposal']);
});

test('preflight: tarefas de cliente ativo exigem proposta fechada',()=>{
  const p=projectFactory();p.niche='n';
  const r=preflight('persona',p);
  assert.equal(r.ok,false);assert.equal(r.first.label,'Proposta fechada (cliente ativo)');assert.equal(r.first.view,'prospecting');
  const w=won();w.niche='n';assert.equal(preflight('persona',w).ok,true);
  assert.equal(preflight('persona',won()).ok,false);
});

test('preflight por tarefa lista cada requisito',()=>{
  const w=won();
  const c=preflight('content',w);assert.deepEqual(c.items.filter(i=>!i.ok).map(i=>i.label),['Nome do responsável pelo conteúdo','Nicho / público-alvo','Persona criada']);
  w.persona={};w.niche='n';w.aiInputs.creatorName='Ana';assert.equal(preflight('content',w).ok,true);
  assert.equal(preflight('metaAds',w).ok,false);
  Object.assign(w.aiInputs,{adOffer:'o',adDestination:'d',conversionAction:'a'});assert.equal(preflight('metaAds',w).ok,true);
  assert.equal(preflight('googleKeywords',w).ok,false);
  w.location='Sorocaba';assert.equal(preflight('googleKeywords',w).ok,true);
  assert.equal(preflight('deepDive',won()).ok,false);
  assert.equal(preflight('googleAds',w,{selectedKeywords:['a','b','c','d']}).ok,false);
  assert.equal(preflight('googleAds',w,{selectedKeywords:['a','b','c','d','e']}).ok,true);
  assert.equal(preflight('googleAds',w,{selectedKeywords:Array(9).fill('x')}).ok,false);
  assert.equal(preflight('googleAds',w,{}).ok,false);
});

test('preflight de prospecção',()=>{
  const p=projectFactory();p.name='';
  assert.equal(preflight('approach',p,{}).ok,false);
  const q=projectFactory();q.name='Acme';q.specialty='x';
  assert.equal(preflight('approach',q,{manager:{managerName:'Eu'}}).ok,true);
  assert.equal(preflight('approach',q,{}).first.view,'settings');
  assert.equal(preflight('marketingPlan',q).first.view,'prospecting');
  q.approach={};assert.equal(preflight('marketingPlan',q).ok,true);
  assert.equal(preflight('proposal',q).ok,false);q.marketingPlan={};assert.equal(preflight('proposal',q).ok,true);
  assert.equal(preflight('searchTerms',q).ok,true);assert.equal(preflight('optimization',q).ok,true);
});

test('preflightJourney agrega os requisitos e a proposta fechada',()=>{
  const p=projectFactory();
  assert.equal(preflightJourney(p).ok,false);
  const w=won();Object.assign(w,{specialty:'s',niche:'n',location:'l'});Object.assign(w.aiInputs,{creatorName:'a',adOffer:'o',adDestination:'d',conversionAction:'c'});
  assert.equal(preflightJourney(w).ok,true);
  w.aiInputs.conversionAction='';assert.equal(preflightJourney(w).first.label,'Ação desejada no destino');
});

test('jornada: só oferece retomar depois de falha com etapas concluídas',()=>{
  assert.deepEqual(JOURNEY_TASKS,['persona','content','metaAds','googleKeywords']);
  assert.equal(journeyResumePoint(null),null);
  const run=newJourneyRun('2026-10-06T00:00:00.000Z');
  assert.equal(run.status,'running');assert.deepEqual(run.done,[]);
  assert.equal(journeyResumePoint({...run,status:'failed'}),null);
  assert.equal(journeyResumePoint({...run,status:'failed',done:['persona','content']}),'metaAds');
  assert.equal(journeyResumePoint({...run,status:'cancelled',done:['persona']}),'content');
  assert.equal(journeyResumePoint({...run,status:'done',done:[...JOURNEY_TASKS]}),null);
  assert.equal(journeyResumePoint({...run,status:'failed',done:[...JOURNEY_TASKS]}),null);
  assert.deepEqual(newJourneyRun().tasks,JOURNEY_TASKS);assert.notEqual(newJourneyRun().tasks,JOURNEY_TASKS);
});
