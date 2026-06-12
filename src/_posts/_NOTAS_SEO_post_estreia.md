# Notas de SEO — Post de Estreia (didático, não vai pro build)

Este arquivo começa com `_`, então o Bridgetown ignora ele no build. É material
de estudo: explica POR QUE cada decisão de SEO foi tomada no post
`2026-06-12-instalando-ruby-rails-mac-mise.md`. Apaga quando não precisar mais.

---

## 1. Title tag

**Escolhido:** `Instalar Ruby 3.3 e Rails 8 no Mac com mise (2026)` (51 caracteres)

Por quê:
- **≤ 60 caracteres** — o Google trunca títulos por largura em pixels (~600px),
  não por contagem exata, mas 50–60 chars é a faixa segura pra não cortar. 51
  está confortável.
- **Keyword na frente** — começa com o verbo de intenção ("Instalar") + as
  keywords mais buscadas ("Ruby 3.3", "Rails 8", "Mac", "mise"). O Google dá
  mais peso ao começo do título, e o usuário decide o clique nos primeiros
  caracteres.
- **Casa com a intenção de busca** — quem digita isso quer um tutorial. O título
  promete exatamente isso, sem clickbait.
- **`(2026)`** — sinaliza frescor. Tutorial de setup envelhece rápido; o ano no
  título melhora CTR porque o usuário quer conteúdo atual.

> Nota: no `<title>` que o Google mostra, o tema do blog geralmente adiciona
> `| Blog do Zd4`. Por isso mantive o título do post curto, pra sobrar espaço
> pro nome do blog sem truncar.

## 2. Meta description

**Escolhida** (158 caracteres):
`Guia prático pra instalar Ruby 3.3 e Rails 8 no Mac usando mise, sem mexer no Ruby do sistema nem usar sudo. Passo a passo testado em 2026.`

Por quê:
- **155–160 chars** é o ideal pra desktop (~920px). 158 está no ponto.
- **Front-load** — a informação essencial ("instalar Ruby 3.3 e Rails 8 no Mac
  usando mise") está nos primeiros ~110 chars, que é o que aparece no mobile.
- **Não é fator de ranqueamento direto**, mas é a maior alavanca de CTR. Por
  isso ela vende um benefício ("sem mexer no Ruby do sistema nem usar sudo") —
  fala da dor de quem busca.
- Repete keywords naturais (Ruby, Rails 8, Mac, mise) sem stuffing.

## 3. Slug

**Escolhido:** `instalando-ruby-rails-mac-mise`
(arquivo: `2026-06-12-instalando-ruby-rails-mac-mise.md`)

Por quê:
- Curto, só keywords, separado por hífen (padrão de URL amigável).
- Cortei palavras de ligação ("no", "com", "e", "8", "3.3") pra ficar enxuto.
  Números de versão em slug envelhecem mal e poluem; mantive só os termos
  estáveis.
- O Bridgetown usa o nome do arquivo (sem a data) como slug por padrão.

## 4. Keywords-alvo

Primária + long-tails escolhidas:

1. **instalar rails 8 mac** (primária — alto intent, tutorial)
2. **mise ruby version manager** (long-tail, ferramenta específica)
3. **ruby on rails ambiente macos 2026** (long-tail com frescor)
4. **mise vs rbenv vs asdf** (long-tail comparativo — captura quem ainda decide)
5. **instalar ruby 3.3 mac** (long-tail de versão)

Secundárias que aparecem natural no corpo: "sudo gem install" (intenção
negativa — gente procurando por que NÃO usar), "ruby do sistema macos",
"mise activate zsh".

Estratégia: a keyword comparativa (#4) é ouro porque tem MENOS concorrência que
"instalar rails mac" puro, e quem busca comparação está em fase de decisão —
exatamente o público que a seção da tabela atende.

## 5. Hierarquia de headings (H1/H2/H3)

- **H1** — vem do `title` do frontmatter (o layout renderiza 1 H1 por página,
  nunca colocar `#` no corpo, senão vira dois H1 = problema de SEO).
- **H2** estruturam o post por etapa de raciocínio:
  1. Por que não usar o Ruby que já vem no Mac
  2. mise, rbenv ou asdf? Escolhendo o gerenciador de versões
  3. Passo a passo: instalando tudo no Mac
  4. Conferindo: deu tudo certo?
  5. Por que isso vale a pena: o que o Rails 8 te entrega
  6. Próximos passos
- **H3** dentro de "Passo a passo" numeram os 5 comandos (1. Instalar o mise,
  2. Ativar no shell, etc.) — isso ajuda featured snippet de passo-a-passo.

Por quê: heading em forma de pergunta ("deu tudo certo?", "Por que não usar...")
é amigável pra featured snippet e pra AI Overviews, que extraem H2 interrogativo
+ resposta curta logo abaixo.

## 6. Otimização pra Featured Snippet

Dois alvos plantados de propósito:

- **Tabela** (mise vs rbenv vs asdf) — tabelas são fortíssimas pra snippet de
  comparação. Colunas curtas, valores escaneáveis, negrito no vencedor.
- **Lista numerada** (os 5 passos, via H3 numerados + blocos `bash`) — Google
  adora extrair "how to" numerado. Cada passo tem um comando isolado e copiável.

Bônus: a lista de 3 motivos em "Por que não usar o Ruby do sistema" é uma lista
ordenada curta — formato que o Google extrai pra snippet de "por que".

## 7. Outros sinais on-page

- **Comandos em bloco ```bash`** — além de UX, dá semântica de código pro
  crawler e melhora dwell time (gente copia e cola, fica na página).
- **Internal linking** — ainda fraco neste post (é o primeiro do blog, não tem
  pra onde linkar). O gancho do "próximo post" já prepara o internal link que
  vai ser adicionado quando o post 2 sair. IMPORTANTE: voltar aqui e linkar.
- **Links externos** — Homebrew (brew.sh) com âncora descritiva. Link externo
  pra fonte de autoridade é sinal positivo.
- **Alt text** — este post não tem imagens. Quando adicionar (ex: screenshot do
  `ruby --version`), usar alt descritivo com keyword, ex:
  `alt="terminal mostrando ruby 3.3.11 após instalar com mise no Mac"`.

---

## O que ainda falta (backlog de SEO técnico do blog)

Isto é estrutural, não dá pra resolver só no post:

1. **Plugin `bridgetown-seo-tag`** (alvo: Sprint E) — gera automaticamente as
   meta tags (`<title>`, `og:`, `twitter:`, `description`) a partir do
   frontmatter. Sem ele, os campos `title`/`description` que eu preenchi NÃO
   viram `<meta>` no `<head>` sozinhos. Hoje eles existem mas podem não estar
   sendo renderizados — checar o layout `<head>`.
2. **Sitemap** — plugin `bridgetown-sitemap` pra gerar `sitemap.xml` e submeter
   no Google Search Console.
3. **`robots.txt`** — garantir que existe e libera o crawl.
4. **Open Graph / Twitter Card** — pra preview bonito quando o link for pro
   LinkedIn (canal principal do Zd4!). Vem junto com o `bridgetown-seo-tag`.
5. **Canonical URL** — definir `url` + `base_path` certos no config pra evitar
   conteúdo duplicado.
6. **Structured data (JSON-LD)** — schema `TechArticle` ou `HowTo` pra esse tipo
   de tutorial. O `HowTo` casa perfeito com os 5 passos e pode render rich result.
7. **Performance / Core Web Vitals** — Bridgetown gera site estático (já é
   rápido), mas vale medir LCP quando tiver imagens.

Prioridade pro LinkedIn: itens 1 e 4 (Open Graph) primeiro, porque o tráfego
inicial do blog vem de lá e preview feio mata o CTR no feed.
