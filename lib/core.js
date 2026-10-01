// Referência: Matriz Estratégica 9 Níveis, PDF fornecido, página 101.
export const MATRIX = {
 descoberta: {
  micro: {google:0,meta:100,campaigns:['Meta | WhatsApp'],count:'1–2',conversion:100},
  medio: {google:20,meta:80,campaigns:['Meta | Engajamento','Meta | WhatsApp','Google | Presença local'],count:'3',conversion:60},
  alto: {google:20,meta:80,campaigns:['Meta | Vídeo','Meta | Engajamento','Meta | WhatsApp','Google | Presença local'],count:'4–5',conversion:50}
 },
 busca: {
  micro: {google:80,meta:20,campaigns:['Google | Busca local','Meta | Remarketing'],count:'1–2',conversion:80},
  medio: {google:60,meta:40,campaigns:['Google | Search','Meta | Engajamento','Meta | WhatsApp'],count:'2–3',conversion:60},
  alto: {google:50,meta:50,campaigns:['Google | Search','Google | Marca','Meta | Vídeo','Meta | WhatsApp'],count:'4–5',conversion:65}
 },
 hibrido: {
  micro: {google:50,meta:50,campaigns:['Google | Busca local','Meta | WhatsApp'],count:'2',conversion:100},
  medio: {google:40,meta:60,campaigns:['Google | Search','Meta | Engajamento','Meta | WhatsApp'],count:'3–4',conversion:65},
  alto: {google:35,meta:65,campaigns:['Google | Search','Google | Marca','Meta | Vídeo','Meta | Engajamento','Meta | WhatsApp'],count:'5–6',conversion:55}
 }
};
export function investmentLevel(amount){return Number(amount)<=1500?'micro':Number(amount)<=5000?'medio':'alto'}

export const ARTIFACT_DEPS = {
  persona:['business'], content:['business','persona','offer','promptInputs'], metaAds:['business','persona','offer','promptInputs'],
  googleAds:['business','persona','offer','promptInputs'], approach:['business','promptInputs'],
  marketingPlan:['business','persona','offer','content','metaAds','googleAds','promptInputs'],
  proposal:['business','offer','marketingPlan'], optimization:['performance']
};

export const ENGINE_LABELS = {
  persona:'Persona estratégica', deepDive:'Aprofundamento da persona', content:'Conteúdo RETINA',
  metaAds:'Meta Ads', googleKeywords:'Palavras-chave Google', googleAds:'Google Ads', approach:'Abordagem de prospecção',
  marketingPlan:'Plano de Marketing', proposal:'Proposta comercial', searchTerms:'Classificação de termos',
  optimization:'Diagnóstico e otimização'
};

export function calcBudget(amount=0,demand='busca',level='micro',gbpPct=20,googleOverride){
  const cfg=MATRIX[demand]?.[level]||MATRIX.busca.micro;
  const total=Math.max(0,Number(amount)||0);
  const gp=googleOverride==null?cfg.google:Math.max(0,Math.min(100,Number(googleOverride)||0));
  const google=total*gp/100, meta=total*(100-gp)/100;
  const safe=Math.max(0,Math.min(100,Number(gbpPct)||0));
  return {total,google,meta,gbp:google*safe/100,ads:google*(100-safe)/100,googlePct:gp,metaPct:100-gp,count:cfg.count,conversionPct:cfg.conversion,gbpPct:safe,adsPct:100-safe,campaigns:cfg.campaigns};
}

export function numberBR(value){
  if(typeof value==='number') return Number.isFinite(value)?value:0;
  const raw=String(value??'').replace(/R\$|%|\s/g,''); if(!raw) return 0;
  const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
  const n=Number(normalized); return Number.isFinite(n)?n:0;
}

export function parseCSV(text){
  const src=String(text??'').replace(/^\uFEFF/,'').trim(); if(!src) return [];
  const first=src.split(/\r?\n/,1)[0]; const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(ch==='"'){ if(quoted&&src[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(ch===sep&&!quoted){row.push(cell.trim());cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&src[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];}
    else cell+=ch;
  }
  row.push(cell.trim()); if(row.some(Boolean))rows.push(row);
  const headers=(rows.shift()||[]).map(h=>h.toLowerCase().trim());
  return rows.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??''])));
}

const aliases={
  spend:['spend','valor gasto','custo','investimento','amount spent'], impressions:['impressions','impressões','impressoes'],
  clicks:['clicks','cliques','link clicks','cliques no link'], leads:['leads','conversões','conversoes','results','resultados'],
  revenue:['revenue','receita','valor de conversão','valor conversao','conversion value'], campaign:['campaign','campanha','campaign name','nome da campanha'],
  date:['date','data','day','dia'], ad:['ad name','nome do anúncio','nome do anuncio']
};
function pick(row,keys){for(const alias of keys){const hit=Object.entries(row).find(([k])=>k.toLowerCase().trim()===alias);if(hit)return hit[1];}return ''}
export function normalizeRows(rows){
  return (rows||[]).map((r,index)=>({id:`${index}-${pick(r,aliases.date)||'row'}`,date:pick(r,aliases.date),campaign:pick(r,aliases.campaign)||`Campanha ${index+1}`,ad:pick(r,aliases.ad),spend:numberBR(pick(r,aliases.spend)),impressions:numberBR(pick(r,aliases.impressions)),clicks:numberBR(pick(r,aliases.clicks)),leads:numberBR(pick(r,aliases.leads)),revenue:numberBR(pick(r,aliases.revenue))}));
}
export function metrics(rows){
  const t=(rows||[]).reduce((a,r)=>({spend:a.spend+(+r.spend||0),impressions:a.impressions+(+r.impressions||0),clicks:a.clicks+(+r.clicks||0),leads:a.leads+(+r.leads||0),revenue:a.revenue+(+r.revenue||0)}),{spend:0,impressions:0,clicks:0,leads:0,revenue:0});
  return {...t,ctr:t.impressions?t.clicks/t.impressions*100:0,cpc:t.clicks?t.spend/t.clicks:0,cpl:t.leads?t.spend/t.leads:0,roas:t.spend?t.revenue/t.spend:0,conversionRate:t.clicks?t.leads/t.clicks*100:0};
}

export function classifySearchTerm(term){
  const t=String(term||'').toLowerCase();
  if(['grátis','gratis','curso','emprego','vaga','salário','salario','download'].some(x=>t.includes(x))) return 'negativo';
  if(['orçamento','orcamento','empresa','contratar','preço','preco','perto de mim','sorocaba','laudo','vistoria'].some(x=>t.includes(x))) return 'alta intenção';
  return 'avaliar';
}
export function evaluateExperiment(exp){
  const a=Number(exp?.a||0),b=Number(exp?.b||0),lower=['cpl','cpc','cpa'].includes(exp?.metric);
  if(!a||!b||a===b)return {winner:'inconclusivo',delta:0};
  const winner=lower?(a<b?'A':'B'):(a>b?'A':'B'); const baseline=winner==='A'?b:a,best=winner==='A'?a:b;
  return {winner,delta:Math.abs(best-baseline)/Math.max(Math.abs(baseline),.0001)*100};
}

export const MOCK_ROWS=[
  {id:'1',date:'2026-09-01',campaign:'Google Search | Vistoria',spend:420,impressions:5600,clicks:284,leads:18,revenue:5400},
  {id:'2',date:'2026-09-08',campaign:'Meta | Diagnóstico',spend:280,impressions:18200,clicks:336,leads:11,revenue:2600},
  {id:'3',date:'2026-09-15',campaign:'Google Search | Laudos',spend:510,impressions:6900,clicks:347,leads:22,revenue:6800},
  {id:'4',date:'2026-09-22',campaign:'Meta | Remarketing',spend:190,impressions:9400,clicks:201,leads:9,revenue:2200}
];

export function projectFactory(name='Diagnos Engenharia'){
  const now=new Date().toISOString();
  return {
    id:`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,
    specialty:name==='Diagnos Engenharia'?'Engenharia diagnóstica e patologia das construções':'',niche:name==='Diagnos Engenharia'?'Síndicos, administradoras, construtoras e proprietários':'',
    description:'',products:'',services:'',offers:'',location:name==='Diagnos Engenharia'?'Sorocaba/SP e região':'',extra:'',status:'Prospecção',commercialStage:'prospecting',mediaPlanConfirmed:false,personas:[],channelReadiness:{},planContext:'',brandLogo:'',brandSecondaryColor:'',
    aiInputs:{
      creatorName:'',adOffer:'',adDestination:'',conversionAction:'',
      prospectOwner:'',prospectLinks:'',prospectObservation:'',prospectAdvertises:'',prospectTrafficManager:'',
      decisionMakerContext:'',marketMetrics:'',planApproachContext:'',planRecipientProfile:'',
      operationalDetails:'',additionalMaterials:'',signerName:'',signerRole:'',signerWhatsapp:'',invitationText:''
    },
    objective:'Gerar oportunidades qualificadas',budget:{amount:0,demand:'busca',level:'micro',gbpPct:20},
    versions:{business:1,offer:1,persona:0,performance:1},artifactMeta:{},
    persona:null,content:null,metaAds:null,googleAds:null,approach:null,marketingPlan:null,proposal:null,
    performanceRows:[],searchTerms:[],tracking:{utmSource:'google',utmMedium:'cpc',utmCampaign:'',events:['lead','whatsapp_click'],health:[]},
    decisions:[],experiments:[],history:[{at:now,text:'Workspace criado.'}],createdAt:now,updatedAt:now
  };
}

export function businessFingerprint(p){return JSON.stringify([p.name,p.specialty,p.niche,p.description,p.products,p.services,p.location,p.contactDestination]);}
export function offerFingerprint(p){return JSON.stringify([p.offers,p.objective,p.budget]);}
export function performanceFingerprint(p){return JSON.stringify((p.performanceRows||[]).map(r=>[r.date,r.campaign,r.spend,r.clicks,r.leads,r.revenue]));}
export function promptInputsFingerprint(p){return JSON.stringify(p.aiInputs||{});}
export function sourceFingerprint(p,key){
  const deps=ARTIFACT_DEPS[key]||[]; const out={};
  for(const d of deps){
    if(d==='business')out.business=businessFingerprint(p);
    if(d==='offer')out.offer=offerFingerprint(p);
    if(d==='persona')out.persona=JSON.stringify(p.persona);
    if(d==='content')out.content=JSON.stringify(p.content);
    if(d==='metaAds')out.metaAds=JSON.stringify(p.metaAds);
    if(d==='googleAds')out.googleAds=JSON.stringify(p.googleAds);
    if(d==='marketingPlan')out.marketingPlan=JSON.stringify(p.marketingPlan);
    if(d==='promptInputs')out.promptInputs=promptInputsFingerprint(p);
    if(d==='performance')out.performance=performanceFingerprint(p);
  }
  return JSON.stringify(out);
}
export function markArtifact(p,key){
  p.artifactMeta=p.artifactMeta||{}; const prev=p.artifactMeta[key];
  p.artifactMeta[key]={version:(prev?.version||0)+1,generatedAt:new Date().toISOString(),fingerprint:sourceFingerprint(p,key)};
  if(key==='persona'){p.versions=p.versions||{};p.versions.persona=(p.versions.persona||0)+1}
}
export function artifactStatus(p,key){
  const meta=p.artifactMeta?.[key]; if(!meta)return 'missing';
  return meta.fingerprint===sourceFingerprint(p,key)?'current':'stale';
}

export function projectHealth(p){
  const checks=[
    {key:'business',label:'Dados do negócio',ok:!!(p.name&&p.specialty&&p.niche),weight:15},
    {key:'persona',label:'Persona',ok:!!p.persona,weight:15},
    {key:'plan',label:'Planejamento',ok:!!p.budget?.amount,weight:10},
    {key:'content',label:'Conteúdo RETINA',ok:!!p.content?.items?.length,weight:15},
    {key:'ads',label:'Anúncios',ok:!!(p.metaAds||p.googleAds),weight:15},
    {key:'tracking',label:'Tracking',ok:!!p.tracking?.events?.length,weight:10},
    {key:'data',label:'Dados de performance',ok:!!p.performanceRows?.length,weight:10},
    {key:'learning',label:'Aprendizado',ok:!!((p.decisions?.length||0)+(p.experiments?.length||0)),weight:10}
  ];
  const score=checks.reduce((s,c)=>s+(c.ok?c.weight:0),0); const stale=['persona','content','metaAds','googleAds','marketingPlan'].filter(k=>artifactStatus(p,k)==='stale');
  return {score,checks,stale,ready:score>=75&&stale.length===0};
}

export function localFindings(p){
  const m=metrics(p.performanceRows||[]), findings=[];
  if(!p.performanceRows?.length)return [{severity:'info',title:'Sem dados de performance',text:'Importe CSV da Meta ou Google para ativar o diagnóstico.'}];
  if(m.ctr<1.2)findings.push({severity:'warn',title:'CTR baixo',text:`CTR agregado de ${m.ctr.toFixed(2)}%. Revise criativos, intenção e segmentação.`});
  if(m.cpl>100)findings.push({severity:'warn',title:'CPL elevado',text:`CPL agregado de R$ ${m.cpl.toFixed(2)}. Compare qualidade dos leads e campanhas antes de cortar verba.`});
  if(m.roas&&m.roas<2)findings.push({severity:'danger',title:'ROAS abaixo de 2x',text:`ROAS agregado de ${m.roas.toFixed(2)}x. Investigue oferta, conversão e atribuição.`});
  if(!findings.length)findings.push({severity:'ok',title:'Sem alerta estrutural',text:'Os indicadores agregados não acionaram regras críticas. Continue acompanhando por campanha e período.'});
  return findings;
}


export function qualityEngine(p){
  const status=(ok,warning=false)=>ok?'ok':warning?'warning':'blocker';
  const hasRealData=(p.performanceRows||[]).some(r=>r.dataType!=='MOCK');
  const levels=p.persona?.niveis_consciencia||{};
  const personaComplete=!!p.persona && Object.keys(levels).length===5;
  const retinaCats=new Set((p.content?.items||[]).map(i=>i.category));
  const contentComplete=['relacionamento','engajamento','transformacao','interacao','niveis_consciencia','autoridade'].every(k=>retinaCats.has(k));
  const metaComplete=(p.metaAds?.ads||[]).length>=4;
  const googleComplete=(p.googleAds?.titles||[]).length>=15 && (p.googleAds?.descriptions||[]).length>=4;
  const trackingOk=!!(p.tracking?.utmSource&&p.tracking?.utmMedium&&(p.tracking?.events||[]).length);
  const stale=['persona','content','metaAds','googleAds','marketingPlan'].filter(k=>artifactStatus(p,k)==='stale');

  const gates={
    A:[
      {label:'Negócio identificado',status:status(!!(p.name&&p.specialty&&p.niche)),detail:p.name&&p.niche?'Nome, especialidade e público definidos.':'Complete nome, especialidade e público-alvo.'},
      {label:'Dados de mídia',status:hasRealData?'ok':'info',detail:hasRealData?'Há dados reais importados.':'Sem dados reais importados; decisões de performance ficam limitadas.'}
    ],
    B:[
      {label:'Planejamento de verba',status:status(!!p.budget?.amount),detail:p.budget?.amount?'Orçamento e matriz de demanda definidos.':'Defina orçamento e tipo de demanda.'},
      {label:'Persona completa',status:status(personaComplete),detail:personaComplete?'Persona com 5 níveis de consciência.':'Gere a Persona estratégica antes de escalar a criação.'}
    ],
    C:[
      {label:'RETINA completo',status:status(contentComplete),detail:contentComplete?'As 6 categorias RETINA estão presentes.':'Gere as 6 categorias RETINA.'},
      {label:'Meta Ads estruturado',status:metaComplete?'ok':'warning',detail:metaComplete?'Há pelo menos 4 ângulos de anúncio.':'Meta Ads ainda não tem 4 anúncios completos.'},
      {label:'Google Ads estruturado',status:googleComplete?'ok':'warning',detail:googleComplete?'15 títulos e 4 descrições disponíveis.':'Google Ads ainda não atingiu 15 títulos e 4 descrições.'}
    ],
    D:[
      {label:'Tracking mínimo',status:trackingOk?'ok':'warning',detail:trackingOk?'UTM e eventos essenciais definidos.':'Configure utm_source, utm_medium e eventos de conversão.'}
    ],
    E:[
      {label:'Memória de decisões',status:(p.decisions||[]).length?'ok':'info',detail:(p.decisions||[]).length?'Há decisões registradas.':'Registre decisões relevantes quando começar a otimização.'},
      {label:'Ciclo de experimentos',status:(p.experiments||[]).length?'ok':'info',detail:(p.experiments||[]).length?'Há experimentos documentados.':'Ainda não há experimentos A/B registrados.'}
    ],
    F:[
      {label:'Consistência de versões',status:stale.length?'warning':'ok',detail:stale.length?stale.length+' artefato(s) foram gerados antes de mudanças nas fontes.':'Nenhum artefato gerado está desatualizado.'}
    ]
  };
  const all=Object.values(gates).flat();
  const summary={
    blockers:all.filter(x=>x.status==='blocker').length,
    warnings:all.filter(x=>x.status==='warning').length,
    infos:all.filter(x=>x.status==='info').length
  };
  summary.ready=summary.blockers===0 && summary.warnings===0;
  return {gates,summary};
}
