'use client';

const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const arr=(v)=>Array.isArray(v)?v:[];
const list=(title,items)=>arr(items).length?`<section><h3>${esc(title)}</h3><ul>${arr(items).map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul></section>`:'';
const rows=(items,render)=>arr(items).map(render).join('');
const logo=(src)=>src?`<img class="clientLogo" src="${esc(src)}" alt="Logo"/>`:'';

function openPrint(title,body,accent='#002e6c'){
  accent=/^#[0-9a-f]{6}$/i.test(String(accent||''))?accent:'#002e6c';
  const w=window.open('','_blank','width=980,height=760');
  if(!w) throw new Error('O navegador bloqueou a janela de exportação. Permita pop-ups para gerar o PDF.');
  const css=`
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box}body{margin:0;color:#172033;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.48}
  .cover{min-height:245mm;display:flex;flex-direction:column;justify-content:space-between;padding:8mm 4mm}
  .brand{font-weight:800;letter-spacing:.14em;color:${accent};font-size:10pt}.clientLogo{max-width:48mm;max-height:24mm;object-fit:contain;margin:8mm 0}
  h1{font-size:27pt;line-height:1.05;margin:5mm 0;color:#10233e}h2{font-size:17pt;margin:8mm 0 4mm;color:${accent};border-bottom:1px solid #dce4ef;padding-bottom:2mm}
  h3{font-size:11pt;margin:5mm 0 2mm;color:#183a63}p{margin:0 0 3mm}ul{margin:2mm 0 4mm;padding-left:5mm}li{margin-bottom:1.6mm}
  .muted{color:#63738a}.meta{display:flex;flex-wrap:wrap;gap:2mm;margin-top:4mm}.tag{border:1px solid #dce4ef;border-radius:20px;padding:1.5mm 3mm;color:#385372}
  .quote{border-left:3px solid ${accent};background:#f3f7fc;padding:4mm;margin:4mm 0;font-weight:700}.page{page-break-before:always;padding-top:2mm}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.box{border:1px solid #dce4ef;border-radius:3mm;padding:4mm;margin-bottom:3mm;break-inside:avoid}
  .box b{display:block;color:#173a64;margin-bottom:1.5mm}.step{display:grid;grid-template-columns:8mm 1fr;gap:3mm;border-top:1px solid #e5eaf1;padding:3mm 0}.step span{width:7mm;height:7mm;border-radius:50%;background:${accent};color:#fff;display:grid;place-items:center;font-size:8pt;font-weight:bold}
  .money{font-size:18pt;font-weight:800;color:${accent}}.footer{margin-top:10mm;border-top:1px solid #dce4ef;padding-top:3mm;color:#6a788c;font-size:9pt}
  .signature{margin-top:10mm}.provider{display:flex;justify-content:space-between;gap:8mm;align-items:flex-start}.provider strong{font-size:14pt;color:${accent}}
  @media print{button{display:none}}
  `;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  w.document.close();
}

export function printMarketingPlan(project,data){
  const accent=project.brandColor||'#002e6c';
  const cover=data.cover||{};
  let body=`<div class="cover"><div><div class="brand">PLANO DE MARKETING</div>${logo(project.brandLogo)}<h1>${esc(cover.company||project.name||'Plano de marketing')}</h1><p class="muted">${esc(cover.objective||project.objective||'')}</p><div class="meta">${[cover.city,cover.period,cover.conversion].filter(Boolean).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div><div class="footer">Documento gerado no Nexus Marketing IA.</div></div>`;
  body+=`<div class="page"><h2>O que este plano propõe</h2><p>${esc(data.proposal?.text||'')}</p>${data.proposal?.communicationPromise?`<div class="quote">${esc(data.proposal.communicationPromise)}</div>`:''}<div class="grid">${rows(data.proposal?.workstreams,(x)=>`<div class="box"><b>${esc(x.channel)}</b><p>${esc(x.audience)}</p><span class="muted">${esc(x.role)}</span></div>`)}</div></div>`;
  if(data.marketContext?.facts?.length||data.marketContext?.practicalNote)body+=`<div class="page"><h2>Contexto de mercado</h2><div class="grid">${rows(data.marketContext?.facts,x=>`<div class="box"><b>${esc(x.value)}</b><p>${esc(x.label)}</p><span class="muted">${esc(x.note)}</span></div>`)}</div><p>${esc(data.marketContext?.practicalNote||'')}</p></div>`;
  body+=`<div class="page"><h2>Quem é o cliente</h2><h3>${esc(data.client?.personaName||'Perfil do cliente')}</h3><p>${esc(data.client?.summary||'')}</p>${list('Medos',data.client?.fears)}${list('Objeções',data.client?.objections)}${list('O que já tentou',data.client?.previousAttempts)}<p class="muted">${esc(data.client?.hypothesisNotice||'')}</p></div>`;
  body+=`<div class="page"><h2>Momentos até a contratação</h2>${rows(data.awareness,(x,i)=>`<div class="step"><span>${i+1}</span><div><b>${esc(x.stage)}</b><p>${esc(x.message)}</p><small class="muted">${esc([x.channel,...arr(x.searches)].filter(Boolean).join(' · '))}</small></div></div>`)}</div>`;
  body+=`<div class="page"><h2>Posicionamento</h2>${list('Compromissos de atendimento',data.positioning?.commitments)}${rows(data.positioning?.fearResponses,x=>`<div class="box"><b>${esc(x.fearOrObjection)}</b><p>${esc(x.response)}</p></div>`)}</div>`;
  body+=`<div class="page"><h2>Canais</h2><div class="grid">${rows(data.channels,x=>`<div class="box"><b>${esc(x.name)}</b><p>${esc(x.summary)}</p>${list('',x.items)}${x.example?`<div class="quote">${esc(x.example)}</div>`:''}</div>`)}</div></div>`;
  body+=`<div class="page"><h2>Onde a venda acontece</h2>${rows(data.salesFlow?.steps,(x,i)=>`<div class="step"><span>${i+1}</span><b>${esc(x)}</b></div>`)}${list('Respostas rápidas',data.salesFlow?.quickReplies)}</div>`;
  body+=`<div class="page"><h2>Ordem de ativação</h2><div class="grid">${rows(data.activation?.timeline,x=>`<div class="box"><b>${esc(x.period)}</b>${list('',x.actions)}</div>`)}</div>${list('Indicadores para acompanhar',data.activation?.indicators)}</div>`;
  body+=`<div class="page"><h2>${esc(data.invitation?.title||'Próximo passo')}</h2><p>${esc(data.invitation?.text||'')}</p>${data.invitation?.whatsappNumber?`<div class="box"><b>WhatsApp</b><div class="money">${esc(data.invitation.whatsappNumber)}</div><p>${esc(data.invitation.whatsappMessage||'')}</p></div>`:''}<div class="signature">${esc(data.invitation?.signature||'')}</div></div>`;
  openPrint(`Plano de Marketing - ${project.name||'Projeto'}`,body,accent);
}

export function printProposal(project,data,agency={}){
  const accent=agency.agencyColor||'#002e6c';
  const provider=agency.agencyName||'Nexus Digital';
  let body=`<div class="cover"><div><div class="provider"><div><div class="brand">${esc(provider)}</div><h1>${esc(data.title||'Proposta comercial')}</h1><p class="muted">Preparada para ${esc(project.name||'')}</p></div><div><strong>${esc(provider)}</strong><p class="muted">${esc(agency.agencyTagline||'')}</p></div></div></div><div class="footer">${esc([agency.managerName,agency.agencyEmail,agency.agencyWhatsapp].filter(Boolean).join(' · '))}</div></div>`;
  body+=`<div class="page"><h2>Contexto</h2><p>${esc(data.context||'')}</p>${list('Objetivos',data.objectives)}${list('Escopo',data.scope)}${list('Entregáveis',data.deliverables)}</div>`;
  body+=`<div class="page"><h2>Como vamos trabalhar</h2>${list('Processo',data.process)}<h3>Prazo</h3><p>${esc(data.timeline||'')}</p><div class="grid"><div class="box"><b>Setup</b><div class="money">${esc(data.investment?.setup||'')}</div></div><div class="box"><b>Mensalidade</b><div class="money">${esc(data.investment?.monthly||'')}</div></div></div><div class="box"><b>Verba de mídia</b><p>${esc(data.investment?.media||'')}</p></div></div>`;
  body+=`<div class="page"><h2>Responsabilidades</h2><div class="grid"><div class="box">${list('Nexus',data.providerResponsibilities)}</div><div class="box">${list('Cliente',data.clientResponsibilities)}</div></div>${list('Condições',data.terms)}<div class="quote">${esc(data.nextStep||'')}</div><div class="signature"><strong>${esc(provider)}</strong><br/><span class="muted">${esc(agency.managerName||'')}</span></div></div>`;
  openPrint(`Proposta - ${project.name||'Projeto'}`,body,accent);
}
