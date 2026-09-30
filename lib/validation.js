export function validateGeneration(task,data){
 if(task==='googleKeywords'){
  for(const [k,n] of [['highIntent',20],['problemAware',10],['negative',10]])if(!Array.isArray(data?.keywords?.[k])||data.keywords[k].length!==n||data.keywords[k].some(x=>typeof x!=='string'||!x.trim()))throw new Error('A IA retornou palavras-chave incompletas. Gere novamente.');
 }
 if(task==='googleAds'){
  for(const [k,n,max] of [['titles',20,30],['descriptions',8,90]])if(!Array.isArray(data?.[k])||data[k].length!==n||data[k].some(x=>typeof x!=='string'||!x.trim()||x.length>max))throw new Error('A IA retornou anúncios fora dos limites de caracteres. Gere novamente.');
 }
 if(task==='content'){
  const list=Array.isArray(data)?data:data?.items;
  const expected=['relacionamento','engajamento','transformacao','interacao','niveis_consciencia','autoridade'];
  if(!Array.isArray(list)||list.length!==6||list.some((x,i)=>x.category!==expected[i]||['title','hook','script','igCaption'].some(k=>typeof x[k]!=='string'||!x[k].trim())))throw new Error('O plano RETINA está incompleto. Gere novamente.');
 }
 if(task==='metaAds'&&(!Array.isArray(data?.ads)||data.ads.length!==4||data.ads.some(x=>!x.body||!x.cta||['pergunta','historia','contraintuitiva','segmentada'].some(k=>!x.hooks?.[k]))))throw new Error('A IA retornou anúncios Meta incompletos. Gere novamente.');
 return data;
}
