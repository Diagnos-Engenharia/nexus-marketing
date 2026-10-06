// Peças comuns dos documentos em A4 (plano e proposta): texto limpo, WhatsApp, SVG e o CSS das páginas.
// Tudo renderiza sem internet: só fontes do sistema e SVG inline.
export const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
export const arr=(v)=>Array.isArray(v)?v:[];
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
const DASHES=`[${EM}${EN}]`;

// Regra do prompt: nunca travessão, sem emoji. Intervalo numérico (10-15) vira hífen.
export const clean=(v)=>String(v??'')
  .replace(new RegExp(`(\\d)\\s*${DASHES}\\s*(?=\\d)`,'g'),'$1-')
  .replace(new RegExp(`\\s*${DASHES}\\s*`,'g'),', ')
  .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Variation_Selector}\p{Cf}]/gu,'')
  .replace(/\s*,(\s*,)+/g,',')
  .replace(/\s{2,}/g,' ')
  .trim();

// Corta em frase (ou palavra) para o bloco caber na página; nunca estoura o limite.
export function clip(text,max){
  const t=clean(text);if(t.length<=max)return t;
  const cut=t.slice(0,max);
  const s=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('; '));
  if(s>max*0.5)return cut.slice(0,s+1);
  const w=cut.lastIndexOf(' ');
  return cut.slice(0,w>0?w:max).replace(/[,;:\s]+$/,'')+'…';
}

export function wrapLines(text,max){
  const words=clean(text).split(' ').filter(Boolean);const lines=[];let line='';
  for(const w of words){
    if(!line)line=w;else if((line+' '+w).length<=max)line+=' '+w;else{lines.push(line);line=w}
  }
  if(line)lines.push(line);return lines;
}

export const digits=(v)=>String(v||'').replace(/\D/g,'');
export function whatsappLink(number,message=''){
  let d=digits(number);if(!d)return '';
  if(!(d.startsWith('55')&&d.length>=12))d='55'+d.replace(/^0+/,'');
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}
export function formatPhone(number){
  let d=digits(number);if(d.startsWith('55')&&d.length>=12)d=d.slice(2);
  if(d.length===11)return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if(d.length===10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return d;
}

export function monthYear(date=new Date()){
  const t=date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  return t.charAt(0).toUpperCase()+t.slice(1);
}

export const logoImg=(src,cls='')=>src?`<img class="${cls}" src="${esc(src)}" alt="Logo"/>`:'';

// ---------- SVG (texto em tspan, sem fontes externas) ----------
const svgText=(lines,x,y,{size=11,weight=400,fill='#1c2736',anchor='start',lh=1.3}={})=>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i===0?0:size*lh}">${esc(l)}</tspan>`).join('')}</text>`;

// Os cinco momentos do cliente: degraus que sobem, um por estágio.
export function awarenessSvg(stages){
  const items=arr(stages).slice(0,5);const n=items.length||1;const gap=10,w=(700-gap*(n-1))/n;
  const boxes=items.map((s,i)=>{
    const x=i*(w+gap),h=70+i*(150/Math.max(1,n-1)||0)*0.5,y=200-h;
    const lines=wrapLines(s.stage||'',Math.max(10,Math.floor(w/7.2))).slice(0,3);
    return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="8" fill="var(--main)" fill-opacity="${(0.5+0.5*(i/Math.max(1,n-1))).toFixed(2)}"/><circle cx="${(x+18).toFixed(1)}" cy="${(y+18).toFixed(1)}" r="11" fill="var(--accent)"/>${svgText([String(i+1)],x+18,y+22,{size:12,weight:700,fill:'var(--on-accent)',anchor:'middle'})}${svgText(lines,x+10,y+46,{size:11.5,weight:700,fill:'var(--on-main)'})}</g>`;
  }).join('');
  return `<svg viewBox="0 0 700 210" role="img" aria-label="Os cinco momentos do cliente até a contratação">${boxes}</svg>`;
}

// Fluxo do atendimento: etapas numeradas ligadas por uma linha.
export function flowSvg(steps){
  const items=arr(steps).slice(0,6);const rowH=52;const H=Math.max(rowH,items.length*rowH);
  const rows=items.map((s,i)=>{
    const y=i*rowH+26;const lines=wrapLines(s,78).slice(0,2);
    return `<g>${i<items.length-1?`<line x1="22" y1="${y+14}" x2="22" y2="${y+rowH-14}" stroke="var(--accent)" stroke-width="2"/>`:''}<circle cx="22" cy="${y}" r="13" fill="var(--main)"/>${svgText([String(i+1)],22,y+4.5,{size:12,weight:700,fill:'var(--on-main)',anchor:'middle'})}${svgText(lines,50,lines.length>1?y-3:y+4,{size:12.5,fill:'#1c2736'})}</g>`;
  }).join('');
  return `<svg viewBox="0 0 700 ${H}" role="img" aria-label="Fluxo do atendimento">${rows}</svg>`;
}

// Ordem de ativação: linha do tempo com um marco por período e até três ações.
export function timelineSvg(timeline){
  const items=arr(timeline).slice(0,5);const n=items.length||1;const colW=700/n;
  const nodes=items.map((t,i)=>{
    const cx=colW*i+colW/2;const label=wrapLines(t.period||'',Math.max(10,Math.floor(colW/7))).slice(0,2);
    const acts=arr(t.actions).slice(0,3).flatMap(a=>wrapLines(a,Math.max(12,Math.floor(colW/6.2))).slice(0,2).map((l,k)=>k===0?'• '+l:'  '+l)).slice(0,6);
    return `<g><circle cx="${cx.toFixed(1)}" cy="62" r="11" fill="var(--accent)"/>${svgText([String(i+1)],cx,66,{size:11,weight:700,fill:'var(--on-accent)',anchor:'middle'})}${svgText(label,cx,26,{size:12.5,weight:700,fill:'var(--main)',anchor:'middle'})}${svgText(acts,colW*i+10,96,{size:10.5,fill:'#334155'})}</g>`;
  }).join('');
  return `<svg viewBox="0 0 700 220" role="img" aria-label="Ordem sugerida de ativação"><line x1="${(colW/2).toFixed(1)}" y1="62" x2="${(700-colW/2).toFixed(1)}" y2="62" stroke="var(--main)" stroke-opacity=".25" stroke-width="3"/>${nodes}</svg>`;
}

// ---------- Página A4 ----------
export function docCss(p){
  return `
@page{size:A4;margin:0}
*{box-sizing:border-box}
:root{--main:${p.main};--accent:${p.accent};--neutral:${p.neutral};--on-main:${p.onMain};--on-accent:${p.onAccent}}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#dde3ec;font-family:Carlito,Calibri,"DejaVu Sans",Arial,sans-serif;color:#1c2736;font-size:10.5pt;line-height:1.5}
.sheet{width:210mm;height:297mm;margin:8mm auto;background:#fff;position:relative;overflow:hidden;box-shadow:0 6px 30px rgba(15,39,71,.2);break-after:page;page-break-after:always}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none}.sheet:last-child{break-after:auto;page-break-after:auto}}
.pad{position:absolute;left:0;right:0;top:0;bottom:17mm;padding:18mm 17mm 4mm;overflow:hidden}
.foot{position:absolute;left:17mm;right:17mm;bottom:8mm;display:flex;align-items:center;justify-content:space-between;gap:6mm;border-top:.3mm solid #dde3ec;padding-top:2.6mm;font-size:8.5pt;color:#667589}
.foot .l{display:flex;align-items:center;gap:3mm}.foot img{height:6mm;max-width:24mm;object-fit:contain}.foot .n{font-weight:700;color:var(--main)}
h1,h2,h3,h4,p,ul,ol,table{margin:0}
h2{font-size:21pt;line-height:1.15;color:var(--main);margin-bottom:3mm}
h3{font-size:11.5pt;color:var(--main);margin:5mm 0 2mm}
.kicker{font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;color:var(--main);opacity:.7;margin-bottom:2mm;display:flex;align-items:center;gap:2.5mm}
.kicker:before{content:"";width:9mm;height:1.1mm;background:var(--accent);border-radius:1mm}
.lead{font-size:12pt;line-height:1.55;color:#243247;margin-bottom:4mm}
.muted{color:#667589}.small{font-size:9pt}
ul.dots{padding:0;list-style:none}ul.dots li{position:relative;padding-left:5mm;margin-bottom:1.8mm}ul.dots li:before{content:"";position:absolute;left:0;top:2.3mm;width:1.8mm;height:1.8mm;border-radius:50%;background:var(--accent)}
ol.num{padding:0;list-style:none;counter-reset:n}ol.num li{counter-increment:n;position:relative;padding:2mm 0 2mm 9mm;border-bottom:.3mm solid #e4e9f0}ol.num li:before{content:counter(n);position:absolute;left:0;top:2mm;width:6mm;height:6mm;border-radius:50%;background:var(--main);color:var(--on-main);font-size:8.5pt;font-weight:700;text-align:center;line-height:6mm}
.callout{border-left:1.6mm solid var(--accent);background:var(--neutral);padding:5mm 6mm;border-radius:0 3mm 3mm 0;font-size:12.5pt;line-height:1.45;font-weight:700;color:var(--main);margin:4mm 0}
.callout.soft{font-size:10.5pt;font-weight:400;color:#243247}
table.t{width:100%;border-collapse:collapse;font-size:9.6pt;margin:3mm 0}
table.t th{background:var(--neutral);color:var(--main);text-align:left;padding:2.2mm 3mm;font-size:8.2pt;letter-spacing:.06em;text-transform:uppercase}
table.t td{padding:2.3mm 3mm;border-bottom:.3mm solid #e1e7ef;vertical-align:top}
table.t td:first-child{font-weight:700;color:var(--main)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:3mm 0}
.card{background:var(--neutral);border-radius:3mm;padding:4.5mm;break-inside:avoid}
.card .big{font-size:19pt;line-height:1.1;font-weight:700;color:var(--main);margin-bottom:1.5mm;overflow-wrap:anywhere}
.card b{display:block;color:var(--main);margin-bottom:1mm}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.cols.two{grid-template-columns:1fr 1fr}
.pill{display:inline-block;background:var(--neutral);color:var(--main);border-radius:20mm;padding:1.2mm 3.5mm;font-size:8.5pt;font-weight:700}
.persona{display:flex;gap:5mm;align-items:center;background:var(--main);color:var(--on-main);border-radius:4mm;padding:6mm;margin-bottom:4mm}
.persona .av{flex:none;width:17mm;height:17mm;border-radius:50%;background:var(--accent);color:var(--on-accent);font-size:18pt;font-weight:700;display:grid;place-items:center}
.persona h3{color:var(--on-main);margin:0 0 1mm;font-size:14pt}.persona p{opacity:.92}
svg{display:block;width:100%;height:auto;margin:3mm 0;font-family:Carlito,Calibri,"DejaVu Sans",Arial,sans-serif}
.bubble{background:var(--neutral);border-radius:4mm 4mm 4mm 1mm;padding:4mm 5mm;margin:2.5mm 0;max-width:150mm;color:#243247}
.wa{display:inline-block;background:var(--accent);color:var(--on-accent);font-weight:700;font-size:16pt;padding:5mm 13mm;border-radius:20mm;text-decoration:none;margin:4mm 0 2mm}
.note{font-size:8.8pt;color:#667589;margin-top:3mm}
.cover{background:var(--main);color:var(--on-main)}
.cover .band{position:absolute;left:0;right:0;bottom:0;height:46mm;background:var(--accent);color:var(--on-accent);padding:11mm 17mm}
.cover .band b{display:block;font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin-bottom:2mm}.cover .band div{font-size:15pt;font-weight:700;line-height:1.3}
.cover .top{position:absolute;left:17mm;right:17mm;top:22mm}
.cover .logoPlate{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:3.5mm;padding:5mm 8mm;min-width:44mm;min-height:24mm}.cover .logoPlate img{max-width:62mm;max-height:30mm;object-fit:contain}.cover .logoPlate span{color:#243247;font-weight:700;font-size:15pt}
.cover .mid{position:absolute;left:17mm;right:17mm;top:98mm}
.cover .mid .kick{font-size:10pt;letter-spacing:.24em;text-transform:uppercase;opacity:.8;margin-bottom:5mm}
.cover h1{font-size:34pt;line-height:1.06;margin-bottom:6mm;overflow-wrap:anywhere}.cover .obj{font-size:14pt;line-height:1.45;max-width:150mm;opacity:.95}
.cover .meta{margin-top:8mm;display:flex;gap:3mm;flex-wrap:wrap}.cover .meta span{border:.3mm solid rgba(255,255,255,.55);border-radius:20mm;padding:1.5mm 4mm;font-size:9.5pt}
.toc{margin-top:2mm}.toc div{display:flex;gap:3mm;align-items:baseline;padding:1.1mm 0;border-bottom:.3mm dotted #b9c3d1;break-inside:avoid;font-size:9.8pt}.toc span:first-child{flex:1}.toc b{color:var(--main)}.toc.two{columns:2;column-gap:9mm}
.sign{margin-top:8mm}.sign b{font-size:13pt;color:var(--main);display:block}.sign span{color:#667589}
.rowbox{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.box{border:.3mm solid #dde3ec;border-radius:3mm;padding:4.5mm}
.box h3{margin-top:0}
.money{font-size:25pt;line-height:1.1;font-weight:700;color:var(--main);margin:1mm 0 2mm;overflow-wrap:anywhere}
.sigline{margin-top:16mm;display:grid;grid-template-columns:1fr 1fr;gap:12mm}.sigline div{border-top:.3mm solid #8b98ab;padding-top:2mm;font-size:9pt;color:#667589}
`;
}

// Monta uma página. A capa não leva rodapé.
export function sheet({title,body,docName,num,logo='',cls=''}){
  const foot=cls.includes('cover')?'':`<div class="foot"><div class="l">${logo?`<img src="${esc(logo)}" alt="Logo"/>`:''}<span>${esc(docName)}</span></div><span class="n">${num}</span></div>`;
  return `<section class="sheet ${cls}" data-page="${num}" data-title="${esc(title)}">${cls.includes('cover')?body:`<div class="pad">${body}</div>`}${foot}</section>`;
}

export function documentHtml({title,css,sheets,lang='pt-BR'}){
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${sheets.join('')}</body></html>`;
}
