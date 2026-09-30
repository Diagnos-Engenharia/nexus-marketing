const business=(p)=>`Marca: ${p.name||'(não informado)'}\nEspecialidade/área: ${p.specialty||'(não informado)'}\nPúblico-alvo: ${p.niche||'(não informado)'}\nDescrição: ${p.description||'(não informado)'}\nProdutos: ${p.products||'(não informado)'}\nServiços: ${p.services||'(não informado)'}\nOfertas: ${p.offers||'(não informado)'}\nLocalização: ${p.location||'(não informado)'}\nObjetivo: ${p.objective||'(não informado)'}\nTom de voz: ${p.tone||'(não informado)'}\nDestino do contato: ${p.contactDestination||'(não informado)'}`;

export const SYSTEM_PROMPT=`Você é o motor estratégico do Nexus Marketing IA. Trabalhe como estrategista de marketing sênior, mídia paga, copywriting e análise de performance. Use somente os dados fornecidos. Nunca invente clientes, resultados, certificações, garantias, números ou características do negócio. Quando precisar inferir comportamento de mercado, trate como hipótese plausível, não como fato. Produza português brasileiro claro e profissional. Quando o pedido exigir JSON, retorne somente JSON válido, sem markdown.`;

export function buildPrompt(task,p,input={}){
  if(task==='health') return `Responda somente com JSON válido: {"ok":true,"message":"Conexão OpenAI ativa"}.`;
  if(task==='persona') return `Você é pesquisador de mercado e estrategista de marketing sênior.

DADOS DO NEGÓCIO
${business(p)}

Crie UMA persona específica representando o PÚBLICO-ALVO (quem compra), nunca o profissional que presta o serviço. Seja profunda e específica, mas não invente fatos sobre a empresa.
Retorne somente JSON válido com exatamente esta estrutura:
{"nome":"","idade":"","descricao_breve":"","formacao":"","profissao":"","situacao_profissional":"","situacao_financeira":"","estado_civil":"","familia":"","momento_atual":"","sonho_principal":"","meta_principal":"","localizacao":"","problema_principal":"","obstaculo_principal":"","emocoes":[""],"medos":[""],"medos_relacionamentos":[""],"frases_ofensivas":[""],"tentativas_passadas":"","trechos_passado":[""],"o_que_nao_quer_fazer":"","trechos_nao_quer":[""],"impacto_relacionamentos":"","culpa_em_quem":"","objecoes":[""],"como_encorajar_sonhos":"","como_justificar_erros":"","como_aliviar_medos":"","como_confirmar_suspeitas":"","niveis_consciencia":{"totalmente_inconsciente":{"pensa":"","sente":"","percebe":"","sabe":"","nao_sabe":"","duvidas":"","comportamento":"","o_que_avanca":""},"consciente_problema":{"pensa":"","sente":"","percebe":"","sabe":"","nao_sabe":"","duvidas":"","comportamento":"","o_que_avanca":""},"consciente_solucao":{"pensa":"","sente":"","percebe":"","sabe":"","nao_sabe":"","duvidas":"","comportamento":"","o_que_avanca":""},"consciente_produto":{"pensa":"","sente":"","percebe":"","sabe":"","nao_sabe":"","duvidas":"","comportamento":"","o_que_avanca":""},"totalmente_consciente":{"pensa":"","sente":"","percebe":"","sabe":"","nao_sabe":"","duvidas":"","comportamento":"","o_que_avanca":""}}}`;
  if(task==='deepDive') return `Aprofunde a persona abaixo com dores, desejos, medos, objeções e linguagem realista.
NEGÓCIO
${business(p)}
PERSONA
${JSON.stringify(p.persona||{})}
Retorne somente JSON válido: {"dificuldades":[""],"medos_extra":[""],"desejos":[""],"historias_constrangedoras":[""],"pensamentos_recorrentes":[""],"pensamentos_autocriticos":[""],"segredos":[""]}. Use 5 itens em cada lista.`;
  if(task==='content') return `Você é estrategista de conteúdo especialista no Método RETINA (Relacionamento, Engajamento, Transformação, Interação 1x1, Níveis de Consciência, Autoridade).
NEGÓCIO
${business(p)}
PERSONA
${JSON.stringify(p.persona||{})}
Gere EXATAMENTE 6 conteúdos, um para cada categoria e nesta ordem: relacionamento, engajamento, transformacao, interacao, niveis_consciencia, autoridade. Escolha o formato adequado à ideia entre Reels, Vídeo longo, Carrossel e Imagem estática, sem impor variedade artificial. Use gancho específico nos primeiros 3 segundos, português natural e os níveis de consciência. Não repita a mesma ideia nas seis categorias. O roteiro precisa ser utilizável de verdade: fala completa para vídeo; 7-10 cards para carrossel; texto principal/complementar/ideia visual para imagem. Não invente depoimentos ou resultados.
Retorne somente um array JSON com objetos: {"category":"","title":"","idea":"","format":"","hook":"","script":"","igCaption":"","dorDesejo":"","objecaoDuvida":"","objetivoRetina":""}.`;
  if(task==='metaAds') return `Você é estrategista de Meta Ads.
NEGÓCIO
${business(p)}
PERSONA
${JSON.stringify(p.persona||{})}
CONTEÚDO/INSIGHTS
${JSON.stringify(p.content?.items||[])}
Conecte os quatro ganchos ao mesmo corpo de cada anúncio. CTA compatível com o destino do contato. Crie 4 anúncios de aquisição com ângulos claramente diferentes e sem promessas não comprovadas. Cada anúncio deve ter quatro variações de gancho (pergunta, história, contraintuitiva, segmentada), corpo e CTA escritos palavra por palavra, ideia visual em campo separado, estágio de consciência e hipótese de por que pode funcionar.
Retorne somente JSON: {"strategySummary":"","audience":"","objective":"","ads":[{"id":"","angle":"","hooks":{"pergunta":"","historia":"","contraintuitiva":"","segmentada":""},"body":"","cta":"","visual":"","awareness":"","hypothesis":""}]}.`;
  if(task==='googleKeywords') return `Especialista em Google Ads Search. NEGÓCIO: ${business(p)}
PERSONA: ${JSON.stringify(p.persona||{})}
Crie 20 palavras-chave principais com intenção de contratação, 10 complementares e 10 negativas específicas ao negócio. Considere a localização. Não use negativas genéricas que excluam a própria oferta. Não gere títulos ou descrições: o usuário selecionará 5 a 8 termos primeiro. Retorne JSON: {"strategy":"","keywords":{"highIntent":[""],"problemAware":[""],"negative":[""]}}.`;
  if(task==='googleAds') return `Especialista em Google Ads Search. NEGÓCIO: ${business(p)}
PERSONA: ${JSON.stringify(p.persona||{})}
TERMOS APROVADOS: ${JSON.stringify(input.selectedKeywords||p.googleAds?.selected||[])}
Crie 20 títulos de até 30 caracteres e 8 descrições de até 90 caracteres, contando espaços e pontuação. Revise todos os limites. Distribua títulos: 3 benefícios, 3 características, 2 marca, 2 CTA e 10 com termos aprovados e variações. Somente use fatos fornecidos. Os 20 títulos e 8 descrições são uma biblioteca de alternativas, não um único anúncio. Retorne JSON: {"strategy":"","keywords":${JSON.stringify(p.googleAds?.keywords||{})},"selected":${JSON.stringify(input.selectedKeywords||p.googleAds?.selected||[])},"titles":[""],"descriptions":[""],"sitelinks":[{"title":"","description":""}],"landingPageNotes":[""]}.`;
  if(task==='approach') return `Você é especialista em prospecção consultiva B2B.
EMPRESA PROSPECTADA
${business(p)}
DADOS DO GESTOR
${JSON.stringify(input.manager||{})}
CANAL: ${input.channel||'WhatsApp'}
CONTEXTO: ${input.context||'(prospecção fria)'}
Crie 5 abordagens diferentes, naturais e curtas, sem promessas exageradas. Inclua follow-ups, objeções prováveis, perguntas de descoberta e um mapa do que ainda seria útil saber antes de personalizar mais.
Retorne somente JSON: {"summary":"","approaches":[{"name":"","opening":"","message":"","whyItWorks":""}],"followUps":[{"when":"","message":""}],"objections":[{"objection":"","answer":""}],"discoveryQuestions":[""],"missingInformation":[""],"nextStep":""}.`;
  if(task==='marketingPlan') return `Você é consultor de marketing estratégico.
NEGÓCIO
${business(p)}
PERSONA
${JSON.stringify(p.persona||{})}
PLANO DE MÍDIA
${JSON.stringify(p.budget||{})}
CONTEXTO COMERCIAL
${JSON.stringify(input||{})}
Use a distribuição de verba calculada abaixo como referência obrigatória, sem recalcular percentuais arbitrariamente: ${JSON.stringify(input.mediaAllocation||{})}. Considere o checklist de preparação de canais: ${JSON.stringify(p.channelReadiness||{})}. Inclua metas mensuráveis propostas como metas, nunca como garantia. Gere um plano executivo de marketing que possa ser apresentado ao prospect. Não invente dados. Diferencie diagnóstico, hipóteses, plano e métricas.
Retorne somente JSON: {"executiveSummary":"","diagnosis":[""],"objectives":[""],"positioning":"","channels":[{"name":"","role":"","priority":""}],"contentPillars":[""],"funnel":[{"stage":"","message":"","channel":""}],"mediaPlan":{"google":"","meta":"","gbp":""},"ninetyDayPlan":[{"period":"","actions":[""]}],"kpis":[""],"assumptions":[""],"nextStep":""}.`;
  if(task==='proposal') return `Você é consultor comercial.
NEGÓCIO
${business(p)}
PLANO
${JSON.stringify(p.marketingPlan||{})}
ENTRADAS COMERCIAIS
${JSON.stringify(input||{})}
Crie uma proposta clara, curta e de alto valor percebido, sem inventar resultados ou garantias.
Retorne somente JSON: {"title":"","context":"","objectives":[""],"scope":[""],"deliverables":[""],"process":[""],"timeline":"","investment":{"setup":"","monthly":"","media":""},"clientResponsibilities":[""],"providerResponsibilities":[""],"terms":[""],"nextStep":""}.`;
  if(task==='searchTerms') return `Classifique termos reais de pesquisa do Google Ads pela intenção em relação ao negócio.
NEGÓCIO
${business(p)}
PALAVRAS-CHAVE ATUAIS
${JSON.stringify(p.googleAds?.selected||p.googleAds?.keywords||[])}
TERMOS
${JSON.stringify(input.terms||[])}
Para cada termo retorne intent = Alta|Média|Baixa|Irrelevante; category = Comercial|Transacional|Informacional|Navegacional|Irrelevante; geoMismatch boolean; reason curta; recommendedAction = manter|negativar|expandir|observar. Respeite conversões reais como evidência e não descarte termo convertido sem justificativa forte.
Retorne somente array JSON: [{"term":"","intent":"","category":"","geoMismatch":false,"reason":"","recommendedAction":""}].`;
  if(task==='optimization') return `Você é analista de mídia paga. Analise dados agregados e descobertas locais sem confundir correlação com causalidade.
NEGÓCIO
${business(p)}
MÉTRICAS
${JSON.stringify(input.metrics||{})}
ACHADOS LOCAIS
${JSON.stringify(input.findings||[])}
DADOS POR CAMPANHA
${JSON.stringify(input.rows||[])}
Priorize no máximo 6 achados. Para cada um descreva observação, evidência, hipótese, confiança, ação, métrica, critério de sucesso, risco e quando revisar. Nunca declare causa como comprovada se não houver evidência.
Retorne somente JSON: {"summary":"","findings":[{"severity":"info|warning|critical","title":"","observation":"","evidence":"","hypothesis":"","confidence":"","action":"","metric":"","successCriterion":"","risk":"","nextReview":""}]}.`;
  throw new Error('Motor de IA desconhecido: '+task);
}
