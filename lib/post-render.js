// Postagem como lista de comandos de desenho: pura e testável em Node (a medida do texto é injetada).
// No navegador, drawCommands executa a lista num canvas, na pré-visualização (escala 0.5) e no download (1080 px).
import {clean} from './doc-kit.js';
import {mixHex,contrastRatio,luminance} from './palette.js';

export const FORMATS={
  '4:5':{width:1080,height:1350,margin:84,cta:96,h1:92},
  '1:1':{width:1080,height:1080,margin:72,cta:88,h1:84}
};
const NAVY='#10233e';
const WHITE='#ffffff';

// ---------- texto ----------
function wrap(text,size,{maxWidth,weight,family,measure}){
  const m=(s)=>measure(s,{size,weight,family});
  const lines=[];let line='',broken=false;
  for(const w of text.split(/\s+/).filter(Boolean)){
    if(m(w)>maxWidth){
      // palavra maior que a linha: quebra por caractere
      broken=true;if(line){lines.push(line);line=''}
      let chunk='';
      for(const ch of w){if(chunk&&m(chunk+ch)>maxWidth){lines.push(chunk);chunk=ch}else chunk+=ch}
      line=chunk;continue;
    }
    const next=line?line+' '+w:w;
    if(m(next)<=maxWidth)line=next;else{lines.push(line);line=w}
  }
  if(line)lines.push(line);
  return {lines,broken};
}

// Maior fonte em que o texto cabe; sem quebrar palavra no meio se der; senão corta com reticências no tamanho mínimo.
export function fitText({text,maxWidth,maxHeight,maxSize,minSize,lineHeight=1.18,weight=700,family='sans',measure}){
  const t=clean(text);
  if(!t)return {lines:[],size:maxSize,height:0,truncated:false};
  const opts={maxWidth,weight,family,measure};
  for(const allowBreak of [false,true])for(let size=maxSize;size>=minSize;size-=2){
    const {lines,broken}=wrap(t,size,opts);
    if(broken&&!allowBreak)continue;
    const height=lines.length*size*lineHeight;
    if(height<=maxHeight)return {lines,size,height,truncated:false};
  }
  const size=minSize;
  const kept=wrap(t,size,opts).lines.slice(0,Math.max(1,Math.floor(maxHeight/(size*lineHeight))));
  let last=kept[kept.length-1];
  while(last.length>1&&measure(last+'…',{size,weight,family})>maxWidth)last=last.slice(0,-1).trimEnd();
  kept[kept.length-1]=last.replace(/[\s,.;:]+$/,'')+'…';
  return {lines:kept,size,height:kept.length*size*lineHeight,truncated:true};
}

// Cor de texto que passa de 4,5:1 sobre todos os fundos possíveis (fundo liso ou ponta do gradiente).
function legibleAll(fg,bgs){
  const ok=(c)=>bgs.every(b=>contrastRatio(c,b)>=4.5);
  if(ok(fg))return fg;
  const options=[NAVY,WHITE,'#000000'];
  return options.find(ok)||options.sort((a,b)=>Math.min(...bgs.map(x=>contrastRatio(b,x)))-Math.min(...bgs.map(x=>contrastRatio(a,x))))[0];
}

// ---------- montagem ----------
export function buildPost({post,brand,format='4:5',variant=0,measure}){
  const fmt=FORMATS[format]||FORMATS['4:5'];
  const W=fmt.width,H=fmt.height,M=fmt.margin;
  const pal=brand.palette;
  const cmds=[];
  const deep=luminance(pal.main)>0.4?mixHex(pal.main,WHITE,0.3):mixHex(pal.main,'#000000',0.35);
  const ink=legibleAll(pal.main,[pal.neutral]);
  const SC={
    dark:{name:'dark',bg:{grad:[pal.main,deep]},bgs:[pal.main,deep],fg:legibleAll(pal.onMain,[pal.main,deep])},
    light:{name:'light',bg:pal.neutral,bgs:[pal.neutral],fg:ink}
  };
  const rect=(x,y,w,h,fill,o={})=>cmds.push({t:'rect',x,y,w,h,r:o.r||0,fill,alpha:o.alpha??1,stroke:o.stroke||null,sw:o.sw||0});
  const circle=(cx,cy,r,fill,alpha)=>cmds.push({t:'circle',cx,cy,r,fill,alpha});
  const block=(text,o)=>{const lh=o.lh||1.18;const f=fitText({text,maxWidth:o.maxWidth,maxHeight:Math.max(o.maxHeight,o.minSize*lh),maxSize:o.maxSize,minSize:o.minSize,lineHeight:lh,weight:o.weight,family:o.family,measure});return {...f,lh,weight:o.weight,family:o.family||'sans'}};
  const draw=(b,x,yTop,{color,bgs,align='left',part,deco=false})=>{
    b.lines.forEach((s,i)=>{
      const w=measure(s,{size:b.size,weight:b.weight,family:b.family});
      const y=yTop+(i+0.5)*b.size*b.lh;
      const x0=align==='left'?x:align==='center'?x-w/2:x-w;
      cmds.push({t:'text',text:s,x,y,size:b.size,weight:b.weight,family:b.family,color,bg:bgs,align,part,deco,x0,x1:x0+w,y0:y-b.size*b.lh/2,y1:y+b.size*b.lh/2});
    });
    return yTop+b.height;
  };
  const accentOk=(bgs)=>bgs.every(b=>contrastRatio(pal.accent,b)>=1.6);
  // Botão e rótulos: destaque da marca quando ele aparece no fundo; senão a cor do texto.
  const accentPill=(S)=>accentOk(S.bgs)?{fill:pal.accent,text:legibleAll(pal.onAccent,[pal.accent])}:{fill:S.fg,text:legibleAll(S.bgs[0],[S.fg])};
  const mainPill=(S)=>S.name==='dark'?accentPill(S):(contrastRatio(pal.main,S.bgs[0])>=1.6?{fill:pal.main,text:legibleAll(pal.onMain,[pal.main])}:{fill:ink,text:legibleAll(S.bgs[0],[ink])});

  function pill(text,x,y,{h,maxSize,minSize=22,colors,maxW,align='left',part,weight=800}){
    const pad=Math.round(h*0.5);
    const b=block(text,{maxWidth:maxW-2*pad,maxHeight:h,maxSize,minSize,weight,lh:1.1});
    const textW=Math.max(0,...b.lines.map(s=>measure(s,{size:b.size,weight,family:'sans'})));
    const w=Math.min(maxW,textW+2*pad);
    const px=align==='right'?x-w:align==='center'?x-w/2:x;
    rect(px,y,w,h,colors.fill,{r:h/2});
    draw(b,px+w/2,y+(h-b.height)/2,{color:colors.text,bgs:[colors.fill],align:'center',part});
    return {x:px,y,w,h};
  }
  // Logo em plaquinha branca (qualquer logo fica legível) ou, sem logo, o nome da empresa.
  function mark(S,{x=M,y=M,right=false,maxW=W-2*M}={}){
    const chipH=76;
    if(brand.logoAspect>0){
      const pad=24,w=Math.min(300,52*brand.logoAspect),h=w/brand.logoAspect,cw=w+2*pad;
      const cx=right?W-M-cw:x;
      rect(cx,y,cw,chipH,WHITE,{r:20,stroke:S.name==='light'?'#0f274726':null,sw:2});
      cmds.push({t:'logo',x:cx+pad,y:y+(chipH-h)/2,w,h});
      return {bottom:y+chipH,w:cw};
    }
    const b=block(brand.name||'',{maxWidth:maxW,maxHeight:chipH,maxSize:38,minSize:24,weight:800,lh:1.1});
    draw(b,right?W-M:x,y+(chipH-b.height)/2,{color:S.fg,bgs:S.bgs,align:right?'right':'left',part:'brand'});
    return {bottom:y+chipH,w:Math.max(0,...b.lines.map(s=>measure(s,{size:b.size,weight:800,family:'sans'})))};
  }
  const ctaTop=post.cta?H-M-fmt.cta:H-M;
  const ctaPill=(S,colors)=>{if(post.cta)pill(post.cta,M,ctaTop,{h:fmt.cta,maxSize:38,minSize:26,colors,maxW:W-2*M,part:'cta'})};
  const fullBg=(S)=>rect(0,0,W,H,S.bg);
  const out={width:W,height:H,commands:cmds,issues:[]};

  // 1. Gancho em destaque
  function gancho(){
    const S=variant%2===0?SC.dark:SC.light,dark=S.name==='dark';
    fullBg(S);
    circle(W-100,300,340,dark?pal.accent:pal.main,dark?0.16:0.06);
    circle(-60,H-240,230,dark?WHITE:pal.main,dark?0.06:0.05);
    const hd=mark(S);
    const top=hd.bottom+40,bottom=ctaTop-48,zone=bottom-top;
    const support=post.support?block(post.support,{maxWidth:W-2*M,maxHeight:Math.min(zone*0.34,200),maxSize:38,minSize:26,weight:500,lh:1.32}):null;
    const used=10+36+(support?32+support.height:0);
    const h1=block(post.headline,{maxWidth:W-2*M,maxHeight:zone-used,maxSize:fmt.h1,minSize:46,weight:800,lh:1.12});
    const total=used+h1.height;
    let y=top+Math.max(0,(zone-total)/2);
    const bar=accentOk(S.bgs)?pal.accent:S.fg;
    rect(M,y,96,10,bar,{r:5});y+=46;
    y=draw(h1,M,y,{color:S.fg,bgs:S.bgs,part:'headline'});
    if(support)draw(support,M,y+32,{color:S.fg,bgs:S.bgs,part:'support'});
    ctaPill(S,dark?accentPill(S):mainPill(S));
  }

  // 2. Mito × Realidade: duas zonas, o mito riscado em cima e a realidade embaixo
  function mito(){
    const swap=variant%2===1;
    const T=swap?SC.dark:SC.light,B=swap?SC.light:SC.dark;
    const split=Math.round(H*0.44);out.split=split;
    rect(0,0,W,H,T.bg);rect(0,split,W,H-split,B.bg);
    circle(W-60,split,200,pal.accent,0.14);
    pill('MITO',M,M,{h:48,maxSize:26,colors:{fill:T.fg,text:legibleAll(T.bgs[0],[T.fg])},maxW:W-2*M,part:'label'});
    const myth=block(post.myth,{maxWidth:W-2*M,maxHeight:split-40-(M+76),maxSize:62,minSize:34,weight:800,lh:1.18});
    const my=M+76;
    draw(myth,M,my,{color:T.fg,bgs:T.bgs,part:'myth'});
    const strike=accentOk(T.bgs)?pal.accent:T.fg;
    cmds.filter(c=>c.t==='text'&&c.part==='myth').forEach(c=>cmds.push({t:'line',x1:c.x0,y1:c.y+c.size*0.06,x2:c.x1,y2:c.y+c.size*0.06,color:strike,sw:6,alpha:0.95}));
    const row=split+44;
    const lab=pill('REALIDADE',M,row+14,{h:48,maxSize:26,colors:accentPill(B),maxW:W-2*M-340,part:'label'});
    mark(B,{y:row,right:true,maxW:W-2*M-lab.w-32});
    const truth=block(post.truth,{maxWidth:W-2*M,maxHeight:ctaTop-36-(row+76+32),maxSize:60,minSize:34,weight:700,lh:1.2});
    draw(truth,M,row+76+32,{color:B.fg,bgs:B.bgs,part:'truth'});
    ctaPill(B,B.name==='dark'?accentPill(B):mainPill(B));
  }

  // 3. Checklist: título e 3 ou 4 itens em cartões
  function lista(){
    const S=variant%2===0?SC.light:SC.dark,dark=S.name==='dark';
    fullBg(S);
    circle(W-80,H*0.2,260,dark?pal.accent:pal.main,dark?0.12:0.05);
    const hd=mark(S);
    const lab=pill('CHECKLIST',M,hd.bottom+34,{h:48,maxSize:26,colors:accentPill(S),maxW:W-2*M,part:'label'});
    const top=lab.y+lab.h+26;
    const items=(post.items||[]).slice(0,4);
    const itemsBottom=ctaTop-40;
    const rowGap=16,n=Math.max(items.length,1);
    const minRow=104;
    const h1=block(post.headline,{maxWidth:W-2*M,maxHeight:Math.min(220,itemsBottom-top-n*minRow-(n-1)*rowGap-30),maxSize:62,minSize:36,weight:800,lh:1.14});
    let y=draw(h1,M,top,{color:S.fg,bgs:S.bgs,part:'headline'})+30;
    const rowH=Math.min(150,(itemsBottom-y-(n-1)*rowGap)/n);
    const innerX=M+30+52+22,innerW=W-M-innerX-30;
    const sizeBox=items.map(t=>block(t,{maxWidth:innerW,maxHeight:rowH-28,maxSize:40,minSize:26,weight:600,lh:1.2}));
    const size=Math.min(...sizeBox.map(b=>b.size),40);
    items.forEach((t,i)=>{
      const b=block(t,{maxWidth:innerW,maxHeight:rowH-28,maxSize:size,minSize:size,weight:600,lh:1.2});
      const ry=y+i*(rowH+rowGap);
      rect(M,ry,W-2*M,rowH,dark?WHITE:WHITE,{r:26,alpha:dark?0.1:1,stroke:dark?null:'#0f274226',sw:2});
      const rowBg=dark?S.bgs:[WHITE];
      const col=dark?S.fg:legibleAll(ink,[WHITE]);
      const cc=accentOk(dark?S.bgs:[WHITE])?pal.accent:ink;
      cmds.push({t:'check',cx:M+30+26,cy:ry+rowH/2,r:26,fill:cc,color:legibleAll(pal.onAccent,[cc])});
      draw(b,innerX,ry+(rowH-b.height)/2,{color:col,bgs:dark?[mixHex(pal.main,WHITE,0.1)]:rowBg,part:'item'});
    });
    ctaPill(S,dark?accentPill(S):mainPill(S));
  }

  // 4. Recado do especialista: cartão de conversa, tom humano
  function recado(){
    const S=variant%2===0?SC.dark:SC.light,dark=S.name==='dark';
    fullBg(S);
    circle(W-80,260,300,dark?pal.accent:pal.main,dark?0.14:0.05);
    const hd=mark(S);
    const zTop=hd.bottom+44,zBottom=ctaTop-44,zone=zBottom-zTop;
    const pad=56,innerW=W-2*M-2*pad;
    const ink2=legibleAll(pal.main,[WHITE]);
    const body=legibleAll(mixHex(ink2,WHITE,0.2),[WHITE]);
    const quoteH=84,sig=60;
    const h1=block(post.headline,{maxWidth:innerW,maxHeight:Math.min(190,zone*0.3),maxSize:58,minSize:36,weight:700,family:'serif',lh:1.16});
    const room=zone-2*pad-quoteH-h1.height-sig-48;
    const support=post.support?block(post.support,{maxWidth:innerW,maxHeight:room,maxSize:40,minSize:28,weight:500,lh:1.4}):null;
    const content=quoteH+h1.height+(support?24+support.height:0)+48+sig;
    const cardH=Math.min(zone,content+2*pad);
    const cy=zTop+(zone-cardH)/2;
    rect(M,cy,W-2*M,cardH,WHITE,{r:30});
    let y=cy+pad;
    const g=block('“',{maxWidth:200,maxHeight:200,maxSize:150,minSize:150,weight:800,family:'serif',lh:0.7});
    draw(g,M+pad,y-6,{color:accentOk([WHITE])?pal.accent:ink2,bgs:[WHITE],deco:true,part:'quote'});
    y+=quoteH;
    y=draw(h1,M+pad,y,{color:ink2,bgs:[WHITE],part:'headline'});
    if(support)y=draw(support,M+pad,y+24,{color:body,bgs:[WHITE],part:'support'});
    rect(M+pad,y+36,56,6,accentOk([WHITE])?pal.accent:ink2,{r:3});
    const nm=block(brand.name||'',{maxWidth:innerW,maxHeight:36,maxSize:30,minSize:22,weight:800,lh:1.1});
    draw(nm,M+pad,y+52,{color:ink2,bgs:[WHITE],part:'signature'});
    ctaPill(S,dark?accentPill(S):mainPill(S));
  }

  // 5. Convite direto: pergunta clara e botão grande
  function convite(){
    const S=variant%2===0?SC.light:SC.dark,dark=S.name==='dark';
    fullBg(S);
    rect(0,0,W,22,accentOk(S.bgs)?pal.accent:S.fg);
    circle(W-90,H-300,300,dark?pal.accent:pal.main,dark?0.14:0.05);
    const hd=mark(S,{y:M+14});
    const btnH=Math.round(fmt.cta*1.35);
    const btnY=post.cta?H-M-btnH:H-M;
    const top=hd.bottom+40,bottom=btnY-48,zone=bottom-top;
    const support=post.support?block(post.support,{maxWidth:W-2*M,maxHeight:Math.min(zone*0.34,210),maxSize:38,minSize:26,weight:500,lh:1.34}):null;
    const used=support?36+support.height:0;
    const h1=block(post.headline,{maxWidth:W-2*M,maxHeight:zone-used,maxSize:fmt.h1-6,minSize:46,weight:800,lh:1.12});
    const y0=top+Math.max(0,(zone-(h1.height+used))/2);
    const y1=draw(h1,M,y0,{color:S.fg,bgs:S.bgs,part:'headline'});
    if(support)draw(support,M,y1+36,{color:S.fg,bgs:S.bgs,part:'support'});
    if(post.cta){
      const colors=dark?accentPill(S):mainPill(S);
      rect(M,btnY,W-2*M,btnH,colors.fill,{r:btnH/2.4});
      const b=block(post.cta+'  →',{maxWidth:W-2*M-80,maxHeight:btnH-24,maxSize:46,minSize:28,weight:800,lh:1.1});
      draw(b,W/2,btnY+(btnH-b.height)/2,{color:colors.text,bgs:[colors.fill],align:'center',part:'cta'});
    }
  }

  ({gancho,mito,lista,recado,convite}[post.model]||gancho)();
  return out;
}

// ---------- canvas (navegador) ----------
export const FONT_STACK={sans:'Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif',serif:'Georgia, "Times New Roman", serif'};
export const makeMeasure=(ctx,fonts=FONT_STACK)=>(text,{size,weight,family='sans'})=>{ctx.font=`${weight} ${size}px ${fonts[family]||fonts.sans}`;return ctx.measureText(text).width};

function roundPath(ctx,x,y,w,h,r){
  r=Math.max(0,Math.min(r,w/2,h/2));
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function paint(ctx,fill,box){
  if(typeof fill==='string')return fill;
  const g=ctx.createLinearGradient(box.x,box.y,box.x+box.w,box.y+box.h);
  g.addColorStop(0,fill.grad[0]);g.addColorStop(1,fill.grad[1]);return g;
}
export function drawCommands(ctx,commands,{scale=1,logo=null,fonts=FONT_STACK}={}){
  ctx.save();ctx.scale(scale,scale);
  for(const c of commands){
    ctx.globalAlpha=c.alpha??1;
    if(c.t==='rect'){
      roundPath(ctx,c.x,c.y,c.w,c.h,c.r||0);ctx.fillStyle=paint(ctx,c.fill,c);ctx.fill();
      if(c.stroke){ctx.globalAlpha=1;ctx.strokeStyle=c.stroke;ctx.lineWidth=c.sw||1;ctx.stroke()}
    }else if(c.t==='circle'){
      ctx.beginPath();ctx.arc(c.cx,c.cy,c.r,0,Math.PI*2);ctx.fillStyle=c.fill;ctx.fill();
    }else if(c.t==='line'){
      ctx.beginPath();ctx.moveTo(c.x1,c.y1);ctx.lineTo(c.x2,c.y2);ctx.strokeStyle=c.color;ctx.lineWidth=c.sw;ctx.lineCap='round';ctx.stroke();
    }else if(c.t==='check'){
      ctx.beginPath();ctx.arc(c.cx,c.cy,c.r,0,Math.PI*2);ctx.fillStyle=c.fill;ctx.fill();
      ctx.beginPath();ctx.moveTo(c.cx-c.r*0.42,c.cy+c.r*0.02);ctx.lineTo(c.cx-c.r*0.1,c.cy+c.r*0.34);ctx.lineTo(c.cx+c.r*0.44,c.cy-c.r*0.3);
      ctx.strokeStyle=c.color;ctx.lineWidth=c.r*0.24;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    }else if(c.t==='logo'){
      if(logo)ctx.drawImage(logo,c.x,c.y,c.w,c.h);
    }else if(c.t==='text'){
      ctx.font=`${c.weight} ${c.size}px ${fonts[c.family]||fonts.sans}`;
      ctx.textAlign=c.align;ctx.textBaseline='middle';ctx.fillStyle=c.color;ctx.fillText(c.text,c.x,c.y);
    }
  }
  ctx.restore();
}
