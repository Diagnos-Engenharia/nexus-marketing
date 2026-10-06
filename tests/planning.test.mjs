import test from 'node:test';
import assert from 'node:assert/strict';
import {calcBudget,investmentLevel,projectFactory,markArtifact,artifactStatus} from '../lib/core.js';
import {validateGeneration} from '../lib/validation.js';
import {buildPrompt} from '../lib/ai-prompts.js';
test('matriz das nove combinações e reconciliação de verba',()=>{
 const expected={descoberta:[0,20,20],busca:[80,60,50],hibrido:[50,40,35]};
 for(const [d,values] of Object.entries(expected))for(const [i,level] of ['micro','medio','alto'].entries()){
  const b=calcBudget(3000,d,level,37);assert.equal(b.googlePct,values[i]);assert.equal(b.google+b.meta,3000);assert.ok(Math.abs(b.gbp+b.ads-b.google)<.001);
 }
});
test('faixas sem sobreposição nos limites',()=>{assert.equal(investmentLevel(1500),'micro');assert.equal(investmentLevel(1500.01),'medio');assert.equal(investmentLevel(5000),'medio');assert.equal(investmentLevel(5000.01),'alto')});
test('ajuste manual e limites preservam totais',()=>{const b=calcBudget(2000,'busca','medio',150,25);assert.equal(b.google,500);assert.equal(b.meta,1500);assert.equal(b.gbp,500);assert.equal(b.ads,0);assert.equal(calcBudget(-10).total,0)});
// A verba saiu de offerFingerprint em 972fdd3: mudar a verba não desatualiza persona/RETINA/anúncios.
// Se o plano de marketing também deve ficar desatualizado quando a verba muda, é decisão de produto (ver PR).
test('troca de persona desatualiza peças dependentes e a verba não',()=>{const p=projectFactory();p.persona={nome:'A'};markArtifact(p,'content');p.persona={nome:'B'};assert.equal(artifactStatus(p,'content'),'stale');markArtifact(p,'content');p.budget.amount=5000;p.budget.gbpPct=10;assert.equal(artifactStatus(p,'content'),'current')});
test('Google começa em palavras-chave e exige textos dentro dos limites',()=>{assert.ok(buildPrompt('googleKeywords',projectFactory()).includes('Não avance para títulos'));const data={titles:Array(20).fill('Vistoria técnica'),descriptions:Array(8).fill('Agende sua vistoria.'),phraseMatch:[],exactMatch:[]};assert.equal(validateGeneration('googleAds',data),data);data.titles[1]='A'.repeat(31);assert.throws(()=>validateGeneration('googleAds',data));assert.throws(()=>validateGeneration('googleKeywords',{keywords:{highIntent:['apenas um']}}))});
test('RETINA e Meta rejeitam entregas incompletas',()=>{assert.throws(()=>validateGeneration('content',[]));assert.throws(()=>validateGeneration('metaAds',{ads:[]}))});
