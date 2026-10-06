'use client';

import {useEffect} from 'react';
import {ENGINE_LABELS} from '../lib/core.js';
import {JOURNEY_TASKS} from '../lib/journey.js';

const NF=new Intl.NumberFormat('pt-BR');
type Item={label:string;ok:boolean;view:string;sub?:string};

function useEscape(onClose:()=>void){
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose]);
}

function Checklist({items,onGo}:{items:Item[];onGo:(i:Item)=>void}){
  return <ul className="checkList">{items.map(i=><li key={i.label} className={i.ok?'ok':'missing'}><span aria-hidden="true">{i.ok?'✓':'○'}</span><b>{i.label}</b>{!i.ok&&<button className="secondary" onClick={()=>onGo(i)}>Ir preencher</button>}</li>)}</ul>;
}

export function PreflightDialog({title,items,onGo,onClose}:{title:string;items:Item[];onGo:(i:Item)=>void;onClose:()=>void}){
  useEscape(onClose);
  const first=items.find(i=>!i.ok);
  return <div className="dialogOverlay" onClick={onClose}><div className="dialogCard" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
    <small>ANTES DE GERAR</small><h3>{title}</h3>
    <p>Faltam informações para o motor trabalhar sem inventar dados. Complete os itens pendentes e gere de novo. Nenhuma chamada foi feita à OpenAI.</p>
    <Checklist items={items} onGo={onGo}/>
    <div className="buttonRow">{first&&<button className="primary" onClick={()=>onGo(first)}>Ir para o primeiro item →</button>}<button className="secondary" onClick={onClose}>Fechar</button></div>
  </div></div>;
}

export function JourneyDialog({p,gate,resumeTask,onRun,onGo,onClose}:{p:any;gate:{ok:boolean;items:Item[]};resumeTask:string|null;onRun:(resume:boolean)=>void;onGo:(i:Item)=>void;onClose:()=>void}){
  useEscape(onClose);
  const exists=(t:string)=>t==='persona'?!!p.persona:t==='content'?!!p.content?.items?.length:t==='metaAds'?!!p.metaAds:!!p.googleAds?.keywords;
  const doneBefore:string[]=resumeTask?(p.journeyRun?.done||[]):[];
  const state=(t:string)=>doneBefore.includes(t)?'concluída na tentativa anterior':exists(t)?'já existe: será substituída (versões anteriores ficam no histórico)':'nova';
  return <div className="dialogOverlay" onClick={onClose}><div className="dialogCard" role="dialog" aria-modal="true" aria-label="Jornada IA essencial" onClick={e=>e.stopPropagation()}>
    <small>JORNADA IA ESSENCIAL</small><h3>Persona → RETINA → Meta Ads → palavras-chave Google</h3>
    <p>{resumeTask?`A jornada anterior parou antes de terminar. Retome de ${ENGINE_LABELS[resumeTask]} ou recomece do zero.`:`${JOURNEY_TASKS.length} chamadas à OpenAI, em sequência. Ela para no primeiro erro, você pode cancelar a qualquer momento e depois revisa cada resultado.`}</p>
    <ol className="journeyList">{JOURNEY_TASKS.map((t:string)=><li key={t}><b>{ENGINE_LABELS[t]}</b><span>{state(t)}</span></li>)}</ol>
    {!gate.ok&&<><p className="muted"><b>Antes de executar, complete:</b></p><Checklist items={gate.items.filter(i=>!i.ok)} onGo={onGo}/></>}
    <div className="buttonRow">
      {gate.ok&&resumeTask&&<button className="primary" onClick={()=>onRun(true)}>Retomar de {ENGINE_LABELS[resumeTask]} →</button>}
      {gate.ok&&<button className={resumeTask?'secondary':'primary'} onClick={()=>onRun(false)}>{resumeTask?'Recomeçar do zero':'✦ Executar jornada'}</button>}
      <button className="secondary" onClick={onClose}>Cancelar</button>
    </div>
  </div></div>;
}

export function UsageCard({summary,title='Uso de IA neste projeto',scope}:{summary:{calls:number;failedCalls:number;inputTokens:number;outputTokens:number;totalTokens:number;byTask?:{task:string;label:string;calls:number;tokens:number;lastTokens:number}[];projects?:number};title?:string;scope?:string}){
  return <section className="card usageCard"><div className="cardHead"><div><div className="eyebrow">USO DA IA</div><h3>{title}</h3></div></div>
    {!summary.calls?<p className="muted">Ainda não há gerações registradas. Os tokens aparecem aqui depois da primeira geração{scope?` ${scope}`:''}.</p>:<>
      <div className="metricGrid">
        <div className="metric"><span>Chamadas</span><b>{NF.format(summary.calls)}</b><small>{summary.failedCalls?`${NF.format(summary.failedCalls)} reprovada(s) na validação`:'nenhuma reprovada'}</small></div>
        <div className="metric"><span>Entrada</span><b>{NF.format(summary.inputTokens)}</b><small>tokens</small></div>
        <div className="metric"><span>Saída</span><b>{NF.format(summary.outputTokens)}</b><small>tokens</small></div>
        <div className="metric"><span>Total</span><b>{NF.format(summary.totalTokens)}</b><small>{summary.projects?`${NF.format(summary.projects)} projeto(s)`:'tokens'}</small></div>
      </div>
      {!!summary.byTask?.length&&<details className="usageTasks"><summary>Por tipo de geração</summary><ul>{summary.byTask.map(t=><li key={t.task}><b>{t.label}</b><span>{NF.format(t.calls)} chamada(s) · {NF.format(t.tokens)} tokens · última {NF.format(t.lastTokens)}</span></li>)}</ul></details>}
    </>}
    <p className="muted usageNote">Tokens medidos pela OpenAI; não é valor em R$. Chamadas canceladas podem não aparecer.</p>
  </section>;
}

export function EngineErrorBanner({error,onRetry,onSettings,onDismiss}:{error:{label:string;message:string;code?:string};onRetry:()=>void;onSettings:()=>void;onDismiss:()=>void}){
  const config=['auth','forbidden','quota','model'].includes(error.code||'');
  return <div className="engineError" role="alert"><div><b>{error.label} não foi concluído</b><span>{error.message}</span></div>
    <div className="buttonRow">{config?<button className="primary" onClick={onSettings}>Abrir configurações</button>:<button className="primary" onClick={onRetry}>Tentar novamente</button>}<button className="secondary" onClick={onDismiss}>Dispensar</button></div></div>;
}
