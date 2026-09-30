'use client';

import Image from 'next/image';
import {useEffect,useMemo,useState} from 'react';
import {
  calcBudget,classifySearchTerm,evaluateExperiment,generatePersona,generateRetina,
  metrics,normalizeRows,parseCSV,projectFactory
} from '../lib/core.js';

const NAV=[
  ['dashboard','Visão geral','▦'],['planner','Planejamento','◎'],['campaign','Campanha guiada','↗'],
  ['persona','Persona','♙'],['content','Conteúdo RETINA','✦'],['ads','Anúncios','◇'],
  ['performance','Performance','⌁'],['terms','Termos de pesquisa','⌕'],['experiments','Experimentos A/B','A/B'],
  ['proposal','Proposta','R$'],['settings','Configurações','⚙']
];

const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const NUM=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const clone=(x:any)=>JSON.parse(JSON.stringify(x));

function Card({title,eyebrow,children,action,className=''}:any){
  return <section className={'card '+className}><div className="cardHead"><div>{eyebrow&&<small>{eyebrow}</small>}{title&&<h3>{title}</h3>}</div>{action}</div>{children}</section>;
}
function Pill({children,tone='blue'}:any){return <span className={'pill '+tone}>{children}</span>}
function Metric({label,value,detail}:any){return <div className="metric"><span>{label}</span><b>{value}</b>{detail&&<small>{detail}</small>}</div>}
function Field({label,children}:any){return <label className="field"><span>{label}</span>{children}</label>}

export default function Home(){
  const [nav,setNav]=useState('dashboard');
  const [projects,setProjects]=useState<any[]>([]);
  const [pid,setPid]=useState('');
  const [ready,setReady]=useState(false);
  const [toast,setToast]=useState('');

  useEffect(()=>{
    let list:any[]=[];
    try{list=JSON.parse(localStorage.getItem('nexus-marketing-ia:v2')||'[]')}catch{}
    if(!list.length) list=[projectFactory('Diagnos Engenharia')];
    setProjects(list);setPid(list[0].id);setReady(true);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem('nexus-marketing-ia:v2',JSON.stringify(projects))},[projects,ready]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)},[toast]);

  const p=projects.find(x=>x.id===pid)||projects[0];
  const update=(fn:(d:any)=>void,msg?:string)=>{
    setProjects(prev=>prev.map(item=>{
      if(item.id!==pid)return item;
      const d=clone(item);fn(d);d.updatedAt=new Date().toISOString();
      if(msg){d.history=d.history||[];d.history.unshift({at:d.updatedAt,text:msg})}
      return d;
    }));
    if(msg)setToast(msg);
  };
  const newWorkspace=()=>{
    const name=window.prompt('Nome do cliente ou projeto','Novo cliente');
    if(!name)return;const n=projectFactory(name);setProjects(x=>[...x,n]);setPid(n.id);setNav('dashboard');
  };
  if(!ready||!p)return <div className="splash"><Image src="/nexus-logo.svg" width={72} height={72} alt="Nexus"/><b>Carregando Nexus Marketing IA...</b></div>;

  return <div className="shell">
    <aside>
      <div className="brand"><Image src="/nexus-logo.svg" width={44} height={44} alt="Nexus Digital"/><div><b>NEXUS</b><span>MARKETING IA</span></div></div>
      <div className="workspace"><small>WORKSPACE</small><select value={pid} onChange={e=>setPid(e.target.value)}>{projects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button onClick={newWorkspace}>＋ Novo workspace</button></div>
      <nav>{NAV.map(([key,label,icon])=><button key={key} className={nav===key?'active':''} onClick={()=>setNav(key)}><i>{icon}</i>{label}</button>)}</nav>
      <div className="sideFoot"><span>●</span> ambiente operacional</div>
    </aside>
    <main>
      <header><div><small>Nexus Digital / {p.name}</small><h1>{NAV.find(x=>x[0]===nav)?.[1]}</h1></div><div className="headerActions"><Pill tone="green">Sistema ativo</Pill><button className="ghost" onClick={()=>{localStorage.removeItem('nexus-marketing-ia:v2');location.reload()}}>Restaurar demo</button></div></header>
      <div className="content">
        {nav==='dashboard'&&<Dashboard p={p} go={setNav}/>}
        {nav==='planner'&&<Planner p={p} update={update}/>}
        {nav==='campaign'&&<Campaign p={p} go={setNav}/>}
        {nav==='persona'&&<Persona p={p} update={update}/>}
        {nav==='content'&&<Content p={p} update={update}/>}
        {nav==='ads'&&<Ads p={p} update={update}/>}
        {nav==='performance'&&<Performance p={p} update={update}/>}
        {nav==='terms'&&<Terms p={p} update={update}/>}
        {nav==='experiments'&&<Experiments p={p} update={update}/>}
        {nav==='proposal'&&<Proposal p={p} update={update}/>}
        {nav==='settings'&&<Settings p={p} update={update}/>}
      </div>
    </main>
    {toast&&<div className="toast">✓ {toast}</div>}
  </div>;
}

function Dashboard({p,go}:any){
  const b=calcBudget(p.budget.amount,p.budget.demand,p.budget.level,p.budget.gbpPct);
  const m=metrics(p.performanceRows||[]);
  const score=Math.min(100,25+(p.persona?20:0)+(p.content?.length?15:0)+(p.ads?15:0)+(p.performanceRows?.length?25:0));
  return <>
    <section className="hero">
      <div><small>NEXUS MARKETING OPERATING SYSTEM</small><h2>Estratégia, mídia e mensuração em um único fluxo.</h2><p>Planeje campanhas, distribua verba, produza ativos, acompanhe performance e registre decisões sem perder o contexto do cliente.</p><div className="row"><button className="primary" onClick={()=>go('planner')}>Planejar campanha</button><button className="secondary" onClick={()=>go('performance')}>Ver performance</button></div></div>
      <div className="score"><span>maturidade do workspace</span><b>{score}%</b><i style={{'--pct':score+'%'} as any}/></div>
    </section>
    <div className="metrics">
      <Metric label="Orçamento planejado" value={BRL.format(b.total)} detail={b.googlePct+'% Google · '+b.metaPct+'% Meta'}/>
      <Metric label="Leads no período" value={NUM.format(m.leads)} detail={'CPL '+BRL.format(m.cpl)}/>
      <Metric label="Receita atribuída" value={BRL.format(m.revenue)} detail={'ROAS '+m.roas.toFixed(2)+'x'}/>
      <Metric label="Cliques" value={NUM.format(m.clicks)} detail={'CTR '+m.ctr.toFixed(1)+'%'}/>
    </div>
    <div className="cols">
      <Card title="Distribuição recomendada" eyebrow="MATRIZ ESTRATÉGICA">
        <Channel name="Google" pct={b.googlePct} value={b.google}/><Channel name="Meta" pct={b.metaPct} value={b.meta}/>
        <div className="subsplit"><span>Dentro de Google</span><b>GBP {b.gbpPct}% · Ads {b.adsPct}%</b></div>
      </Card>
      <Card title="Próximas ações" eyebrow="CHECKLIST">
        <Action done={!!p.persona} label="Definir persona" onClick={()=>go('persona')}/>
        <Action done={!!p.content?.length} label="Gerar conteúdo RETINA" onClick={()=>go('content')}/>
        <Action done={!!p.ads} label="Estruturar anúncios" onClick={()=>go('ads')}/>
        <Action done={!!p.performanceRows?.length} label="Revisar performance" onClick={()=>go('performance')}/>
      </Card>
    </div>
    <Card title="Campanhas sugeridas" eyebrow="PORTFÓLIO DO PLANO">
      <div className="campaigns">{b.campaigns.map((x:string,i:number)=><div key={x}><span>{String(i+1).padStart(2,'0')}</span><b>{x}</b><Pill>{i<2?'Prioridade':'Apoio'}</Pill></div>)}</div>
    </Card>
  </>;
}

function Channel({name,pct,value}:any){return <div className="channel"><div><span>{name}</span><b>{pct}% · {BRL.format(value)}</b></div><div><i style={{width:pct+'%'}}/></div></div>}
function Action({done,label,onClick}:any){return <button className="action" onClick={onClick}><span className={done?'done':''}>{done?'✓':'○'}</span><b>{label}</b><i>›</i></button>}

function Planner({p,update}:any){
  const b=calcBudget(p.budget.amount,p.budget.demand,p.budget.level,p.budget.gbpPct);
  const set=(k:string,v:any)=>update((d:any)=>{d.budget={...d.budget,[k]:v}},'Planejamento atualizado');
  return <div className="planner">
    <Card title="Parâmetros da campanha" eyebrow="1. ESTRATÉGIA">
      <Field label="Objetivo"><input value={p.objective} onChange={e=>update((d:any)=>d.objective=e.target.value)}/></Field>
      <Field label="Orçamento mensal (R$)"><input type="number" min="0" value={p.budget.amount} onChange={e=>set('amount',Number(e.target.value))}/></Field>
      <div className="form2">
        <Field label="Tipo de demanda"><select value={p.budget.demand} onChange={e=>set('demand',e.target.value)}><option value="descoberta">Descoberta</option><option value="busca">Busca ativa</option><option value="hibrido">Híbrido</option></select></Field>
        <Field label="Nível de investimento"><select value={p.budget.level} onChange={e=>set('level',e.target.value)}><option value="micro">Micro</option><option value="medio">Médio</option><option value="alto">Alto</option></select></Field>
      </div>
      <Field label={'Parcela do Google destinada ao GBP: '+p.budget.gbpPct+'%'}><input type="range" min="0" max="100" value={p.budget.gbpPct} onChange={e=>set('gbpPct',Number(e.target.value))}/></Field>
    </Card>
    <Card title="Alocação calculada" eyebrow="2. DISTRIBUIÇÃO">
      <div className="bigSplit"><div><small>GOOGLE</small><b>{b.googlePct}%</b><span>{BRL.format(b.google)}</span></div><div><small>META</small><b>{b.metaPct}%</b><span>{BRL.format(b.meta)}</span></div></div>
      <div className="metrics compact"><Metric label="GBP" value={BRL.format(b.gbp)}/><Metric label="Google Ads" value={BRL.format(b.ads)}/></div>
      <h4>Campanhas recomendadas</h4><div className="tags">{b.campaigns.map((x:string)=><span key={x}>{x}</span>)}</div>
    </Card>
  </div>;
}

function Campaign({p,go}:any){
  const steps=[
    ['Planejamento',true,'planner'],['Persona',!!p.persona,'persona'],['Conteúdo',!!p.content?.length,'content'],
    ['Anúncios',!!p.ads,'ads'],['Mensuração',!!p.performanceRows?.length,'performance'],['Experimentos',!!p.experiments?.length,'experiments']
  ];
  return <Card title="Campanha guiada" eyebrow="FLUXO OPERACIONAL"><p className="lead">Siga a sequência para transformar briefing em campanha mensurável. O Nexus preserva o histórico do workspace e indica o que ainda precisa ser concluído.</p><div className="steps">{steps.map((s:any,i:number)=><button key={s[0]} onClick={()=>go(s[2])}><span>{i+1}</span><div><b>{s[0]}</b><small>{s[1]?'Concluído':'Pendente'}</small></div><Pill tone={s[1]?'green':'muted'}>{s[1]?'OK':'Abrir'}</Pill></button>)}</div></Card>;
}

function Persona({p,update}:any){
  const generate=()=>update((d:any)=>{d.persona=generatePersona(d.name,d.niche,d.audience)},'Persona gerada');
  return <div className="cols wide">
    <Card title="Contexto do público" eyebrow="PERSONA">
      <Field label="Nicho"><input value={p.niche} onChange={e=>update((d:any)=>d.niche=e.target.value)}/></Field>
      <Field label="Público-alvo"><textarea value={p.audience} onChange={e=>update((d:any)=>d.audience=e.target.value)}/></Field>
      <button className="primary" onClick={generate}>Gerar persona estratégica</button>
    </Card>
    <Card title={p.persona?.name||'Persona ainda não gerada'} eyebrow="SÍNTESE">
      {!p.persona?<p className="muted">Use o contexto do negócio para gerar dores, objeções e gatilhos.</p>:<>
        <p className="lead">{p.persona.profile}</p>
        <List title="Dores" items={p.persona.pains}/><List title="Objeções" items={p.persona.objections}/><List title="Gatilhos" items={p.persona.triggers}/>
      </>}
    </Card>
  </div>;
}
function List({title,items}:any){return <div className="list"><b>{title}</b>{items.map((x:string)=><p key={x}>• {x}</p>)}</div>}

function Content({p,update}:any){
  const [topic,setTopic]=useState(p.niche||'serviço técnico');
  const generate=()=>update((d:any)=>{d.content=generateRetina(topic)},'Pauta RETINA gerada');
  return <>
    <Card title="Motor de conteúdo RETINA" eyebrow="CRIAÇÃO"><div className="inline"><Field label="Tema da campanha"><input value={topic} onChange={e=>setTopic(e.target.value)}/></Field><button className="primary" onClick={generate}>Gerar 6 ângulos</button></div></Card>
    <div className="contentGrid">{(p.content||[]).map((x:any,i:number)=><Card key={i} eyebrow={x.type.toUpperCase()} title={x.title}><p className="muted">{x.cta}</p><div className="creativeMock"><span>{x.type.slice(0,1)}</span><b>{x.title}</b></div></Card>)}</div>
  </>;
}

function Ads({p,update}:any){
  const generate=()=>update((d:any)=>{
    const svc=d.niche||'serviço';
    d.ads={
      meta:[
        {hook:'Problema invisível também gera custo.',body:'Transforme sinais dispersos em um diagnóstico claro para decidir com segurança.',cta:'Solicitar avaliação'},
        {hook:'Antes de investir na correção, investigue a causa.',body:'Método técnico, evidências e orientação objetiva para reduzir retrabalho.',cta:'Falar com especialista'},
        {hook:'Decisão técnica começa por evidência.',body:'Organize sintomas, histórico e medições em um plano de ação verificável.',cta:'Conhecer o método'},
        {hook:'O barato pode sair caro quando a causa não foi diagnosticada.',body:'Avalie o cenário antes de definir a intervenção.',cta:'Pedir proposta'}
      ],
      google:{
        keywords:['empresa de '+svc,svc+' sorocaba','orçamento '+svc,'especialista em '+svc,'contratar '+svc],
        titles:['Especialista em '+svc,'Diagnóstico Técnico','Atendimento em Sorocaba','Solicite uma Avaliação','Engenharia com Método'],
        descriptions:['Investigação técnica, diagnóstico e orientação objetiva para sua tomada de decisão.','Atendimento especializado com registro técnico e plano de ação claro.']
      }
    }
  },'Estrutura de anúncios gerada');
  return <>
    <div className="pageActions"><button className="primary" onClick={generate}>{p.ads?'Regenerar anúncios':'Gerar anúncios'}</button></div>
    {!p.ads?<Card title="Estrutura ainda vazia" eyebrow="META + GOOGLE"><p className="muted">Gere uma primeira versão a partir do contexto do workspace. Depois refine textos, termos e criativos.</p></Card>:<div className="cols">
      <Card title="Meta Ads" eyebrow="4 VARIAÇÕES">{p.ads.meta.map((a:any,i:number)=><div className="ad" key={i}><small>ANÚNCIO {i+1}</small><b>{a.hook}</b><p>{a.body}</p><span>{a.cta}</span></div>)}</Card>
      <Card title="Google Ads" eyebrow="BUSCA ATIVA"><h4>Palavras-chave</h4><div className="tags">{p.ads.google.keywords.map((x:string)=><span key={x}>{x}</span>)}</div><h4>Títulos</h4>{p.ads.google.titles.map((x:string)=><p className="line" key={x}>{x}</p>)}<h4>Descrições</h4>{p.ads.google.descriptions.map((x:string)=><p className="muted" key={x}>{x}</p>)}</Card>
    </div>}
  </>;
}

function Performance({p,update}:any){
  const m=metrics(p.performanceRows||[]);
  const importCSV=async(file:File)=>{
    const rows=normalizeRows(parseCSV(await file.text()));
    if(!rows.length)return alert('CSV sem linhas reconhecidas.');
    update((d:any)=>d.performanceRows=rows,'Dados de performance importados');
  };
  return <>
    <div className="metrics">
      <Metric label="Investimento" value={BRL.format(m.spend)}/><Metric label="Impressões" value={NUM.format(m.impressions)}/>
      <Metric label="Cliques" value={NUM.format(m.clicks)} detail={'CPC '+BRL.format(m.cpc)}/><Metric label="Leads" value={NUM.format(m.leads)} detail={'CPL '+BRL.format(m.cpl)}/>
      <Metric label="Receita" value={BRL.format(m.revenue)} detail={'ROAS '+m.roas.toFixed(2)+'x'}/>
    </div>
    <Card title="Importar dados" eyebrow="CSV GOOGLE / META / GA4" action={<label className="uploadBtn">Importar CSV<input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&importCSV(e.target.files[0])}/></label>}>
      <div className="table"><div className="tr head"><span>Data</span><span>Campanha</span><span>Invest.</span><span>Cliques</span><span>Leads</span><span>Receita</span></div>{(p.performanceRows||[]).map((r:any)=><div className="tr" key={r.id}><span>{r.date||'—'}</span><b>{r.campaign}</b><span>{BRL.format(r.spend)}</span><span>{NUM.format(r.clicks)}</span><span>{NUM.format(r.leads)}</span><span>{BRL.format(r.revenue)}</span></div>)}</div>
    </Card>
  </>;
}

function Terms({p,update}:any){
  const defaults=['vistoria de imóvel sorocaba','curso grátis de engenharia','empresa de laudo técnico','como fazer laudo pdf','engenheiro para infiltração','salário engenheiro civil'];
  const terms=p.searchTerms||defaults.map((term:string)=>({term,status:classifySearchTerm(term),action:''}));
  const change=(i:number,action:string)=>update((d:any)=>{const base=d.searchTerms||terms;d.searchTerms=base.map((x:any,n:number)=>n===i?{...x,action}:x)},'Termo revisado');
  return <Card title="Termos de pesquisa" eyebrow="CLASSIFICAÇÃO ASSISTIDA"><div className="terms">{terms.map((t:any,i:number)=><div key={t.term}><div><b>{t.term}</b><Pill tone={t.status==='negativo'?'red':t.status==='alta intenção'?'green':'amber'}>{t.status}</Pill></div><select value={t.action} onChange={e=>change(i,e.target.value)}><option value="">Sem ação</option><option value="manter">Manter</option><option value="negativar">Negativar</option><option value="expandir">Expandir</option></select></div>)}</div></Card>;
}

function Experiments({p,update}:any){
  const [form,setForm]=useState({name:'Gancho técnico x gancho de dor',metric:'cpl',a:48,b:39});
  const add=()=>update((d:any)=>{d.experiments=[{...form,id:Date.now()},...(d.experiments||[])]},'Experimento registrado');
  return <div className="cols wide">
    <Card title="Novo experimento" eyebrow="A/B"><Field label="Hipótese"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div className="form3"><Field label="Métrica"><select value={form.metric} onChange={e=>setForm({...form,metric:e.target.value})}><option value="cpl">CPL</option><option value="ctr">CTR</option><option value="conversion">Conversão</option></select></Field><Field label="A"><input type="number" value={form.a} onChange={e=>setForm({...form,a:Number(e.target.value)})}/></Field><Field label="B"><input type="number" value={form.b} onChange={e=>setForm({...form,b:Number(e.target.value)})}/></Field></div><button className="primary" onClick={add}>Registrar experimento</button></Card>
    <div>{!(p.experiments||[]).length?<Card title="Sem testes ainda"><p className="muted">Registre a primeira hipótese para criar memória de aprendizado.</p></Card>:(p.experiments||[]).map((e:any)=>{const r=evaluateExperiment(e);return <Card key={e.id} title={e.name} eyebrow={e.metric.toUpperCase()} action={<Pill tone={r.winner==='inconclusivo'?'amber':'green'}>{r.winner==='inconclusivo'?'Inconclusivo':'Venceu '+r.winner}</Pill>}><div className="ab"><span>A <b>{e.a}</b></span><span>B <b>{e.b}</b></span></div><p className="muted">Diferença relativa: {r.delta.toFixed(1)}%</p></Card>})}</div>
  </div>;
}

function Proposal({p,update}:any){
  const q=p.proposal||{monthly:1800,setup:600,status:'Follow UP'};
  const set=(k:string,v:any)=>update((d:any)=>{d.proposal={...(d.proposal||q),[k]:v}},'Proposta atualizada');
  return <div className="cols wide">
    <Card title="Condições comerciais" eyebrow="PROPOSTA"><div className="form2"><Field label="Gestão mensal (R$)"><input type="number" value={q.monthly} onChange={e=>set('monthly',Number(e.target.value))}/></Field><Field label="Setup (R$)"><input type="number" value={q.setup} onChange={e=>set('setup',Number(e.target.value))}/></Field></div><Field label="Status"><select value={q.status} onChange={e=>set('status',e.target.value)}><option>Follow UP</option><option>Fechado</option><option>Declinado</option></select></Field></Card>
    <Card title={p.name} eyebrow="RESUMO EXECUTIVO"><div className="price"><small>GESTÃO MENSAL</small><b>{BRL.format(q.monthly)}</b><span>Setup: {BRL.format(q.setup)}</span></div><List title="Escopo" items={['Planejamento de campanhas','Google Ads e Meta Ads','Otimização de GBP','Mensuração e relatório','Ciclo de testes e decisões']}/><Pill tone={q.status==='Fechado'?'green':q.status==='Declinado'?'red':'amber'}>{q.status}</Pill></Card>
  </div>;
}

function Settings({p,update}:any){
  return <div className="cols wide">
    <Card title="Contexto do workspace" eyebrow="NEGÓCIO"><Field label="Nome"><input value={p.name} onChange={e=>update((d:any)=>d.name=e.target.value)}/></Field><Field label="Nicho"><input value={p.niche} onChange={e=>update((d:any)=>d.niche=e.target.value)}/></Field><Field label="Público-alvo"><textarea value={p.audience} onChange={e=>update((d:any)=>d.audience=e.target.value)}/></Field></Card>
    <div><Card title="Motor de IA" eyebrow="INTEGRAÇÃO"><Pill tone="amber">OpenAI · próxima etapa</Pill><p className="muted">O sistema funciona hoje com regras, templates e matriz estratégica local. A camada de geração por modelo será conectada via API sem alterar o fluxo operacional.</p></Card><Card title="Persistência" eyebrow="LOCAL-FIRST"><Pill tone="green">Ativa</Pill><p className="muted">Workspaces, planejamento, conteúdo, anúncios, experimentos e proposta ficam salvos neste navegador.</p></Card></div>
  </div>;
}
