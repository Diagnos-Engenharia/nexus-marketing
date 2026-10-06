'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {Projects,ProjectDialog,BrandBrief,MediaPlanning,PlanWorkspace,PersonaWorkspace,ContentWorkspace,CalendarWorkspace,Readiness,GoogleWorkspace} from '../components/workspaces';
import {PreflightDialog,JourneyDialog,UsageCard,EngineErrorBanner} from '../components/engine-ui';
import {printProposal} from '../lib/print-docs.js';
import {
  ENGINE_LABELS,addUsage,artifactStatus,calcBudget,evaluateExperiment,localFindings,markArtifact,
  metrics,normalizeRows,parseCSV,projectFactory,projectHealth,qualityEngine,sumUsage,usageSummary
} from '../lib/core.js';
import {
  adsReady,briefReady,journeyResumePoint,journeySteps,lifecycle,newJourneyRun,nextStep,preflight,preflightJourney
} from '../lib/journey.js';

type View='projects'|'brand'|'plan'|'content'|'ads'|'calendar'|'readiness'|'home'|'journey'|'prospecting'|'campaigns'|'performance'|'learning'|'settings';
type AIConfig={apiKey:string;model:string;remember:boolean;connected:boolean;lastTest?:string};
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const DEC=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const STORAGE='nexus-marketing-ia:v3';
const SETTINGS='nexus-marketing-settings:v3';
const SESSION_KEY='nexus-openai-key:session';
const LOCAL_KEY='nexus-openai-key:local';
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
const uid=(p='id')=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

const NAV:[View,string,string,string][]=[
  ['projects','Meus projetos','▦',''],
  ['home','Painel','⌂',''],
  ['brand','Marca e público','◉',''],
  ['plan','Plano de marketing','▤',''],
  ['campaigns','Investimento','◎',''],
  ['content','Conteúdo RETINA','✦',''],
  ['ads','Anúncios','↗',''],
  ['calendar','Calendário','▦',''],
  ['performance','Resultados','⌁',''],
  ['readiness','Preparar canais','✓',''],
  ['prospecting','Comercial','↗',''],
  ['learning','Aprendizados','◈',''],
  ['journey','Fluxo do projeto','✧',''],
  ['settings','Configurações','⚙','']
];

const MODEL_OPTIONS=[
  ['gpt-5.6-luna','Luna · econômico','Alto volume e menor custo'],
  ['gpt-5.6-terra','Terra · equilibrado','Bom equilíbrio entre qualidade e custo'],
  ['gpt-5.6-sol','Sol · máxima qualidade','Mais forte para estratégia e raciocínio']
];



function Card({title,eyebrow,children,action,className=''}:any){return <section className={`card ${className}`}><div className="cardHead"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}{title&&<h3>{title}</h3>}</div>{action}</div>{children}</section>}
function Pill({children,tone='blue'}:any){return <span className={`pill ${tone}`}>{children}</span>}
function Field({label,hint,children}:any){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
function Metric({label,value,detail,tone}:any){return <div className={`metric ${tone||''}`}><span>{label}</span><b>{value}</b>{detail&&<small>{detail}</small>}</div>}
function StatusDot({status}:any){return <span className={`statusDot ${status}`}>{status==='current'?'Atual':status==='stale'?'Desatualizado':'Não gerado'}</span>}
function Empty({title,text,action}:any){return <div className="empty"><div className="emptyIcon">✦</div><h3>{title}</h3><p>{text}</p>{action}</div>}
function Tabs({items,value,onChange}:any){return <div className="tabs">{items.map((x:any)=><button key={x[0]} className={value===x[0]?'active':''} onClick={()=>onChange(x[0])}>{x[1]}{x[2]&&<span>{x[2]}</span>}</button>)}</div>}

export default function Home(){
  const [view,setView]=useState<View>('projects');
  const [projectOpen,setProjectOpen]=useState(false);
  const [projects,setProjects]=useState<any[]>([]); const [pid,setPid]=useState(''); const [ready,setReady]=useState(false);
  const [projectDialog,setProjectDialog]=useState(false); const [mobileMenu,setMobileMenu]=useState(false);
  const [toast,setToast]=useState(''); const [busy,setBusy]=useState<{task:string;label:string;step?:string;cancellable?:boolean}|null>(null);
  const [engineError,setEngineError]=useState<{task:string;label:string;message:string;code?:string;input:any}|null>(null);
  const [preflightDialog,setPreflightDialog]=useState<{title:string;items:any[]}|null>(null);
  const [journeyDialog,setJourneyDialog]=useState(false);
  const abortRef=useRef<AbortController|null>(null);
  const [sub,setSub]=useState<Record<string,string>>({prospecting:'approach',campaigns:'planning',performance:'overview',learning:'decisions'});
  const [ai,setAI]=useState<AIConfig>({apiKey:'',model:'gpt-5.6-terra',remember:false,connected:false});
  const [globalSettings,setGlobalSettings]=useState<any>({agencyName:'Nexus Digital',agencyTagline:'Marketing digital para engenheiros',agencyColor:'#002e6c',agencyEmail:'',agencyWhatsapp:'',managerName:'Nexus Digital',managerSpecialty:'Gestão de tráfego e estratégia digital',region:'',experience:'',managerClients:'',managerVacancies:'',proposalMonthly:1800,proposalSetup:600});

  useEffect(()=>{
    let list:any[]=[]; try{list=JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch{}
    if(!list.length) list=[projectFactory('Diagnos Engenharia')];
    // Migração da primeira versão: remove somente o dataset demonstrativo interno conhecido.
    list=list.map((proj:any)=>{
      const rows=proj.performanceRows||[];
      const demo=rows.length===4 && ['Google Search | Vistoria','Meta | Diagnóstico','Google Search | Laudos','Meta | Remarketing'].every(name=>rows.some((r:any)=>r.campaign===name));
      const cleaned=demo?{...proj,performanceRows:[]}:proj;
      const hasManagement=!!(cleaned.persona||cleaned.content?.items?.length||cleaned.metaAds||cleaned.googleAds?.titles?.length||cleaned.performanceRows?.length);
      const inferred=cleaned.proposal?.status==='Fechado'?'won':cleaned.proposal?.status==='Declinado'?'declined':hasManagement?'won':cleaned.proposal?'proposal':'prospecting';
      const oldSchema=Number(cleaned.schemaVersion||0);
      const budget={amount:0,demand:'busca',level:'micro',gbpPct:20,...(cleaned.budget||{})};
      if(budget.gbpPct==null||(oldSchema<4&&Number(budget.gbpPct)===50))budget.gbpPct=20;
      return {...cleaned,schemaVersion:4,commercialStage:cleaned.commercialStage||inferred,mediaPlanConfirmed:!!cleaned.mediaPlanConfirmed,brandLogo:cleaned.brandLogo||'',brandSecondaryColor:cleaned.brandSecondaryColor||'',budget};
    });
    let st:any={}; try{st=JSON.parse(localStorage.getItem(SETTINGS)||'{}')}catch{}
    const remember=!!localStorage.getItem(LOCAL_KEY); const key=localStorage.getItem(LOCAL_KEY)||sessionStorage.getItem(SESSION_KEY)||'';
    setGlobalSettings((x:any)=>({...x,...st})); setProjects(list); setPid(list.some((x:any)=>x.id===localStorage.getItem('nexus-active-project'))?localStorage.getItem('nexus-active-project')!:list[0].id); setAI(x=>({...x,apiKey:key,remember,connected:false})); setReady(true);
  },[]);
  useEffect(()=>{if(ready){try{localStorage.setItem(STORAGE,JSON.stringify(projects))}catch{setToast('Não foi possível salvar neste navegador. Exporte o projeto para preservar os dados.')}}},[projects,ready]);
  useEffect(()=>{if(ready){try{localStorage.setItem(SETTINGS,JSON.stringify(globalSettings))}catch{setToast('Não foi possível salvar as configurações neste navegador.')}}},[globalSettings,ready]);
  useEffect(()=>{if(ready&&pid)localStorage.setItem('nexus-active-project',pid)},[pid,ready]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t)},[toast]);

  const p=projects.find(x=>x.id===pid)||projects[0];
  const update=(fn:(d:any)=>void,msg?:string)=>{setProjects(prev=>prev.map(item=>{if(item.id!==pid)return item;const d=clone(item);fn(d);d.updatedAt=new Date().toISOString();if(msg)d.history=[{at:d.updatedAt,text:msg},...(d.history||[])].slice(0,100);return d}));if(msg)setToast(msg)};
  const navigate=(v:View,tab?:string)=>{
    const won=lifecycle(p)==='won';
    const postSaleOnly:View[]=['home','content','ads','campaigns','performance','calendar','readiness','learning'];
    if(!won&&postSaleOnly.includes(v)){v='journey';tab=undefined}
    if(v==='projects')setProjectOpen(false);else if(v!=='settings')setProjectOpen(true);
    setView(v);setMobileMenu(false);if(tab)setSub(s=>({...s,[v]:tab}));window.scrollTo({top:0,behavior:'smooth'});
  };
  const openProject=(id:string)=>{const proj=projects.find(x=>x.id===id);if(!proj)return;const n=nextStep(proj);const [v,t]:[View,string?]=n.key==='done'?['performance','overview']:[n.view as View,n.sub];setPid(id);setProjectOpen(true);setView(v);if(t)setSub(s=>({...s,[v]:t}));setMobileMenu(false);window.scrollTo({top:0,behavior:'smooth'});};
  const createProject=(data:any)=>{const n=projectFactory(data.name);Object.assign(n,data,{commercialStage:'prospecting',status:'Prospecção'});setProjects(prev=>[...prev,n]);setPid(n.id);setProjectDialog(false);setProjectOpen(true);setView('brand');setSub(s=>({...s,brand:'brief'}));setToast('Projeto criado. Comece pelo briefing.');window.scrollTo({top:0,behavior:'smooth'});};
  const saveAIKey=(cfg:AIConfig)=>{localStorage.removeItem(LOCAL_KEY);sessionStorage.removeItem(SESSION_KEY);if(cfg.apiKey){if(cfg.remember)localStorage.setItem(LOCAL_KEY,cfg.apiKey);else sessionStorage.setItem(SESSION_KEY,cfg.apiKey)}setAI(cfg)};
  const testAI=async(cfg=ai)=>{if(!cfg.apiKey){setToast('Informe a chave da OpenAI.');return false}setBusy({task:'health',label:'Testando conexão com OpenAI'});try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:cfg.apiKey,model:cfg.model,task:'health',project:p,reasoning:'low'})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Falha de conexão');const next={...cfg,connected:true,lastTest:new Date().toISOString()};saveAIKey(next);setToast('OpenAI conectada com sucesso.');return true}catch(e:any){setAI(x=>({...x,connected:false}));setToast(e.message||'Não foi possível conectar.');return false}finally{setBusy(null)}};

  const callAI=async(task:string,project:any,input:any={},signal?:AbortSignal)=>{
    if(!ai.apiKey)throw new Error('Conecte sua chave da OpenAI em Configurações.');
    let r:Response;
    try{r=await fetch('/api/ai',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:ai.apiKey,model:ai.model,task,project,input:task==='marketingPlan'?{...input,mediaAllocation:calcBudget(project.budget?.amount,project.budget?.demand,project.budget?.level,project.budget?.gbpPct,project.budget?.googleOverride)}:input,reasoning:task==='searchTerms'?'low':'medium'})})}
    catch{throw Object.assign(new Error(signal?.aborted?'Geração cancelada.':'Não consegui falar com o servidor do Nexus. Confira a conexão e tente novamente.'),{code:signal?.aborted?'cancelled':'network'})}
    const j=await r.json().catch(()=>null);
    if(!j)throw Object.assign(new Error(r.status===504?'A geração passou do tempo limite do servidor. Tente novamente ou use o modelo Luna.':'O servidor do Nexus não respondeu corretamente. Tente novamente.'),{code:'server'});
    if(!r.ok||!j.ok)throw Object.assign(new Error(j.error||'Falha ao executar motor'),{usage:j.usage||null,code:j.code});
    return j;
  };
  const applyResult=(d:any,task:string,data:any,usage?:any)=>{
    d.generations=[{id:uid('gen'),task,at:new Date().toISOString(),model:ai.model,usage:usage||null},...(d.generations||[])].slice(0,50);
    if(usage)addUsage(d,task,usage);
    if(task==='persona'){if(d.persona)d.personaHistory=[{data:d.persona,savedAt:new Date().toISOString()},...(d.personaHistory||[])].slice(0,3);d.persona=data;markArtifact(d,'persona')}
    if(task==='deepDive'){d.persona=d.persona||{};d.persona.exploracao=data}
    if(task==='content'){if(d.content)d.contentHistory=[{data:d.content,savedAt:new Date().toISOString()},...(d.contentHistory||[])].slice(0,3);d.content={items:Array.isArray(data)?data:(data.items||[]),generatedAt:new Date().toISOString()};markArtifact(d,'content')}
    if(task==='metaAds'){if(d.metaAds)d.metaAdsHistory=[{data:d.metaAds,savedAt:new Date().toISOString()},...(d.metaAdsHistory||[])].slice(0,3);d.metaAds=data;markArtifact(d,'metaAds')}
    if(task==='googleKeywords'){if(d.googleAds)d.googleAdsHistory=[{data:d.googleAds,savedAt:new Date().toISOString()},...(d.googleAdsHistory||[])].slice(0,3);d.googleAds={...(d.googleAds||{}),keywords:data.keywords,selected:[],titles:[],descriptions:[],sitelinks:[],strategy:data.strategy};markArtifact(d,'googleAds')}
    if(task==='googleAds'){if(d.googleAds)d.googleAdsHistory=[{data:d.googleAds,savedAt:new Date().toISOString()},...(d.googleAdsHistory||[])].slice(0,3);d.googleAds=data;markArtifact(d,'googleAds')}
    if(task==='approach'){d.approach=data;markArtifact(d,'approach')}
    if(task==='marketingPlan'){d.marketingPlan=data;markArtifact(d,'marketingPlan')}
    if(task==='proposal'){d.proposal={...data,status:d.proposal?.status||'Em negociação'};d.commercialStage='proposal';d.status='Proposta';markArtifact(d,'proposal')}
    if(task==='searchTerms'){d.searchTermClassifications=data}
    if(task==='optimization'){d.optimization=data;markArtifact(d,'optimization')}
  };
  const gotoItem=(i:any)=>{setPreflightDialog(null);setJourneyDialog(false);navigate(i.view,i.sub)};
  const runEngine=async(task:string,input:any={},success?:string)=>{
    if(!ai.apiKey){navigate('settings');setToast('Conecte sua chave da OpenAI para ativar este motor.');return}
    const gate=preflight(task,p,input);
    if(!gate.ok){setPreflightDialog({title:ENGINE_LABELS[task]||'Motor de IA',items:gate.items});return}
    setEngineError(null);
    const ctl=new AbortController();abortRef.current=ctl;
    setBusy({task,label:ENGINE_LABELS[task]||'Motor de IA',cancellable:true});
    try{const snap=clone(p);const j=await callAI(task,snap,input,ctl.signal);if(task==='proposal'){j.data.investment={setup:BRL.format(Number(input.setup)||0),monthly:BRL.format(Number(input.monthly)||0),media:String(input.media||'')}}update(d=>{if(task==='proposal')d.proposalInputs={setup:Number(input.setup)||0,monthly:Number(input.monthly)||0,media:String(input.media||'')};applyResult(d,task,j.data,j.usage)},success||`${ENGINE_LABELS[task]||'Motor'} concluído`);setAI(x=>({...x,connected:true}))}
    catch(e:any){
      if(e.usage)update(d=>{addUsage(d,task,e.usage,{failed:true})});
      if(e.code==='cancelled')setToast('Geração cancelada.');
      else setEngineError({task,label:ENGINE_LABELS[task]||'Motor de IA',message:e.message||'Falha no motor de IA.',code:e.code,input});
    }finally{setBusy(null);abortRef.current=null}
  };
  const executeJourney=async(resume:boolean)=>{
    setJourneyDialog(false);
    if(!ai.apiKey){navigate('settings');setToast('Conecte sua chave da OpenAI antes de executar a jornada.');return}
    const gate=preflightJourney(p);
    if(!gate.ok){setPreflightDialog({title:'Jornada IA essencial',items:gate.items});return}
    setEngineError(null);
    const draft=clone(p);
    let run=resume&&journeyResumePoint(draft.journeyRun)?{...draft.journeyRun,status:'running',failedTask:null,error:null}:newJourneyRun();
    const ctl=new AbortController();abortRef.current=ctl;
    const save=()=>{draft.journeyRun=run;draft.updatedAt=new Date().toISOString();setProjects(prev=>prev.map(x=>x.id===pid?clone(draft):x))};
    save();
    try{
      for(const t of run.tasks){
        if(run.done.includes(t))continue;
        setBusy({task:t,label:'Jornada IA essencial',step:`${run.tasks.indexOf(t)+1}/${run.tasks.length} · ${ENGINE_LABELS[t]}`,cancellable:true});
        try{const j=await callAI(t,draft,{},ctl.signal);applyResult(draft,t,j.data,j.usage)}
        catch(e:any){if(e.usage)addUsage(draft,t,e.usage,{failed:true});run={...run,status:e.code==='cancelled'?'cancelled':'failed',failedTask:t,error:e.message};save();throw e}
        run={...run,done:[...run.done,t]};
        draft.history=[{at:new Date().toISOString(),text:`${ENGINE_LABELS[t]} gerado pela jornada IA`},...(draft.history||[])].slice(0,100);
        save();
      }
      run={...run,status:'done'};save();setAI(x=>({...x,connected:true}));setToast('Jornada IA concluída. Revise cada resultado.');
    }catch(e:any){
      if(e.code==='cancelled')setToast('Jornada cancelada. Você pode retomar de onde parou.');
      else setEngineError({task:'journey',label:'Jornada IA essencial',message:e.message||'Falha na jornada.',code:e.code,input:null});
    }finally{setBusy(null);abortRef.current=null}
  };

  if(!ready||!p)return <div className="splash"><Image src="/nexus-logo.svg" alt="Nexus" width={68} height={68}/><div><b>Nexus Marketing IA</b><span>Organizando seu projeto...</span></div></div>;
  const health=projectHealth(p);
  const stage=lifecycle(p);
  const inProject=projectOpen&&view!=='projects'&&view!=='settings';
  const allowed=stage==='won'?['journey','brand','content','ads','campaigns',...(p.mediaPlanConfirmed?['home','performance','calendar','readiness','learning']:[])]:['journey','brand','prospecting','plan'];
  const projectNav=NAV.filter(([key])=>allowed.includes(key));

  return <div className="appShell">
    <aside id="main-menu" className={`sidebar ${mobileMenu?'mobileOpen':''}`}>
      <div className="brand"><Image src="/nexus-logo.svg" alt="Nexus Digital" width={46} height={46}/><div><b>NEXUS</b><span>MARKETING IA</span></div></div>
      <nav className="globalNav" aria-label="Navegação geral">
        <button aria-current={view==='projects'?'page':undefined} aria-expanded={inProject} className={view==='projects'||inProject?'active':''} onClick={()=>navigate('projects')}><i>▦</i><span><b>Meus projetos</b></span></button>
      </nav>
      {inProject&&<div className="projectNavigation">
        <div className="projectContext"><small>PROJETO ABERTO</small><b title={p.name}>{p.name}</b></div>
        <nav aria-label={`Áreas de ${p.name}`}>
          {projectNav.map(([key,label,icon])=><button key={key} aria-current={view===key?'page':undefined} className={view===key?'active':''} onClick={()=>navigate(key)}><i>{icon}</i><span><b>{label}</b></span></button>)}
        </nav>
        <div className="sidebarFoot"><div className="healthMini"><span>Estrutura do projeto</span><b>{health.score}%</b></div><div className="progress"><i style={{width:health.score+'%'}}/></div><small>{health.stale.length?`${health.stale.length} item(ns) desatualizado(s)`:'Base consistente'}</small></div>
      </div>}
      <nav className="globalSettings" aria-label="Configurações gerais"><button aria-current={view==='settings'?'page':undefined} className={view==='settings'?'active':''} onClick={()=>navigate('settings')}><i>⚙</i><span><b>Configurações</b></span>{ai.apiKey&&<em className="navDot"/>}</button></nav>

    </aside>

    <main className="main">
      <header className={`topbar ${inProject?'projectTopbar':''}`}>
        <button className="menuToggle iconBtn" aria-label="Abrir menu" aria-expanded={mobileMenu} aria-controls="main-menu" onClick={()=>setMobileMenu(!mobileMenu)}>☰</button>
        <div className="topTitle">
          {inProject?<div className="projectBreadcrumb"><button onClick={()=>navigate('projects')}>Meus projetos</button><span aria-hidden="true">/</span><strong title={p.name}>{p.name}</strong></div>:<small>Nexus Digital / {view==='settings'?'Preferências gerais':'Seu portfólio'}</small>}
          <h1>{NAV.find(x=>x[0]===view)?.[1]}</h1>
        </div>
        <div className="topActions">
          {inProject&&<span className={`pill ${stage==='won'?'green':stage==='declined'?'red':'blue'}`}>{stage==='won'?'Cliente ativo':stage==='declined'?'Declinado':'Prospecção'}</span>}{inProject&&<button className="secondary backToProjects" onClick={()=>navigate('projects')}>← Projetos</button>}
          <button className={`aiStatus ${ai.connected?'ok':ai.apiKey?'warn':''}`} onClick={()=>navigate('settings')}><span>✦</span><div><small>OPENAI</small><b>{ai.connected?'Conectada':ai.apiKey?'Chave salva':'Conectar API'}</b></div></button>
          {inProject&&<button className="iconBtn" aria-label="Exportar projeto" title="Exportar projeto" onClick={()=>downloadJSON(p)}>⇩</button>}
        </div>
      </header>

      <div className="page">
        {!ai.apiKey&&view!=='settings'&&view!=='projects'&&<div className="apiBanner"><div><b>Ative os motores de IA</b><span>Conecte a OpenAI quando quiser gerar os materiais do projeto.</span></div><button onClick={()=>navigate('settings')}>Conectar OpenAI</button></div>}
        {engineError&&<EngineErrorBanner error={engineError} onSettings={()=>{setEngineError(null);navigate('settings')}} onDismiss={()=>setEngineError(null)} onRetry={()=>{const e=engineError;setEngineError(null);if(e.task==='journey')setJourneyDialog(true);else runEngine(e.task,e.input)}}/>}
        {inProject&&<ProjectFlow p={p} view={view} sub={sub} go={navigate}/>}
        {view==='projects'&&<Projects projects={projects} open={openProject} create={()=>setProjectDialog(true)}/>}
        {view==='brand'&&(stage==='won'?<><Tabs items={[["brief","Empresa"],["persona","Persona"]]} value={sub.brand||'persona'} onChange={(t:string)=>setSub(x=>({...x,brand:t}))}/>{(sub.brand||'persona')==='persona'?<PersonaWorkspace key={pid} p={p} update={update} run={runEngine} onContinue={()=>navigate('content')}/>:<BrandBrief p={p} update={update} onContinue={()=>navigate('brand','persona')}/>}</>:<BrandBrief p={p} update={update} onContinue={()=>navigate('prospecting','approach')}/>)}
        {view==='plan'&&<PlanWorkspace key={pid} p={p} update={update} run={runEngine} settings={globalSettings} onContinue={()=>navigate('prospecting','proposal')}/>}
        {view==='content'&&<ContentWorkspace key={pid} p={p} update={update} run={runEngine} onContinue={()=>navigate('ads','meta')}/>}
        {view==='calendar'&&<CalendarWorkspace key={pid} p={p} update={update}/>}
        {view==='readiness'&&<Readiness p={p} update={update}/>}
        {view==='ads'&&<><Tabs items={[["meta","Meta · despertar interesse"],["google","Google · quem já procura"]]} value={sub.ads||'meta'} onChange={(t:string)=>setSub(x=>({...x,ads:t}))}/>{sub.ads==='google'?<GoogleWorkspace key={pid} p={p} update={update} run={runEngine}/>:<MetaAds p={p} update={update} run={runEngine}/>} {adsReady(p)&&<div className="flowFooter"><div><b>Anúncios prontos para testar</b><span>Agora defina quanto investir em cada canal.</span></div><button className="primary" onClick={()=>navigate('campaigns','planning')}>Continuar para investimento →</button></div>}</>}
        {view==='home'&&<Dashboard p={p} health={health} go={navigate}/>}
        {view==='journey'&&<Journey p={p} go={navigate} ai={ai} onJourney={()=>setJourneyDialog(true)}/>}
        {view==='prospecting'&&<Prospecting key={pid} p={p} tab={sub.prospecting} setTab={(v:string)=>setSub(s=>({...s,prospecting:v}))} run={runEngine} settings={globalSettings} update={update} go={navigate}/>}
        {view==='campaigns'&&<MediaPlanning p={p} update={update} onContinue={()=>navigate('performance','overview')}/>} 
        {view==='performance'&&<Performance key={pid} p={p} tab={sub.performance} setTab={(v:string)=>setSub(s=>({...s,performance:v}))} run={runEngine} update={update}/>}
        {view==='learning'&&<Learning key={pid} p={p} tab={sub.learning} setTab={(v:string)=>setSub(s=>({...s,learning:v}))} update={update}/>}
        {view==='settings'&&<Settings ai={ai} setAI={saveAIKey} testAI={testAI} settings={globalSettings} setSettings={setGlobalSettings} busy={busy} projects={projects}/>}
      </div>
    </main>
    {projectDialog&&<ProjectDialog save={createProject} close={()=>setProjectDialog(false)}/>}
    {toast&&<div role="status" className="toast">{toast}</div>}
    {busy&&<div className="busyOverlay"><div className="busyCard"><div className="orb">✦</div><small>NEXUS AI ENGINE</small><h3>{busy.label}</h3><p>{busy.step||'Processando contexto, estratégia e estrutura de saída...'}</p><div className="loader"><i/></div><span>Você pode aguardar nesta tela. O resultado será salvo no projeto.</span>{busy.cancellable&&<button className="secondary busyCancel" onClick={()=>abortRef.current?.abort()}>Cancelar geração</button>}</div></div>}
    {preflightDialog&&<PreflightDialog title={preflightDialog.title} items={preflightDialog.items} onGo={gotoItem} onClose={()=>setPreflightDialog(null)}/>}
    {journeyDialog&&<JourneyDialog p={p} gate={preflightJourney(p)} resumeTask={journeyResumePoint(p.journeyRun)} onRun={executeJourney} onGo={gotoItem} onClose={()=>setJourneyDialog(false)}/>}
  </div>;
}

function downloadJSON(p:any){const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`nexus-${p.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`;a.click();URL.revokeObjectURL(u)}
function ProjectFlow({p,view,sub,go}:any){
 const journey=journeySteps(p);const won=journey.phase==='gestao';
 const steps=journey.steps.map((s:any)=>[s.label,s.done,s.view,s.sub]);
 return <div className="flowRail"><div className="flowRailPhase">{won?'GESTÃO':'PROSPECÇÃO'}</div>{steps.map((s:any,i:number)=>{const unlocked=i===0||steps.slice(0,i).every((x:any)=>x[1]);const active=view===s[2]&&(!s[3]||sub[s[2]]===s[3]);return <button key={s[0]} disabled={!unlocked} className={(s[1]?'done ':'')+(active?'active':'')} onClick={()=>go(s[2],s[3]||undefined)}><span>{s[1]?'✓':i+1}</span><b>{s[0]}</b></button>})}</div>;
}

function nextAction(p:any){const n=nextStep(p);return [n.label,n.text,n.view,n.sub]}


function Dashboard({p,health,go}:any){const b=calcBudget(p.budget.amount,p.budget.demand,p.budget.level,p.budget.gbpPct,p.budget.googleOverride),m=metrics(p.performanceRows||[]),next=nextAction(p);return <>
  <section className="hero"><div className="heroCopy"><div className="heroLabel">CLIENTE ATIVO</div><h2>Agora o foco é executar e medir.</h2><p>O painel aparece somente depois do fechamento. Continue pelo próximo passo do projeto.</p><div className="heroBtns"><button className="primary" onClick={()=>go(next[2],next[3])}>{next[0]} <span>→</span></button><button className="secondary" onClick={()=>go('journey')}>Ver fluxo</button></div></div><div className="heroNext"><span>PRÓXIMO PASSO</span><b>{next[0]}</b><p>{next[1]}</p><div className="scoreRing" style={{'--score':health.score} as any}><strong>{health.score}%</strong><small>estrutura</small></div></div></section>
  <div className="metricGrid"><Metric label="Orçamento mensal" value={BRL.format(b.total)} detail={b.total?(b.googlePct+'% Google · '+b.metaPct+'% Meta'):'Defina na etapa Investimento'}/><Metric label="Leads" value={DEC.format(m.leads)} detail={m.leads?('CPL '+BRL.format(m.cpl)):'Sem dados importados'}/><Metric label="Receita atribuída" value={BRL.format(m.revenue)} detail={m.revenue?('ROAS '+m.roas.toFixed(2)+'x'):'Sem dados importados'}/><Metric label="CTR" value={m.ctr.toFixed(1)+'%'} detail={m.clicks?(DEC.format(m.clicks)+' cliques'):'Sem dados importados'}/></div>
  <div className="grid2"><Card eyebrow="FLUXO" title="Onde o projeto está"><OperationMap p={p} go={go}/></Card><Card eyebrow="INVESTIMENTO" title="Distribuição atual"><BudgetSplit p={p}/></Card></div>
</>}
function Quick({title,text,icon,onClick}:any){return <button className="quick" onClick={onClick}><i>{icon}</i><div><b>{title}</b><span>{text}</span></div><em>›</em></button>}
function OperationMap({p,go}:any){const items=[['Empresa',briefReady(p),'brand','brief'],...journeySteps(p).steps.map((s:any)=>[s.label,s.done,s.view,s.key==='results'?'sources':s.sub])];return <div className="operationMap">{items.map((x:any,i:number)=><button key={x[0]} onClick={()=>go(x[2],x[3]||undefined)} className={x[1]?'done':''}><span>{x[1]?'✓':i+1}</span><b>{x[0]}</b><small>{x[1]?'concluído':'próxima ação'}</small></button>)}</div>}
function BudgetSplit({p}:any){const b=calcBudget(p.budget.amount,p.budget.demand,p.budget.level,p.budget.gbpPct,p.budget.googleOverride);return <div className="budgetSplit"><div className="splitRow"><span>Google</span><b>{b.googlePct}% · {BRL.format(b.google)}</b></div><div className="bar"><i style={{width:b.googlePct+'%'}}/></div><div className="splitRow"><span>Meta</span><b>{b.metaPct}% · {BRL.format(b.meta)}</b></div><div className="bar meta"><i style={{width:b.metaPct+'%'}}/></div><div className="budgetMini"><div><small>GBP</small><b>{BRL.format(b.gbp)}</b></div><div><small>Google Ads</small><b>{BRL.format(b.ads)}</b></div></div><div className="tagRow">{b.campaigns.map((x:string)=><span key={x}>{x}</span>)}</div></div>}


function Journey({p,go,ai,onJourney}:any){
 const j=journeySteps(p);const won=j.phase==='gestao';const current=j.current;
 const steps=j.steps.map((s:any)=>({...s,action:()=>go(s.view,s.sub||undefined)}));const target=steps[current];
 const resume=journeyResumePoint(p.journeyRun);
 return <><section className="workflowHero"><div><small>{won?'CLIENTE ATIVO':'PROSPECÇÃO'}</small><h2>{won?'Da estratégia para a execução.':'Do primeiro briefing ao fechamento.'}</h2><p>{won?'Persona, conteúdo, anúncios, investimento e resultado.':'O Nexus abre somente a etapa que faz sentido agora.'}</p></div><button className="primary" onClick={target.action}>{'Continuar: '+target.title} →</button></section>
 <div className="journey simpleJourney">{steps.map((s:any,i:number)=>{const unlocked=i===0||steps.slice(0,i).every((x:any)=>x.done);return <button className={'journeyStep '+(s.done?'done ':'')+(i===current?'current':'')} disabled={!unlocked} key={s.title} onClick={s.action}><div className="stepNo">{s.done?'✓':i+1}</div><div className="stepBody"><div className="stepTitle"><div><b>{s.title}</b><span>{s.done?'Concluído':i===current?'Próxima etapa':'Aguardando'}</span></div></div><em>›</em></div></button>})}</div>
 {won&&<section className="card journeyCard"><div><div className="eyebrow">JORNADA IA ESSENCIAL · OPCIONAL</div><h3>Gerar Persona, RETINA, Meta Ads e palavras-chave em sequência</h3><p>São 4 chamadas à OpenAI. O Nexus para no primeiro erro, você pode cancelar a qualquer momento e depois revisa cada resultado. Se preferir, siga etapa por etapa pelo fluxo acima.</p>{resume&&<span className="tag">Interrompida: dá para retomar de {ENGINE_LABELS[resume]}</span>}</div><button className="primary" disabled={!ai.apiKey} title={ai.apiKey?'':'Conecte a OpenAI em Configurações'} onClick={onJourney}>✦ {resume?'Retomar ou recomeçar':'Executar jornada'}</button></section>}
 <UsageCard summary={usageSummary(p)}/></>;
}

function Prospecting({p,tab,setTab,run,settings,update,go}:any){
 const ai=p.aiInputs||{};const [channel,setChannel]=useState('WhatsApp');const [context,setContext]=useState(ai.planApproachContext||'');
 const savedCommercial=p.proposalInputs||{};
 const [commercial,setCommercial]=useState({monthly:savedCommercial.monthly??settings.proposalMonthly??1800,setup:savedCommercial.setup??settings.proposalSetup??600,media:savedCommercial.media||'Verba de mídia paga diretamente às plataformas'});
 const setAI=(k:string,v:any)=>update((d:any)=>{d.aiInputs={...(d.aiInputs||{}),[k]:v}});
 const items=[['approach','Abordagem'],['proposal','Proposta']];
 const manager={...settings,managerName:settings.managerName||settings.agencyName||'Nexus Digital',targetNiche:p.specialty||p.niche};
 const ready=!!((settings.managerName||settings.agencyName||'Nexus Digital').trim()&&p.name?.trim()&&(p.specialty||p.services||p.products)?.trim());
 const decide=(status:string)=>{update((d:any)=>{d.proposal={...(d.proposal||{}),status};d.commercialStage=status==='Fechado'?'won':'declined';d.status=status==='Fechado'?'Ativo':'Declinado'},status==='Fechado'?'Cliente fechado. Gestão liberada.':'Proposta marcada como declinada.');if(status==='Fechado')go('brand','persona');else go('projects')};
 return <>
  <div className="sectionIntro"><div><div className="eyebrow">{tab==='approach'?'ETAPA 2 DE 5 · PROSPECÇÃO':'ETAPA 4 E 5 DE 5 · PROSPECÇÃO'}</div><h2>{tab==='approach'?'Prepare uma abordagem específica para esta empresa.':'Transforme o plano em proposta e registre a decisão.'}</h2></div></div><Tabs items={items} value={tab} onChange={setTab}/>
  {tab==='approach'&&<><div className="grid2"><Card eyebrow="ABORDAGEM" title="Contexto"><Field label="Canal"><select value={channel} onChange={e=>setChannel(e.target.value)}><option>WhatsApp</option><option>Instagram</option><option>Ligação</option><option>Presencial</option></select></Field><Field label="Como chegamos até esta empresa?"><textarea value={context} onChange={e=>{setContext(e.target.value);setAI('planApproachContext',e.target.value)}} placeholder="Contato frio, indicação, conversa anterior..."/></Field><div className="managerSummary"><small>QUEM ABORDA</small><b>{settings.managerName||settings.agencyName}</b><span>{settings.agencyName} · {settings.region||'região a definir'}</span></div></Card>
  <Card eyebrow="PROSPECT" title="Pontos de conexão"><Field label="Dono ou decisor, se souber"><input value={ai.prospectOwner||''} onChange={e=>setAI('prospectOwner',e.target.value)}/></Field><Field label="Site, Instagram ou Google"><input value={ai.prospectLinks||p.contactDestination||''} onChange={e=>setAI('prospectLinks',e.target.value)}/></Field><Field label="O que chamou sua atenção"><textarea value={ai.prospectObservation||''} onChange={e=>setAI('prospectObservation',e.target.value)}/></Field><div className="form2"><Field label="Já anuncia?"><select value={ai.prospectAdvertises||''} onChange={e=>setAI('prospectAdvertises',e.target.value)}><option value="">Não sei</option><option>Sim</option><option>Não</option></select></Field><Field label="Já tem gestor?"><select value={ai.prospectTrafficManager||''} onChange={e=>setAI('prospectTrafficManager',e.target.value)}><option value="">Não sei</option><option>Sim</option><option>Não</option></select></Field></div></Card></div>
  <details className="contextDetails"><summary>Mais contexto para personalizar</summary><div className="grid2"><Field label="Sobre o decisor"><textarea value={ai.decisionMakerContext||''} onChange={e=>setAI('decisionMakerContext',e.target.value)} placeholder="Dores, desejos, objeções, rotina, tentativas anteriores..."/></Field><Field label="Sobre o mercado"><textarea value={ai.marketMetrics||''} onChange={e=>setAI('marketMetrics',e.target.value)} placeholder="Indicadores e particularidades do segmento, se souber."/></Field></div></details>
  <div className="flowFooter"><div><b>{p.approach?'Abordagem pronta':'Gerar abordagem'}</b><span>{p.approach?'Revise as opções e avance para o plano.':'O Nexus usa o briefing e os pontos de conexão acima.'}</span></div>{p.approach?<button className="primary" onClick={()=>go('plan')}>Continuar para plano →</button>:<button className="primary" disabled={!ready} onClick={()=>run('approach',{manager,channel,context})}>✦ Gerar 5 abordagens</button>}</div>
  {p.approach&&<ResultCard title="Opções de abordagem" empty=""><ApproachResult data={p.approach}/></ResultCard>}</>}
  {tab==='proposal'&&<><div className="grid2"><Card eyebrow="NEXUS" title="Proposta comercial"><div className="providerMini"><b>{settings.agencyName}</b><span>{settings.agencyTagline}</span><small>{[settings.agencyEmail,settings.agencyWhatsapp].filter(Boolean).join(' · ')||'Contatos configuráveis em Configurações'}</small></div><div className="form2"><Field label="Setup (R$)"><input type="number" value={commercial.setup} onChange={e=>setCommercial({...commercial,setup:Number(e.target.value)})}/></Field><Field label="Mensalidade (R$)"><input type="number" value={commercial.monthly} onChange={e=>setCommercial({...commercial,monthly:Number(e.target.value)})}/></Field></div><Field label="Verba de mídia"><input value={commercial.media} onChange={e=>setCommercial({...commercial,media:e.target.value})}/></Field>{!p.marketingPlan?<button className="primary full" onClick={()=>go('plan')}>Gerar plano antes da proposta →</button>:<button className="primary full" onClick={()=>run('proposal',{...commercial,manager:settings,agency:settings})}>✦ {p.proposal?'Gerar nova versão':'Gerar proposta'}</button>}</Card>
  <ResultCard title="Proposta" empty="Gere o plano de marketing e depois a proposta.">{p.proposal&&<ProposalResult data={p.proposal} project={p} agency={settings}/>}</ResultCard></div>
  {p.proposal&&<Card eyebrow="DECISÃO" title="O que aconteceu com esta proposta?"><div className="decisionButtons"><button className="successButton" onClick={()=>decide('Fechado')}>✓ Fechado</button><button className="declineButton" onClick={()=>decide('Declinado')}>Declinado</button></div><p className="muted">Fechado libera a gestão: Persona → RETINA → Anúncios → Investimento → Resultados.</p></Card>}</>}
 </>;
}
function InfoStack({p}:any){return <div className="infoStack"><div><span>Negócio</span><b>{p.name}</b></div><div><span>Público</span><b>{p.niche||'—'}</b></div><div><span>Persona</span><b>{p.persona?.nome||'Ainda não gerada'}</b></div><div><span>Conteúdo</span><b>{p.content?.items?.length?`${p.content.items.length} peças RETINA`:'Ainda não gerado'}</b></div></div>}
function ResultCard({title,empty,children}:any){return <Card eyebrow="OUTPUT" title={title}>{children||<Empty title="Ainda sem resultado" text={empty}/>}</Card>}
function ApproachResult({data}:any){return <div className="resultList">{(data.approaches||[]).map((a:any,i:number)=><div className="outputItem" key={i}><small>OPÇÃO {i+1}</small><b>{a.name}</b>{a.pointsUsed?.length>0&&<em>Pontos usados: {a.pointsUsed.join(' · ')}</em>}<p>{a.message}</p></div>)}{data.informationMap?.length>0&&<><h4>Mapa das informações utilizadas</h4>{data.informationMap.map((x:any,i:number)=><div className="miniLine" key={i}><b>{x.information}</b><span>{(x.usedIn||[]).join(', ')}</span></div>)}</>}{data.unusedConnections?.length>0&&<DocList title="Pontos de conexão ainda não utilizados" items={data.unusedConnections}/>} {data.followUps?.length>0&&<><h4>Follow-ups</h4>{data.followUps.map((f:any,i:number)=><div className="outputItem" key={i}><small>{f.when}</small><p>{f.message}</p></div>)}</>}{data.objections?.length>0&&<><h4>Possíveis objeções</h4>{data.objections.map((o:any,i:number)=><div className="miniLine" key={i}><b>{o.objection}</b><span>{o.answer}</span></div>)}</>}{data.missingInformation?.length>0&&<DocList title="Alertas de lacuna" items={data.missingInformation}/>}</div>}
function MarketingPlanResult({data}:any){return <div className="document"><p className="lead">{data.executiveSummary}</p><DocList title="Diagnóstico" items={data.diagnosis}/><DocList title="Objetivos" items={data.objectives}/><h4>Canais</h4>{(data.channels||[]).map((x:any,i:number)=><div className="miniLine" key={i}><b>{x.name}</b><span>{x.role} · {x.priority}</span></div>)}<h4>Plano de 90 dias</h4>{(data.ninetyDayPlan||[]).map((x:any,i:number)=><div className="timelineItem" key={i}><span>{x.period}</span><ul>{(x.actions||[]).map((a:string)=><li key={a}>{a}</li>)}</ul></div>)}</div>}
function ProposalResult({data,project,agency}:any){return <div className="document proposalDoc"><div className="proposalHero"><small>{agency.agencyName||'NEXUS DIGITAL'}</small><h2>{data.title}</h2><p>{data.context}</p></div><DocList title="Objetivos" items={data.objectives}/><DocList title="Escopo" items={data.scope}/><DocList title="Entregáveis" items={data.deliverables}/><DocList title="Processo" items={data.process}/><div className="investment"><span>Setup <b>{data.investment?.setup}</b></span><span>Mensal <b>{data.investment?.monthly}</b></span></div><p className="nextStep">{data.nextStep}</p><button className="secondary" onClick={()=>{try{printProposal(project,data,agency)}catch(e:any){alert(e.message||'Não foi possível abrir a exportação.')}}}>Exportar PDF</button></div>}
function DocList({title,items}:any){if(!items?.length)return null;return <div className="docList"><h4>{title}</h4><ul>{items.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>}

function MetaAds({p,update,run}:any){
 const status=artifactStatus(p,'metaAds');const ai=p.aiInputs||{};const setAI=(k:string,v:any)=>update((d:any)=>{d.aiInputs={...(d.aiInputs||{}),[k]:v}});
 const ready=!!(p.persona&&(ai.adOffer||p.offers||p.services||p.products)?.trim()&&(ai.adDestination||p.contactDestination)?.trim()&&ai.conversionAction?.trim());
 return <><div className="sectionIntro"><div><div className="eyebrow">ANÚNCIOS / META</div><h2>Oferta + destino + ação + persona.</h2><p>O motor só gera os quatro anúncios quando as quatro respostas exigidas pelo prompt estiverem disponíveis.</p></div><button className="primary" disabled={!ready} onClick={()=>run('metaAds')}>✦ {p.metaAds?'Regenerar 4 anúncios':'Gerar 4 anúncios'}</button></div>
 <Card eyebrow="ANTES DE GERAR" title="Informações obrigatórias"><Field label="O que você está anunciando"><textarea value={ai.adOffer||''} onChange={e=>setAI('adOffer',e.target.value)} placeholder={p.offers||p.services||'Descreva produto, serviço, oferta ou evento com detalhes.'}/></Field><div className="form2"><Field label="Destino após o clique"><input value={ai.adDestination||p.contactDestination||''} onChange={e=>setAI('adDestination',e.target.value)} placeholder="WhatsApp, página, formulário..."/></Field><Field label="Ação desejada no destino"><input value={ai.conversionAction||''} onChange={e=>setAI('conversionAction',e.target.value)} placeholder="Enviar mensagem, pedir orçamento..."/></Field></div><div className="requirementGrid"><div className={(ai.adOffer||p.offers||p.services||p.products)?'ready':'missing'}><span>{(ai.adOffer||p.offers||p.services||p.products)?'✓':'○'}</span><b>Oferta detalhada</b></div><div className={(ai.adDestination||p.contactDestination)?'ready':'missing'}><span>{(ai.adDestination||p.contactDestination)?'✓':'○'}</span><b>Destino</b></div><div className={ai.conversionAction?'ready':'missing'}><span>{ai.conversionAction?'✓':'○'}</span><b>Ação</b></div><div className={p.persona?'ready':'missing'}><span>{p.persona?'✓':'○'}</span><b>Persona</b></div></div></Card>
 {!p.metaAds?<Empty title="Meta Ads ainda não gerado" text="Complete as quatro informações e gere os anúncios pelo Método GCC."/>:<div className="adsGrid">{(p.metaAds.ads||[]).map((a:any,i:number)=><Card key={i} eyebrow={`ANÚNCIO ${i+1}`} title={a.angle}><div className="adPreview"><small>GANCHO</small><b>{a.hooks?.pergunta||a.hooks?.contraintuitiva}</b><p>{a.body}</p><button>{a.cta}</button></div><div className="hookList">{Object.entries(a.hooks||{}).map(([k,v]:any)=><div key={k}><span>{k}</span><p>{v}</p></div>)}</div>{a.awareness&&<div className="hypothesis">Nível de consciência: {a.awareness}</div>}<StatusDot status={status}/></Card>)}</div>}
 </>;
}
function Tracking({p,update}:any){const t=p.tracking||{};const set=(k:string,v:any)=>update((d:any)=>{d.tracking={...(d.tracking||{}),[k]:v}},'Tracking atualizado');return <div className="grid2"><Card eyebrow="UTM BUILDER" title="Padronização"><Field label="utm_source"><input value={t.utmSource||''} onChange={e=>set('utmSource',e.target.value)}/></Field><Field label="utm_medium"><input value={t.utmMedium||''} onChange={e=>set('utmMedium',e.target.value)}/></Field><Field label="utm_campaign"><input value={t.utmCampaign||''} onChange={e=>set('utmCampaign',e.target.value)}/></Field><div className="utmPreview">?utm_source={t.utmSource||'{source}'}&utm_medium={t.utmMedium||'{medium}'}&utm_campaign={t.utmCampaign||'{campaign}'}</div></Card><Card eyebrow="CONVERSÕES" title="Eventos essenciais"><div className="eventList">{['lead','whatsapp_click','form_submit','phone_click','purchase'].map(ev=><label key={ev}><input type="checkbox" checked={(t.events||[]).includes(ev)} onChange={e=>set('events',e.target.checked?[...(t.events||[]),ev]:(t.events||[]).filter((x:string)=>x!==ev))}/><span><b>{ev}</b><small>Evento de mensuração</small></span></label>)}</div></Card></div>}

function Performance({p,tab,setTab,run,update}:any){const items=[['overview','Visão'],['sources','Fontes de dados'],['terms','Termos'],['creatives','Criativos'],['diagnostics','Diagnóstico']];return <><div className="sectionIntro"><div><div className="eyebrow">MENSURAÇÃO</div><h2>Dados que viram decisão</h2><p>Importe performance real, confira métricas e use IA somente onde ela agrega interpretação — sem mascarar falta de dados.</p></div></div><Tabs items={items} value={tab} onChange={setTab}/>{tab==='overview'&&<PerformanceOverview p={p}/>} {tab==='sources'&&<Sources p={p} update={update}/>} {tab==='terms'&&<Terms p={p} run={run} update={update}/>} {tab==='creatives'&&<Creatives p={p}/>} {tab==='diagnostics'&&<Diagnostics p={p} run={run}/>}</>}

function PerformanceOverview({p}:any){const m=metrics(p.performanceRows||[]);const byCamp:any={};(p.performanceRows||[]).forEach((r:any)=>{const k=r.campaign||'Sem campanha';byCamp[k]=byCamp[k]||[];byCamp[k].push(r)});return <><div className="metricGrid five"><Metric label="Investimento" value={BRL.format(m.spend)}/><Metric label="Impressões" value={DEC.format(m.impressions)}/><Metric label="CTR" value={`${m.ctr.toFixed(2)}%`} detail={`CPC ${BRL.format(m.cpc)}`}/><Metric label="Leads" value={DEC.format(m.leads)} detail={`CPL ${BRL.format(m.cpl)}`}/><Metric label="ROAS" value={`${m.roas.toFixed(2)}x`} detail={BRL.format(m.revenue)}/></div><Card eyebrow="CAMPANHAS" title="Performance consolidada"><div className="dataTable"><div className="tr head"><span>Campanha</span><span>Invest.</span><span>Cliques</span><span>Leads</span><span>CPL</span><span>ROAS</span></div>{Object.entries(byCamp).map(([name,rows]:any)=>{const x=metrics(rows);return <div className="tr" key={name}><b>{name}</b><span>{BRL.format(x.spend)}</span><span>{DEC.format(x.clicks)}</span><span>{DEC.format(x.leads)}</span><span>{BRL.format(x.cpl)}</span><span>{x.roas.toFixed(2)}x</span></div>})}</div></Card></>}

function Sources({p,update}:any){const importCSV=async(file:File)=>{const rows=normalizeRows(parseCSV(await file.text()));if(!rows.length){alert('Não reconheci linhas no CSV.');return}update((d:any)=>{d.performanceRows=rows.map((r:any)=>({...r,dataType:'REAL',source:'csv'}));d.versions.performance=(d.versions.performance||0)+1},`${rows.length} linhas de performance importadas`)};return <div className="grid2"><Card eyebrow="IMPORTAÇÃO" title="Google / Meta / GA4"><div className="dropzone"><div>⇧</div><b>Importe CSV exportado das plataformas</b><span>Reconhece campanha, gasto, impressões, cliques, leads/conversões e receita.</span><label className="primary">Escolher CSV<input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&importCSV(e.target.files[0])}/></label></div></Card><Card eyebrow="STATUS" title="Base atual"><div className="sourceStats"><div><span>Linhas</span><b>{p.performanceRows?.length||0}</b></div><div><span>Campanhas</span><b>{new Set((p.performanceRows||[]).map((r:any)=>r.campaign)).size}</b></div><div><span>Período</span><b>{p.performanceRows?.[0]?.date||'—'}</b></div></div><button className="dangerText" onClick={()=>confirm('Limpar dados importados?')&&update((d:any)=>{d.performanceRows=[]},'Dados de performance limpos')}>Limpar base</button></Card></div>}

function Terms({p,run,update}:any){const [raw,setRaw]=useState((p.searchTerms||[]).join('\n'));const terms=raw.split('\n').map(x=>x.trim()).filter(Boolean);const save=()=>update((d:any)=>{d.searchTerms=terms},'Lista de termos atualizada');return <div className="grid2"><Card eyebrow="TERMOS DE PESQUISA" title="Classificação por intenção"><Field label="Cole um termo por linha"><textarea className="tall" value={raw} onChange={e=>setRaw(e.target.value)} placeholder={'vistoria apartamento novo\ncurso de engenharia\nlaudo técnico sorocaba'}/></Field><div className="buttonRow"><button className="secondary" onClick={save}>Salvar termos</button><button className="primary" disabled={!terms.length} onClick={()=>run('searchTerms',{terms:terms.map(term=>({term,clicks:0,cost:0,conversions:0}))})}>✦ Classificar com IA</button></div></Card><Card eyebrow="RESULTADO" title="Intenção e ação">{!p.searchTermClassifications?<Empty title="Sem classificação" text="Cole termos e rode o motor. Para recomendações com evidência, inclua depois o relatório real de termos."/>:<div className="classificationList">{p.searchTermClassifications.map((x:any,i:number)=><div key={i}><div><b>{x.term}</b><Pill tone={x.intent==='Alta'?'green':x.intent==='Irrelevante'?'red':'amber'}>{x.intent}</Pill></div><p>{x.reason}</p><span>{x.category} · {x.recommendedAction}</span></div>)}</div>}</Card></div>}

function Creatives({p}:any){const ads=p.metaAds?.ads||[],rows=p.performanceRows||[];return <>{!ads.length?<Empty title="Gere Meta Ads primeiro" text="O painel de criativos cruza os anúncios gerados com dados importados quando os nomes estiverem disponíveis."/>:<div className="adsGrid">{ads.map((a:any,i:number)=>{const linked=rows.filter((r:any)=>r.ad&&String(r.ad).includes(String(i+1)));const m=metrics(linked);return <Card key={i} eyebrow={`CRIATIVO ${i+1}`} title={a.angle}><p className="muted">{a.hooks?.contraintuitiva||a.hooks?.pergunta}</p><div className="creativeStats"><span>Invest. <b>{linked.length?BRL.format(m.spend):'N/D'}</b></span><span>CTR <b>{linked.length?m.ctr.toFixed(2)+'%':'N/D'}</b></span><span>Leads <b>{linked.length?DEC.format(m.leads):'N/D'}</b></span></div><small className="muted">{linked.length?'Dados vinculados pelo nome do anúncio.':'Sem vínculo com dados reais. Não estimamos performance.'}</small></Card>})}</div>}</>}

function Diagnostics({p,run}:any){const m=metrics(p.performanceRows||[]),local=localFindings(p);return <div className="grid2"><Card eyebrow="REGRAS LOCAIS" title="Sinais observados"><div className="findingList">{local.map((x:any,i:number)=><div className={x.severity} key={i}><span>{x.severity==='ok'?'✓':x.severity==='danger'?'!':'•'}</span><div><b>{x.title}</b><p>{x.text}</p></div></div>)}</div><button className="primary full" onClick={()=>run('optimization',{metrics:m,findings:local,rows:p.performanceRows||[]})}>✦ Interpretar e priorizar com IA</button></Card><ResultCard title="Diagnóstico assistido" empty="A IA vai partir das métricas e dos sinais locais, declarando hipóteses e nível de confiança.">{p.optimization&&<div className="findingList detailed"><p className="lead">{p.optimization.summary}</p>{(p.optimization.findings||[]).map((f:any,i:number)=><div className={f.severity} key={i}><span>{i+1}</span><div><b>{f.title}</b><p>{f.observation}</p><small><strong>Evidência:</strong> {f.evidence}</small><small><strong>Hipótese:</strong> {f.hypothesis}</small><small><strong>Ação:</strong> {f.action}</small><small><strong>Revisão:</strong> {f.nextReview}</small></div></div>)}</div>}</ResultCard></div>}

function Learning({p,tab,setTab,update}:any){const items=[['decisions','Decisões'],['experiments','Experimentos'],['audit','Auditoria'],['history','Histórico']];return <><div className="sectionIntro"><div><div className="eyebrow">MELHORIA CONTÍNUA</div><h2>O projeto precisa aprender com o que aconteceu</h2><p>Registre decisões e testes para não repetir mudanças sem memória do motivo e do resultado.</p></div></div><Tabs items={items} value={tab} onChange={setTab}/>{tab==='decisions'&&<Decisions p={p} update={update}/>} {tab==='experiments'&&<Experiments p={p} update={update}/>} {tab==='audit'&&<Audit p={p}/>} {tab==='history'&&<History p={p}/>}</>}

function Decisions({p,update}:any){const [f,setF]=useState({title:'',reason:'',action:'',metric:'CPL',status:'Planejada'});const add=()=>{if(!f.title)return;update((d:any)=>{d.decisions=[{...f,id:uid('dec'),at:new Date().toISOString()},...(d.decisions||[])]},'Decisão registrada');setF({title:'',reason:'',action:'',metric:'CPL',status:'Planejada'})};return <div className="grid2"><Card eyebrow="DIÁRIO" title="Registrar decisão"><Field label="Decisão"><input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Ex.: reduzir verba da campanha X em 20%"/></Field><Field label="Por quê"><textarea value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></Field><Field label="O que será alterado"><textarea value={f.action} onChange={e=>setF({...f,action:e.target.value})}/></Field><div className="form2"><Field label="Métrica principal"><input value={f.metric} onChange={e=>setF({...f,metric:e.target.value})}/></Field><Field label="Status"><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Planejada</option><option>Em observação</option><option>Concluída</option></select></Field></div><button className="primary full" onClick={add}>Registrar decisão</button></Card><Card eyebrow="HISTÓRICO" title="Decisões do projeto">{!p.decisions?.length?<Empty title="Nenhuma decisão registrada" text="Documente mudanças importantes para preservar o raciocínio do projeto."/>:<div className="decisionList">{p.decisions.map((d:any)=><div key={d.id}><div><b>{d.title}</b><Pill tone={d.status==='Concluída'?'green':'amber'}>{d.status}</Pill></div><p>{d.reason}</p><small>{d.action}</small></div>)}</div>}</Card></div>}

function Experiments({p,update}:any){const [f,setF]=useState({name:'Gancho técnico × gancho de dor',metric:'cpl',a:48,b:39,hypothesis:'O gancho de dor reduzirá o CPL sem piorar a qualidade do lead.'});const add=()=>update((d:any)=>{d.experiments=[{...f,id:uid('exp'),at:new Date().toISOString()},...(d.experiments||[])]},'Experimento registrado');return <div className="grid2"><Card eyebrow="A/B" title="Novo experimento"><Field label="Hipótese"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field><Field label="Racional"><textarea value={f.hypothesis} onChange={e=>setF({...f,hypothesis:e.target.value})}/></Field><div className="form3"><Field label="Métrica"><select value={f.metric} onChange={e=>setF({...f,metric:e.target.value})}><option value="cpl">CPL</option><option value="ctr">CTR</option><option value="cpc">CPC</option><option value="conversion">Conversão</option></select></Field><Field label="A"><input type="number" value={f.a} onChange={e=>setF({...f,a:Number(e.target.value)})}/></Field><Field label="B"><input type="number" value={f.b} onChange={e=>setF({...f,b:Number(e.target.value)})}/></Field></div><button className="primary full" onClick={add}>Registrar teste</button></Card><Card eyebrow="RESULTADOS" title="Experimentos">{!p.experiments?.length?<Empty title="Nenhum teste ainda" text="Compare uma variável por vez para transformar opinião em aprendizado."/>:<div className="experimentList">{p.experiments.map((e:any)=>{const r=evaluateExperiment(e);return <div key={e.id}><div><b>{e.name}</b><Pill tone={r.winner==='inconclusivo'?'amber':'green'}>{r.winner==='inconclusivo'?'Inconclusivo':`Venceu ${r.winner}`}</Pill></div><p>{e.hypothesis}</p><div className="ab"><span>A <b>{e.a}</b></span><span>B <b>{e.b}</b></span><em>Δ {r.delta.toFixed(1)}%</em></div></div>})}</div>}</Card></div>}

function Audit({p}:any){
  const h=projectHealth(p),q=qualityEngine(p);
  const labels:any={A:'A — Dados',B:'B — Estratégia',C:'C — Criativos',D:'D — Tracking',E:'E — Operacional',F:'F — Consistência'};
  return <>
    <div className={`auditHero ${q.summary.ready?'ready':''}`}><div><small>QUALITY GATE A–F</small><h2>{q.summary.ready?'Estrutura consistente para avançar':'Há pendências antes de escalar'}</h2><p>O gate verifica base de dados, estratégia, criativos, tracking, operação e consistência entre versões. Ele não substitui julgamento estratégico.</p><div className="auditSummary"><Pill tone={q.summary.blockers?'red':'green'}>{q.summary.blockers} bloqueador(es)</Pill><Pill tone={q.summary.warnings?'amber':'green'}>{q.summary.warnings} aviso(s)</Pill><Pill tone="blue">{q.summary.infos} informativo(s)</Pill></div></div><strong>{h.score}%</strong></div>
    <div className="qualityGates">{Object.entries(q.gates).map(([key,checks]:any)=><Card key={key} eyebrow={labels[key]} title={checks.some((x:any)=>x.status==='blocker')?'Requer ação':checks.some((x:any)=>x.status==='warning')?'Revisar':'Estruturado'} className={checks.some((x:any)=>x.status==='blocker')?'gateBlock':checks.some((x:any)=>x.status==='warning')?'gateWarn':'gateOk'}><div className="gateChecks">{checks.map((x:any,i:number)=><div key={i}><span className={x.status}>{x.status==='ok'?'✓':x.status==='blocker'?'!':'•'}</span><div><b>{x.label}</b><p>{x.detail}</p></div></div>)}</div></Card>)}</div>
    {h.stale.length>0&&<Card eyebrow="VERSIONAMENTO" title="Artefatos que precisam de atenção"><div className="staleList">{h.stale.map((x:string)=><div key={x}><Pill tone="amber">Desatualizado</Pill><b>{ENGINE_LABELS[x]||x}</b><span>Foi gerado antes de uma mudança em sua fonte. O resultado foi preservado; regenere quando fizer sentido.</span></div>)}</div></Card>}
  </>;
}

function History({p}:any){return <div className="grid2"><Card eyebrow="ATIVIDADE" title="Histórico do projeto">{(p.history||[]).map((h:any,i:number)=><div className="historyItem" key={i}><span>{new Date(h.at).toLocaleString('pt-BR')}</span><b>{h.text}</b></div>)}</Card><Card eyebrow="GERAÇÕES" title="Motores executados">{!p.generations?.length?<Empty title="Sem gerações nesta versão" text="As novas execuções por OpenAI aparecerão aqui com data e modelo."/>:p.generations.map((g:any)=><div className="historyItem" key={g.id}><span>{new Date(g.at).toLocaleString('pt-BR')}</span><b>{ENGINE_LABELS[g.task]||g.task}</b><small>{g.model}</small></div>)}</Card></div>}


function Settings({ai,setAI,testAI,settings,setSettings,busy,projects}:any){
 const [draft,setDraft]=useState(ai);useEffect(()=>setDraft(ai),[ai]);const save=()=>{setAI({...draft,connected:false})};
 return <><div className="sectionIntro"><div><div className="eyebrow">CONFIGURAÇÕES</div><h2>Configure uma vez e reutilize em todos os projetos.</h2></div></div><div className="grid2 settingsGrid">
 <Card eyebrow="IDENTIDADE NEXUS" title="Usada nas propostas"><Field label="Nome da agência"><input value={settings.agencyName} onChange={e=>setSettings({...settings,agencyName:e.target.value})}/></Field><Field label="Posicionamento"><input value={settings.agencyTagline} onChange={e=>setSettings({...settings,agencyTagline:e.target.value})}/></Field><div className="form2"><Field label="Cor"><input type="color" value={settings.agencyColor||'#002e6c'} onChange={e=>setSettings({...settings,agencyColor:e.target.value})}/></Field><Field label="Responsável"><input value={settings.managerName} onChange={e=>setSettings({...settings,managerName:e.target.value})}/></Field></div><div className="form2"><Field label="E-mail"><input value={settings.agencyEmail||''} onChange={e=>setSettings({...settings,agencyEmail:e.target.value})}/></Field><Field label="WhatsApp"><input value={settings.agencyWhatsapp||''} onChange={e=>setSettings({...settings,agencyWhatsapp:e.target.value})}/></Field></div></Card>
 <Card eyebrow="COMERCIAL" title="Padrões da Nexus"><Field label="Especialidade"><input value={settings.managerSpecialty} onChange={e=>setSettings({...settings,managerSpecialty:e.target.value})}/></Field><div className="form2"><Field label="Região"><input value={settings.region} onChange={e=>setSettings({...settings,region:e.target.value})}/></Field><Field label="Experiência"><select value={settings.experience} onChange={e=>setSettings({...settings,experience:e.target.value})}><option value="">Selecione</option><option>Zero (nenhum cliente)</option><option>Iniciante (1 a 2 clientes)</option><option>Intermediário (3 a 7 clientes)</option><option>Experiente (8 ou mais clientes)</option></select></Field></div><div className="form2"><Field label="Clientes atuais"><input type="number" min="0" value={settings.managerClients??''} onChange={e=>setSettings({...settings,managerClients:e.target.value})}/></Field><Field label="Vagas disponíveis"><input type="number" min="0" value={settings.managerVacancies??''} onChange={e=>setSettings({...settings,managerVacancies:e.target.value})}/></Field></div><div className="form2"><Field label="Setup padrão"><input type="number" value={settings.proposalSetup} onChange={e=>setSettings({...settings,proposalSetup:Number(e.target.value)})}/></Field><Field label="Mensalidade padrão"><input type="number" value={settings.proposalMonthly} onChange={e=>setSettings({...settings,proposalMonthly:Number(e.target.value)})}/></Field></div></Card>
 <Card eyebrow="OPENAI API" title="Motores de inteligência"><div className="connectionState"><div className={ai.connected?'on':ai.apiKey?'saved':''}>✦</div><div><b>{ai.connected?'Conexão validada':ai.apiKey?'Chave configurada':'Ainda não conectada'}</b><span>{ai.connected?'Modelo atual: '+ai.model:'Insira sua chave para ativar os motores.'}</span></div></div><Field label="Chave da OpenAI"><input type="password" autoComplete="off" value={draft.apiKey} onChange={e=>setDraft({...draft,apiKey:e.target.value,connected:false})} placeholder="sk-..."/></Field><Field label="Modelo"><select value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value,connected:false})}>{MODEL_OPTIONS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></Field><label className="remember"><input type="checkbox" checked={draft.remember} onChange={e=>setDraft({...draft,remember:e.target.checked})}/><span><b>Lembrar chave neste navegador</b><small>Desmarcado = some ao fechar a sessão.</small></span></label><div className="buttonRow"><button className="secondary" onClick={save}>Salvar</button><button className="primary" disabled={!draft.apiKey||!!busy} onClick={async()=>{setAI({...draft,connected:false});await testAI({...draft,connected:false})}}>Testar conexão</button>{ai.apiKey&&<button className="dangerText" onClick={()=>{const empty={...ai,apiKey:'',connected:false,remember:false};setDraft(empty);setAI(empty)}}>Remover chave</button>}</div></Card>
 <UsageCard summary={sumUsage(projects)} title="Uso em todos os projetos" scope="em qualquer projeto"/>
 </div></>;
}

