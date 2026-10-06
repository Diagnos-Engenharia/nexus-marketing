import test from 'node:test';
import assert from 'node:assert/strict';
import {paletteFromPixels,DEFAULT_PALETTE,readableOn,luminance,parseHex} from '../lib/palette.js';
import {clean,clip,whatsappLink,formatPhone,wrapLines} from '../lib/doc-kit.js';

const px=(parts)=>{ // parts: [[r,g,b,a,count],...]
  const out=[];for(const [r,g,b,a,n] of parts)for(let i=0;i<n;i++)out.push(r,g,b,a);return out;
};

test('paleta: logo azul-marinho e laranja vira principal escura e destaque laranja',()=>{
  const pal=paletteFromPixels(px([[11,42,91,255,600],[242,140,15,255,300],[255,255,255,255,500],[0,0,0,0,200]]));
  assert.ok(luminance(pal.main)<0.3,'principal escura');
  const [r,g,b]=parseHex(pal.accent);assert.ok(r>200&&g>100&&b<80,'destaque laranja '+pal.accent);
  assert.match(pal.neutral,/^#[0-9a-f]{6}$/);assert.ok(luminance(pal.neutral)>0.8,'neutro claro');
  assert.equal(pal.source,'logo');
});

test('paleta: logo de uma cor só combina com cinza-azulado escuro',()=>{
  const pal=paletteFromPixels(px([[200,30,40,255,800],[255,255,255,255,400]]));
  assert.equal(pal.main,'#27364b');
  const [r,g,b]=parseHex(pal.accent);assert.ok(r>150&&g<80&&b<90,'destaque é a cor da logo '+pal.accent);
});

test('paleta: sem pixels úteis usa azul-marinho, âmbar e cinza claro',()=>{
  assert.deepEqual(paletteFromPixels([]),DEFAULT_PALETTE);
  assert.deepEqual(paletteFromPixels(px([[255,255,255,255,100],[0,0,0,0,100]])),DEFAULT_PALETTE);
});

test('paleta: principal sempre escura o bastante para texto branco e cor do texto legível',()=>{
  const pal=paletteFromPixels(px([[250,220,60,255,700],[40,90,200,255,200]]));
  assert.ok(luminance(pal.main)<=0.3,'principal '+pal.main+' lum '+luminance(pal.main));
  assert.equal(readableOn('#0f2747'),'#ffffff');assert.equal(readableOn('#f6c343'),'#10233e');
});

test('clean: remove travessão e emoji sem estragar intervalos numéricos',()=>{
  const em=String.fromCharCode(0x2014),en=String.fromCharCode(0x2013);
  assert.equal(clean(`Plano ${em} simples`),'Plano, simples');
  assert.equal(clean(`de 10${en}15 dias`),'de 10-15 dias');
  assert.equal(clean(`Olá ${String.fromCodePoint(0x1F680)} mundo`),'Olá mundo');
  assert.equal(clean(null),'');
  assert.ok(!/[–—]/.test(clean(`a${em}b${en}c`)));
});

test('clip: corta em frase ou palavra sem passar do limite',()=>{
  assert.equal(clip('Curto.',50),'Curto.');
  const t='Primeira frase completa. Segunda frase um pouco maior que o restante do limite.';
  assert.equal(clip(t,40),'Primeira frase completa.');
  assert.ok(clip('palavra '.repeat(40),30).length<=31);
});

test('whatsapp: normaliza número e monta o link com mensagem',()=>{
  assert.equal(whatsappLink('(15) 99999-1234','Oi, quero conversar'),'https://wa.me/5515999991234?text=Oi%2C%20quero%20conversar');
  assert.equal(whatsappLink('5515999991234','x'),'https://wa.me/5515999991234?text=x');
  assert.equal(whatsappLink('','x'),'');
  assert.equal(formatPhone('5515999991234'),'(15) 99999-1234');
  assert.equal(formatPhone('1534441234'),'(15) 3444-1234');
});

test('wrapLines quebra por palavras no limite de caracteres',()=>{
  assert.deepEqual(wrapLines('uma frase razoavelmente longa para quebrar',16),['uma frase','razoavelmente','longa para','quebrar']);
  assert.deepEqual(wrapLines('',10),[]);
});

import {buildPlanDocument} from '../lib/plan-document.js';

const kw=(n,t)=>Array.from({length:n},(_,i)=>`${t} ${i+1}`);
const richPlan=()=>({
  cover:{title:'Plano de marketing',company:'Acme Vistorias',objective:'Receber pedidos de orçamento de síndicos de Sorocaba pelo WhatsApp.',city:'Sorocaba/SP',period:'90 dias',conversion:'Pedido de orçamento pelo WhatsApp'},
  proposal:{text:'Este plano organiza como a empresa aparece para quem já procura vistoria e para quem ainda não sabe que precisa dela.',communicationPromise:'Laudo claro, prazo combinado e atendimento direto.',workstreams:[{channel:'Google Ads',audience:'Quem já procura',role:'Captar buscas com intenção'},{channel:'Meta Ads',audience:'Síndicos sem urgência',role:'Despertar interesse'},{channel:'Conteúdo orgânico',audience:'Quem acompanha o perfil',role:'Mostrar como o diagnóstico é feito'}]},
  marketContext:{facts:[{label:'Condomínios na região',value:'1.200',note:'Estimativa da pesquisa'},{label:'Prédios com mais de 20 anos',value:'38%',note:'Sem fonte oficial'}],practicalNote:'Use esses números para explicar por que a vistoria preventiva compensa.'},
  client:{personaName:'Rafael, síndico',summary:'Síndico profissional com doze anos de experiência, pressionado por fissuras recorrentes.',obstacle:'Não sabe em quem confiar para o diagnóstico.',fears:kw(5,'Medo'),objections:kw(5,'Objeção'),previousAttempts:kw(3,'Tentativa'),hypothesisNotice:'Hipótese de comportamento, não estatística.'},
  awareness:['Totalmente inconsciente','Consciente do problema','Consciente da solução','Consciente do produto','Totalmente consciente'].map((stage,i)=>({stage,message:'Mensagem '+(i+1),channel:i<2?'Meta Ads':'Google Ads',searches:i>1?['vistoria predial sorocaba']:[]})),
  positioning:{commitments:kw(4,'Compromisso'),fearResponses:[{fearOrObjection:'Medo de pagar duas vezes',response:'O laudo já traz a causa e a solução.'},{fearOrObjection:'Prazo longo',response:'Prazo combinado antes de começar.'}]},
  channels:[{name:'Google Ads',summary:'Capta quem pesquisa agora.',items:kw(4,'Passo google'),example:'Exemplo de busca.'},{name:'Meta Ads',summary:'Desperta interesse.',items:kw(3,'Passo meta'),example:'Exemplo de anúncio.'},{name:'Conteúdo orgânico',summary:'Mostra autoridade.',items:kw(3,'Passo conteúdo'),example:''}],
  salesFlow:{steps:kw(5,'Etapa do atendimento'),quickReplies:['Olá! Posso ajudar com a vistoria?','Segue o resumo do que combinamos.']},
  activation:{timeline:[{period:'Semana 1',actions:['Configurar acompanhamento']},{period:'Semanas 2 e 3',actions:['Ativar Google Ads','Publicar o primeiro conteúdo']},{period:'Semana 4',actions:['Ativar Meta Ads']}],indicators:kw(6,'Indicador')},
  invitation:{title:'Se quiser conversar sobre isso',text:'Este plano é da empresa e pode ser aplicado sem ajuda. Se quiser conversar sobre o material, é só chamar.',whatsappNumber:'15999991234',whatsappMessage:'Oi, recebi o plano de marketing e quero marcar uma conversa',signature:'Ana Souza, gestora de tráfego'},
  sendSeparately:['Roteiros completos','Textos de anúncio'],omittedSections:[]
});
const richProject=()=>({name:'Acme Vistorias',location:'Sorocaba/SP',brandLogo:'data:image/png;base64,AAAA',brandPalette:{main:'#0b2a5b',accent:'#f28c0f'},aiInputs:{signerName:'Ana Souza',signerWhatsapp:'15999991234'},
  googleAds:{keywords:{highIntent:kw(20,'vistoria predial'),problemAware:kw(10,'fissura'),negative:kw(10,'grátis')},selected:kw(5,'vistoria predial'),titles:kw(20,'Título Google'),descriptions:kw(8,'Descrição Google')},
  metaAds:{ads:[1,2,3,4].map(i=>({angle:'Ângulo '+i,hooks:{pergunta:'Pergunta do gancho '+i,historia:'h',contraintuitiva:'c',segmentada:'s'},body:'Corpo do anúncio '+i,cta:'CTA '+i}))},
  content:{items:['relacionamento','engajamento','transformacao','interacao','niveis_consciencia','autoridade'].map((c,i)=>({category:c,title:'Peça '+(i+1),format:'Reels',hook:'Gancho '+i,script:'Roteiro completo da peça '+i}))}});
const NOW=new Date(2026,9,6);
const textOf=(html)=>html.replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ');

test('plano: documento completo respeita o limite de 12 páginas, com capa primeiro e convite por último',()=>{
  const d=buildPlanDocument(richProject(),richPlan(),{now:NOW});
  assert.ok(d.pages.length>=9&&d.pages.length<=12,'páginas '+d.pages.length);
  assert.equal(d.pages[0].title,'Capa');assert.equal(d.pages.at(-1).title,'Convite');
  assert.equal((d.html.match(/<section class="sheet/g)||[]).length,d.pages.length);
});

test('plano: logo na capa e em miniatura no rodapé, cores da marca aplicadas',()=>{
  const d=buildPlanDocument(richProject(),richPlan(),{now:NOW});
  const cover=d.html.slice(d.html.indexOf('class="sheet cover"'),d.html.indexOf('data-page="2"'));
  assert.match(cover,/<img class="" src="data:image\/png;base64,AAAA"/);
  assert.ok((d.html.match(/<div class="foot">[^]*?<img/g)||[]).length>=1);
  assert.match(d.html,/--main:#0b2a5b/);assert.match(d.html,/--accent:#f28c0f/);
});

test('plano: sumário aponta para as páginas certas',()=>{
  const d=buildPlanDocument(richProject(),richPlan(),{now:NOW});
  const toc=[...d.html.matchAll(/<div class="toc[^"]*">([^]*?)<\/div><\/div>/g)][0]?.[1]||'';
  const entries=[...toc.matchAll(/<span>([^<]+)<\/span><b>(\d+)<\/b>/g)].map(m=>({title:m[1].replace(/&amp;/g,'&'),no:Number(m[2])}));
  assert.ok(entries.length>=8,'entradas '+entries.length);
  for(const e of entries)assert.equal(d.pages.find(p=>p.no===e.no)?.title,e.title,'sumário '+e.title);
});

test('plano: convite com botão do WhatsApp, número escrito e assinatura',()=>{
  const d=buildPlanDocument(richProject(),richPlan(),{now:NOW});
  assert.match(d.html,/href="https:\/\/wa\.me\/5515999991234\?text=Oi%2C%20recebi%20o%20plano%20de%20marketing/);
  assert.match(d.html,/Chamar no WhatsApp/);assert.match(textOf(d.html),/\(15\) 99999-1234/);
  assert.match(textOf(d.html),/Ana Souza, gestora de tráfego/);
});

test('plano: sem travessão, sem emoji e sem clichês, mesmo com texto sujo vindo do modelo',()=>{
  const em=String.fromCharCode(0x2014),en=String.fromCharCode(0x2013);
  const plan=richPlan();plan.proposal.text=`Plano ${em} direto ${String.fromCodePoint(0x1F680)} e simples, de 10${en}15 dias.`;
  const d=buildPlanDocument(richProject(),plan,{now:NOW});
  assert.ok(!d.html.includes(em)&&!d.html.includes(en));
  assert.ok(!/\p{Extended_Pictographic}/u.test(d.html));
  assert.match(textOf(d.html),/Plano, direto e simples, de 10-15 dias/);
  const banned=['jornada','pilares','insights','estratégic','crucial','transformação','desbloquear','alavancar','mergulhar','cenário atual','vamos juntos','excelência'];
  const t=textOf(d.html).toLowerCase();
  for(const w of banned)assert.ok(!t.includes(w),'clichê no texto fixo: '+w);
});

test('plano: canais usam o material do projeto com seleção (8 títulos, 1 anúncio completo, tabela de peças)',()=>{
  const d=buildPlanDocument(richProject(),richPlan(),{now:NOW});
  const t=textOf(d.html);
  assert.ok(t.includes('Título Google 8')&&!t.includes('Título Google 9'),'8 títulos');
  assert.ok(t.includes('vistoria predial 5'));
  assert.ok(t.includes('Ângulo 4')&&t.includes('Corpo do anúncio 1')&&!t.includes('Corpo do anúncio 2'),'1 anúncio completo');
  assert.ok(t.includes('Peça 6')&&t.includes('Roteiro completo da peça 0'),'peças e 1 roteiro');
  assert.match(t,/material completo/i);
});

test('plano: pouco material gera documento curto, sem páginas vazias nem "undefined"',()=>{
  const sparse={cover:{company:'Acme'},proposal:{text:'Proposta enxuta.'},channels:[],salesFlow:{steps:[]},activation:{timeline:[]},invitation:{text:''}};
  const d=buildPlanDocument({name:'Acme'},sparse,{now:NOW});
  assert.deepEqual(d.pages.map(p=>p.title),['Capa','O que este plano propõe']);
  assert.ok(!/undefined|null|\[object/.test(d.html));
  const none=buildPlanDocument({name:'Acme'},{cover:{company:'Acme'}},{now:NOW});
  assert.deepEqual(none.pages.map(p=>p.title),['Capa']);
});

test('plano: mais de três canais viram no máximo três páginas de canal e o total não passa de 12',()=>{
  const plan=richPlan();plan.channels=Array.from({length:7},(_,i)=>({name:'Canal '+i,summary:'Resumo '+i,items:['a','b'],example:'x'}));
  const d=buildPlanDocument(richProject(),plan,{now:NOW});
  assert.ok(d.pages.length<=12,'páginas '+d.pages.length);
  assert.ok(d.pages.some(p=>p.title==='Outros canais'));
  assert.ok(d.pages.filter(p=>p.kind==='canal').length<=3);
});

test('plano: data em português e logo ausente usa o nome na capa',()=>{
  const p=richProject();delete p.brandLogo;
  const d=buildPlanDocument(p,richPlan(),{now:NOW});
  assert.match(textOf(d.html),/Outubro de 2026/);
  assert.match(d.html,/<div class="logoPlate"><span>Acme Vistorias<\/span>/);
});


import {buildProposalDocument} from '../lib/proposal-document.js';

const proposal=()=>({title:'Proposta de gestão de tráfego',context:'A empresa recebe pedidos por indicação e quer previsibilidade na captação de orçamentos.',objectives:['Gerar pedidos de orçamento pelo WhatsApp','Organizar o acompanhamento dos contatos'],scope:['Configuração das contas de anúncio','Criação dos anúncios de pesquisa','Relatório mensal'],deliverables:['Estrutura das campanhas','Textos dos anúncios','Painel de acompanhamento'],process:['Reunião de alinhamento','Configuração','Ativação','Revisão mensal'],timeline:'Primeiros anúncios no ar em até 15 dias úteis após o aceite.',investment:{setup:'R$ 600',monthly:'R$ 1.800',media:'Verba de mídia paga direto pelo cliente às plataformas.'},clientResponsibilities:['Enviar acessos','Responder contatos em até um dia'],providerResponsibilities:['Gerir as campanhas','Enviar o relatório'],terms:['Contrato mensal com renovação automática','Cancelamento com aviso prévio de 30 dias'],nextStep:'Responda por aqui para marcarmos a reunião de alinhamento.'});
const agency={agencyName:'Nexus Digital',agencyTagline:'Marketing digital para engenheiros',agencyColor:'#002e6c',agencyAccent:'#f28c0f',agencyEmail:'contato@nexus.com.br',agencyWhatsapp:'15999990000',managerName:'Ana Souza',managerSpecialty:'Gestora de tráfego',agencyLogo:'data:image/png;base64,BBBB'};

test('proposta: valores comerciais aparecem exatamente como informados, em destaque',()=>{
  const d=buildProposalDocument({name:'Acme Vistorias',brandLogo:'data:image/png;base64,AAAA'},proposal(),agency,{now:NOW});
  const t=textOf(d.html);
  for(const v of ['R$ 600','R$ 1.800','Verba de mídia paga direto pelo cliente às plataformas.'])assert.ok(t.includes(v),v);
  assert.ok(d.pages.some(p=>p.title==='Investimento'));
  assert.match(d.html,/class="money"/);
});

test('proposta: logo da agência e do cliente na capa, cores da agência, contato clicável',()=>{
  const d=buildProposalDocument({name:'Acme Vistorias',brandLogo:'data:image/png;base64,AAAA'},proposal(),agency,{now:NOW});
  const cover=d.html.slice(d.html.indexOf('class="sheet cover"'),d.html.indexOf('data-page="2"'));
  assert.ok(cover.includes('base64,BBBB')&&cover.includes('base64,AAAA'));
  assert.match(d.html,/--main:#002e6c/);assert.match(d.html,/--accent:#f28c0f/);
  assert.match(d.html,/href="https:\/\/wa\.me\/5515999990000\?text=/);
  assert.match(textOf(d.html),/Ana Souza/);assert.match(textOf(d.html),/Preparada para Acme Vistorias/);
});

test('proposta: estrutura enxuta, aceite com linhas de assinatura e texto sem travessão, emoji ou clichê',()=>{
  const em=String.fromCharCode(0x2014);const p=proposal();p.context=`Contexto ${em} claro ${String.fromCodePoint(0x1F680)}`;
  const d=buildProposalDocument({name:'Acme'},p,agency,{now:NOW});
  assert.ok(d.pages.length>=5&&d.pages.length<=8,'páginas '+d.pages.length);
  assert.equal(d.pages.at(-1).title,'Próximo passo');
  assert.match(d.html,/class="sigline"/);
  assert.ok(!d.html.includes(em)&&!/\p{Extended_Pictographic}/u.test(d.html));
  const t=textOf(d.html).toLowerCase();
  for(const w of ['jornada','pilares','insights','estratégic','crucial','transformação','alavancar','vamos juntos','excelência'])assert.ok(!t.includes(w),'clichê: '+w);
});

test('proposta: seções sem material são removidas e nada vira "undefined"',()=>{
  const d=buildProposalDocument({name:'Acme'},{title:'Proposta',investment:{setup:'R$ 600',monthly:'',media:''}},{agencyName:'Nexus Digital'},{now:NOW});
  assert.ok(!/undefined|null|\[object/.test(d.html));
  assert.deepEqual(d.pages.map(p=>p.title),['Capa','Investimento']);
  assert.ok(!d.html.includes('wa.me'));
});
