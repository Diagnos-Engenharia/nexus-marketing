export function validateGeneration(task,data,project={}){
 if(task==='googleKeywords'){
  for(const [k,n] of [['highIntent',20],['problemAware',10],['negative',10]])if(!Array.isArray(data?.keywords?.[k])||data.keywords[k].length!==n||data.keywords[k].some(x=>typeof x!=='string'||!x.trim()))throw new Error('A IA retornou palavras-chave incompletas. Gere novamente.');
 }
 if(task==='googleAds'){
  for(const [k,n,max] of [['titles',20,30],['descriptions',8,90]])if(!Array.isArray(data?.[k])||data[k].length!==n||data[k].some(x=>typeof x!=='string'||!x.trim()||x.length>max))throw new Error('A IA retornou anúncios fora dos limites de caracteres. Gere novamente.');
  if(!Array.isArray(data?.phraseMatch)||!Array.isArray(data?.exactMatch))throw new Error('A IA não retornou as correspondências de frase e exata.');
 }
 if(task==='content'){
  const list=Array.isArray(data)?data:data?.items;
  const expected=['relacionamento','engajamento','transformacao','interacao','niveis_consciencia','autoridade'];
  if(!Array.isArray(list)||list.length!==6||list.some((x,i)=>x.category!==expected[i]||['title','hook','script','igCaption'].some(k=>typeof x[k]!=='string'||!x[k].trim())))throw new Error('O plano RETINA está incompleto. Gere novamente.');
 }
 if(task==='metaAds'){
  if(!Array.isArray(data?.ads)||data.ads.length!==4||data.ads.some(x=>!x.body||!x.cta||['pergunta','historia','contraintuitiva','segmentada'].some(k=>!x.hooks?.[k])))throw new Error('A IA retornou anúncios Meta incompletos. Gere novamente.');
 }
 if(task==='extraHooks'){
  const norm=(x)=>String(x||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const types=['pergunta','historia','sacada contraintuitiva','segmentado'];
  if(!Array.isArray(data?.videoHooks)||data.videoHooks.length!==10||data.videoHooks.some(h=>!h||typeof h.text!=='string'||!h.text.trim()||!types.some(t=>norm(h.type).includes(t))))throw new Error('A IA retornou os ganchos extras de vídeo incompletos. Gere novamente.');
  if(!Array.isArray(data?.imageHeadlines)||data.imageHeadlines.length!==10||data.imageHeadlines.some(x=>typeof x!=='string'||!x.trim()))throw new Error('A IA retornou as headlines de imagem incompletas. Gere novamente.');
 }
 if(task==='persona'){
  const levels=data?.niveis_consciencia&&typeof data.niveis_consciencia==='object'?Object.keys(data.niveis_consciencia).length:0;
  if(!data||typeof data!=='object'||Array.isArray(data)||!data.nome||(!Array.isArray(data.medos)&&!levels))throw new Error('A persona voltou incompleta. Gere novamente.');
 }
 if(task==='deepDive'){
  if(!data||typeof data!=='object'||Array.isArray(data)||!['dificuldades','desejos','segredos'].some(k=>Array.isArray(data[k])&&data[k].length))throw new Error('O aprofundamento da persona voltou incompleto. Gere novamente.');
 }
 if(task==='specialist'){
  const list=(k)=>Array.isArray(data?.[k])&&data[k].length>0;
  if(!data||typeof data!=='object'||(!list('medos')&&!list('dificuldades_dia_a_dia')))throw new Error('O perfil do especialista voltou incompleto. Gere novamente.');
 }
 if(task==='approach'){
  if(!Array.isArray(data?.approaches)||data.approaches.length!==5)throw new Error('A IA precisa retornar exatamente 5 abordagens de prospecção.');
  if(!Array.isArray(data?.followUps)||data.followUps.length!==4)throw new Error('A IA precisa retornar os 4 follow-ups previstos no método.');
 }
 if(task==='marketingPlan'){
  // O prompt manda omitir blocos sem material em vez de inventar. Só recusamos plano sem capa ou sem nenhum conteúdo.
  if(!data||typeof data!=='object'||Array.isArray(data)||!data.cover||typeof data.cover!=='object')throw new Error('O plano de marketing voltou sem a capa. Gere novamente.');
  const blocks=[
   ['Proposta',!!String(data.proposal?.text||'').trim()],
   ['Canais recomendados',Array.isArray(data.channels)&&data.channels.length>0],
   ['Onde a venda acontece',Array.isArray(data.salesFlow?.steps)&&data.salesFlow.steps.length>0],
   ['Ordem de ativação',Array.isArray(data.activation?.timeline)&&data.activation.timeline.length>0],
   ['Convite final',!!String(data.invitation?.text||'').trim()]
  ];
  if(!blocks.some(([,ok])=>ok))throw new Error('O plano de marketing voltou sem conteúdo. Gere novamente.');
  if(project?.persona){
    if(!data.client||!data.positioning||!Array.isArray(data.awareness)||data.awareness.length<5)throw new Error('Com persona disponível, o plano precisa contemplar cliente, posicionamento e os 5 níveis de consciência.');
  }else if(data.awareness!=null&&!Array.isArray(data.awareness)){
    throw new Error('A seção de consciência do plano precisa ser uma lista.');
  }
  // A tela avisa o que ficou de fora para o usuário completar as informações e gerar de novo.
  const told=Array.isArray(data.omittedSections)?data.omittedSections.filter(x=>typeof x==='string'&&x.trim()):[];
  data.omittedSections=[...told,...blocks.filter(([,ok])=>!ok).map(([name])=>name)];
 }
 return data;
}
