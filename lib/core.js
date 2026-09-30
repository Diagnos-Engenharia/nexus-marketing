export const MATRIX = {
  descoberta: {
    micro: { google: 30, meta: 70, campaigns: ['Meta | Descoberta', 'Meta | Remarketing', 'Google | Marca'] },
    medio: { google: 25, meta: 75, campaigns: ['Meta | Descoberta', 'Meta | Prova', 'Meta | Remarketing', 'Google | Marca'] },
    alto: { google: 20, meta: 80, campaigns: ['Meta | Descoberta', 'Meta | Prova', 'Meta | Remarketing', 'Meta | Escala', 'Google | Marca'] }
  },
  busca: {
    micro: { google: 80, meta: 20, campaigns: ['Google | Busca', 'Google | Marca', 'Meta | Remarketing'] },
    medio: { google: 75, meta: 25, campaigns: ['Google | Busca', 'Google | Marca', 'Google | Performance', 'Meta | Remarketing'] },
    alto: { google: 70, meta: 30, campaigns: ['Google | Busca', 'Google | Marca', 'Google | Performance', 'Meta | Remarketing', 'Meta | Prova'] }
  },
  hibrido: {
    micro: { google: 60, meta: 40, campaigns: ['Google | Busca', 'Meta | Descoberta', 'Meta | Remarketing'] },
    medio: { google: 45, meta: 55, campaigns: ['Google | Busca', 'Google | Marca', 'Meta | Descoberta', 'Meta | Remarketing'] },
    alto: { google: 35, meta: 65, campaigns: ['Google | Busca', 'Google | Marca', 'Meta | Descoberta', 'Meta | Prova', 'Meta | Remarketing'] }
  }
};

export function calcBudget(amount=0,demand='busca',level='micro',gbpPct=50){
  const cfg=MATRIX[demand]?.[level]||MATRIX.busca.micro;
  const total=Math.max(0,Number(amount)||0);
  const google=total*cfg.google/100;
  const meta=total*cfg.meta/100;
  const safe=Math.max(0,Math.min(100,Number(gbpPct)||0));
  return {
    total,google,meta,gbp:google*safe/100,ads:google*(100-safe)/100,
    googlePct:cfg.google,metaPct:cfg.meta,gbpPct:safe,adsPct:100-safe,campaigns:cfg.campaigns
  };
}

export function numberBR(value){
  if(typeof value==='number') return Number.isFinite(value)?value:0;
  const raw=String(value??'').replace(/R\$|%|\s/g,'');
  if(!raw) return 0;
  const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
  const n=Number(normalized); return Number.isFinite(n)?n:0;
}

export function parseCSV(text){
  const src=String(text??'').replace(/^\uFEFF/,'').trim(); if(!src) return [];
  const first=src.split(/\r?\n/,1)[0];
  const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(ch==='"'){ if(quoted&&src[i+1]==='"'){cell+='"';i++;} else quoted=!quoted; }
    else if(ch===sep&&!quoted){row.push(cell.trim());cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&src[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))rows.push(row);row=[];}
    else cell+=ch;
  }
  row.push(cell.trim()); if(row.some(Boolean))rows.push(row);
  const headers=(rows.shift()||[]).map(h=>h.toLowerCase().trim());
  return rows.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??''])));
}

const aliases={
  spend:['spend','valor gasto','custo','investimento'],
  impressions:['impressions','impressões','impressoes'],
  clicks:['clicks','cliques','link clicks'],
  leads:['leads','conversões','conversoes','results','resultados'],
  revenue:['revenue','receita','valor de conversão','valor conversao'],
  campaign:['campaign','campanha','campaign name','nome da campanha'],
  date:['date','data','day','dia']
};
function pick(row,keys){for(const alias of keys){const hit=Object.entries(row).find(([k])=>k.toLowerCase().trim()===alias);if(hit)return hit[1];}return '';}
export function normalizeRows(rows){
  return (rows||[]).map((r,index)=>({
    id:`${index}-${pick(r,aliases.date)||'row'}`,date:pick(r,aliases.date),
    campaign:pick(r,aliases.campaign)||`Campanha ${index+1}`,
    spend:numberBR(pick(r,aliases.spend)),impressions:numberBR(pick(r,aliases.impressions)),
    clicks:numberBR(pick(r,aliases.clicks)),leads:numberBR(pick(r,aliases.leads)),revenue:numberBR(pick(r,aliases.revenue))
  }));
}
export function metrics(rows){
  const t=(rows||[]).reduce((a,r)=>({spend:a.spend+(+r.spend||0),impressions:a.impressions+(+r.impressions||0),clicks:a.clicks+(+r.clicks||0),leads:a.leads+(+r.leads||0),revenue:a.revenue+(+r.revenue||0)}),{spend:0,impressions:0,clicks:0,leads:0,revenue:0});
  return {...t,ctr:t.impressions?t.clicks/t.impressions*100:0,cpc:t.clicks?t.spend/t.clicks:0,cpl:t.leads?t.spend/t.leads:0,roas:t.spend?t.revenue/t.spend:0};
}
export function classifySearchTerm(term){
  const t=String(term||'').toLowerCase();
  if(['grátis','gratis','curso','emprego','vaga','salário','salario','download'].some(x=>t.includes(x))) return 'negativo';
  if(['orçamento','orcamento','empresa','contratar','preço','preco','perto de mim','sorocaba','laudo','vistoria'].some(x=>t.includes(x))) return 'alta intenção';
  return 'avaliar';
}
export function evaluateExperiment(exp){
  const a=Number(exp?.a||0),b=Number(exp?.b||0),lower=['cpl','cpc','cpa'].includes(exp?.metric);
  if(!a||!b||a===b)return {winner:'inconclusivo',delta:0};
  const winner=lower?(a<b?'A':'B'):(a>b?'A':'B');
  const baseline=winner==='A'?b:a,best=winner==='A'?a:b;
  return {winner,delta:Math.abs(best-baseline)/Math.max(Math.abs(baseline),.0001)*100};
}
export function generatePersona(name,niche,audience){
  return {
    name:'Cliente decisor de '+name,
    profile:audience||'Decisor responsável pela contratação',
    pains:['Incerteza sobre onde investir','Dificuldade de provar retorno','Baixa previsibilidade de oportunidades'],
    objections:['Receio de gastar sem mensuração','Comparação por preço','Falta de tempo para acompanhar marketing'],
    triggers:['Diagnóstico claro','Prova técnica','Plano objetivo com métricas'],
    niche:niche||''
  };
}
export function generateRetina(topic='serviço técnico'){
  return [
    {type:'Realidade',title:`O que quase ninguém explica sobre ${topic}`,cta:'Entenda antes de decidir.'},
    {type:'Educação',title:`3 critérios para avaliar ${topic}`,cta:'Salve este checklist.'},
    {type:'Transformação',title:`Do problema ao diagnóstico: como conduzir ${topic}`,cta:'Veja o método completo.'},
    {type:'Identificação',title:`Você está nesta situação com ${topic}?`,cta:'Compare com o seu caso.'},
    {type:'Necessidade',title:`Quando vale contratar ${topic}`,cta:'Fale com um especialista.'},
    {type:'Autoridade',title:`Como medimos resultado em ${topic}`,cta:'Conheça os indicadores.'}
  ];
}
export const MOCK_ROWS=[
  {id:'1',date:'2026-09-01',campaign:'Google Search | Vistoria',spend:420,impressions:5600,clicks:284,leads:18,revenue:5400},
  {id:'2',date:'2026-09-08',campaign:'Meta | Diagnóstico',spend:280,impressions:18200,clicks:336,leads:11,revenue:2600},
  {id:'3',date:'2026-09-15',campaign:'Google Search | Laudos',spend:510,impressions:6900,clicks:347,leads:22,revenue:6800},
  {id:'4',date:'2026-09-22',campaign:'Meta | Remarketing',spend:190,impressions:9400,clicks:201,leads:9,revenue:2200}
];
export function projectFactory(name='Diagnos Engenharia'){
  const now=new Date().toISOString();
  return {id:`p-${Date.now()}`,name,niche:'Engenharia diagnóstica e patologia das construções',audience:'Síndicos, administradoras, construtoras e proprietários',objective:'Gerar oportunidades qualificadas',budget:{amount:1500,demand:'busca',level:'micro',gbpPct:50},persona:null,content:[],performanceRows:MOCK_ROWS,decisions:[],experiments:[],history:[{at:now,text:'Workspace criado.'}],proposal:{monthly:1800,setup:600,status:'Follow UP'},createdAt:now,updatedAt:now};
}
