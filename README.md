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

## Desenvolvimento e validação

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

Não depende de GitHub Actions. A Vercel recebe commits pela integração GitHub existente.
