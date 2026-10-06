// Fonte única das etapas do fluxo, da pré-checagem antes de gerar e da jornada IA retomável.
export function lifecycle(p){
  if(p?.commercialStage==='won'||p?.proposal?.status==='Fechado')return 'won';
  if(p?.commercialStage==='declined'||p?.proposal?.status==='Declinado')return 'declined';
  return p?.proposal?'proposal':'prospecting';
}
export const briefReady=(p)=>!!(p?.name?.trim()&&p?.specialty?.trim()&&p?.niche?.trim()&&p?.location?.trim());
export const adsReady=(p)=>!!(p?.metaAds||p?.googleAds?.titles?.length);

export function journeySteps(p){
  const stage=lifecycle(p);const won=stage==='won';
  const steps=won?[
    {key:'persona',label:'Persona',title:'Persona',cta:'Criar Persona',text:'Mapeie dores, objeções e níveis de consciência.',done:!!p.persona,view:'persona',sub:''},
    {key:'content',label:'RETINA',title:'Conteúdo RETINA',cta:'Criar RETINA',text:'Transforme a persona em conteúdos prontos.',done:!!p.content?.items?.length,view:'content',sub:''},
    {key:'ads',label:'Anúncios',title:'Anúncios',cta:'Criar anúncios',text:'Escolha Meta ou Google conforme a estratégia.',done:adsReady(p),view:'ads',sub:'meta'},
    {key:'media',label:'Investimento',title:'Investimento',cta:'Definir investimento',text:'A matriz distribui a verba entre Google, Meta e GBP.',done:!!p.mediaPlanConfirmed,view:'campaigns',sub:'planning'},
    {key:'results',label:'Resultados',title:'Resultados',cta:'Importar resultados',text:'Adicione dados reais para acompanhar a performance.',done:!!p.performanceRows?.length,view:'performance',sub:''}
  ]:[
    {key:'brief',label:'Empresa',title:'Empresa e especialista',cta:'Revisar empresa',text:'Complete a base do cliente.',done:briefReady(p),view:'brand',sub:'brief'},
    {key:'approach',label:'Abordagem',title:'Abordagem',cta:'Gerar abordagem',text:'O Nexus usa o briefing para criar 5 abordagens.',done:!!p.approach,view:'prospecting',sub:'approach'},
    {key:'plan',label:'Plano',title:'Plano de marketing',cta:'Gerar plano de marketing',text:'Transforme a abordagem em um plano.',done:!!p.marketingPlan,view:'plan',sub:''},
    {key:'proposal',label:'Proposta',title:'Proposta',cta:'Gerar proposta',text:'Ancore a proposta no plano aprovado.',done:!!p.proposal,view:'prospecting',sub:'proposal'},
    {key:'decision',label:'Decisão',title:'Fechado ou declinado',cta:'Registrar decisão',text:'Marque a proposta como Fechado ou Declinado.',done:['won','declined'].includes(stage),view:'prospecting',sub:'proposal'}
  ];
  const first=steps.findIndex(s=>!s.done);
  return {phase:won?'gestao':'prospeccao',stage,steps,current:first<0?steps.length-1:first,complete:first<0};
}

export function nextStep(p){
  if(lifecycle(p)==='declined')return {key:'decision',label:'Ver decisão',text:'A proposta foi declinada.',view:'prospecting',sub:'proposal'};
  if(!briefReady(p))return {key:'brief',label:'Revisar empresa',text:'Complete a base do cliente.',view:'brand',sub:'brief'};
  const {steps,current,complete}=journeySteps(p);
  if(complete)return {key:'done',label:'Diagnosticar performance',text:'Cruze dados, hipóteses e próximos testes.',view:'performance',sub:'diagnostics'};
  const s=steps[current];
  return {key:s.key,label:s.cta,text:s.text,view:s.view,sub:s.key==='results'?'sources':(s.sub||undefined)};
}

const has=(v)=>!!String(v??'').trim();
const WON_ONLY=['content','metaAds','extraHooks','googleKeywords','googleAds'];
function check(task,p,input){
  const x=p?.aiInputs||{};const items=[];
  const add=(label,ok,view,sub)=>items.push({label,ok:!!ok,view,sub});
  if(WON_ONLY.includes(task))add('Proposta fechada (cliente ativo)',lifecycle(p)==='won','prospecting','proposal');
  if(task==='persona')add('Nicho / público-alvo',has(p.niche),'brand','brief');
  if(task==='deepDive')add('Persona criada',!!p.persona,'persona');
  if(task==='content'){
    add('Nome do responsável pelo conteúdo',has(x.creatorName),'content');
    add('Nicho / público-alvo',has(p.niche),'brand','brief');
    add('Persona criada',!!p.persona,'persona');
  }
  if(task==='metaAds'){
    add('Persona criada',!!p.persona,'persona');
    add('Oferta detalhada',has(x.adOffer||p.offers||p.services||p.products),'ads','meta');
    add('Destino após o clique',has(x.adDestination||p.contactDestination),'ads','meta');
    add('Ação desejada no destino',has(x.conversionAction),'ads','meta');
  }
  if(task==='googleKeywords'){
    add('Persona criada',!!p.persona,'persona');
    add('Oferta específica',has(x.adOffer||p.services||p.products),'ads','google');
    add('Ação depois do clique',has(x.conversionAction),'ads','google');
    add('Localização',has(p.location),'brand','brief');
  }
  if(task==='extraHooks'){
    add('4 anúncios Meta gerados',(p.metaAds?.ads||[]).length>=4,'ads','meta');
  }
  if(task==='posts')add('Anúncio Meta gerado',!!(p.metaAds?.ads||[])[Number(input?.adIndex)],'ads','meta');
  if(task==='googleAds'){const n=(input?.selectedKeywords||[]).length;add('De 5 a 8 palavras-chave selecionadas',n>=5&&n<=8,'ads','google')}
  if(task==='approach'){
    add('Seu nome (gestor)',has(input?.manager?.managerName),'settings');
    add('Nome da empresa prospectada',has(p.name),'brand','brief');
    add('O que a empresa vende ou presta',has(p.specialty||p.services||p.products),'brand','brief');
  }
  if(task==='specialist'){
    add('Nome da empresa',has(p.name),'brand');
    add('O que ela vende ou presta',has(p.specialty||p.services||p.products),'brand');
  }
  if(task==='marketingPlan')add('Abordagem gerada',!!p.approach,'prospecting','approach');
  if(task==='proposal')add('Plano de marketing gerado',!!p.marketingPlan,'plan');
  return items;
}
const result=(items)=>{const missing=items.filter(i=>!i.ok);return {ok:!missing.length,items,first:missing[0]||null}};
export const preflight=(task,p,input={})=>result(check(task,p,input));
export function preflightJourney(p){
  const x=p?.aiInputs||{};const items=[];
  const add=(label,ok,view,sub)=>items.push({label,ok:!!ok,view,sub});
  add('Proposta fechada (cliente ativo)',lifecycle(p)==='won','prospecting','proposal');
  add('Especialidade da empresa',has(p.specialty),'brand','brief');
  add('Nicho / público-alvo',has(p.niche),'brand','brief');
  add('Localização',has(p.location),'brand','brief');
  add('Nome do responsável pelo conteúdo',has(x.creatorName),'content');
  add('Oferta detalhada',has(x.adOffer||p.services||p.products),'ads','meta');
  add('Destino após o clique',has(x.adDestination||p.contactDestination),'ads','meta');
  add('Ação desejada no destino',has(x.conversionAction),'ads','meta');
  return result(items);
}

export const JOURNEY_TASKS=['persona','content','metaAds','googleKeywords'];
export const newJourneyRun=(now=new Date().toISOString())=>({startedAt:now,tasks:[...JOURNEY_TASKS],done:[],status:'running',failedTask:null,error:null});
export function journeyResumePoint(run){
  if(!run||!['failed','cancelled'].includes(run.status)||!(run.done||[]).length)return null;
  return (run.tasks||[]).find(t=>!(run.done||[]).includes(t))||null;
}

// Menu lateral do projeto: dois grupos. A Persona fica em Prospecção até o fechamento e depois passa
// para a Gestão, que libera aos poucos (persona, conteúdo, anúncios, investimento), como a Prospecção.
export const AFTER_INVESTMENT=['home','performance','calendar','readiness','learning'];
export function navModel(p){
  const won=lifecycle(p)==='won';
  const prospecting=won?['brand','plan','prospecting','journey']:['persona','brand','plan','prospecting','journey'];
  const management=['content','ads','campaigns',...AFTER_INVESTMENT];
  if(won)management.unshift('persona');
  const reason=(key)=>{
    if(!won)return 'Libera quando a proposta for fechada.';
    if(key==='content'&&!p.persona)return 'Libera depois de criar a persona.';
    if(key==='ads'&&!p.content?.items?.length)return 'Libera depois do conteúdo RETINA.';
    if(key==='campaigns'&&!adsReady(p))return 'Libera depois dos anúncios.';
    if(AFTER_INVESTMENT.includes(key)&&!p.mediaPlanConfirmed)return 'Libera depois de confirmar o investimento.';
    return '';
  };
  return [
    {key:'prospeccao',label:'Prospecção',items:prospecting.map(key=>({key,locked:''}))},
    {key:'gestao',label:'Gestão',items:management.map(key=>({key,locked:reason(key)}))}
  ];
}
