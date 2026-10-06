export const TIMEOUT_MS=55000;
const MODEL_RE=/^[a-zA-Z0-9._:-]{1,120}$/;
const EFFORTS=['low','medium','high'];

export class EngineError extends Error{
  constructor(message,status=500,{code='engine',usage=null,detail=''}={}){super(message);this.name='EngineError';this.status=status;this.code=code;this.usage=usage;this.detail=detail}
}
export const isValidModel=(m)=>typeof m==='string'&&MODEL_RE.test(m);
export const normalizeReasoning=(v)=>EFFORTS.includes(v)?v:'medium';
export function readUsage(u){
  const n=(x)=>Number.isSafeInteger(x)&&x>=0?x:0;
  return {inputTokens:n(u?.input_tokens),outputTokens:n(u?.output_tokens)};
}
export function extractText(data){
  if(typeof data?.output_text==='string'&&data.output_text)return data.output_text;
  const chunks=[];
  for(const item of data?.output||[])for(const part of item?.content||[]){
    if(part?.type==='output_text'&&part?.text)chunks.push(part.text);
    else if(typeof part?.text==='string')chunks.push(part.text);
  }
  return chunks.join('\n').trim();
}
const BS=String.fromCharCode(92);
// Fim do valor JSON que começa em `from`, ignorando chaves e colchetes dentro de strings.
function balanced(s,from){
  let depth=0,str=false,esc=false;
  for(let i=from;i<s.length;i++){
    const c=s[i];
    if(str){if(esc)esc=false;else if(c===BS)esc=true;else if(c==='"')str=false;continue}
    if(c==='"')str=true;
    else if(c==='{'||c==='[')depth++;
    else if((c==='}'||c===']')&&--depth===0)return s.slice(from,i+1);
  }
  return null;
}
const dropTrailingCommas=(t)=>t.replace(/,(\s*[}\]])/g,'$1');
// Uma aspa dentro de string só fecha o texto se vier seguida de , : } ]. As outras são falas sem escape.
function escapeInnerQuotes(t){
  let out='',str=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(!str){out+=c;if(c==='"')str=true;continue}
    if(c===BS){out+=c+(t[++i]??'');continue}
    if(c==='"'){if(/^\s*[,:}\]]/.test(t.slice(i+1)))str=false;else{out+='\\"';continue}}
    out+=c;
  }
  return out;
}
const tryParse=(t)=>{try{const v=JSON.parse(t);return v!==null&&typeof v==='object'?v:undefined}catch{return undefined}};
const FIXES=[(t)=>t,dropTrailingCommas,(t)=>escapeInnerQuotes(dropTrailingCommas(t))];
// Procura o primeiro valor JSON do texto, mesmo com conversa antes/depois e chaves soltas nela.
export function parseJSON(raw){
  const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const lastClose=Math.max(text.lastIndexOf('}'),text.lastIndexOf(']'));
  for(let i=0,tries=0;i<text.length&&tries<60;i++){
    if(text[i]!=='{'&&text[i]!=='[')continue;
    tries++;
    const whole=balanced(text,i);
    for(const fix of FIXES)for(const c of [whole,text.slice(i,lastClose+1)]){const v=c?tryParse(fix(c)):undefined;if(v!==undefined)return v}
    if(!whole)break;
    i+=whole.length-1;
  }
  const detail=text.replace(/\s+/g,' ').slice(0,240)+(text.length>240?'…':'');
  throw new EngineError('A resposta da IA não retornou JSON válido.',422,{code:'invalid_json',detail});
}
function httpError(status){
  if(status===401)return new EngineError('Chave da OpenAI inválida ou revogada. Confira em Configurações.',401,{code:'auth'});
  if(status===403)return new EngineError('A OpenAI negou o acesso ao projeto ou ao modelo escolhido.',403,{code:'forbidden'});
  if(status===429)return new EngineError('Limite de uso ou saldo da API da OpenAI atingido. Confira sua conta.',429,{code:'quota'});
  if(status===400||status===404)return new EngineError('Modelo indisponível ou incompatível com a API de respostas. Escolha outro modelo em Configurações.',400,{code:'model'});
  return new EngineError('A OpenAI está temporariamente indisponível. Tente novamente em instantes.',502,{code:'upstream'});
}
export async function callOpenAI({apiKey,model,instructions,input,maxOutputTokens,reasoning,json=false,signal,timeoutMs=TIMEOUT_MS,request=fetch}){
  if(!isValidModel(model))throw new EngineError('Modelo inválido. Escolha um modelo em Configurações.',400,{code:'model'});
  const timeout=AbortSignal.timeout(timeoutMs);
  const merged=signal?AbortSignal.any([signal,timeout]):timeout;
  const interrupted=(fallback)=>signal?.aborted?new EngineError('Geração cancelada.',499,{code:'cancelled'})
    :timeout.aborted?new EngineError(`A geração passou de ${Math.round(timeoutMs/1000)} s. Tente novamente ou use o modelo Luna.`,504,{code:'timeout'}):fallback;
  let response,data;
  try{
    const send=(asJson)=>request('https://api.openai.com/v1/responses',{
      method:'POST',signal:merged,cache:'no-store',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions,input,max_output_tokens:maxOutputTokens,reasoning:{effort:normalizeReasoning(reasoning)},store:false,...(asJson?{text:{format:{type:'json_object'}}}:{})})
    });
    response=await send(json);
    // Um 400 não gera tokens: se o modelo não aceitar o modo JSON, repete sem ele.
    if(json&&response.status===400)response=await send(false);
  }catch{
    throw interrupted(new EngineError('Não consegui falar com a OpenAI. Confira a conexão e tente novamente.',502,{code:'network'}));
  }
  if(!response.ok)throw httpError(response.status);
  try{data=await response.json()}catch{
    throw interrupted(new EngineError('Resposta inválida da OpenAI. Tente novamente.',502,{code:'upstream'}));
  }
  const usage=readUsage(data?.usage);
  if(data?.status==='incomplete')throw new EngineError('A OpenAI interrompeu a resposta antes de terminar (limite de saída). Gere novamente.',422,{code:'incomplete',usage});
  if(data?.status==='failed'||data?.error)throw new EngineError('A OpenAI não concluiu a geração. Tente novamente.',502,{code:'upstream',usage});
  const text=extractText(data);
  if(!text)throw new EngineError('A OpenAI não retornou texto utilizável. Gere novamente.',422,{code:'empty',usage});
  return {text,usage,model:data?.model||model,responseId:data?.id||null};
}
