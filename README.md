# Nexus Marketing IA

Aplicação Next.js da Nexus Digital, vinculada ao projeto Vercel `nexus-marketing`.

## Áreas de trabalho

- Portfólio de projetos com busca, filtro, criação e seleção persistente.
- Briefing compartilhado e biblioteca de personas com níveis de consciência.
- Plano de marketing em área própria, com diagnóstico, canais, funil, plano de 90 dias, hipóteses e indicadores.
- Matriz de campanhas baseada no documento fornecido (p. 101), com nove combinações, faixas sem sobreposição e ajustes manuais justificados.
- Divisão da parcela Google entre campanhas de presença local associadas ao GBP e outras campanhas Google Ads.
- RETINA: seis conteúdos completos com editor, legenda, status, canal e data.
- Calendário editorial e checklist de preparação dos canais.
- Meta Ads: quatro ângulos e quatro ganchos por anúncio.
- Google Ads: geração de palavras-chave → seleção de 5 a 8 termos → biblioteca de 20 títulos e 8 descrições. Validação de limites antes de salvar.
- Comercial, importação CSV, termos de pesquisa, tracking, experimentos, decisões e auditoria de qualidade preservados.

## Dados e IA

Projetos são salvos neste navegador em `nexus-marketing-ia:v3`; os dados da versão anterior são mantidos. Não há sincronização de projetos entre dispositivos. Exportação JSON disponível.

A IA usa uma chave OpenAI fornecida em Configurações. Por padrão a chave fica na sessão. Nunca inclua chaves em commits. Gerações custam conforme a conta da API. Sem chave, briefing, orçamento, personas manuais, calendário e checklist continuam utilizáveis.

As datas do calendário organizam o planejamento; não publicam automaticamente nas redes sociais.

## Uso e privacidade da IA

- Toda chamada à OpenAI vai com `store: false`: a resposta não fica armazenada na conta da API para consulta posterior (a retenção de segurança da OpenAI, quando houver, segue a política dela). A chave continua só no navegador e passa pelo servidor do Nexus apenas durante a chamada.
- As gerações que devolvem objeto pedem à OpenAI o modo JSON (se o modelo não aceitar, repete sem ele; um erro 400 não gasta tokens). Se mesmo assim a resposta vier fora do formato, o banner mostra **Ver o que a IA respondeu** (os primeiros caracteres), nada é salvo e a tentativa conta no uso.
- Cada geração tem limite de 55 s e pode ser cancelada pelo botão **Cancelar geração**. Erros do motor ficam num banner fixo, com **Tentar novamente** ou **Abrir configurações** (chave, acesso, saldo ou modelo).
- Textos livres do projeto (briefing, observações, termos de pesquisa, CSV) vão ao modelo dentro de um bloco marcado como não confiável: o modelo os usa como dado e não segue instruções escritas neles.
- O uso é medido em tokens pela própria OpenAI, por projeto (tela **Fluxo do projeto**) e no total (**Configurações**). Gerações reprovadas na validação também contam. Não é valor em R$.
- **Jornada IA essencial** (só cliente ativo, opcional): Persona → RETINA → Meta Ads → palavras-chave Google, em 4 chamadas. Para no primeiro erro, pode ser cancelada e retomada da etapa em que parou; cada etapa concluída fica salva.

## Desenvolvimento e validação

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

Não depende de GitHub Actions. A Vercel recebe commits pela integração GitHub existente.


## Fluxo operacional

O Nexus separa o ciclo do projeto em duas fases para evitar telas sem contexto:

**Prospecção:** Briefing → Abordagem → Plano de marketing → Proposta → Fechado/Declinado.

**Cliente ativo:** Persona → Conteúdo RETINA → Meta ou Google Ads → Distribuição de investimento → Resultados.

Projetos novos começam no briefing, sem dashboard. O painel de gestão só é liberado após a proposta ser marcada como **Fechado**. Plano de marketing e proposta possuem exportação para PDF pelo diálogo de impressão do navegador.

## Menu do projeto

O menu lateral do projeto tem dois grupos:

- **Prospecção**: Persona (até o fechamento), **Empresa e especialista**, Plano de marketing, Comercial e Fluxo do projeto.
- **Gestão** (libera depois que a proposta é marcada como **Fechado**): Persona, Conteúdo RETINA, Anúncios (Meta e Google), Investimento e, depois de confirmar o investimento, Painel, Resultados, Calendário, Preparar canais e Aprendizados. Antes do fechamento os itens aparecem travados, com a dica de quando liberam.

Depois do fechamento a **Persona sai de Prospecção e passa a ser a primeira etapa da Gestão**, que libera aos poucos, como a Prospecção: criar a persona libera o conteúdo, o conteúdo libera os anúncios, os anúncios liberam o investimento.

**Empresa e especialista**: depois de preencher empresa e oferta, **Gerar especialista** cria o perfil de quem presta o serviço (medos, receios, dificuldades, o que valoriza e como conversar). É uma hipótese para você se preparar para a conversa, não um dado sobre alguém real.

A **Persona** gera a pesquisa completa na ordem do prompt do curso (retrato, problema e obstáculo, emoções e medos, passado, decisão de compra e os 5 níveis de consciência), tudo aberto na tela, com edição, cópia e o aprofundamento de medos, dores, desejos e objeções.

Em **Investimento**, a matriz mostra as 9 combinações (3 cenários × 3 faixas) e destaca a do projeto. Em **Anúncios**, o Meta tem o passo opcional dos **20 ganchos extras** e o Google traz as listas prontas para copiar (uma por linha).

## Plano e proposta em PDF

O plano de marketing e a proposta saem em **A4**, com a **logo e as cores do cliente** (plano) ou da agência (proposta):

- Envie a logo em Empresa e especialista (PNG, JPG ou SVG). O Nexus conta os pixels e extrai a cor principal, a de destaque e um neutro claro; dá para ajustar à mão. A logo da agência fica em Configurações.
- O plano segue o prompt do curso: até 12 páginas, uma ideia por página, capa com logo, sumário com as páginas, diagramas em SVG, uma página por canal com o material do projeto já selecionado (8 títulos, 1 anúncio completo, tabela das peças e 1 roteiro) e o convite final com botão do WhatsApp. Blocos sem material são removidos, nunca inventados.
- A proposta traz capa com as duas logos, investimento em destaque, responsabilidades e aceite com linhas de assinatura.
- Tudo renderiza offline (só fontes do sistema e SVG). **Ver e exportar PDF** abre a pré-visualização; **Salvar como PDF** usa a impressão do navegador. O texto passa por uma limpeza que remove travessão e emoji.

Na matriz de investimento, a presença local/GBP começa em **20% da parcela destinada ao Google**. O valor pode ser ajustado nas opções avançadas.
