import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT, buildPrompt } from '../../../lib/ai-prompts.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function extractText(data:any){
  if(typeof data?.output_text==='string' && data.output_text) return data.output_text;
  const chunks:any[]=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.type==='output_text' && part?.text) chunks.push(part.text);
      else if(typeof part?.text==='string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}
function parseJSON(raw:string){
  const clean=String(raw||'').trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  try{return JSON.parse(clean)}catch{}
  const firstObj=clean.indexOf('{'), lastObj=clean.lastIndexOf('}');
  const firstArr=clean.indexOf('['), lastArr=clean.lastIndexOf(']');
  const candidates:any[]=[];
  if(firstObj>=0&&lastObj>firstObj)candidates.push(clean.slice(firstObj,lastObj+1));
  if(firstArr>=0&&lastArr>firstArr)candidates.push(clean.slice(firstArr,lastArr+1));
  for(const c of candidates){try{return JSON.parse(c)}catch{}}
  throw new Error('A resposta da IA não retornou JSON válido.');
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const apiKey=String(body.apiKey||'').trim();
    const model=String(body.model||'gpt-5.6-terra');
    const task=String(body.task||'');
    if(!apiKey || apiKey.length<20) return NextResponse.json({ok:false,error:'Informe uma chave da OpenAI válida.'},{status:400});
    const prompt=buildPrompt(task,body.project||{},body.input||{});
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions:SYSTEM_PROMPT,input:prompt,max_output_tokens:task==='health'?250:12000,reasoning:{effort:body.reasoning||'medium'}}),
      cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const message=data?.error?.message||`OpenAI respondeu ${response.status}.`;
      return NextResponse.json({ok:false,error:message},{status:response.status});
    }
    const raw=extractText(data);
    const parsed=parseJSON(raw);
    return NextResponse.json({ok:true,data:parsed,usage:data?.usage||null,model:data?.model||model,responseId:data?.id||null});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||'Falha ao executar o motor de IA.'},{status:500});
  }
}
