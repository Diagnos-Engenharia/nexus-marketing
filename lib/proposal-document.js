// Proposta comercial em A4: mesma linguagem visual do plano, com a identidade da agência (logo e cores)
// e a logo do cliente na capa. O investimento aparece em destaque, sem esconder o preço.
import {resolvePaletteFrom} from './palette.js';
import {esc,arr,clean,clip,whatsappLink,formatPhone,monthYear,logoImg,docCss,sheet,documentHtml} from './doc-kit.js';

const t=(v,max)=>esc(clip(v,max));
const has=(a)=>arr(a).length>0;
const str=(x)=>typeof x==='string'?x:JSON.stringify(x);
const dots=(items,max,len=140)=>has(items)?`<ul class="dots">${arr(items).slice(0,max).map(x=>`<li>${t(str(x),len)}</li>`).join('')}</ul>`:'';
const head=(kicker,title)=>`<div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>`;
const filled=(v)=>!!String(v??'').trim();

export function buildProposalDocument(project={},data={},agency={},opts={}){
  const palette=opts.palette||resolvePaletteFrom({color:agency.agencyColor,accent:agency.agencyAccent,palette:agency.agencyPalette});
  const now=opts.now||new Date();
  const client=clean(project.name||'Cliente');
  const provider=clean(agency.agencyName||'Nexus Digital');
  const docName=`Proposta | ${client}`;
  const agencyLogo=agency.agencyLogo||'';
  const inv=data.investment||{};
  const manager=clean(agency.managerName||'');
  const defs=[];
  const add=(title,body,cls='')=>defs.push({title,body,cls});

  const contact=[agency.agencyWhatsapp?formatPhone(agency.agencyWhatsapp):'',clean(agency.agencyEmail)].filter(Boolean).join('  |  ');
  add('Capa',()=>`<div class="top"><div class="logoPlate">${agencyLogo?logoImg(agencyLogo):`<span>${esc(provider)}</span>`}</div></div><div class="mid"><div class="kick">Proposta comercial</div><h1>${esc(clean(data.title)||'Proposta comercial')}</h1><p class="obj">Preparada para ${esc(client)}</p>${project.brandLogo?`<div class="meta" style="margin-top:8mm"><div class="logoPlate" style="min-width:0;min-height:0;padding:3mm 5mm">${logoImg(project.brandLogo)}</div></div>`:''}<div class="meta"><span>${esc(monthYear(now))}</span></div></div><div class="band"><b>${esc(provider)}</b><div>${esc(clean(agency.agencyTagline)||contact)}</div></div>`,'cover');

  if(filled(data.context)||has(data.objectives))
    add('Resumo',()=>`${head('Proposta','Ponto de partida e objetivos')}${filled(data.context)?`<p class="lead">${t(data.context,640)}</p>`:''}${has(data.objectives)?`<h3>O que queremos alcançar</h3><ol class="num">${arr(data.objectives).slice(0,6).map(x=>`<li>${t(str(x),150)}</li>`).join('')}</ol>`:''}`);

  if(has(data.scope)||has(data.deliverables))
    add('Escopo e entregas',()=>`${head('Proposta','Escopo e entregas')}<div class="cols two">${has(data.scope)?`<div><h3>O que está incluído</h3>${dots(data.scope,8,130)}</div>`:''}${has(data.deliverables)?`<div><h3>O que você recebe</h3>${dots(data.deliverables,8,130)}</div>`:''}</div>`);

  if(has(data.process)||filled(data.timeline))
    add('Como vamos trabalhar',()=>`${head('Proposta','Como vamos trabalhar')}${has(data.process)?`<ol class="num">${arr(data.process).slice(0,7).map(x=>`<li>${t(str(x),150)}</li>`).join('')}</ol>`:''}${filled(data.timeline)?`<h3>Prazo</h3><div class="callout soft">${t(data.timeline,260)}</div>`:''}`);

  if(filled(inv.setup)||filled(inv.monthly)||filled(inv.media)||has(data.terms))
    add('Investimento',()=>`${head('Proposta','Investimento')}<div class="rowbox">${filled(inv.setup)?`<div class="box"><h3>Setup</h3><div class="money">${t(inv.setup,30)}</div><span class="small muted">Pagamento único</span></div>`:''}${filled(inv.monthly)?`<div class="box"><h3>Mensalidade</h3><div class="money">${t(inv.monthly,30)}</div><span class="small muted">Gestão e acompanhamento</span></div>`:''}</div>${filled(inv.media)?`<h3>Verba de mídia</h3><div class="callout soft">${t(inv.media,260)}</div>`:''}${has(data.terms)?`<h3>Condições</h3>${dots(data.terms,6,150)}`:''}`);

  if(has(data.providerResponsibilities)||has(data.clientResponsibilities))
    add('Responsabilidades',()=>`${head('Proposta','Responsabilidades')}<div class="cols two">${has(data.providerResponsibilities)?`<div class="box"><h3>${esc(provider)}</h3>${dots(data.providerResponsibilities,7,120)}</div>`:''}${has(data.clientResponsibilities)?`<div class="box"><h3>${esc(client)}</h3>${dots(data.clientResponsibilities,7,120)}</div>`:''}</div>`);

  const link=whatsappLink(agency.agencyWhatsapp,`Oi, recebi a proposta para ${client} e quero conversar`);
  if(filled(data.nextStep)||link||agency.agencyEmail||manager)
    add('Próximo passo',()=>`${head('Proposta','Próximo passo')}${filled(data.nextStep)?`<div class="callout">${t(data.nextStep,260)}</div>`:''}${link?`<a class="wa" href="${esc(link)}">Falar pelo WhatsApp</a><p class="note">${esc(contact)}</p>`:contact?`<p class="note">${esc(contact)}</p>`:''}<h3>Aceite</h3><p class="muted small">Ao assinar, as partes concordam com o escopo, o investimento e as condições desta proposta.</p><div class="sigline"><div>${esc(client)}<br/>Data e assinatura</div><div>${esc(manager||provider)}${manager?`<br/>${esc(provider)}`:''}</div></div>`);

  const pages=defs.map((d,i)=>({no:i+1,title:d.title}));
  const sheets=defs.map((d,i)=>sheet({title:d.title,body:d.body(),docName,num:i+1,logo:agencyLogo,cls:d.cls}));
  return {html:documentHtml({title:docName,css:docCss(palette),sheets}),pages,palette,docName};
}
