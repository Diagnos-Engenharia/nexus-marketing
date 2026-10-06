export const TIMEOUT_MS=55000;
const MODEL_RE=/^[a-zA-Z0-9._:-]{1,120}$/;
const EFFORTS=['low','medium','high'];

export class EngineError extends Error{
  constructor(message,status=500,{code='engine',usage=null}={}){super(message);this.name='EngineError';this.status=status;this.code=code;this.usage=usage}
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
export function parseJSON(raw){
  const clean=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(clean)}catch{}
  const firstObj=clean.indexOf('{'),lastObj=clean.lastIndexOf('}');
  const firstArr=clean.indexOf('['),lastArr=clean.lastIndexOf(']');
  const candidates=[];
  if(firstObj>=0&&lastObj>firstObj)candidates.push(clean.slice(firstObj,lastObj+1));
  if(firstArr>=0&&lastArr>firstArr)candidates.push(clean.slice(firstArr,lastArr+1));
  for(const c of candidates){try{return JSON.parse(c)}catch{}}
  throw new Error('A resposta da IA não retornou JSON válido.');
}
function httpError(status){
  if(status===401)return new EngineError('Chave da OpenAI inválida ou revogada. Confira em Configurações.',401,{code:'auth'});
  if(status===403)return new EngineError('A OpenAI negou o acesso ao projeto ou ao modelo escolhido.',403,{code:'forbidden'});
  if(status===429)return new EngineError('Limite de uso ou saldo da API da OpenAI atingido. Confira sua conta.',429,{code:'quota'});
  if(status===400||status===404)return new EngineError('Modelo indisponível ou incompatível com a API de respostas. Escolha outro modelo em Configurações.',400,{code:'model'});
  return new EngineError('A OpenAI está temporariamente indisponível. Tente novamente em instantes.',502,{code:'upstream'});
}
export async function callOpenAI({apiKey,model,instructions,input,maxOutputTokens,reasoning,signal,timeoutMs=TIMEOUT_MS,request=fetch}){
  if(!isValidModel(model))throw new EngineError('Modelo inválido. Escolha um modelo em Configurações.',400,{code:'model'});
  const timeout=AbortSignal.timeout(timeoutMs);
  const merged=signal?AbortSignal.any([signal,timeout]):timeout;
  const interrupted=(fallback)=>signal?.aborted?new EngineError('Geração cancelada.',499,{code:'cancelled'})
    :timeout.aborted?new EngineError(`A geração passou de ${Math.round(timeoutMs/1000)} s. Tente novamente ou use o modelo Luna.`,504,{code:'timeout'}):fallback;
  let response,data;
  try{
    response=await request('https://api.openai.com/v1/responses',{
      method:'POST',signal:merged,cache:'no-store',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions,input,max_output_tokens:maxOutputTokens,reasoning:{effort:normalizeReasoning(reasoning)},store:false})
    });
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
