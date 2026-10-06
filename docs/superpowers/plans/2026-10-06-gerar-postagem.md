# Gerar postagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Em cada anúncio Meta, um botão "Gerar postagem" abre uma janela com 5 postagens (PNG + legenda) na identidade visual da empresa, com seleção, download e "Gerar outros".

**Architecture:** A IA devolve só o texto das 5 postagens (tarefa `posts`, objeto JSON). O navegador desenha a imagem em canvas a partir de uma lista de comandos pura (`buildPost`), testável em Node com uma função de medida injetada. O estado fica em `project.metaAds.adPosts[adKey].sets`.

**Tech Stack:** Next.js 15, React 19, `node --test`, canvas 2D, sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-10-06-gerar-postagem-design.md`

## Global Constraints

- Texto em português do Brasil, sem emoji, sem travessão (`clean` de `lib/doc-kit.js`).
- Sem dependência nova; fontes do sistema (família lida do `body`).
- Imagem 1080 px de largura; altura 1350 (4:5) ou 1080 (1:1); margem 84 px (72 no quadrado).
- Contraste texto/fundo mínimo 4,5:1 em toda lista de desenho.
- Máximo 4 rodadas (20 postagens) por anúncio.
- `npm test`, `npx tsc --noEmit` e `npm run build` limpos antes de cada commit.

## Review Focus

- Texto muito longo ou palavra sem espaço maior que a largura: a imagem não pode estourar nem sobrepor blocos (reduz fonte, depois corta com reticências).
- Cor principal clara escolhida à mão (amarelo, branco): o texto continua legível.
- Sem logo / logo SVG sem proporção: usa o nome da empresa, sem quebrar o layout.
- Resposta da IA com campos faltando, itens a mais, travessão ou emoji: recusa estrutura inválida e limpa o resto.
- "Gerar outros" com 4 rodadas já salvas: a mais antiga sai, as outras ficam; o ZIP não mistura nomes repetidos.

---

### Task 1: Cores e utilidades de contraste

**Files:** Modify `lib/palette.js`; Test `tests/posts.test.mjs`

**Interfaces:**
- Produces: `mixHex(a,b,t)`, `contrastRatio(fg,bg)`, `legible(fg,bg,min=4.5)` (devolve `fg` ou a melhor entre `#10233e` e `#ffffff`).

- [ ] Teste: `contrastRatio('#000000','#ffffff')` ≈ 21; `legible('#f5e050','#ffffff')` devolve cor com razão ≥ 4,5.
- [ ] Implementar com `luminance` existente; rodar o teste.

### Task 2: Dados e normalização (`lib/posts.js`)

**Files:** Create `lib/posts.js`; Test `tests/posts.test.mjs`

**Interfaces:**
- Produces: `POST_MODELS` (5, na ordem gancho, mito, lista, recado, convite, cada um com `label` e `role`), `LIMITS`, `adKey(ad,i)`, `normalizePosts(data)` → `{posts}` limpo e cortado, `addPostSet(adPosts,key,posts,now)` → novo `adPosts` (máx. 4 rodadas, `variant` alternando), `postFileName(company,adIndex,post,setIndex)`.

- [ ] Testes: normalização remove travessão/emoji e corta no limite; `lista` aceita 3 ou 4 itens e recusa 1; `addPostSet` alterna `variant`, mantém 4 e descarta a mais antiga; nomes de arquivo sem acento, sem barra, únicos.
- [ ] Implementar; rodar.

### Task 3: Motor de desenho (`lib/post-render.js`)

**Files:** Create `lib/post-render.js`; Test `tests/post-render.test.mjs`

**Interfaces:**
- Consumes: `resolvePalette`, `legible`, `mixHex` (Task 1); `clean` de `doc-kit`.
- Produces: `fitText({text,maxWidth,maxHeight,maxSize,minSize,lineHeight,weight,family,measure})` → `{lines,size,height,truncated}`; `buildPost({post,model,brand:{name,palette,logoAspect},format,variant,measure})` → `{width,height,commands,issues}`; `drawCommands(ctx,commands,{scale,logo,fonts})`; `FORMATS`.

- [ ] Testes (medida falsa: largura = caracteres × tamanho × 0,55): 5 modelos × 2 formatos × 2 variantes × 3 paletas (escura, clara, padrão) × 3 tamanhos de texto (curto, normal, 3× o limite, palavra gigante): todo texto dentro da margem e da altura; sem sobreposição de caixas de texto; contraste ≥ 4,5 por comando de texto; nenhuma fonte abaixo do mínimo.
- [ ] Implementar `fitText` (quebra por palavra, quebra por caractere se a palavra não cabe, reduz fonte, depois corta com reticências).
- [ ] Implementar os 5 layouts e `drawCommands` (retângulo arredondado manual, gradiente, círculo com alpha, check, linha, texto com baseline `middle`).

### Task 4: ZIP (`lib/zip.js`)

**Files:** Create `lib/zip.js`; Test `tests/posts.test.mjs`

**Interfaces:** Produces `crc32(bytes)`, `makeZip([{name,data:Uint8Array}])` → `Uint8Array`.

- [ ] Teste: `crc32('123456789')` = `0xCBF43926`; assinaturas `PK\x03\x04`, `PK\x01\x02`, `PK\x05\x06`; contagem de entradas; leitura de volta com `python -m zipfile -l` no smoke manual.
- [ ] Implementar sem compressão (método 0), nomes em UTF-8 (flag 0x0800).

### Task 5: Prompt, validação e rótulo (`posts`)

**Files:** Modify `lib/ai-prompts.js`, `lib/validation.js`, `lib/core.js`, `lib/journey.js`; Test `tests/posts.test.mjs`

**Interfaces:** Consumes `adKey`. Produces tarefa `posts` com `input: {adIndex}`; saída `{posts:[5]}`.

- [ ] Testes: prompt contém o anúncio escolhido, a persona resumida, a identidade e as postagens anteriores como "não repetir", sem travessão; dados do usuário dentro de `DADOS_NAO_CONFIAVEIS`; `ARRAY_TASKS` não inclui `posts`; validação recusa menos de 5, modelo fora de ordem, `lista` sem itens, legenda vazia; `preflight('posts')` exige o anúncio.
- [ ] Implementar; `ENGINE_LABELS.posts = 'Postagens do anúncio'`.

### Task 6: Janela e integração

**Files:** Create `components/post-studio.tsx`; Modify `app/page.tsx`, `app/globals.css`

**Interfaces:** Consumes Tasks 2 a 5. `PostStudio({p,adIndex,onClose,onGenerate})`.

- [ ] `applyResult` recebe `input` e grava com `addPostSet`; `callAI` usa esforço `low` para `posts`.
- [ ] Botão "Gerar postagem" no cartão do anúncio; abre a janela e dispara a geração se não houver postagens.
- [ ] Janela: identidade (logo, cores, aviso sem logo), alternância 4:5/1:1, seleção, "Baixar" por cartão, "Baixar selecionadas (ZIP)", "Copiar legenda", "Gerar outros 5", aviso das 4 rodadas.
- [ ] Verificação visual no navegador do app com 3 paletas e textos longos; mobile.

### Task 7: Documentação e entrega

**Files:** Modify `README.md`

- [ ] README (seção "Postagens do anúncio"); `npm test`, `tsc`, `build`; commit; push; checar a Vercel.
