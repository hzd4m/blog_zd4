---
layout: capitulo
title: "Cap. 7 — Roteamento, Controllers e REST"
slug: cap-07-roteamento-controllers-rest
livro_slug: por-que-rails
ordem: 7
tempo_leitura: "32 min"
template_engine: none
permalink: /livros/por-que-rails/cap-07-roteamento-controllers-rest/
---

> 📖 Este capítulo é parte do livro "Por que Rails?" — versão online gratuita.
> Fonte: `~/Desktop/ebooks/Por que Rails?/capitulos/cap_07_roteamento_controllers_rest.md`

# Capítulo 7 — Roteamento, Controllers e REST

> "Uma URL é uma promessa de comportamento." — adaptado de Roy Fielding


> 🎯 **Você vai sair daqui sabendo:**
> - Por que `resources :posts` é uma das linhas mais densas em significado do Rails inteiro
> - Como uma requisição HTTP atravessa `routes.rb`, vira `params`, passa por filters e vira resposta — sem mistério
> - Como blindar seu controller com strong parameters, `rescue_from` e respostas multi-formato (HTML, JSON, Turbo Stream)
> - Quando aninhar rotas, quando NÃO aninhar (a pegadinha clássica que derruba juniores), e como versionar API de verdade
> - O suficiente pra montar uma API REST completa, com testes, em uma tarde
> 📚 **Pré-requisitos:** ter lido Cap. 5 (Anatomia) e Cap. 6 (ActiveRecord). Tenha um terminal aberto e disposição pra rodar `bin/rails routes` toda hora.

> 💬 **Akita, 2007 — palestra "Entendendo Rails":**
>
> > "CUIDADO: Rails NÃO é Scaffold. Scaffold é apenas uma pequena funcionalidade para facilitar prototipação."
>
> Esse aviso de 2007 atravessou 20 anos sem perder uma vírgula. REST chegou só no Rails 2.0 — Akita pegou o final disso. Hoje, o `resources :posts` que vamos dissecar neste capítulo é o **filho direto** do scaffold antigo: a mesma intenção (CRUD pronto), feita do jeito certo (rotas, não código gerado em runtime).

**Pergunta provocativa pra abrir o capítulo:** se eu te dou as URLs `GET /posts`, `POST /posts`, `GET /posts/42`, `PATCH /posts/42`, `DELETE /posts/42` — você consegue, sem ver mais nada, dizer o que cada uma faz, qual controller responde, qual view será renderizada, qual SQL roda no banco e qual helper de URL pode ser usado pra gerar cada link? Em Rails, depois deste capítulo, a resposta é **sim, pra todas as cinco, de cabeça**. Essa é a densidade de informação que REST + convenção empacotam num único `resources :posts`.

---

## 7.1 Por que este capítulo é o ponto de virada

No Cap. 5 você mapeou a estrutura do projeto. No Cap. 6 você domou o ActiveRecord. Agora chega o terceiro vértice do MVC: **a porta de entrada do mundo HTTP**.

Routes + controllers + REST é o lugar onde Rails materializa a maior parte da sua produtividade visível. Uma única linha — `resources :posts` — gera **sete rotas RESTful**, mapeia cada uma pra uma action específica, infere o nome da view, gera helpers de URL nomeados, sabe qual verbo HTTP usar, e ainda combina tudo isso com strong parameters, callbacks e respostas multi-formato.

Compare com o que você teria em outras stacks:
- **Node/Express:** declarar manualmente cada rota, cada middleware, cada helper de URL, cada serializer.
- **Python/Flask:** rotas decoradoras espalhadas, sem inferência de view, sem `params.require/permit` nativo.
- **Java/Spring:** anotações em todo controller (`@GetMapping`, `@PostMapping`, `@PathVariable`, `@RequestBody`...), config XML/yaml extra.
- **Go/Gin:** rotas explícitas, struct binding manual, validação manual.

Rails escolheu o caminho oposto: **a convenção REST é a interface**. Você declara o recurso, o framework deduz o resto. E quando você precisa fugir da convenção, a fuga é cirúrgica — não te força a reescrever tudo.

Domine este capítulo e você sai com a habilidade de **modelar qualquer API ou app web em termos de recursos**. Essa é, talvez, a habilidade mais transferível que Rails te dá.

---

## 7.2 REST em 5 minutos — a tabela mágica

Antes de tocar em código Rails, alinhe vocabulário. REST (Representational State Transfer) é um estilo de arquitetura criado por Roy Fielding na tese de doutorado dele em 2000. A ideia é tratar URLs como **substantivos** (recursos) e verbos HTTP como **verbos** (operações sobre recursos).

| Verbo HTTP | Intenção | Idempotente? | Seguro? |
|------------|----------|--------------|---------|
| `GET`      | Ler      | Sim          | Sim     |
| `POST`     | Criar    | Não          | Não     |
| `PATCH`    | Atualizar (parcial) | Sim | Não |
| `PUT`      | Atualizar (total/substituir) | Sim | Não |
| `DELETE`   | Deletar  | Sim          | Não     |

> **Seguro** = não muda estado no servidor. **Idempotente** = chamar N vezes tem o mesmo efeito de chamar 1 vez (útil pra retry de cliente).

E o mapeamento canônico Rails:

| Verbo  | URL              | Action  | O que faz                       |
|--------|------------------|---------|---------------------------------|
| GET    | /posts           | index   | Lista todos                     |
| GET    | /posts/new       | new     | Form de criação (HTML)          |
| POST   | /posts           | create  | Cria de fato                    |
| GET    | /posts/:id       | show    | Mostra 1 específico             |
| GET    | /posts/:id/edit  | edit    | Form de edição (HTML)           |
| PATCH  | /posts/:id       | update  | Atualiza de fato                |
| DELETE | /posts/:id       | destroy | Apaga                           |

Sete rotas. Sete actions. Uma única linha no `routes.rb`:

```ruby
resources :posts
```

Essa linha é o **tijolo fundamental** do roteamento Rails. Tudo que vem a seguir são variações em torno desse tijolo.

> 🕰️ **Curiosidade histórica — REST entrou de fininho no Rails 2.0**
>
> Quem aprendeu Rails antes de dezembro de 2007 (versão 1.x) não tinha `resources`. As rotas eram declaradas uma a uma, com `map.connect ':controller/:action/:id'` — uma "catch-all route" que despachava qualquer URL pra qualquer controller usando convenção de nome. Funcionava, mas misturava semântica HTTP de qualquer jeito. Em **Rails 2.0**, DHH plugou REST como cidadão de primeira: `map.resources :posts` (o ancestral direto do `resources :posts` atual). Akita, em 2007, pegou exatamente essa virada — e ainda chamava o método de "scaffold REST" em algumas passagens. Em Rails 3.0, o `map.` saiu, e o `resources` virou top-level no bloco `routes.draw`. De lá pra cá: nada de relevante mudou na DSL básica. Vinte anos de estabilidade.

---

## 7.3 `config/routes.rb` por dentro

Esse arquivo é o **mapa do site**. Toda URL pública do seu app passa por aqui — ou não existe. Vamos olhar o que um `rails new posts_app` te dá por default e ir expandindo.

### O arquivo zerado

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Health check (Rails 8 default)
  get "up" => "rails/health#show", as: :rails_health_check

  # Service Worker / manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Defina sua root
  # root "posts#index"
end
```

Três coisas pra notar:

1. **`get "up"`** — endpoint pra load balancer / Kamal verificarem que o app está vivo. Não tem view, retorna 200 se o Rails sobe.
2. **PWA defaults** — Rails 8 entrega esqueleto de Progressive Web App.
3. **`root`** comentado — é a sua "home page", a URL `/`.

### `root` — a primeira rota que você adiciona

```ruby
root "posts#index"
```

Isso traduz `GET /` → `PostsController#index`. Gera o helper `root_path` (= `"/"`) e `root_url` (= `"http://localhost:3000/"`).

### `resources` — a porrada principal

```ruby
resources :posts
```

Equivale a escrever isto (não faça — só pra ilustrar):

```ruby
get    "/posts",          to: "posts#index",   as: :posts
get    "/posts/new",      to: "posts#new",     as: :new_post
post   "/posts",          to: "posts#create"
get    "/posts/:id",      to: "posts#show",    as: :post
get    "/posts/:id/edit", to: "posts#edit",    as: :edit_post
patch  "/posts/:id",      to: "posts#update"
put    "/posts/:id",      to: "posts#update"
delete "/posts/:id",      to: "posts#destroy"
```

Verificar com seus próprios olhos:

```bash
bin/rails routes -g posts
```

Output esperado:

```
       Prefix Verb   URI Pattern                  Controller#Action
        posts GET    /posts(.:format)             posts#index
              POST   /posts(.:format)             posts#create
     new_post GET    /posts/new(.:format)         posts#new
    edit_post GET    /posts/:id/edit(.:format)    posts#edit
         post GET    /posts/:id(.:format)         posts#show
              PATCH  /posts/:id(.:format)         posts#update
              PUT    /posts/:id(.:format)         posts#update
              DELETE /posts/:id(.:format)         posts#destroy
```

A coluna **Prefix** é o que vira o nome do helper: `posts_path`, `new_post_path`, `edit_post_path(post)`, `post_path(post)`. Esse helper você usa em controllers, views, mailers — em **qualquer** lugar.

### Limitando o conjunto de rotas

Nem todo recurso quer as sete. Use `only` ou `except`:

```ruby
resources :posts, only: [:index, :show]                  # só GET /posts e GET /posts/:id
resources :users, except: [:destroy]                     # tudo menos DELETE
resources :sessions, only: [:new, :create, :destroy]     # padrão pra login/logout
```

### `resource` (singular) — quando não tem `:id`

Há recursos dos quais existe **um único por contexto**. O perfil do usuário logado, o carrinho da sessão, a configuração da conta. Para esses, `resource` (sem `s`):

```ruby
resource :perfil
```

Gera **seis** rotas (sem `index`, porque não faz sentido listar "um"):

| Verbo  | URL          | Action  | Helper          |
|--------|--------------|---------|-----------------|
| GET    | /perfil/new  | new     | `new_perfil_path` |
| POST   | /perfil      | create  | `perfil_path`   |
| GET    | /perfil      | show    | `perfil_path`   |
| GET    | /perfil/edit | edit    | `edit_perfil_path` |
| PATCH  | /perfil      | update  | `perfil_path`   |
| DELETE | /perfil      | destroy | `perfil_path`   |

Note que **o controller continua no plural** (`PerfisController`). É só a URL que perde o `:id` e o `index`. Pegadinha clássica: muita gente esquece e cria `PerfilController` (singular), e Rails reclama.

### `member` e `collection` — quando você precisa de mais que sete

Às vezes você precisa de uma action extra que opera **sobre um recurso específico** ou **sobre toda a coleção**. `resources` aceita `member` e `collection`:

```ruby
resources :posts do
  member do
    patch :publicar           # PATCH /posts/:id/publicar → posts#publicar
    patch :arquivar           # PATCH /posts/:id/arquivar → posts#arquivar
  end

  collection do
    get :rascunhos            # GET /posts/rascunhos → posts#rascunhos
    get :populares            # GET /posts/populares → posts#populares
  end
end
```

Helpers gerados: `publicar_post_path(post)`, `arquivar_post_path(post)`, `rascunhos_posts_path`, `populares_posts_path`.

**Regra mental:**
- `member` → URL tem `:id` → opera sobre **um** record.
- `collection` → URL não tem `:id` → opera sobre **muitos** records.

> ⚠️ **Cuidado — REST puro evita member/collection custom**
>
> Toda vez que você adiciona `member :publicar`, está abrindo exceção ao REST canônico. Quando isso vira hábito, seu `routes.rb` cresce em ações verbais e perde a clareza. **Alternativa RESTful:** trate "publicação" como um sub-recurso: `resources :posts do resource :publicacao, only: [:create, :destroy] end`. Vira `POST /posts/:post_id/publicacao` (publica) e `DELETE /posts/:post_id/publicacao` (despublica). É mais Rails. É mais REST. É mais fácil de testar. Use `member` quando a action *realmente* é uma operação especial sem semântica de recurso (ex.: `:exportar_pdf`).

### Nested resources — quando aninhar e quando NÃO

Recursos podem ser aninhados pra refletir hierarquia:

```ruby
resources :projetos do
  resources :tarefas
end
```

Gera:

```
GET    /projetos/:projeto_id/tarefas           → tarefas#index
POST   /projetos/:projeto_id/tarefas           → tarefas#create
GET    /projetos/:projeto_id/tarefas/new       → tarefas#new
GET    /projetos/:projeto_id/tarefas/:id       → tarefas#show
GET    /projetos/:projeto_id/tarefas/:id/edit  → tarefas#edit
PATCH  /projetos/:projeto_id/tarefas/:id       → tarefas#update
DELETE /projetos/:projeto_id/tarefas/:id       → tarefas#destroy
```

E rotas pro projeto:

```
GET /projetos, POST /projetos, GET /projetos/:id, etc.
```

Note `:projeto_id` (foreign key explícita na URL). Helpers: `projeto_tarefas_path(projeto)`, `projeto_tarefa_path(projeto, tarefa)`, `edit_projeto_tarefa_path(projeto, tarefa)`.

**Quando aninhar:**
- A entidade filho **só existe** dentro do contexto do pai (tarefa só faz sentido dentro de projeto).
- Você quer **listar** filhos sempre filtrados pelo pai (`/projetos/3/tarefas`).
- Permissões cascateiam: quem pode ver o projeto pode ver as tarefas dele.

**Quando NÃO aninhar (pegadinha clássica):**

```ruby
# RUIM — aninhamento profundo demais
resources :empresas do
  resources :departamentos do
    resources :equipes do
      resources :funcionarios do
        resources :tarefas
      end
    end
  end
end
# Rota gerada: /empresas/1/departamentos/2/equipes/3/funcionarios/4/tarefas/5/edit
# URL ilegível. Helper ilegível. Vai te morder.
```

A **regra de Jamis Buck** (engenheiro Rails clássico): **nunca aninhe mais de um nível**. Pra hierarquias profundas, use rotas planas (`/tarefas/:id`) e busque o pai via foreign key.

Outra prática: **`shallow: true`**. Aninha só onde precisa do contexto do pai (index, new, create) e plana onde não (show, edit, update, destroy):

```ruby
resources :projetos do
  resources :tarefas, shallow: true
end
```

Gera:

```
GET    /projetos/:projeto_id/tarefas         → tarefas#index
POST   /projetos/:projeto_id/tarefas         → tarefas#create
GET    /projetos/:projeto_id/tarefas/new     → tarefas#new
GET    /tarefas/:id                          → tarefas#show     (plana!)
GET    /tarefas/:id/edit                     → tarefas#edit     (plana!)
PATCH  /tarefas/:id                          → tarefas#update   (plana!)
DELETE /tarefas/:id                          → tarefas#destroy  (plana!)
```

Helpers ficam concisos: `tarefa_path(tarefa)` em vez de `projeto_tarefa_path(projeto, tarefa)`.

### `namespace` e `scope` — agrupando rotas

`namespace` prefixa **URL + módulo de controller + helper**:

```ruby
namespace :admin do
  resources :posts
end
```

Gera `/admin/posts` → `Admin::PostsController` → helpers `admin_posts_path`. Você precisa criar `app/controllers/admin/posts_controller.rb`:

```ruby
class Admin::PostsController < ApplicationController
  # ...
end
```

`scope` é mais flexível e prefixa **só a URL** (não muda módulo nem helper):

```ruby
scope "/admin" do
  resources :posts                # /admin/posts → posts#index (não Admin::Posts)
end
```

Ou só helper:

```ruby
scope as: :admin do
  resources :posts                # /posts mas helper admin_posts_path
end
```

Ou só módulo:

```ruby
scope module: "admin" do
  resources :posts                # /posts → Admin::PostsController, helper posts_path
end
```

`namespace :x` = `scope "/x", as: :x, module: "x"`. Use `namespace` quando os três batem; use `scope` quando você precisa de uma combinação diferente.

### `concern` — rotas reutilizáveis

Imagine que vários recursos podem ter comentários: `posts`, `fotos`, `videos`. Em vez de repetir `resources :comments` em cada um:

```ruby
concern :commentable do
  resources :comentarios, only: [:index, :create, :destroy]
end

resources :posts,  concerns: :commentable
resources :fotos,  concerns: :commentable
resources :videos, concerns: :commentable
```

Cada um ganha as rotas de comentário aninhadas. Combina lindamente com `belongs_to :commentable, polymorphic: true` no model.

### Constraints — restringindo quando uma rota casa

Você pode condicionar rotas a subdomínio, formato, regex no parâmetro, ou qualquer lambda:

```ruby
# Subdomain
constraints subdomain: "api" do
  resources :posts                # api.seuapp.com/posts
end

# Regex em parâmetro
resources :users, constraints: { id: /\d+/ }   # só casa IDs numéricos

# Format
get "feed", to: "feeds#show", constraints: { format: :rss }

# Lambda
constraints ->(req) { req.headers["X-Tenant"].present? } do
  resources :workspaces
end
```

### Catch-all e direct URLs

Pra páginas legacy ou redirects:

```ruby
get "/blog/*path", to: redirect("/posts/%{path}")   # /blog/qualquer-coisa → /posts/qualquer-coisa
get "/sobre",      to: "paginas#sobre"               # rota literal
get "*unmatched",  to: "errors#not_found"            # último fallback
```

`direct` define helpers customizados:

```ruby
direct :homepage do
  "https://seusite.com"
end
# Agora homepage_url retorna "https://seusite.com" em qualquer view
```

---

## 7.4 URL helpers — `_path` vs `_url`

Para cada rota nomeada, Rails gera **dois** helpers:

- **`_path`** retorna caminho relativo: `/posts/42`. Use em **views e links internos**.
- **`_url`** retorna URL completa: `http://seusite.com/posts/42`. Use em **emails, redirects externos, webhooks, callbacks de OAuth**.

```ruby
posts_path                  # "/posts"
post_path(@post)            # "/posts/42"
post_path(id: 42)           # "/posts/42"
post_url(@post)             # "http://localhost:3000/posts/42"
edit_post_path(@post)       # "/posts/42/edit"
new_post_path               # "/posts/new"
```

Query string vai como hash:

```ruby
posts_path(page: 2, tag: "rails")   # "/posts?page=2&tag=rails"
```

Helpers aceitam o objeto inteiro (chama `to_param`, que por default devolve `id`):

```ruby
post_path(@post)            # equivalente a post_path(@post.id)
```

Sobrescrevendo `to_param` no model você consegue URLs com slug:

```ruby
class Post < ApplicationRecord
  def to_param
    "#{id}-#{titulo.parameterize}"   # ex: "42-introducao-a-rails"
  end
end

post_path(@post)            # "/posts/42-introducao-a-rails"
# `Post.find(params[:id])` ainda funciona porque o "42-..." vira inteiro 42 quando convertido
```

### Em vez de hardcoding, use os helpers

```erb
<%# RUIM %>
<a href="/posts/<%= @post.id %>">Ver</a>

<%# BOM %>
<%= link_to "Ver", post_path(@post) %>

<%# Mesma coisa, mais idiomática (Rails infere o path do model) %>
<%= link_to "Ver", @post %>
```

Quando você renomeia uma rota, os helpers continuam apontando pro lugar certo. Hardcoded paths quebram. Sempre os helpers.

---

## 7.5 Controllers — anatomia

Tudo que chega via HTTP cai num controller. Cada controller herda de `ApplicationController` (ou de `ActionController::API` em apps `--api`) e tem **uma action por endpoint**.

### O esqueleto

```ruby
# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  before_action :set_post, only: [:show, :edit, :update, :destroy]

  def index
    @posts = Post.all
  end

  def show
    # @post já está populado pelo before_action
  end

  def new
    @post = Post.new
  end

  def create
    @post = Post.new(post_params)
    if @post.save
      redirect_to @post, notice: "Post criado com sucesso."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: "Post atualizado."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post.destroy
    redirect_to posts_path, notice: "Post apagado.", status: :see_other
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:titulo, :corpo, :publicado)
  end
end
```

Esse é o **CRUD canônico** de Rails. Memorize a forma — você vai escrever isso centenas de vezes.

Pontos importantes:
- Variáveis de instância (`@post`) são automaticamente disponíveis na view. Variáveis locais (`post`) não.
- `redirect_to` faz 302 e o browser segue (nova request).
- `render :template` envia template **na mesma request** (sem novo GET). Use pra mostrar erros de form.
- `status: :unprocessable_entity` (422) sinaliza pra Turbo que o form falhou e o Hotwire injeta o HTML de volta. Sem isso, Turbo ignora.
- `status: :see_other` (303) em `destroy` é necessário pro Turbo seguir o redirect após DELETE (browsers convertem 302 pra GET, mas a especificação dita que DELETE+redirect deve ser 303).

### `params` — o dicionário da requisição

`params` é um `ActionController::Parameters` (parecido com um hash, mas com superpoderes). Mistura **três fontes**:

1. **Path params** — `/posts/:id` → `params[:id]`
2. **Query string** — `/posts?page=2&tag=rails` → `params[:page]`, `params[:tag]`
3. **Body** — POST/PATCH com `application/x-www-form-urlencoded` ou `application/json` → vira hash em `params`

```ruby
# GET /posts/42?include=user&page=2
# Body vazio
params[:id]       # "42"     (sempre string, mesmo de :id numérico)
params[:include]  # "user"
params[:page]     # "2"

# POST /posts com body {"post": {"titulo": "Oi", "corpo": "..."}}
params[:post][:titulo]   # "Oi"
params[:post][:corpo]    # "..."
```

Ver tudo: `params.inspect` ou olhar log de dev (Rails imprime `Parameters:` em cada request).

### Strong parameters — `require` e `permit`

Em Rails 3, você podia fazer:

```ruby
Post.create(params[:post])
```

Se o usuário mandasse `params[:post][:admin] = true` no body, ele virava admin. Vulnerabilidade **gigante**: mass assignment. Em **Rails 4** isso foi resolvido com **strong parameters**, e o filtro virou obrigatório.

```ruby
def post_params
  params.require(:post).permit(:titulo, :corpo, :publicado)
end
```

Quebrando:
- `params.require(:post)` — exige chave `:post`. Se não vier, levanta `ActionController::ParameterMissing` (vira 400).
- `.permit(:titulo, :corpo, :publicado)` — explicitamente libera essas três chaves. Outras são **silenciosamente descartadas**.

Tentativa maliciosa:

```ruby
# Cliente manda: post: { titulo: "X", corpo: "Y", admin: true }
post_params
# => #<ActionController::Parameters {"titulo"=>"X", "corpo"=>"Y"} permitted: true>
# admin sumiu silenciosamente
```

### Permit aninhado, arrays, nested attributes

Realidade tem hash dentro de hash:

```ruby
# Estrutura recebida:
# {
#   "post": {
#     "titulo": "X",
#     "tags": ["rails", "ruby"],
#     "metadata": { "fonte": "blog", "score": 5 },
#     "comentarios_attributes": [
#       { "autor": "Ana", "texto": "Top!" },
#       { "autor": "João", "texto": "Idem." }
#     ]
#   }
# }

def post_params
  params.require(:post).permit(
    :titulo,
    tags: [],                                      # array de scalars
    metadata: [:fonte, :score],                    # hash com chaves fixas
    comentarios_attributes: [:autor, :texto]       # array de hashes (nested)
  )
end
```

Regras:
- `:campo` — libera scalar (string, número, bool).
- `campo: []` — libera array de scalars.
- `campo: [:a, :b]` — libera hash com chaves `:a` e `:b`.
- `campo_attributes: [:a, :b]` — libera array de hashes (pra usar com `accepts_nested_attributes_for` no model).

### `permit!` — desligar a proteção (perigoso)

```ruby
params[:post].permit!   # libera TUDO — só use se SOUBER que confia 100%
```

99% dos casos: nunca use. Toler-zero: use só em rotas administrativas autenticadas e ainda assim com nojo.

> ⚠️ **Cuidado — `require` vazio te quebra**
>
> Se o cliente manda `{}` em vez de `{ "post": { ... } }`, `params.require(:post)` levanta `ActionController::ParameterMissing`. Em apps web, Rails converte isso pra 400 automaticamente. Em apps API com `rescue_from ActiveRecord::RecordNotFound`, você pode querer tratar `ParameterMissing` separado pra retornar JSON elegante em vez de stack trace. Veremos no 7.7.

---

## 7.6 Filters — `before_action`, `after_action`, `around_action`

Filters são código que roda **antes**, **depois** ou **envolvendo** uma action. Usados pra autenticação, autorização, set-up de variáveis, logging, instrumentação.

```ruby
class PostsController < ApplicationController
  before_action :autenticar_usuario!
  before_action :set_post,        only: [:show, :edit, :update, :destroy]
  before_action :verificar_dono,  only: [:edit, :update, :destroy]

  after_action  :registrar_acesso, only: [:show]

  around_action :medir_tempo, only: [:index]

  # actions...

  private

  def autenticar_usuario!
    redirect_to login_path unless current_user
  end

  def set_post
    @post = Post.find(params[:id])
  end

  def verificar_dono
    redirect_to posts_path, alert: "Acesso negado" unless @post.user == current_user
  end

  def registrar_acesso
    @post.increment!(:views_count) if @post && response.successful?
  end

  def medir_tempo
    inicio = Time.current
    yield                                                # roda a action
    Rails.logger.info("index levou #{Time.current - inicio}s")
  end
end
```

Comportamentos importantes:
- Filters herdam: `ApplicationController#before_action :autenticar` vale pra **todos** os filhos.
- `before_action` que faz `render` ou `redirect_to` **interrompe** a cadeia: action principal nem roda.
- `after_action` roda **só se a action não levantou exceção**.
- `around_action` recebe a action como bloco (`yield`).
- Ordem importa: filters rodam na ordem que você declarou.

### `skip_before_action` — desligando herdado

```ruby
class ApplicationController < ActionController::Base
  before_action :autenticar_usuario!
end

class SessionsController < ApplicationController
  skip_before_action :autenticar_usuario!, only: [:new, :create]
  # login não pode exigir login. obviamente.
end
```

### `if` / `unless` em filter — execução condicional

```ruby
before_action :verificar_assinatura, if: -> { current_user&.plano_pago? }
before_action :forcar_2fa,           unless: :otp_validado?

private

def otp_validado?
  session[:otp_at] && session[:otp_at] > 1.hour.ago.to_i
end
```

> 🎯 **Princípio atemporal — Akita, 2007:**
>
> > "Se não vale a pena testar, para que estamos codificando?"
>
> Filters são particularmente fáceis de esquecer no teste. Você muda a action e o `before_action :autorizar` continua rodando — mas você nunca cobriu o caminho de "não autorizado". Teste a action E teste a filter (passe um `current_user` que NÃO seja dono, espere 403 ou redirect). Cada filter é uma porta — porta não testada é porta arrombada.

---

## 7.7 `rescue_from` — tratamento global de exceções

Em vez de espalhar `begin/rescue` em cada action, declare uma vez no controller:

```ruby
class ApplicationController < ActionController::Base
  rescue_from ActiveRecord::RecordNotFound,    with: :nao_encontrado
  rescue_from ActionController::ParameterMissing, with: :parametros_invalidos
  rescue_from CanCan::AccessDenied,            with: :acesso_negado   # se usar CanCan

  private

  def nao_encontrado
    respond_to do |format|
      format.html { render "errors/not_found", status: :not_found }
      format.json { render json: { error: "não encontrado" }, status: :not_found }
    end
  end

  def parametros_invalidos(exception)
    render json: { error: "parâmetro ausente: #{exception.param}" }, status: :bad_request
  end

  def acesso_negado
    redirect_to root_path, alert: "Você não tem permissão pra acessar isso."
  end
end
```

Boa prática: declarar no `ApplicationController` pra centralizar comportamento de erro. Cada controller filho ganha automaticamente.

---

## 7.8 `respond_to` — uma action, vários formatos

Mesma action pode servir HTML (para o browser), JSON (para mobile/SPA externa) e Turbo Stream (pra updates parciais). `respond_to` é o switch.

```ruby
def index
  @posts = Post.all

  respond_to do |format|
    format.html                                         # renderiza index.html.erb
    format.json { render json: @posts }
    format.csv  { send_data gerar_csv(@posts), filename: "posts.csv" }
  end
end

def create
  @post = Post.new(post_params)

  respond_to do |format|
    if @post.save
      format.html { redirect_to @post, notice: "Post criado." }
      format.json { render json: @post, status: :created, location: @post }
      format.turbo_stream  # renderiza app/views/posts/create.turbo_stream.erb
    else
      format.html { render :new, status: :unprocessable_entity }
      format.json { render json: { errors: @post.errors }, status: :unprocessable_entity }
    end
  end
end
```

Como Rails decide qual bloco rodar?
1. Olha o header `Accept` da requisição (`Accept: application/json` → JSON).
2. Olha a extensão na URL (`/posts.json` → JSON).
3. Default: HTML.

Pra forçar via URL:
```
GET /posts          → HTML
GET /posts.json     → JSON
GET /posts.csv      → CSV
```

### Renderizando JSON elegante

Para API séria, `render json: @post` chama `@post.to_json` que serializa **tudo** do model (incluindo campos sensíveis tipo `password_digest`). Pra controle fino:

```ruby
# Opção 1 — incluir/excluir manual
render json: @post.as_json(only: [:id, :titulo, :corpo], include: { user: { only: [:id, :nome] } })

# Opção 2 — sobrescrever as_json no model
class Post < ApplicationRecord
  def as_json(options = {})
    super(options.merge(only: [:id, :titulo, :corpo, :created_at]))
  end
end

# Opção 3 — usar Jbuilder (default no Rails)
# app/views/posts/show.json.jbuilder
json.extract! @post, :id, :titulo, :corpo, :created_at
json.url      post_url(@post, format: :json)
json.autor do
  json.id   @post.user.id
  json.nome @post.user.nome
end

# Opção 4 — gem dedicada: ActiveModel::Serializers, Alba, jsonapi-rb
```

Pra apis pequenas, Jbuilder ou `as_json` resolvem. Pra projetos sérios, Alba é o queridinho moderno (rápido e simples).

---

## 7.9 Modo `--api` — ApplicationController vs ActionController::API

`rails new minha_api --api` gera projeto enxuto: sem views, sem assets, sem CSRF nas requests. Diferenças do modo full-stack:

| Aspecto | App full | App `--api` |
|---------|----------|-------------|
| Controller base | `ActionController::Base` | `ActionController::API` |
| Middlewares de sessão/cookies | Sim | Não |
| CSRF protection | Sim | Não (autentique por token) |
| Helpers de view | Sim | Não |
| `app/views` | Sim | Não (só `.jbuilder` ou JSON puro) |
| Layout HTML | Sim | Não |

`ActionController::API` é **mais leve** porque pula middlewares e mixins que não fazem sentido sem HTML. Em app full-stack você pode ainda assim ter controllers de API herdando dele:

```ruby
# app/controllers/api/base_controller.rb
class Api::BaseController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :nao_encontrado

  private

  def nao_encontrado
    render json: { error: "não encontrado" }, status: :not_found
  end
end

# app/controllers/api/v1/posts_controller.rb
class Api::V1::PostsController < Api::BaseController
  def index
    render json: Post.all
  end
end
```

E no routes:

```ruby
namespace :api do
  namespace :v1 do
    resources :posts
  end
end
```

Gera `/api/v1/posts` → `Api::V1::PostsController#index`.

### Versionamento de API

A regra atemporal: **APIs públicas devem ser versionadas**. Por quê? Porque quando você mudar o JSON de output, clientes mobile/parceiros vão estar usando versões antigas há meses. Sem versionamento, qualquer mudança quebra produção alheia.

Três estratégias:

| Estratégia | Como | Quando usar |
|------------|------|-------------|
| **URL versionada** | `/api/v1/posts`, `/api/v2/posts` | Mais clara, mais comum. **Default Rails.** |
| **Header Accept** | `Accept: application/vnd.seuapp.v1+json` | Mais "RESTful puro", mais difícil de testar com curl |
| **Subdomain** | `v1.api.seuapp.com` | Útil quando rotear pra app diferente |

URL versionada vence em 95% dos casos por simplicidade.

> 🔄 **Antes vs Depois — `respond_to`**
>
> | Era (Rails 2.x) | É (Rails 8.1) |
> |-----------------|---------------|
> | `respond_to :html, :xml` no topo do controller | `respond_to do |format| ... end` por action OR class-level via `respond_to` (mantido) |
> | XML (`.rxml`) bombando | XML ainda existe via `*.xml.builder`, mas raríssimo. **JSON dominou.** |
> | RJS (`.rjs`) pra atualizar HTML via JS | Morto. **Turbo Stream** (`.turbo_stream.erb`) pega o lugar. |
> | `format.iphone { ... }` (gambiarra de mobile) | Mobile vira API consumidora (`format.json`) ou app nativa via Hotwire Native |

---

## 7.10 O ciclo de vida de uma request — desta vez detalhado

Você já viu no Cap. 5 a versão macro. Agora a versão **detalhada do ponto de vista do controller**:

```
1. Browser → POST /posts (body: post[titulo]=Oi&post[corpo]=...)
   Headers: Cookie, Accept, X-CSRF-Token, etc.
       ↓
2. Puma recebe a request, passa pro Rack
       ↓
3. Middlewares (em ordem):
       Rack::Sendfile, ActionDispatch::ShowExceptions, Logger,
       ActionDispatch::Cookies, ActionDispatch::Session::CookieStore,
       ActionDispatch::Flash, ActionDispatch::ParamsParser (Rails 5+: integrado),
       Rack::Head, ActionDispatch::Static, etc.
       → cada um pode interceptar (ex: Static serve /public direto)
       → Params são parseados (body → params hash)
       → Session é desserializada do cookie
       → CSRF token é verificado (pula em GET e em formato JSON com config)
       ↓
4. Router (config/routes.rb):
       POST /posts → "posts#create"
       params[:controller] = "posts", params[:action] = "create"
       ↓
5. Rails instancia PostsController.new
       ↓
6. ApplicationController#process_action
       → roda before_action callbacks NA ORDEM declarada
       → se algum faz render/redirect, INTERROMPE
       ↓
7. PostsController#create executa:
       @post = Post.new(post_params)
       @post.save
       (ActiveRecord roda validations, callbacks, gera SQL)
       redirect_to @post
       ↓
8. Rails registra a resposta:
       → status, headers, body
       → roda after_action callbacks
       ↓
9. Middlewares na ordem REVERSA processam a resposta
       (ex: Cookies adiciona Set-Cookie no header,
        Flash limpa mensagens consumidas, Logger escreve log)
       ↓
10. Rack devolve pro Puma → Puma serializa em HTTP/1.1 → Browser recebe 302
       ↓
11. Browser segue Location: /posts/42 → nova request começa do passo 1
```

Tudo isso em **milissegundos**. Mas vale entender — quando algo dá errado, você sabe onde olhar.

---

## 7.11 Pegadinhas reais

1. **`render` vs `redirect_to`** — chamar os dois na mesma action levanta `DoubleRenderError`. Sempre `return` depois de redirect/render condicional:
   ```ruby
   redirect_to login_path and return unless current_user
   ```

2. **`destroy` retornando 302 em vez de 303** — Turbo (Rails 7+) precisa de 303 em destroy:
   ```ruby
   redirect_to posts_path, status: :see_other
   ```
   Sem `status:`, o link com `data-turbo-method="delete"` redireciona pra GET... do mesmo `/posts/:id` que acabou de ser deletado → 404.

3. **`PATCH` vs `PUT`** — Rails aceita os dois pra `update`. **Use PATCH.** PUT semanticamente substitui o recurso inteiro; PATCH atualiza parcial. APIs públicas devem expor PATCH; PUT é resquício histórico.

4. **CSRF em endpoints JSON** — `protect_from_forgery` (default) verifica token CSRF em POST/PATCH/DELETE. Em endpoint JSON pra app mobile (que não tem cookie), você vai ter erro 422. Solução: autenticar por token + `skip_before_action :verify_authenticity_token` (ou herdar de `ActionController::API`).

5. **`params[:id]` é sempre string** — `params[:id] == 42` é `false`. Use `Post.find(params[:id])` (Rails converte) ou `params[:id].to_i`.

6. **`current_user` nil dentro de filter** — se autenticação não rodou antes (ordem de filters), `current_user` será nil. Cheque a ordem. Use `prepend_before_action` pra forçar primeira posição:
   ```ruby
   prepend_before_action :autenticar_usuario!
   ```

7. **Nested resources com `params[:projeto_id]` esquecido** — em `/projetos/3/tarefas`, é `params[:projeto_id]` (e `params[:id]` se for show/edit). Esqueci a foreign key → tarefa salva sem projeto.

8. **Strong params com array de IDs (multi-select)** — checkbox múltiplo manda `params[:post][:tag_ids] = ["1","2","3"]`. Permit:
   ```ruby
   params.require(:post).permit(:titulo, tag_ids: [])
   ```
   Sem o `[]`, o array é descartado silenciosamente.

9. **`rescue_from Exception`** — captura literalmente tudo, **inclusive** SystemExit, Interrupt, exceções de SO. Use `StandardError` (que é o que `rescue` sem classe pega). Melhor ainda: capture exceções específicas.

10. **`respond_to` sem bloco** (declaração) é diferente de `respond_to do |f|`:
    ```ruby
    respond_to :html, :json     # class-level: aceita esses formatos no controller inteiro
    
    def show
      respond_to do |format|    # action-level: decide o que fazer por formato
        format.html
        format.json { render json: @post }
      end
    end
    ```

11. **Helpers de URL fora de view/controller** — em jobs, mailers, services, você precisa incluir manualmente:
    ```ruby
    class Notificador
      include Rails.application.routes.url_helpers

      def link_pro_post(post)
        post_url(post, host: "seusite.com")   # _url precisa de host
      end
    end
    ```

12. **`bin/rails routes` vs `bin/rails routes -g posts`** — em apps grandes, o `routes` puro vomita 500 linhas. Use `-g` (grep) ou `-c` (controller):
    ```bash
    bin/rails routes -g admin
    bin/rails routes -c PostsController
    bin/rails routes --expanded     # output em modo tabela vertical, mais legível
    ```

---

## 7.12 Lab — API REST de Projetos e Tarefas

### Objetivo

Construir uma **API REST completa** pra gerenciar Projetos e suas Tarefas, exercitando **tudo** que vimos: `resources`, nested resources, strong params, filters, `rescue_from`, `respond_to` HTML+JSON, e testes de controller.

### Especificação funcional

- Um **Projeto** tem nome, descrição, e várias tarefas.
- Uma **Tarefa** tem título, descrição, status (`pendente`, `em_andamento`, `concluida`), prazo, e pertence a um projeto.
- Endpoints REST completos pros dois recursos.
- Tarefas são **nested em projetos** (com `shallow: true` pra evitar URLs longas):
  - `GET /projetos/:projeto_id/tarefas` — lista tarefas do projeto
  - `POST /projetos/:projeto_id/tarefas` — cria tarefa no projeto
  - `GET /tarefas/:id`, `PATCH /tarefas/:id`, `DELETE /tarefas/:id` — operações por id
- `before_action :set_projeto` no `TarefasController` (quando precisar).
- Strong params com `permit` corretos.
- `rescue_from ActiveRecord::RecordNotFound` → 404 JSON elegante.
- `respond_to` servindo HTML e JSON.
- **5 testes de controller** cobrindo CRUD básico.
- Extras opcionais: versionamento `api/v1`.

### Passos

#### 1. Crie o projeto

```bash
cd ~/Desktop/ebooks/Por\ que\ Rails\?/labs/cap_07
rails new gerenciador
cd gerenciador
```

#### 2. Gere os models

```bash
bin/rails g model Projeto nome:string descricao:text
bin/rails g model Tarefa titulo:string descricao:text \
                          status:string prazo:date projeto:references
bin/rails db:migrate
```

#### 3. Models com validações e relacionamento

```ruby
# app/models/projeto.rb
class Projeto < ApplicationRecord
  has_many :tarefas, dependent: :destroy

  validates :nome, presence: true, length: { maximum: 100 }
end
```

```ruby
# app/models/tarefa.rb
class Tarefa < ApplicationRecord
  STATUSES = %w[pendente em_andamento concluida].freeze

  belongs_to :projeto

  validates :titulo, presence: true, length: { maximum: 200 }
  validates :status, inclusion: { in: STATUSES }

  scope :pendentes,     -> { where(status: "pendente") }
  scope :em_andamento,  -> { where(status: "em_andamento") }
  scope :concluidas,    -> { where(status: "concluida") }
  scope :atrasadas,     -> { where("prazo < ?", Date.current).where.not(status: "concluida") }

  before_validation :default_status

  private

  def default_status
    self.status ||= "pendente"
  end
end
```

#### 4. Rotas — nested com shallow + namespace de API

```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "projetos#index"

  resources :projetos do
    resources :tarefas, shallow: true
  end

  # Versão API com mesmo esquema
  namespace :api do
    namespace :v1 do
      resources :projetos do
        resources :tarefas, shallow: true
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
```

Confira:

```bash
bin/rails routes -g tarefas
```

Você deve ver:

```
   projeto_tarefas GET    /projetos/:projeto_id/tarefas(.:format)         tarefas#index
                   POST   /projetos/:projeto_id/tarefas(.:format)         tarefas#create
new_projeto_tarefa GET    /projetos/:projeto_id/tarefas/new(.:format)     tarefas#new
       edit_tarefa GET    /tarefas/:id/edit(.:format)                     tarefas#edit
            tarefa GET    /tarefas/:id(.:format)                          tarefas#show
                   PATCH  /tarefas/:id(.:format)                          tarefas#update
                   DELETE /tarefas/:id(.:format)                          tarefas#destroy
```

#### 5. ApplicationController — rescue global

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  rescue_from ActiveRecord::RecordNotFound,        with: :nao_encontrado
  rescue_from ActionController::ParameterMissing,  with: :parametros_invalidos

  private

  def nao_encontrado(exception)
    respond_to do |format|
      format.html { render plain: "Não encontrado", status: :not_found }
      format.json { render json: { error: "recurso não encontrado" }, status: :not_found }
    end
  end

  def parametros_invalidos(exception)
    respond_to do |format|
      format.html { render plain: "Parâmetro ausente: #{exception.param}", status: :bad_request }
      format.json { render json: { error: "parâmetro ausente", param: exception.param }, status: :bad_request }
    end
  end
end
```

#### 6. ProjetosController

```ruby
# app/controllers/projetos_controller.rb
class ProjetosController < ApplicationController
  before_action :set_projeto, only: [:show, :edit, :update, :destroy]

  def index
    @projetos = Projeto.includes(:tarefas).order(:nome)

    respond_to do |format|
      format.html
      format.json { render json: @projetos.as_json(include: :tarefas) }
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json { render json: @projeto.as_json(include: :tarefas) }
    end
  end

  def new
    @projeto = Projeto.new
  end

  def create
    @projeto = Projeto.new(projeto_params)

    respond_to do |format|
      if @projeto.save
        format.html { redirect_to @projeto, notice: "Projeto criado." }
        format.json { render json: @projeto, status: :created, location: @projeto }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { errors: @projeto.errors }, status: :unprocessable_entity }
      end
    end
  end

  def edit; end

  def update
    respond_to do |format|
      if @projeto.update(projeto_params)
        format.html { redirect_to @projeto, notice: "Projeto atualizado." }
        format.json { render json: @projeto }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { errors: @projeto.errors }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @projeto.destroy

    respond_to do |format|
      format.html { redirect_to projetos_path, notice: "Projeto apagado.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private

  def set_projeto
    @projeto = Projeto.find(params[:id])
  end

  def projeto_params
    params.require(:projeto).permit(:nome, :descricao)
  end
end
```

#### 7. TarefasController — com nested

A pegadinha aqui: a action `create` vem da rota nested (`/projetos/:projeto_id/tarefas`), então `params[:projeto_id]` existe. Já `show`, `update`, `destroy` vêm das rotas planas (graças ao `shallow`), então **não** têm `projeto_id` — buscamos pela tarefa direto.

```ruby
# app/controllers/tarefas_controller.rb
class TarefasController < ApplicationController
  before_action :set_projeto, only: [:index, :new, :create]
  before_action :set_tarefa,  only: [:show, :edit, :update, :destroy]

  def index
    @tarefas = @projeto.tarefas.order(:prazo)

    respond_to do |format|
      format.html
      format.json { render json: @tarefas }
    end
  end

  def show
    respond_to do |format|
      format.html
      format.json { render json: @tarefa.as_json(include: :projeto) }
    end
  end

  def new
    @tarefa = @projeto.tarefas.build
  end

  def create
    @tarefa = @projeto.tarefas.build(tarefa_params)

    respond_to do |format|
      if @tarefa.save
        format.html { redirect_to @tarefa, notice: "Tarefa criada." }
        format.json { render json: @tarefa, status: :created, location: @tarefa }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { errors: @tarefa.errors }, status: :unprocessable_entity }
      end
    end
  end

  def edit; end

  def update
    respond_to do |format|
      if @tarefa.update(tarefa_params)
        format.html { redirect_to @tarefa, notice: "Tarefa atualizada." }
        format.json { render json: @tarefa }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { errors: @tarefa.errors }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    projeto = @tarefa.projeto
    @tarefa.destroy

    respond_to do |format|
      format.html { redirect_to projeto_tarefas_path(projeto), notice: "Tarefa apagada.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private

  def set_projeto
    @projeto = Projeto.find(params[:projeto_id])
  end

  def set_tarefa
    @tarefa = Tarefa.find(params[:id])
  end

  def tarefa_params
    params.require(:tarefa).permit(:titulo, :descricao, :status, :prazo)
  end
end
```

#### 8. Views mínimas (HTML)

Por brevidade, só as essenciais. Adapte ao seu gosto.

```erb
<%# app/views/projetos/index.html.erb %>
<h1>Projetos</h1>
<%= link_to "Novo projeto", new_projeto_path %>
<ul>
  <% @projetos.each do |projeto| %>
    <li>
      <%= link_to projeto.nome, projeto %>
      — <%= projeto.tarefas.size %> tarefas
    </li>
  <% end %>
</ul>
```

```erb
<%# app/views/projetos/show.html.erb %>
<h1><%= @projeto.nome %></h1>
<p><%= @projeto.descricao %></p>

<h2>Tarefas</h2>
<%= link_to "Nova tarefa", new_projeto_tarefa_path(@projeto) %>
<ul>
  <% @projeto.tarefas.each do |tarefa| %>
    <li>
      <%= link_to tarefa.titulo, tarefa %>
      — <%= tarefa.status %>
      <% if tarefa.prazo %>(até <%= tarefa.prazo %>)<% end %>
    </li>
  <% end %>
</ul>

<%= link_to "Editar", edit_projeto_path(@projeto) %> |
<%= button_to "Apagar", @projeto, method: :delete,
              data: { turbo_confirm: "Tem certeza?" } %>
```

```erb
<%# app/views/projetos/_form.html.erb %>
<%= form_with model: projeto do |f| %>
  <% if projeto.errors.any? %>
    <div class="error">
      <ul>
        <% projeto.errors.full_messages.each do |msg| %>
          <li><%= msg %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <div>
    <%= f.label :nome %>
    <%= f.text_field :nome %>
  </div>
  <div>
    <%= f.label :descricao %>
    <%= f.text_area :descricao %>
  </div>
  <%= f.submit %>
<% end %>
```

```erb
<%# app/views/projetos/new.html.erb %>
<h1>Novo projeto</h1>
<%= render "form", projeto: @projeto %>
```

```erb
<%# app/views/projetos/edit.html.erb %>
<h1>Editar projeto</h1>
<%= render "form", projeto: @projeto %>
```

Idem pra Tarefas — formulário com `form_with model: [@projeto, @tarefa]` no `new`, e `form_with model: @tarefa` no `edit`. O `form_with` infere a URL e o método (POST pra novo, PATCH pra existente).

#### 9. Seeds (opcional)

```ruby
# db/seeds.rb
Projeto.destroy_all

p1 = Projeto.create!(nome: "Lançar SaaS", descricao: "Primeiro micro-SaaS de portfólio")
p2 = Projeto.create!(nome: "Estudar Rails 8", descricao: "Ler o livro 'Por que Rails?'")

p1.tarefas.create!(titulo: "Definir nicho",     status: "concluida",    prazo: 10.days.ago)
p1.tarefas.create!(titulo: "Construir MVP",     status: "em_andamento", prazo: 14.days.from_now)
p1.tarefas.create!(titulo: "Deploy no Kamal",   status: "pendente",     prazo: 30.days.from_now)

p2.tarefas.create!(titulo: "Cap. 5", status: "concluida",    prazo: 2.days.ago)
p2.tarefas.create!(titulo: "Cap. 6", status: "concluida",    prazo: 1.day.ago)
p2.tarefas.create!(titulo: "Cap. 7", status: "em_andamento", prazo: Date.current)

puts "#{Projeto.count} projetos, #{Tarefa.count} tarefas."
```

```bash
bin/rails db:seed
bin/rails server
```

Acesse `http://localhost:3000` e navegue.

#### 10. Testes de controller

```ruby
# test/controllers/projetos_controller_test.rb
require "test_helper"

class ProjetosControllerTest < ActionDispatch::IntegrationTest
  setup do
    @projeto = Projeto.create!(nome: "Teste", descricao: "...")
  end

  test "index responde 200 e lista projetos em JSON" do
    get projetos_path(format: :json)
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |p| p["nome"] == "Teste" }
  end

  test "show responde 200 com o projeto" do
    get projeto_path(@projeto, format: :json)
    assert_response :success
    assert_equal "Teste", JSON.parse(response.body)["nome"]
  end

  test "show com id inválido responde 404 JSON" do
    get projeto_path(id: 99_999, format: :json)
    assert_response :not_found
    assert_equal "recurso não encontrado", JSON.parse(response.body)["error"]
  end

  test "create com params válidos cria e responde 201" do
    assert_difference("Projeto.count", 1) do
      post projetos_path(format: :json),
           params: { projeto: { nome: "Novo", descricao: "X" } }
    end
    assert_response :created
  end

  test "create com nome vazio responde 422 com erros" do
    assert_no_difference("Projeto.count") do
      post projetos_path(format: :json),
           params: { projeto: { nome: "" } }
    end
    assert_response :unprocessable_entity
    assert_includes JSON.parse(response.body)["errors"].keys, "nome"
  end
end
```

Rode:

```bash
bin/rails test test/controllers/projetos_controller_test.rb
```

Espere: `5 runs, X assertions, 0 failures, 0 errors`.

### Critério de sucesso

- `bin/rails routes -g tarefas` mostra rotas nested + shallow corretas.
- Navegando por `http://localhost:3000`, você cria/edita/deleta projetos e tarefas via UI.
- `curl -H "Accept: application/json" http://localhost:3000/projetos` devolve JSON com os projetos.
- `curl http://localhost:3000/projetos/99999.json` devolve `{"error":"recurso não encontrado"}` com 404.
- `bin/rails test` passa com 5+ testes verdes.
- Strong params bloqueiam campo malicioso: `curl -X POST .../projetos.json -d '{"projeto":{"nome":"X","admin":true}}'` cria projeto mas ignora `admin`.

### Extras (opcionais)

1. **Versionamento API (`/api/v1`)** — duplique os controllers em `app/controllers/api/v1/`, herde de `Api::BaseController < ActionController::API`, monte rotas em `namespace :api do; namespace :v1 do`.

2. **Member action `concluir`** — adicione em rotas:
   ```ruby
   resources :tarefas, shallow: true do
     member do
       patch :concluir
     end
   end
   ```
   E no controller:
   ```ruby
   def concluir
     @tarefa.update!(status: "concluida")
     redirect_to @tarefa
   end
   ```

3. **Concern de comentários** — defina `concern :commentable` no routes, modele `Comentario` com `belongs_to :commentable, polymorphic: true`, e libere comentários em projetos e tarefas.

4. **Autenticação básica** — adicione `before_action :autenticar_usuario!` no `ApplicationController` (mesmo que `autenticar_usuario!` seja um `head :unauthorized unless request.headers["X-Api-Key"] == "secreto"` por enquanto). Veremos auth de verdade no Cap. 9.

5. **Constraint de subdomain** — coloque o namespace `:api` num `constraints subdomain: "api"` e teste com `http://api.localhost:3000` (precisa setar `/etc/hosts` ou usar `lvh.me` em dev).

---

## 7.13 Pra fundo

- **Rails Guides — Routing from the Outside In** — https://guides.rubyonrails.org/routing.html (referência completa de `config/routes.rb`)
- **Rails Guides — Action Controller Overview** — https://guides.rubyonrails.org/action_controller_overview.html (params, filters, rescue, respond_to, streaming)
- **Roy Fielding — "Architectural Styles and the Design of Network-based Software Architectures"** (Capítulo 5: REST) — a tese original que define REST. Densa, mas é o documento-fundação.
- **DHH — "Getting Hyper About Hypertext" (RailsConf 2021 keynote)** — por que Hotwire + REST clássico vence SPAs pra 90% dos casos.
- **Jamis Buck — "Nested Resources"** (post antigo, ainda atual) — origem da regra "nunca aninhe mais de 1 nível".
- **Source do `ActionDispatch::Routing::Mapper`** no GitHub do Rails — quando quiser entender como `resources` realmente expande pras 7 rotas, leia o código. Ruby legível, comentado.
- **`config/routes.rb` do Discourse / Mastodon / Forem (open-source grandes em Rails)** — ver exemplos reais de routes complexos vivendo em produção há anos.

---

> **No próximo capítulo:** Views + Hotwire. Como ERB + Turbo Frames + Turbo Streams + Stimulus te dão uma "SPA" sem escrever React, e por que isso é uma das maiores reviravoltas de produtividade dos últimos anos no desenvolvimento web.
