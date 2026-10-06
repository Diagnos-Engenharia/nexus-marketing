import {clean,clip} from './doc-kit.js';

// Os 5 modelos de postagem, sempre nesta ordem. A origem de cada um está no spec (biblioteca de anúncios estáticos).
export const POST_MODELS=[
  {key:'gancho',label:'Gancho em destaque',role:'Para o scroll com a frase do anúncio'},
  {key:'mito',label:'Mito × Realidade',role:'Corrige uma crença comum'},
  {key:'lista',label:'Checklist',role:'Utilidade e autoridade'},
  {key:'recado',label:'Recado do especialista',role:'Conversa direta, tom humano'},
  {key:'convite',label:'Convite direto',role:'Chamada clara para agir'}
];
export const LIMITS={headline:90,support:160,myth:100,truth:160,item:64,cta:32,caption:700,hashtag:30,maxItems:4,maxHashtags:5,maxSets:4};
export const adKey=(i)=>'ad'+(i+1);

const cut=(text,max)=>{const t=clip(text,max);return t.length>max?t.slice(0,max-1)+'…':t};

// Legenda: limpa linha a linha (mantém parágrafos) e corta no limite sem estourar a primeira linha.
function cleanCaption(text,max){
  const lines=String(text??'').split('\n').map(clean);
  const out=[];
  for(const l of lines){if(l||(out.length&&out[out.length-1]))out.push(l)}
  while(out.length&&!out[out.length-1])out.pop();
  let joined=out.join('\n');
  if(joined.length>max){
    const slice=joined.slice(0,max);
    const stop=Math.max(slice.lastIndexOf('\n'),slice.lastIndexOf('. '));
    joined=(stop>max*0.4?slice.slice(0,stop+1):slice.slice(0,slice.lastIndexOf(' ')>0?slice.lastIndexOf(' '):max)).trim();
  }
  return joined;
}
const cleanTag=(t)=>String(t??'').replace(/[^\p{L}\p{N}_]/gu,'').slice(0,LIMITS.hashtag);

export function normalizePosts(data){
  const list=Array.isArray(data?.posts)?data.posts:[];
  const posts=POST_MODELS.map((m,i)=>{
    const p=list[i]||{};
    const out={model:m.key,caption:cleanCaption(p.caption,LIMITS.caption),hashtags:(Array.isArray(p.hashtags)?p.hashtags:[]).map(cleanTag).filter(t=>t.length>=2).slice(0,LIMITS.maxHashtags),cta:cut(p.cta,LIMITS.cta)};
    if(m.key==='mito'){out.myth=cut(p.myth,LIMITS.myth);out.truth=cut(p.truth,LIMITS.truth)}
    else{
      out.headline=cut(p.headline,LIMITS.headline);
      if(m.key==='lista')out.items=(Array.isArray(p.items)?p.items:[]).map(x=>cut(x,LIMITS.item)).filter(Boolean).slice(0,LIMITS.maxItems);
      else out.support=cut(p.support,LIMITS.support);
    }
    return out;
  });
  return {posts};
}

// Nova rodada de 5 postagens do anúncio: a variante alterna (claro/escuro) e só as 4 últimas rodadas ficam.
export function addPostSet(adPosts,key,posts,now=new Date()){
  const cur=adPosts?.[key]||{rounds:0,sets:[]};
  const rounds=(cur.rounds||0)+1;
  const set={id:`${key}-r${rounds}`,round:rounds,at:now.toISOString(),variant:(rounds-1)%2,items:posts};
  return {...(adPosts||{}),[key]:{rounds,sets:[set,...(cur.sets||[])].slice(0,LIMITS.maxSets)}};
}

const slug=(s)=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40).replace(/-+$/,'')||'empresa';
export const postFileName=({company,adIndex,round,n,model})=>`${slug(company)}-anuncio${adIndex+1}-r${round}-${n}-${model}.png`;
