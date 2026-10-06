# Gerar postagem a partir do anúncio Meta

Data: 2026-10-06 · Escopo: PR #1 (`feat/motor-ia-seguro-custo-jornada`)

## Pedido

Em Gestão > Anúncios, abaixo de cada um dos anúncios Meta, um botão **Gerar postagem**. Ele abre uma janela só daquele anúncio com **5 postagens diferentes**, baseadas no anúncio e na **identidade visual da empresa** (logo e cores). Cada postagem pode ser selecionada e baixada. **Gerar outros** cria mais 5.

O usuário pré-autorizou seguir sem perguntas, com as opções recomendadas. Este documento registra o entendimento e as escolhas.

## Entendimento

- Saída: imagem pronta para postar (PNG) + legenda. Não publica nada em rede social.
- Fonte do conteúdo: o anúncio (ângulo, corpo, CTA, 4 ganchos, nível de consciência), a persona e a oferta/destino do projeto. Nada de fatos novos.
- Identidade: `resolvePalette(project)` (cor principal, destaque, neutro) e `project.brandLogo`. Sem logo, usa o nome da empresa como marca.
- Custo: cada rodada de 5 é uma chamada de IA (tokens, visíveis no uso do projeto). Só o texto vem da IA; a imagem é desenhada no navegador, sem custo.

## Análise de marketing: modelos escolhidos

Base: biblioteca de anúncios estáticos (skill ad-creative), com função de cada modelo no funil. O público do projeto é "consciente do problema", então os modelos priorizam reconhecimento do problema, autoridade e convite.

| # | Modelo | Origem na biblioteca | Função | Texto na imagem |
|---|--------|----------------------|--------|-----------------|
| 1 | Gancho em destaque | Headline Statement | parar o scroll com a frase do anúncio | headline, apoio, CTA |
| 2 | Mito × Realidade | Problem/Solution (duas zonas) | corrigir uma crença errada, vem do gancho contraintuitivo | mito, realidade, CTA |
| 3 | Checklist | Callout / infográfico educativo | autoridade e utilidade, tende a ser salvo | título, 3 ou 4 itens, CTA |
| 4 | Recado do especialista | Founder Message (S, melhor alcance a frio) | conversa direta, tom humano | abertura, texto, CTA |
| 5 | Convite direto | CTA | fundo de funil, ação clara | headline, apoio, botão |

Descartados de propósito: Review Card e Testimonial Stack (exigem depoimento real; não inventamos), Stat Callout (exigiria número real) e Before/After (reivindicação regulada).

Formato: **Feed 4:5 (1080×1350)** é o padrão por ocupar mais tela; **Quadrado 1:1 (1080×1080)** como alternativa. Margem de 84 px (a grade do Instagram corta as laterais do 4:5). Stories 9:16 fica para depois (zonas seguras próprias).

Variação entre rodadas: a rodada seguinte inverte os esquemas claro/escuro dos modelos, então "Gerar outros" não parece repetição.

## Regras de texto

- Português do Brasil, sem emoji, sem travessão, sem clichês de texto automático (revelação por contraste, listas de negação, pergunta respondida pelo próprio texto).
- Não inventar número, cliente, resultado, prazo, certificação ou garantia. Não prometer resultado. Em engenharia diagnóstica, descrever o que se verifica, não o que se garante.
- Política do Meta: não afirmar características pessoais do leitor (saúde, dívida, medo). Descrever a situação, não rotular a pessoa.
- Limites (o desenho reduz a fonte para caber; o excesso é cortado em frase): headline 90, apoio 160, mito 100, realidade 160, item 64 (3 ou 4 itens), CTA 32, legenda 700 (primeira linha até 125, que é o que aparece antes do "ver mais"), 3 a 5 hashtags.

## Arquitetura

```
lib/posts.js        modelos, limites, normalizePosts, adKey, addPostSet, nomes de arquivo
lib/post-render.js  fitText + buildPost (lista de desenho pura, medida injetada) + drawCommands (canvas)
lib/zip.js          ZIP sem compressão (PNG já é comprimido), CRC32
lib/ai-prompts.js   tarefa "posts" (objeto JSON { posts: [5] })
lib/validation.js   estrutura das 5 postagens
components/post-studio.tsx   janela: grade, seleção, baixar, gerar outros
```

Dados: `project.metaAds.adPosts[adKey] = { sets: [{ id, at, variant, items: [5 postagens] }] }`, no máximo 4 rodadas por anúncio (a mais antiga sai). Regenerar os 4 anúncios descarta as postagens (o anúncio mudou).

Fluxo: clicar em **Gerar postagem** abre a janela; se o anúncio ainda não tem postagens, a geração começa na hora (o clique é a intenção) e o cartão de progresso/cancelar do motor aparece por cima. **Gerar outros** repete com as postagens anteriores como "não repetir".

Imagem: a IA devolve só texto. O navegador desenha em canvas por uma lista de comandos pura (testável sem navegador): fundo, formas, texto ajustado ao espaço, logo em plaquinha branca (qualquer logo fica legível), contraste mínimo 4,5:1 garantido por cor de texto calculada. Pré-visualização em meia resolução; o download renderiza em 1080 px.

Download: um PNG por postagem; selecionadas em lote saem num ZIP.

## Fora do escopo

Publicar nas redes, Stories 9:16, imagens geradas por IA (fotos), edição manual do texto na imagem, carrossel.

## Não verificado (a declarar na entrega)

Geração real pela OpenAI (sem chave nesta sessão): validada com respostas simuladas. Qualidade visual conferida no navegador do app com logos e cores de teste.
