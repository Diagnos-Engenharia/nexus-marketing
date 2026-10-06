'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {resolvePalette} from '../lib/palette.js';
import {buildPost,drawCommands,makeMeasure,FONT_STACK} from '../lib/post-render.js';
import {POST_MODELS,LIMITS,adKey,postFileName,slug} from '../lib/posts.js';
import {makeZip} from '../lib/zip.js';
import {EngineErrorBanner} from './engine-ui';

type Brand={name:string;palette:any;logo:HTMLImageElement|null;aspect:number|null;fonts:any};

// Identidade do cliente: cores da marca, logo carregada e a fonte do próprio app.
function useBrand(p:any):Brand&{key:string}{
  const palette=useMemo(()=>resolvePalette(p),[p.brandColor,p.brandAccent,p.brandPalette]);
  const [logo,setLogo]=useState<HTMLImageElement|null>(null);
  const [fontTick,setFontTick]=useState(0);
  useEffect(()=>{
    let live=true;
    if(!p.brandLogo){setLogo(null);return}
    const img=new Image();img.onload=()=>{if(live)setLogo(img)};img.onerror=()=>{if(live)setLogo(null)};img.src=p.brandLogo;
    return()=>{live=false};
  },[p.brandLogo]);
  useEffect(()=>{document.fonts?.ready.then(()=>setFontTick(t=>t+1))},[]);
  const fonts=useMemo(()=>({...FONT_STACK,sans:getComputedStyle(document.body).fontFamily||FONT_STACK.sans}),[fontTick]);
  const aspect=logo&&logo.naturalWidth>0&&logo.naturalHeight>0?logo.naturalWidth/logo.naturalHeight:null;
  return {name:p.name||'Empresa',palette,logo:aspect?logo:null,aspect,fonts,key:`${fontTick}|${p.brandLogo?.length||0}|${palette.main}|${palette.accent}|${aspect}`};
}

function paint(canvas:HTMLCanvasElement,post:any,variant:number,format:string,b:Brand,scale:number){
  const measure=makeMeasure(document.createElement('canvas').getContext('2d')!,b.fonts);
  const built=buildPost({post,brand:{name:b.name,palette:b.palette,logoAspect:b.aspect},format,variant,measure});
  canvas.width=Math.round(built.width*scale);canvas.height=Math.round(built.height*scale);
  drawCommands(canvas.getContext('2d')!,built.commands,{scale,logo:b.logo,fonts:b.fonts});
}

function PostCanvas({post,variant,format,brand,brandKey}:{post:any;variant:number;format:string;brand:Brand;brandKey:string}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{if(ref.current)paint(ref.current,post,variant,format,brand,0.5)},[post,variant,format,brandKey]);
  return <canvas ref={ref} role="img" aria-label={post.headline||post.myth||'Postagem'}/>;
}

const time=(iso:string)=>{try{return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}catch{return ''}};
const captionText=(post:any)=>[post.caption,(post.hashtags||[]).map((h:string)=>'#'+h).join(' ')].filter(Boolean).join('\n\n');

export function PostStudio({p,adIndex,error,onClose,onGenerate,onSettings,onDismissError}:{p:any;adIndex:number;error:any;onClose:()=>void;onGenerate:()=>void;onSettings:()=>void;onDismissError:()=>void}){
  const ad=(p.metaAds?.ads||[])[adIndex]||{};
  const sets:any[]=p.metaAds?.adPosts?.[adKey(adIndex)]?.sets||[];
  const items=sets.flatMap(set=>(set.items||[]).map((post:any,i:number)=>({id:`${set.id}:${i}`,set,post,i})));
  const [format,setFormat]=useState('4:5');
  const [sel,setSel]=useState<string[]>([]);
  const [notice,setNotice]=useState('');
  const [working,setWorking]=useState(false);
  const brand=useBrand(p);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose]);
  useEffect(()=>{setSel(s=>s.filter(id=>items.some(x=>x.id===id)))},[sets.length]);

  const toggle=(id:string)=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const blobOf=(post:any,set:any)=>new Promise<Blob>((res,rej)=>{
    const c=document.createElement('canvas');paint(c,post,set.variant,format,brand,1);
    c.toBlob(b=>b?res(b):rej(new Error('png')),'image/png');
  });
  const save=(blob:Blob,name:string)=>{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
  const nameOf=(x:any)=>postFileName({company:p.name,adIndex,round:x.set.round,n:x.i+1,model:x.post.model});
  const downloadOne=async(x:any)=>{
    try{setWorking(true);save(await blobOf(x.post,x.set),nameOf(x));setNotice('Imagem baixada.')}
    catch{setNotice('Não foi possível gerar a imagem. Tente de novo.')}finally{setWorking(false)}
  };
  const downloadSelected=async()=>{
    const chosen=items.filter(x=>sel.includes(x.id));
    if(!chosen.length)return;
    if(chosen.length===1)return downloadOne(chosen[0]);
    try{
      setWorking(true);setNotice('Preparando as imagens...');
      const files=[];
      for(const x of chosen)files.push({name:nameOf(x),data:new Uint8Array(await (await blobOf(x.post,x.set)).arrayBuffer())});
      save(new Blob([makeZip(files)],{type:'application/zip'}),`${slug(p.name)}-anuncio${adIndex+1}-postagens.zip`);
      setNotice(`${chosen.length} imagens baixadas em um ZIP.`);
    }catch{setNotice('Não foi possível gerar as imagens. Tente de novo.')}finally{setWorking(false)}
  };
  const copyCaption=async(post:any)=>{try{await navigator.clipboard.writeText(captionText(post));setNotice('Legenda copiada.')}catch{setNotice('Não foi possível copiar. Abra a legenda e copie à mão.')}};

  const pal=brand.palette;
  const allSelected=items.length>0&&sel.length===items.length;
  return <div className="studioOverlay" onClick={onClose}>
    <div className="studio" role="dialog" aria-modal="true" aria-label={`Postagens do anúncio ${adIndex+1}`} onClick={e=>e.stopPropagation()}>
      <header className="studioHead"><div><small>POSTAGENS · ANÚNCIO {adIndex+1}</small><h3>{ad.angle||'Anúncio'}</h3></div><button className="secondary" onClick={onClose}>Fechar</button></header>
      {error&&<EngineErrorBanner error={error} onRetry={onGenerate} onSettings={onSettings} onDismiss={onDismissError}/>}
      <div className="studioIdentity">
        <div className="studioLogo">{p.brandLogo?<img src={p.brandLogo} alt="Logo do cliente"/>:<span>{brand.name}</span>}</div>
        <div className="studioSwatches" aria-label="Cores da marca"><i style={{background:pal.main}}/><i style={{background:pal.accent}}/><i style={{background:pal.neutral}}/></div>
        <p>{p.brandLogo?'As postagens usam a logo e as cores da marca.':'Sem logo: as postagens usam o nome da empresa e as cores '+(p.brandColor?'escolhidas':'padrão')+'. Envie a logo em Empresa e especialista para aplicar a marca.'}</p>
      </div>
      <div className="studioBar">
        <div className="studioSeg" role="group" aria-label="Formato da imagem">
          <button aria-pressed={format==='4:5'} onClick={()=>setFormat('4:5')}>Feed 4:5</button>
          <button aria-pressed={format==='1:1'} onClick={()=>setFormat('1:1')}>Quadrado 1:1</button>
        </div>
        <div className="studioActions">
          {items.length>0&&<button className="secondary" onClick={()=>setSel(allSelected?[]:items.map(x=>x.id))}>{allSelected?'Limpar seleção':'Selecionar todas'}</button>}
          {items.length>0&&<button className="secondary" disabled={!sel.length||working} onClick={downloadSelected}>{sel.length>1?`Baixar ${sel.length} selecionadas (ZIP)`:sel.length===1?'Baixar selecionada':'Baixar selecionadas'}</button>}
          <button className="primary" onClick={onGenerate}>✦ {items.length?'Gerar outros 5':'Gerar 5 postagens'}</button>
        </div>
      </div>
      <p className="studioNote" role="status">{notice||(items.length?`${sel.length} de ${items.length} selecionadas. Cada geração usa a IA e conta nos tokens do projeto; o desenho da imagem é feito no seu navegador.`:'')}</p>
      {!items.length&&<div className="studioEmpty"><h4>Nenhuma postagem para este anúncio ainda</h4><p>O Nexus cria 5 postagens diferentes a partir do anúncio e da identidade visual da empresa. Cada uma pode ser baixada como imagem.</p></div>}
      {sets.map((set,si)=><section key={set.id}>
        <h4 className="studioRound">Rodada {set.round} · {time(set.at)}{si===0?' · mais recente':''}</h4>
        <div className="postGrid">{(set.items||[]).map((post:any,i:number)=>{
          const id=`${set.id}:${i}`,m=POST_MODELS.find(x=>x.key===post.model),checked=sel.includes(id);
          return <article key={id} className={`postCard${checked?' on':''}`}>
            <label className="postPick"><input type="checkbox" checked={checked} onChange={()=>toggle(id)}/><span>Selecionar</span></label>
            <div className="postModel"><b>{m?.label||post.model}</b><small>{m?.role}</small></div>
            <div className="postCanvas" onClick={()=>toggle(id)}><PostCanvas post={post} variant={set.variant} format={format} brand={brand} brandKey={brand.key}/></div>
            <div className="buttonRow"><button className="primary" disabled={working} onClick={()=>downloadOne({id,set,post,i})}>Baixar PNG</button><button className="secondary" onClick={()=>copyCaption(post)}>Copiar legenda</button></div>
            <details><summary>Legenda e hashtags</summary><p className="postCaption">{post.caption}</p>{post.hashtags?.length>0&&<p className="postTags">{post.hashtags.map((h:string)=>'#'+h).join(' ')}</p>}</details>
          </article>;
        })}</div>
      </section>)}
      {sets.length>=LIMITS.maxSets&&<p className="studioNote">Guardamos as {LIMITS.maxSets} últimas rodadas ({LIMITS.maxSets*5} postagens) deste anúncio. Ao gerar outras, a mais antiga sai.</p>}
    </div>
  </div>;
}
