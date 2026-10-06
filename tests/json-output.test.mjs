import test from 'node:test';
import assert from 'node:assert/strict';
import {callOpenAI,EngineError,parseJSON} from '../lib/openai.js';
import {buildPrompt,ARRAY_TASKS} from '../lib/ai-prompts.js';
import {validateGeneration} from '../lib/validation.js';
import {projectFactory} from '../lib/core.js';

const base={apiKey:'sk-test-0123456789abcdef',model:'gpt-x',instructions:'i',input:'p',maxOutputTokens:100};
const done={status:'completed',id:'r1',model:'gpt-x',output_text:'{"a":1}',usage:{input_tokens:10,output_tokens:5}};

test('parseJSON lê o objeto mesmo com texto antes e depois, inclusive com chaves no texto',()=>{
  const raw='Segue a pesquisa [NICHO INFORMADO] {rascunho}\n```json\n{"nome":"Ana","frase":"use {chaves} aqui","medos":["a","b"]}\n```\nGostaria que eu aprofundasse? {sim}';
  assert.deepEqual(parseJSON(raw),{nome:'Ana',frase:'use {chaves} aqui',medos:['a','b']});
});

test('parseJSON devolve o array inteiro, não o primeiro objeto dele',()=>{
  assert.deepEqual(parseJSON('Aqui:\n[{"a":1},{"a":2}]\nfim'),[{a:1},{a:2}]);
});

test('parseJSON tolera vírgula sobrando e BOM',()=>{
  assert.deepEqual(parseJSON(String.fromCharCode(0xFEFF)+'{"a":[1,2,],"b":{"c":1,},}'),{a:[1,2],b:{c:1}});
});

test('parseJSON conserta aspas duplas soltas dentro de falas',()=>{
  const raw='{"frases_ofensivas":["Ele disse "isso não é para você" e saiu","Normal"],"nome":"Ana"}';
  assert.deepEqual(parseJSON(raw),{frases_ofensivas:['Ele disse "isso não é para você" e saiu','Normal'],nome:'Ana'});
});

test('parseJSON não devolve um pedaço de dentro de um JSON quebrado',()=>{
  assert.throws(()=>parseJSON('{"a":{"b":1},"c":[1,2'),/JSON válido/);
});

test('parseJSON falha com erro tipificado e trecho da resposta para diagnóstico',()=>{
  const prose='Qual é o nicho sobre o qual você deseja fazer a pesquisa de mercado?\n'+'x'.repeat(400);
  try{parseJSON(prose);assert.fail('deveria falhar')}catch(e){
    assert.ok(e instanceof EngineError);
    assert.equal(e.code,'invalid_json');assert.equal(e.status,422);
    assert.match(e.message,/JSON válido/);
    assert.match(e.detail,/^Qual é o nicho/);
    assert.ok(e.detail.length<=260);
    assert.ok(!e.detail.includes('\n'));
  }
});

test('pede JSON ao modelo quando a tarefa devolve objeto',async()=>{
  let sent;
  await callOpenAI({...base,json:true,request:async(u,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify(done))}});
  assert.deepEqual(sent.text,{format:{type:'json_object'}});
  await callOpenAI({...base,request:async(u,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify(done))}});
  assert.equal(sent.text,undefined);
});

test('se o modelo não aceitar o modo JSON, repete sem ele e segue',async()=>{
  const bodies=[];
  const r=await callOpenAI({...base,json:true,request:async(u,init)=>{
    const b=JSON.parse(init.body);bodies.push(b);
    return b.text?new Response(JSON.stringify({error:{message:'x'}}),{status:400}):new Response(JSON.stringify(done));
  }});
  assert.equal(bodies.length,2);assert.ok(bodies[0].text);assert.equal(bodies[1].text,undefined);
  assert.equal(r.text,'{"a":1}');
});

test('se as duas tentativas voltam 400, o erro é de modelo (uma repetição só)',async()=>{
  let calls=0;
  await assert.rejects(()=>callOpenAI({...base,json:true,request:async()=>{calls++;return new Response('{}',{status:400})}}),e=>e.code==='model');
  assert.equal(calls,2);
});

test('content e searchTerms são as únicas tarefas que devolvem array',()=>{
  assert.deepEqual([...ARRAY_TASKS].sort(),['content','searchTerms']);
});

test('todo prompt do método avisa que as respostas já foram coletadas e proíbe texto fora do JSON',()=>{
  const p=projectFactory('Acme');p.niche='Imóvel recente';p.persona={nome:'A'};p.approach={a:1};
  for(const task of ['persona','deepDive','content','metaAds','googleKeywords','extraHooks','approach','marketingPlan']){
    const prompt=buildPrompt(task,p,{});
    assert.match(prompt,/Ignore qualquer regra do prompt canônico que mande fazer perguntas/,task);
    assert.match(prompt,/aspas simples/,task);
  }
});

test('persona: a pergunta final de aprofundamento não pode aparecer nem fora do JSON',()=>{
  const p=projectFactory('Acme');
  const prompt=buildPrompt('persona',p,{});
  assert.match(prompt,/nem antes nem depois do JSON/);
});

test('persona sem estrutura mínima é recusada na validação, não salva como persona',()=>{
  assert.throws(()=>validateGeneration('persona',{},{}),/persona/i);
  assert.throws(()=>validateGeneration('persona',{pensa:'x'},{}),/persona/i);
  validateGeneration('persona',{nome:'Ana',medos:['a'],niveis_consciencia:{totalmente_inconsciente:{pensa:'x'}}},{});
});

test('caminho do servidor: relatório + JSON com falas + pergunta final vira persona válida',async()=>{
  const persona={nome:'Marcos',idade:'42',problema_principal:'Medo de comprar imóvel com defeito',medos:['Pagar caro por um erro oculto'],frases_ofensivas:['Ele disse "isso é frescura de engenheiro" e riu'],niveis_consciencia:{totalmente_inconsciente:{pensa:'Tá tudo certo'}}};
  const json=JSON.stringify(persona,null,1).replace('"Ele disse \\"isso é frescura de engenheiro\\" e riu"','"Ele disse "isso é frescura de engenheiro" e riu"');
  const text='Pesquisa de mercado sobre [NICHO INFORMADO]\n\n```json\n'+json+'\n```\n\nVocê gostaria que eu aprofundasse?';
  const r=await callOpenAI({...base,json:true,request:async()=>new Response(JSON.stringify({status:'completed',output_text:text,usage:{input_tokens:900,output_tokens:4000}}))});
  const data=parseJSON(r.text);
  validateGeneration('persona',data,{});
  assert.equal(data.frases_ofensivas[0],'Ele disse "isso é frescura de engenheiro" e riu');
  assert.deepEqual(r.usage,{inputTokens:900,outputTokens:4000});
});

test('caminho do servidor: só a pergunta do nicho falha com 422, trecho e tokens preservados',async()=>{
  const r=await callOpenAI({...base,json:true,request:async()=>new Response(JSON.stringify({status:'completed',output_text:'Qual é o nicho sobre o qual você deseja fazer a pesquisa de mercado e mapeamento de persona?',usage:{input_tokens:900,output_tokens:30}}))});
  assert.deepEqual(r.usage,{inputTokens:900,outputTokens:30});
  assert.throws(()=>parseJSON(r.text),e=>e.code==='invalid_json'&&e.status===422&&/^Qual é o nicho/.test(e.detail));
});
