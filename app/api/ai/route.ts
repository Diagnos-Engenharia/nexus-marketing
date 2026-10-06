import { NextResponse } from 'next/server';
import {validateGeneration} from '../../../lib/validation.js';
import { SYSTEM_PROMPT, buildPrompt, ARRAY_TASKS } from '../../../lib/ai-prompts.js';
import { callOpenAI, parseJSON, EngineError } from '../../../lib/openai.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req:Request){
  let usage:any=null;
  try{
    const body=await req.json().catch(()=>null);
    if(!body)return NextResponse.json({ok:false,error:'Requisição inválida.',code:'bad_request'},{status:400});
    const apiKey=String(body.apiKey||'').trim();
    const model=String(body.model||'gpt-5.6-terra');
    const task=String(body.task||'');
    if(!apiKey || apiKey.length<20) return NextResponse.json({ok:false,error:'Informe uma chave da OpenAI válida.',code:'auth'},{status:400});
    if(task==='googleAds'&&(!Array.isArray(body.input?.selectedKeywords)||body.input.selectedKeywords.length<5||body.input.selectedKeywords.length>8))return NextResponse.json({ok:false,error:'Selecione de 5 a 8 palavras-chave antes de gerar os anúncios.',code:'bad_request'},{status:400});
    const prompt=buildPrompt(task,body.project||{},body.input||{});
    const result=await callOpenAI({apiKey,model,instructions:SYSTEM_PROMPT,input:prompt,maxOutputTokens:task==='health'?250:12000,reasoning:body.reasoning,json:!ARRAY_TASKS.includes(task),signal:req.signal});
    usage=result.usage;
    const parsed=parseJSON(result.text);
    validateGeneration(task,parsed,body.project||{});
    return NextResponse.json({ok:true,data:parsed,usage,model:result.model,responseId:result.responseId});
  }catch(error:any){
    const known=error instanceof EngineError;
    const status=known?error.status:usage?422:500;
    return NextResponse.json({ok:false,error:error?.message||'Falha ao executar o motor de IA.',code:known?error.code:usage?'invalid_output':'engine',detail:(known&&error.detail)||undefined,usage:(known&&error.usage)||usage},{status});
  }
}
