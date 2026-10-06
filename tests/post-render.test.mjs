import test from 'node:test';
import assert from 'node:assert/strict';
import {fitText,buildPost,drawCommands,FORMATS} from '../lib/post-render.js';
import {resolvePaletteFrom,contrastRatio} from '../lib/palette.js';
import {POST_MODELS} from '../lib/posts.js';

// Medida falsa: largura proporcional ao tamanho. Dá para testar o layout sem navegador.
const measure=(text,{size})=>String(text).length*size*0.55;

const PALETTES={
  escura:resolvePaletteFrom({color:'#0f2747',accent:'#d98a0b'}),
  clara:resolvePaletteFrom({color:'#f2d640',accent:'#ffe680'}),
  igual:resolvePaletteFrom({color:'#1b5e20',accent:'#1b5e20'})
};
const SENT='Conferir o imóvel antes de aceitar as chaves evita gastos que aparecem só depois da mudança. ';
const TEXTS={
  curto:(m)=>base(m,'Oi','Ok'),
  normal:(m)=>base(m,'Receio de descobrir o problema tarde demais','Uma vistoria ajuda a enxergar antes de decidir'),
  enorme:(m)=>base(m,SENT.repeat(4),SENT.repeat(5)),
  palavra:(m)=>base(m,'A'.repeat(140),'B'.repeat(160))
};
function base(model,a,b){
  if(model==='mito')return {model,myth:a,truth:b,cta:'Falar com a equipe agora pelo WhatsApp',caption:'x',hashtags:[]};
  if(model==='lista')return {model,headline:a,items:[b,b,'Itens curtos','Mais um item de checagem'],cta:'Agendar vistoria',caption:'x',hashtags:[]};
  return {model,headline:a,support:b,cta:'Pedir orçamento',caption:'x',hashtags:[]};
}
const LOGOS=[null,3,10,0.4];

function boxesOverlap(a,b){return a.x0<b.x1-1&&b.x0<a.x1-1&&a.y0<b.y1-1&&b.y0<a.y1-1}

test('fitText: cabe sem reduzir, reduz a fonte, quebra palavra gigante e corta com reticências',()=>{
  const small=fitText({text:'Olá mundo',maxWidth:900,maxHeight:200,maxSize:80,minSize:40,measure});
  assert.equal(small.size,80);assert.deepEqual(small.lines,['Olá mundo']);assert.equal(small.truncated,false);
  const mid=fitText({text:'palavra '.repeat(12).trim(),maxWidth:600,maxHeight:260,maxSize:80,minSize:30,measure});
  assert.ok(mid.size<80&&mid.height<=260);assert.equal(mid.truncated,false);
  const giant=fitText({text:'A'.repeat(200),maxWidth:500,maxHeight:300,maxSize:60,minSize:30,measure});
  assert.ok(giant.lines.every(l=>measure(l,{size:giant.size})<=500));assert.ok(giant.height<=300);
  const cut=fitText({text:'texto longo '.repeat(100),maxWidth:400,maxHeight:120,maxSize:40,minSize:30,measure});
  assert.equal(cut.truncated,true);assert.ok(cut.height<=120);assert.ok(cut.lines.at(-1).endsWith('…'));
  assert.ok(cut.lines.every(l=>measure(l,{size:cut.size})<=400));
});

test('fitText: texto vazio devolve zero linhas',()=>{
  const e=fitText({text:'   ',maxWidth:500,maxHeight:100,maxSize:40,minSize:20,measure});
  assert.deepEqual(e.lines,[]);assert.equal(e.height,0);
});

for(const [fmtKey,fmt] of Object.entries(FORMATS)){
  test(`layout ${fmtKey}: nada estoura, sobrepõe ou perde contraste (modelos × variantes × paletas × textos × logos)`,()=>{
    let n=0;
    for(const m of POST_MODELS)for(const variant of [0,1])for(const [pn,palette] of Object.entries(PALETTES))for(const [tn,make] of Object.entries(TEXTS))for(const logoAspect of LOGOS){
      const tag=`${m.key}/v${variant}/${pn}/${tn}/logo${logoAspect}`;
      const r=buildPost({post:make(m.key),brand:{name:'Diagnos Engenharia',palette,logoAspect},format:fmtKey,variant,measure});
      n++;
      assert.equal(r.width,fmt.width,tag);assert.equal(r.height,fmt.height,tag);
      assert.equal(r.commands[0].t,'rect',tag);
      assert.equal(r.commands[0].w,fmt.width,tag);assert.equal(r.commands[0].h,fmt.height,tag);
      const texts=r.commands.filter(c=>c.t==='text');
      assert.ok(texts.length>=3,tag+' pouco texto');
      for(const t of texts){
        assert.ok(t.size>=22,`${tag} fonte ${t.size}`);
        assert.ok(t.x0>=fmt.margin-1&&t.x1<=fmt.width-fmt.margin+1,`${tag} horizontal ${t.x0}-${t.x1} "${t.text.slice(0,20)}"`);
        assert.ok(t.y0>=0&&t.y1<=fmt.height-fmt.margin+1,`${tag} vertical ${t.y0}-${t.y1}`);
        if(!t.deco)for(const bg of t.bg)assert.ok(contrastRatio(t.color,bg)>=4.5,`${tag} contraste ${t.color} sobre ${bg} = ${contrastRatio(t.color,bg).toFixed(2)}`);
      }
      const solid=texts.filter(t=>!t.deco);
      for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)assert.ok(!boxesOverlap(solid[i],solid[j]),`${tag} sobreposição "${solid[i].text.slice(0,15)}" x "${solid[j].text.slice(0,15)}"`);
      for(const l of r.commands.filter(c=>c.t==='logo'))assert.ok(l.w>0&&l.h>0&&l.x>=fmt.margin-1&&l.x+l.w<=fmt.width-fmt.margin+1,`${tag} logo`);
      if(m.key==='mito'){
        for(const t of texts.filter(t=>t.part==='myth'))assert.ok(t.y1<=r.split+1,`${tag} mito invade a realidade`);
        for(const t of texts.filter(t=>t.part==='truth'||t.part==='cta'))assert.ok(t.y0>=r.split-1,`${tag} realidade sobe no mito`);
      }
    }
    assert.equal(n,5*2*3*4*4);
  });
}

test('sem logo usa o nome da empresa; com logo desenha a plaquinha e o comando de logo',()=>{
  const post={model:'gancho',headline:'Receio',support:'Apoio',cta:'Pedir orçamento',caption:'x',hashtags:[]};
  const brand={name:'Diagnos Engenharia',palette:PALETTES.escura};
  const sem=buildPost({post,brand:{...brand,logoAspect:null},format:'4:5',variant:0,measure});
  assert.ok(sem.commands.some(c=>c.t==='text'&&c.text==='Diagnos Engenharia'));
  assert.ok(!sem.commands.some(c=>c.t==='logo'));
  const com=buildPost({post,brand:{...brand,logoAspect:3},format:'4:5',variant:0,measure});
  assert.equal(com.commands.filter(c=>c.t==='logo').length,1);
  assert.ok(!com.commands.some(c=>c.t==='text'&&c.text==='Diagnos Engenharia'));
});

test('variante 1 inverte claro e escuro',()=>{
  const post={model:'gancho',headline:'Receio',support:'Apoio',cta:'Pedir',caption:'x',hashtags:[]};
  const brand={name:'X',palette:PALETTES.escura,logoAspect:null};
  const a=buildPost({post,brand,format:'4:5',variant:0,measure}).commands[0].fill;
  const b=buildPost({post,brand,format:'4:5',variant:1,measure}).commands[0].fill;
  assert.notDeepEqual(a,b);
});

test('a lista de desenho é só dados e não tem travessão nem emoji',()=>{
  const r=buildPost({post:TEXTS.normal('lista'),brand:{name:'Diagnos',palette:PALETTES.escura,logoAspect:3},format:'1:1',variant:0,measure});
  assert.doesNotThrow(()=>JSON.stringify(r.commands));
  const all=r.commands.filter(c=>c.t==='text').map(c=>c.text).join(' ');
  assert.ok(!/[–—]/.test(all));
});

test('drawCommands executa todos os tipos de comando sem erro e respeita a escala',()=>{
  const calls=[];
  const ctx=new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):k==='createLinearGradient'?()=>({addColorStop(){}}):(...a)=>{calls.push([k,a])},set:(t,k,v)=>{calls.push(['set:'+k,v]);return true}});
  const r=buildPost({post:TEXTS.normal('lista'),brand:{name:'D',palette:PALETTES.escura,logoAspect:3},format:'4:5',variant:0,measure});
  drawCommands(ctx,r.commands,{scale:0.5,logo:{}});
  assert.ok(calls.some(c=>c[0]==='scale'&&c[1][0]===0.5));
  assert.ok(calls.some(c=>c[0]==='fillText'));
  assert.ok(calls.some(c=>c[0]==='drawImage'));
});
