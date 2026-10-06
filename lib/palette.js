// Cores da marca a partir da logo: conta os pixels de verdade, como pede o prompt do plano.
// Principal (escura, para títulos e fundos), destaque (faixas, ícones, botão) e neutro claro (caixas).
const clamp=(n)=>Math.max(0,Math.min(255,Math.round(n)));
export const hex=(rgb)=>'#'+rgb.map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
export const parseHex=(h)=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(h||'').trim());return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)):null};
const chan=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
const lumRgb=([r,g,b])=>0.2126*chan(r)+0.7152*chan(g)+0.0722*chan(b);
export const luminance=(h)=>{const c=parseHex(h);return c?lumRgb(c):0};
export const readableOn=(bg)=>luminance(bg)>0.4?'#10233e':'#ffffff';
const sat=([r,g,b])=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mx===0?0:(mx-mn)/mx};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
export const neutralFor=(mainHex)=>hex(mix(parseHex(mainHex)||[15,39,71],[255,255,255],0.93));
export const DEFAULT_PALETTE={main:'#0f2747',accent:'#d98a0b',neutral:'#eef2f7',source:'default'};
const SLATE='#27364b';

export function paletteFromPixels(rgba){
  const buckets=new Map();let counted=0;
  for(let i=0;i+3<rgba.length;i+=4){
    const r=rgba[i],g=rgba[i+1],b=rgba[i+2],a=rgba[i+3];
    if(a<128||(r>235&&g>235&&b>235))continue;
    const key=((r>>4)<<8)|((g>>4)<<4)|(b>>4);
    const e=buckets.get(key)||{n:0,r:0,g:0,b:0};e.n++;e.r+=r;e.g+=g;e.b+=b;buckets.set(key,e);counted++;
  }
  if(!counted)return {...DEFAULT_PALETTE};
  const colors=[...buckets.values()].map(e=>({n:e.n,rgb:[e.r/e.n,e.g/e.n,e.b/e.n]})).sort((x,y)=>y.n-x.n);
  const groups=[];
  for(const c of colors){
    const g=groups.find(g=>dist(g.rgb,c.rgb)<48);
    if(g){const t=g.n+c.n;g.rgb=g.rgb.map((v,i)=>(v*g.n+c.rgb[i]*c.n)/t);g.n=t}else groups.push({n:c.n,rgb:[...c.rgb]});
  }
  groups.sort((x,y)=>y.n-x.n);
  const significant=groups.filter(g=>g.n/counted>=0.04);
  const sig=significant.length?significant:[groups[0]];
  let main,accent;
  if(sig.length===1){
    accent=hex(sig[0].rgb);main=SLATE;
  }else{
    const darkest=[...sig].sort((a,b)=>lumRgb(a.rgb)-lumRgb(b.rgb))[0];
    const mainC=sig.find(c=>lumRgb(c.rgb)<0.3)||darkest;
    const accentC=sig.filter(c=>c!==mainC&&dist(c.rgb,mainC.rgb)>70).sort((a,b)=>sat(b.rgb)*Math.sqrt(b.n)-sat(a.rgb)*Math.sqrt(a.n))[0];
    main=hex(lumRgb(mainC.rgb)>0.3?mix(mainC.rgb,[0,0,0],0.4):mainC.rgb);
    accent=accentC?hex(accentC.rgb):DEFAULT_PALETTE.accent;
  }
  return {main,accent,neutral:neutralFor(main),source:'logo'};
}

// Só no navegador: lê a imagem e devolve a paleta. Falha de leitura (SVG sem tamanho, CORS) cai na paleta padrão.
export async function paletteFromImage(src,size=64){
  if(typeof document==='undefined'||!src)return {...DEFAULT_PALETTE};
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
    const w=img.naturalWidth||size,h=img.naturalHeight||size,k=Math.min(1,size/Math.max(w,h));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);
    return paletteFromPixels(ctx.getImageData(0,0,c.width,c.height).data);
  }catch{return {...DEFAULT_PALETTE}}
}

// Paleta efetiva: cor escolhida à mão vale mais que a extraída da logo.
export function resolvePaletteFrom({color,accent,palette}={}){
  const stored=palette||{};
  const pick=(v)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():null;
  const main=pick(color)||pick(stored.main)||DEFAULT_PALETTE.main;
  const acc=pick(accent)||pick(stored.accent)||DEFAULT_PALETTE.accent;
  return {main,accent:acc,neutral:neutralFor(main),onMain:readableOn(main),onAccent:readableOn(acc)};
}
export const resolvePalette=(project={})=>resolvePaletteFrom({color:project.brandColor,accent:project.brandAccent,palette:project.brandPalette});

// Mistura e contraste para os criativos: texto sempre legível sobre o fundo escolhido.
export const mixHex=(a,b,t)=>hex(mix(parseHex(a)||[0,0,0],parseHex(b)||[255,255,255],t));
export const contrastRatio=(fg,bg)=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
export function legible(fg,bg,min=4.5){
  if(contrastRatio(fg,bg)>=min)return fg;
  const options=['#10233e','#ffffff','#000000'];
  return options.find(c=>contrastRatio(c,bg)>=min)||options.sort((x,y)=>contrastRatio(y,bg)-contrastRatio(x,bg))[0];
}
