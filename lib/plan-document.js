// Plano de marketing em A4 (até 12 páginas), seguindo o prompt do curso:
// uma ideia por página, blocos sem material são removidos, nada de dado inventado, tudo offline.
import {resolvePalette} from './palette.js';
import {esc,arr,clean,clip,whatsappLink,formatPhone,monthYear,logoImg,awarenessSvg,flowSvg,timelineSvg,docCss,sheet,documentHtml} from './doc-kit.js';

const t=(v,max)=>esc(clip(v,max));
const has=(a)=>arr(a).length>0;
const str=(x)=>typeof x==='string'?x:JSON.stringify(x);
const dots=(items,max,len=130)=>has(items)?`<ul class="dots">${arr(items).slice(0,max).map(x=>`<li>${t(str(x),len)}</li>`).join('')}</ul>`:'';
const table=(head,rows)=>`<table class="t"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const head=(kicker,title)=>`<div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>`;
const CATEGORY={relacionamento:'Aproximar',engajamento:'Alcançar mais gente',transformacao:'Ensinar',interacao:'Conversar com o público',niveis_consciencia:'Despertar a necessidade',autoridade:'Mostrar domínio'};
const SEPARATE='O material completo existe e é enviado à parte.';

function channelKind(name){
  const n=String(name||'').toLowerCase();
  if(/google|pesquisa|busca/.test(n))return 'google';
  if(/meta|facebook|an[uú]ncios?\b/.test(n)&&!/org[aâ]nic/.test(n))return 'meta';
  if(/org[aâ]nic|conte[uú]do|reels|tiktok|youtube|instagram/.test(n))return 'content';
  return 'generic';
}

// Material do projeto por canal, já selecionado: 8 títulos, 1 anúncio completo, tabela das 6 peças e 1 roteiro.
function googleAssets(project){
  const g=project.googleAds||{};
  const kws=(has(g.selected)?arr(g.selected):arr(g.keywords?.highIntent)).slice(0,8);
  const titles=arr(g.titles).slice(0,8);
  if(!kws.length&&!titles.length)return null;
  const html=`<div class="cols two"><div><h3>Palavras-chave</h3>${dots(kws,8,60)}<h3>Negativas</h3>${dots(arr(g.keywords?.negative),5,40)}</div><div><h3>Títulos dos anúncios</h3>${dots(titles,8,36)}<h3>Descrições</h3>${dots(arr(g.descriptions),3,95)}</div></div>`;
  return {html,truncated:arr(g.titles).length>8||arr(g.descriptions).length>3||arr(g.keywords?.negative).length>5};
}
function metaAssets(project){
  const ads=arr(project.metaAds?.ads).slice(0,4);if(!ads.length)return null;
  const a=ads[0];
  const html=`${table(['Ângulo','Gancho de pergunta'],ads.map(x=>[t(x.angle,70),t(x.hooks?.pergunta||x.hooks?.contraintuitiva||'',120)]))}<h3>Um anúncio completo</h3><div class="callout soft"><b>Gancho:</b> ${t(a.hooks?.pergunta||a.hooks?.contraintuitiva||'',160)}<br/><br/><b>Corpo:</b> ${t(a.body,520)}<br/><br/><b>Chamada:</b> ${t(a.cta,120)}</div>`;
  return {html,truncated:arr(project.metaAds?.ads).length>1};
}
function contentAssets(project){
  const items=arr(project.content?.items).slice(0,6);if(!items.length)return null;
  const first=items[0];
  const html=`${table(['Função','Peça','Formato'],items.map(x=>[esc(CATEGORY[x.category]||clean(x.category)),t(x.title,80),t(x.format,30)]))}<h3>Roteiro de exemplo</h3><div class="callout soft"><b>${t(first.title,90)}</b><br/>${t(first.script||first.hook,560)}</div>`;
  return {html,truncated:true};
}
function channelAssets(kind,project){return kind==='google'?googleAssets(project):kind==='meta'?metaAssets(project):kind==='content'?contentAssets(project):null}

function channelBody(c,project,sendSeparately){
  const assets=channelAssets(channelKind(c.name),project);
  const example=!assets&&c.example?`<div class="callout soft">${t(c.example,300)}</div>`:'';
  const note=(assets?.truncated||sendSeparately)&&assets?`<p class="note">${SEPARATE}</p>`:'';
  return `${head('Canal',clean(c.name)||'Canal')}${c.summary?`<p class="lead">${t(c.summary,330)}</p>`:''}${assets?assets.html:''}${has(c.items)?`<h3>Como começar</h3>${dots(c.items,5,140)}`:''}${example}${note}`;
}
function otherChannelsBody(list){
  return `${head('Canais','Outros canais')}<div class="cols two">${list.slice(0,6).map(c=>`<div class="box"><h3>${t(c.name,40)}</h3>${c.summary?`<p>${t(c.summary,200)}</p>`:''}${dots(c.items,3,90)}</div>`).join('')}</div>`;
}

export function buildPlanDocument(project={},data={},opts={}){
  const palette=opts.palette||resolvePalette(project);
  const now=opts.now||new Date();
  const company=clean(data.cover?.company||project.name||'Empresa');
  const docName=`Plano de marketing | ${company}`;
  const logo=project.brandLogo||'';
  const ai=project.aiInputs||{};
  const inv=data.invitation||{};
  const signer={name:opts.signer?.name||ai.signerName||'',role:opts.signer?.role||ai.signerRole||'',whatsapp:opts.signer?.whatsapp||ai.signerWhatsapp||''};
  const defs=[];
  const add=(title,kind,body,cls='')=>defs.push({title,kind,body,cls});

  // 1. Capa
  const city=clean(data.cover?.city||project.location||'');
  const objective=clip(data.cover?.objective||project.objective||'',190);
  const conversion=clean(data.cover?.conversion||'');
  add('Capa','capa',()=>`<div class="top"><div class="logoPlate">${logo?logoImg(logo):`<span>${esc(company)}</span>`}</div></div><div class="mid"><div class="kick">Plano de marketing</div><h1>${esc(company)}</h1>${objective?`<p class="obj">${esc(objective)}</p>`:''}<div class="meta">${[city,monthYear(now),clean(data.cover?.period)].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div><div class="band"><b>${conversion?'Conversão principal':'Documento preparado para'}</b><div>${esc(conversion||company)}</div></div>`,'cover');

  // 2. O que este plano propõe (com sumário)
  if(data.proposal?.text||has(data.proposal?.workstreams))
    add('O que este plano propõe','proposta',(ctx)=>`${head('Plano de marketing','O que este plano propõe')}${data.proposal?.text?`<p class="lead">${t(data.proposal.text,430)}</p>`:''}${data.proposal?.communicationPromise?`<div class="callout">${t(data.proposal.communicationPromise,190)}</div>`:''}${has(data.proposal?.workstreams)?table(['Canal','Quem alcança','O que faz'],arr(data.proposal.workstreams).slice(0,5).map(w=>[t(w.channel,32),t(w.audience,70),t(w.role,85)])):''}<h3>Neste documento</h3><div class="toc${ctx.toc.length>6?' two':''}">${ctx.toc.map(e=>`<div><span>${esc(e.title)}</span><b>${e.no}</b></div>`).join('')}</div>`);

  // 3. Contexto de mercado
  if(has(data.marketContext?.facts)||data.marketContext?.practicalNote)
    add('Contexto de mercado','contexto',()=>`${head('Mercado','Contexto de mercado')}${has(data.marketContext?.facts)?`<div class="cards">${arr(data.marketContext.facts).slice(0,6).map(f=>`<div class="card"><div class="big">${t(f.value,18)}</div><b>${t(f.label,60)}</b>${f.note?`<span class="small muted">${t(f.note,90)}</span>`:''}</div>`).join('')}</div>`:''}${data.marketContext?.practicalNote?`<h3>Como usar isso</h3><div class="callout soft">${t(data.marketContext.practicalNote,420)}</div>`:''}`);

  // 4. Quem é o cliente
  const c=data.client||{};
  if(c.personaName||c.summary||c.obstacle||has(c.fears)||has(c.objections)){
    const initials=clean(c.personaName||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase()||'?';
    add('Quem é o cliente','cliente',()=>`${head('Público','Quem é o cliente')}<div class="persona"><div class="av">${esc(initials)}</div><div><h3>${t(c.personaName||'Perfil do cliente',60)}</h3>${c.summary?`<p>${t(c.summary,260)}</p>`:''}</div></div>${c.obstacle?`<h3>O que mais trava</h3><div class="callout soft">${t(c.obstacle,240)}</div>`:''}<div class="cols">${has(c.fears)?`<div><h3>Medos</h3>${dots(c.fears,5,110)}</div>`:''}${has(c.objections)?`<div><h3>Objeções</h3>${dots(c.objections,5,110)}</div>`:''}${has(c.previousAttempts)?`<div><h3>O que já tentou</h3>${dots(c.previousAttempts,4,110)}</div>`:''}</div><p class="note">${t(c.hypothesisNotice||'Esta persona descreve um comportamento provável do público. É uma hipótese para validar, não uma estatística.',200)}</p>`);
  }

  // 5. Momentos até a contratação
  if(has(data.awareness)){
    const stages=arr(data.awareness).slice(0,5);const withSearches=stages.filter(s=>has(s.searches));
    add('Os momentos até a contratação','momentos',()=>`${head('Decisão','Os momentos até a contratação')}${awarenessSvg(stages)}${table(['Momento','Mensagem que funciona','Canal'],stages.map(s=>[t(s.stage,40),t(s.message,160),t(s.channel,40)]))}${withSearches.length?`<h3>Buscas típicas por estágio</h3>${table(['Momento','Buscas'],withSearches.map(s=>[t(s.stage,40),t(arr(s.searches).slice(0,4).join(' · '),150)]))}`:''}`);
  }

  // 6. Posicionamento
  const pos=data.positioning||{};
  if(has(pos.commitments)||has(pos.fearResponses))
    add('Posicionamento','posicionamento',()=>`${head('Atendimento','Posicionamento')}${has(pos.commitments)?`<h3>Compromissos de atendimento</h3><ol class="num">${arr(pos.commitments).slice(0,6).map(x=>`<li>${t(str(x),130)}</li>`).join('')}</ol>`:''}${has(pos.fearResponses)?`<h3>Cada medo, uma resposta</h3>${table(['Medo ou objeção','Frase que resolve'],arr(pos.fearResponses).slice(0,6).map(x=>[t(x.fearOrObjection,80),t(x.response,160)]))}`:''}`);

  // 7. Canal por canal (no máximo 3 páginas; o excedente vira "Outros canais")
  const chs=arr(data.channels).filter(x=>x&&(x.name||x.summary));
  const sendSeparately=has(data.sendSeparately);
  if(chs.length<=3)chs.forEach(x=>add(clean(x.name)||'Canal','canal',()=>channelBody(x,project,sendSeparately)));
  else{
    chs.slice(0,2).forEach(x=>add(clean(x.name)||'Canal','canal',()=>channelBody(x,project,sendSeparately)));
    add('Outros canais','canal',()=>otherChannelsBody(chs.slice(2)));
  }

  // 8. Onde a venda acontece
  const sf=data.salesFlow||{};
  if(has(sf.steps)||has(sf.quickReplies))
    add('Onde a venda acontece','venda',()=>`${head('Atendimento','Onde a venda acontece')}${has(sf.steps)?flowSvg(sf.steps):''}${has(sf.quickReplies)?`<h3>Respostas rápidas para salvar</h3>${arr(sf.quickReplies).slice(0,2).map(x=>`<div class="bubble">${t(str(x),300)}</div>`).join('')}`:''}`);

  // 9. Ordem sugerida de ativação (mostra o caminho; não cobra nada)
  const act=data.activation||{};
  if(has(act.timeline)||has(act.indicators)){
    const ind=arr(act.indicators).slice(0,8);const mid=Math.ceil(ind.length/2);
    add('Ordem sugerida de ativação','ativacao',()=>`${head('Caminho','Ordem sugerida de ativação')}${has(act.timeline)?timelineSvg(act.timeline):''}${ind.length?`<h3>Indicadores que valem a pena acompanhar</h3><div class="cols two">${table(['Indicador'],ind.slice(0,mid).map(x=>[t(str(x),90)]))}${ind.length>mid?table(['Indicador'],ind.slice(mid).map(x=>[t(str(x),90)])):''}</div>`:''}`);
  }

  // 10. Convite (única página com a presença de quem envia)
  const number=inv.whatsappNumber||signer.whatsapp||'';
  const signature=clean(inv.signature||[signer.name,signer.role].filter(Boolean).join(', '));
  if(inv.text||number||signature){
    const message=clean(inv.whatsappMessage)||'Oi, recebi o plano de marketing e quero marcar uma conversa';
    const link=whatsappLink(number,message);
    add('Convite','convite',()=>`${head('Próximo passo',clean(inv.title)||'Se quiser conversar sobre isso')}<p class="lead">${t(inv.text||'Este plano é da empresa e pode ser colocado em prática sem ajuda. Se quiser conversar sobre o material e ver como aplicá-lo para vender mais, é só chamar.',700)}</p>${link?`<a class="wa" href="${esc(link)}">Chamar no WhatsApp</a><p class="note">${esc(formatPhone(number))}</p>`:''}${signature?`<div class="sign"><b>${esc(signature)}</b></div>`:''}`);
  }

  // Numeração e sumário (a capa não entra no sumário)
  const pages=defs.map((d,i)=>({no:i+1,title:d.title,kind:d.kind}));
  const ctx={toc:pages.slice(1)};
  const sheets=defs.map((d,i)=>sheet({title:d.title,body:d.body(ctx),docName,num:i+1,logo,cls:d.cls}));
  return {html:documentHtml({title:docName,css:docCss(palette),sheets}),pages,palette,docName};
}
