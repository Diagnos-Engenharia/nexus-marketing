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
 if(task==='approach'){
  if(!Array.isArray(data?.approaches)||data.approaches.length!==5)throw new Error('A IA precisa retornar exatamente 5 abordagens de prospecção.');
  if(!Array.isArray(data?.followUps)||data.followUps.length!==4)throw new Error('A IA precisa retornar os 4 follow-ups previstos no método.');
 }
 if(task==='marketingPlan'){
  const required=['cover','proposal','channels','salesFlow','activation','invitation'];
  if(!data||required.some(k=>!data[k]))throw new Error('O plano de marketing voltou incompleto. Gere novamente.');
  if(!Array.isArray(data.channels)||!data.channels.length)throw new Error('O plano precisa indicar os canais recomendados.');
  if(project?.persona){
    if(!data.client||!data.positioning||!Array.isArray(data.awareness)||data.awareness.length<5)throw new Error('Com persona disponível, o plano precisa contemplar cliente, posicionamento e os 5 níveis de consciência.');
  }else if(data.awareness!=null&&!Array.isArray(data.awareness)){
    throw new Error('A seção de consciência do plano precisa ser uma lista.');
  }
 }
 return data;
}
