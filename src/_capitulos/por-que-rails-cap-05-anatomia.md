---
layout: capitulo
title: "Cap. 5 — Anatomia de um projeto Rails 8"
slug: cap-05-anatomia
livro_slug: por-que-rails
ordem: 5
tempo_leitura: "15 min"
template_engine: none
permalink: /livros/por-que-rails/cap-05-anatomia/
---

> 📖 Este capítulo é parte do livro "Por que Rails?" — versão online gratuita.
> Fonte: `~/Desktop/ebooks/Por que Rails?/capitulos/cap_05_anatomia.md`

# Capítulo 5 — Anatomia de um projeto Rails 8

> "There is no magic. There is only convention." — DHH (parafraseado)


> 🎯 **Você vai sair daqui sabendo:**
> - Por que abrir QUALQUER projeto Rails do mundo eu vou achar as coisas no mesmo lugar
> - O que cada uma das ~25 pastas e arquivos que `rails new` cospe faz
> - O ciclo de vida completo de uma requisição, do clique do usuário ao HTML
> - Onde vivem as decisões "mágicas" de convenção que dispensam XML, YAML e configuração
> 📚 **Pré-requisitos:** Ruby instalado (Cap. 4) e disposição pra rodar `rails new` enquanto lê.

> 💬 **Akita, 2007 — palestra "Entendendo Rails":**
>
> > "Não precisamos configurar dezenas de arquivos XML. Basicamente colocamos a senha do banco de dados, apenas."
>
> Em 2026, com `credentials.yml.enc` e `master.key`, nem a senha você coloca em texto puro. A promessa de "zero configuração ritual" só se intensificou em duas décadas.

**Pergunta provocativa pra abrir o capítulo:** se Rails é "convenção sobre configuração", **onde** exatamente está essa convenção escrita? Em que arquivo? Em que linha? Spoiler: ela não está escrita em arquivo nenhum do seu projeto — ela está embutida na estrutura de pastas, nos nomes dos arquivos, e nas regras de inferência que Zeitwerk, ActiveRecord e ActionController assumem ao bootar. Este capítulo é o mapa dessa convenção invisível.

## 5.1 Por quê este capítulo existe

Você vai ouvir muito sobre a "magia do Rails". Não existe magia — existe **convenção**. O framework toma decisões em seu nome porque já viu milhões de projetos e sabe o que funciona. Quando você roda `rails new meuapp`, ele gera ~80 arquivos em pastas com nomes específicos, e **cada um tem um papel definido**.

O custo da convenção: se você não souber onde cada peça vai, vai parecer mágico — e mágica que você não entende é mágica que você não consegue debugar às 3h da manhã quando algo quebra em produção.

A vantagem da convenção: você abre **qualquer** projeto Rails do mundo — Shopify, GitHub, um micro-SaaS de portfólio — e encontra a mesma estrutura. Isso muda completamente o jogo da produtividade. Você não está aprendendo "como funciona ESTE app", está aprendendo "como funciona QUALQUER app Rails".

O objetivo deste capítulo é dissecar essa estrutura inteira até você nunca mais ficar perdido.

## 5.2 O ponto de partida

Antes de tudo, gere o projeto-cobaia:

```bash
cd ~
rails new anatomia
cd anatomia
ls -la
```

Você verá uns 25 itens no diretório raiz e várias pastas. Vamos atravessar em camadas: **raiz → app/ → config/ → db/ → bin/ → resto**.

---

## 5.3 A raiz do projeto

### `Gemfile` e `Gemfile.lock`

- `Gemfile` é o `package.json` do Ruby. Lista as gems (bibliotecas) que seu app precisa, com restrições de versão.
- `Gemfile.lock` é o `package-lock.json` — versões **resolvidas e congeladas**. Esse arquivo vai pro git, é a fonte da verdade do que sobe pra produção.
- Gerenciado pelo **Bundler**: `bundle install`, `bundle update gem_x`, `bundle outdated`.

Como ler uma linha de gem:

```ruby
gem "rails", "~> 8.0"             # qualquer 8.x >= 8.0 e < 9.0
gem "puma"                        # qualquer versão (perigoso em prod)
gem "stimulus-rails"
gem "tailwindcss-rails"           # se você usou --css=tailwind
gem "bcrypt", "~> 3.1.7"          # restrição estrita
```

Operadores de versão importantes:
- `"~> 8.0"` ("twiddle-wakka") = `>= 8.0, < 9.0` — patches e minors livres, major bloqueado.
- `"~> 8.0.1"` = `>= 8.0.1, < 8.1.0` — só patches livres.
- `">= 8.0"` = qualquer versão maior ou igual — **perigoso**, pega Rails 99 amanhã.

### `.ruby-version`

Pin da versão do Ruby (ex: `3.3.11`). Lido pelo seu gerenciador (mise/rbenv/asdf). Garante que o time inteiro use o mesmo Ruby. Vai pro git.

### `config.ru`

"Rack config". É o ponto de entrada do servidor HTTP — Puma lê esse arquivo pra saber como bootar o app. Você não mexe quase nunca, mas é onde middlewares de baixo nível podem ser montados.

### `Rakefile`

Define `rake` tasks (scripts de manutenção). Rails carrega as suas e as próprias dele. `bin/rails -T` lista tudo. Tasks customizadas vivem em `lib/tasks/*.rake`.

### Arquivos de SO/Git

`README.md`, `.gitignore`, `.gitattributes` — você já conhece. O `.gitignore` que Rails gera é bem completo (ignora `log/`, `tmp/`, `master.key`, etc.).

### `Dockerfile`, `.dockerignore`, `config/deploy.yml` (Rails 8)

Rails 8 gera Dockerfile pronto pra produção e config do **Kamal 2** (o deployer do DHH). Veremos a fundo no Cap. 14. Por enquanto: saiba que sua VPS de $5/mês já tem tudo que precisa pra rodar isso, sem Kubernetes.

### `package.json`, `bun.lockb` ou `yarn.lock`

Se você usou o default (importmap), pode nem existir. Com `--javascript=esbuild`/`bun` ou Tailwind via Node, esses arquivos aparecem.

---

> 🕰️ **Curiosidade histórica — de `script/` a `bin/`**
>
> Quem aprendeu Rails antes de 2012 lembra de digitar comandos como `script/generate controller Blog`, `script/console`, `script/server`, `script/runner`. Havia uma pasta `script/` na raiz com um executável Ruby por tarefa. Em Rails 3.0 isso virou `rails generate`, e em Rails 4 a pasta `bin/` consolidou os binstubs (`bin/rails`, `bin/rake`, `bin/setup`). O `bin/` que você vê hoje é o herdeiro direto do `script/` dos pioneiros — mesmo papel, com a vantagem de invocar o Bundler do projeto antes de tocar no Ruby, evitando a tragédia clássica de "rodou na minha máquina porque eu tinha Rails 2.3 global instalado".

## 5.4 A pasta `app/` — onde 95% do seu código vai morar

Esta é A pasta. Tudo aqui é **autoloaded** pelo Rails via **Zeitwerk** — você nunca escreve `require`. Coloca a classe certa no arquivo certo com o nome certo, e o framework acha sozinho.

```
app/
├── controllers/       # recebem HTTP, devolvem HTTP
├── models/            # objetos de negócio + persistência
├── views/             # templates HTML/JSON
├── helpers/           # funções auxiliares pras views
├── jobs/              # tarefas async (Solid Queue)
├── mailers/           # emails transacionais
├── channels/          # WebSockets (ActionCable)
├── javascript/        # Stimulus controllers
└── assets/            # imagens, CSS pré-compilados
```

### `app/controllers/`

Cada controller herda de `ApplicationController` e responde por uma "resource". Convenção: **nome no plural + sufixo `Controller`**.

```ruby
# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  def index
    @posts = Post.all
  end

  def show
    @post = Post.find(params[:id])
  end

  def create
    @post = Post.new(post_params)
    if @post.save
      redirect_to @post, notice: "Post criado!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def post_params
    params.require(:post).permit(:title, :body)
  end
end
```

Por convenção, Rails liga `PostsController#index` automaticamente a `app/views/posts/index.html.erb`. **Você não declara isso em lugar nenhum.** Se você quer renderizar outra view, faz explícito: `render :outra_view`.

### `app/models/`

Cada model representa uma tabela do banco. Herda de `ApplicationRecord`. **Nome no singular**.

```ruby
# app/models/post.rb     →    tabela posts
class Post < ApplicationRecord
  belongs_to :user
  validates :title, presence: true
end
```

Convenção pesada e inquebrável:
- Classe `Post` → tabela `posts` → arquivo `post.rb`
- Classe `BlogPost` → tabela `blog_posts` → arquivo `blog_post.rb`

Mudou um, quebra os outros. Rails tem comandos pra renomear tabela, mas você quase nunca precisa — segue a convenção que tudo funciona.

### `app/views/`

Templates ERB (HTML com Ruby embutido). Organizados por resource:

```
app/views/
├── layouts/
│   └── application.html.erb      # esqueleto HTML envolvendo todas as páginas
├── posts/
│   ├── index.html.erb            # lista de posts
│   ├── show.html.erb             # detalhe de 1 post
│   ├── new.html.erb              # form de criar
│   ├── edit.html.erb             # form de editar
│   └── _form.html.erb            # partial reutilizada por new e edit
└── shared/
    └── _navbar.html.erb
```

**Partials começam com `_`** e são chamados sem o `_`: `<%= render "form", post: @post %>`. Você pode renderizar uma coleção também: `<%= render @posts %>` chama `_post.html.erb` pra cada um.

A sintaxe ERB básica:
- `<%= expressao %>` — avalia e **imprime**
- `<% comando %>` — avalia sem imprimir (ex: `<% if user.admin? %>`)
- `<%# comentário %>` — não vai pra saída

> 🕰️ **Curiosidade histórica — `.rhtml`, `.rxml`, `.rjs`**
>
> Em Rails 1.x a extensão padrão pra template HTML era `.rhtml` (Embedded Ruby HTML) — `index.rhtml` em vez do nosso `index.html.erb`. Existiam também `.rxml` (XML Builder) e o famigerado `.rjs` (JavaScript Generator), que permitia gerar JS a partir de Ruby pra atualizar pedaços da página via Ajax sobre Prototype.js. Ex:
>
> ```ruby
> # add_comment.rjs — Rails 1.x (MORTO)
> page.insert_html :bottom, :comments, partial: 'comment', object: @comment
> page.visual_effect :highlight, "comment_#{@comment.id}"
> ```
>
> O `.rhtml` virou `.html.erb` em Rails 2 (formato `nome.<formato>.<template_handler>`), e `.rjs` foi deprecated em Rails 3.1 e removido em 4.0. O sucessor espiritual hoje é o **Turbo Stream** (`create.turbo_stream.erb`): mesmo objetivo (atualizar pedaços da página), HTML em vez de JS gerado, zero linha de JavaScript escrita por você.

### `app/helpers/`

Funções auxiliares pras views — formatação, tags HTML customizadas, lógica de apresentação. Cada controller tem helper próprio, mas por default todos os helpers viram **globais nas views**.

```ruby
# app/helpers/application_helper.rb
module ApplicationHelper
  def formato_brl(valor)
    "R$ #{format('%.2f', valor).tr('.', ',')}"
  end

  def link_externo(texto, url)
    link_to texto, url, target: "_blank", rel: "noopener"
  end
end
```

Na view: `<%= formato_brl(produto.preco) %>`.

### `app/jobs/`

Tarefas assíncronas. Herdam de `ApplicationJob`. Executadas pelo **Solid Queue** (default no Rails 8).

```ruby
class EnviarNotificacaoJob < ApplicationJob
  queue_as :default

  def perform(usuario_id, mensagem)
    user = User.find(usuario_id)
    UserMailer.notificacao(user, mensagem).deliver_now
  end
end

# Disparar:
EnviarNotificacaoJob.perform_later(user.id, "Olá!")
# perform_later → fila. perform_now → executa síncrono (use em testes).
```

### `app/mailers/`

Emails transacionais. Subclasse de `ApplicationMailer`. Cada método público é um email. Templates ficam em `app/views/<mailer_name>/`.

```ruby
class UserMailer < ApplicationMailer
  def boas_vindas(user)
    @user = user
    mail(to: user.email, subject: "Bem-vindo!")
  end
end
```

Dispara com `UserMailer.boas_vindas(user).deliver_later` (vai pra fila) ou `.deliver_now` (síncrono).

### `app/channels/`

ActionCable — WebSockets pra real-time (chat, notificações ao vivo, presença). No Rails 8 usa **Solid Cable** por baixo, sem Redis. Aprofundamos no Cap. 10 e usamos pesado no Projeto 5 (BugTracker).

### `app/javascript/`

**Stimulus controllers** — Hotwire. Pedacinhos de JS que se ligam a `data-controller="..."` no HTML.

```js
// app/javascript/controllers/hello_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["output"]

  greet() {
    this.outputTarget.textContent = "Olá!"
  }
}
```

```erb
<div data-controller="hello">
  <button data-action="click->hello#greet">Falar</button>
  <p data-hello-target="output"></p>
</div>
```

### `app/assets/`

Imagens, CSS pré-compilado. Com importmap (default), **JavaScript NÃO vai aqui** — vai em `app/javascript/`. Css vai em `app/assets/stylesheets/`.

---

> 🎯 **Princípio atemporal — "Convenção elimina XML"**
>
> > "Não precisamos configurar dezenas de arquivos XML. Basicamente colocamos a senha do banco de dados, apenas." — Fabio Akita, *Entendendo Rails* (2007)
>
> Akita falava isso comparando Rails 1.x ao mundo Java EE da época, onde um Hello World envolvia `web.xml`, `struts-config.xml`, `hibernate.cfg.xml`, e mais uma dúzia de descritores de deploy. Em 2026, esse princípio se aprofundou: o `config/` que você está lendo agora tem ~15 arquivos, e em **nenhum** deles você precisa declarar "este controller responde a essa rota" ou "esta classe mapeia essa tabela". Convenção sobre configuração é o que permite que o `app/` te dê tantas garantias sem te obrigar a escrever XML, YAML ou anotações pra nada. Em 2026 nem a senha do banco você escreve em texto puro — `master.key` + `credentials.yml.enc` resolvem.

## 5.5 A pasta `config/` — configuração de tudo

```
config/
├── application.rb         # config global do app
├── boot.rb                # bootstrap (você não mexe)
├── environment.rb         # idem
├── routes.rb              # MAPA DE URLs (você mexe MUITO)
├── database.yml           # config do banco por ambiente
├── credentials.yml.enc    # secrets criptografados
├── master.key             # chave pra abrir credentials (NUNCA no git)
├── puma.rb                # config do servidor HTTP
├── storage.yml            # Active Storage
├── cable.yml              # Action Cable (Rails 8: Solid Cable)
├── cache.yml              # Solid Cache
├── queue.yml              # Solid Queue
├── recurring.yml          # jobs recorrentes (Rails 8)
├── deploy.yml             # Kamal
├── importmap.rb           # mapa de imports JS (se usando importmap)
├── environments/
│   ├── development.rb
│   ├── test.rb
│   └── production.rb
├── initializers/          # arquivos rodados UMA vez no boot
└── locales/               # i18n
```

### `config/routes.rb` — o mais importante

Mapeia URLs pra controllers/actions. Domine isso, domine Rails.

```ruby
Rails.application.routes.draw do
  root "home#index"                              # GET /
  resources :posts                                # 7 rotas RESTful
  resources :users, only: [:show, :edit, :update] # subset
  resource :perfil, only: [:show, :edit]          # singular: sem :id

  namespace :admin do
    resources :posts                              # /admin/posts/...
  end

  get "/sobre", to: "paginas#sobre"               # rota explícita
  
  # Health check pra load balancer / Kamal
  get "up" => "rails/health#show", as: :rails_health_check
end
```

`resources :posts` cria **7 rotas RESTful** de uma vez:

| Verbo  | Path             | Action  | Helper de URL          |
|--------|------------------|---------|------------------------|
| GET    | /posts           | index   | `posts_path`           |
| GET    | /posts/new       | new     | `new_post_path`        |
| POST   | /posts           | create  | `posts_path`           |
| GET    | /posts/:id       | show    | `post_path(post)`      |
| GET    | /posts/:id/edit  | edit    | `edit_post_path(post)` |
| PATCH  | /posts/:id       | update  | `post_path(post)`      |
| DELETE | /posts/:id       | destroy | `post_path(post)`      |

Veja **todas** as rotas do app: `bin/rails routes` (ou só algumas com `-g posts`).

### `config/database.yml`

Define banco por ambiente. Rails 8 default: **SQLite em todos os ambientes, inclusive produção**.

```yaml
default: &default
  adapter: sqlite3
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000

development:
  <<: *default
  database: storage/development.sqlite3

test:
  <<: *default
  database: storage/test.sqlite3

production:
  <<: *default
  database: storage/production.sqlite3
```

A escolha de SQLite em prod é controversa mas defensável: simples, rápido, zero ops. Você troca pra Postgres com `rails new --database=postgresql` ou editando esse arquivo + Gemfile.

### `config/credentials.yml.enc` + `master.key`

Secrets criptografados. Editar:

```bash
EDITOR="code --wait" bin/rails credentials:edit
```

Conteúdo de exemplo:
```yaml
stripe:
  secret_key: sk_live_xxx
openai:
  api_key: sk-xxx
secret_key_base: <gerado automaticamente>
```

Acesso no código: `Rails.application.credentials.stripe[:secret_key]`.

**Regra absoluta:** `master.key` **nunca** vai pro git. Em produção, sobe como env var `RAILS_MASTER_KEY`.

### `config/initializers/`

Cada `.rb` aqui roda **uma vez** no boot. Configurações de gems.

```ruby
# config/initializers/stripe.rb
Stripe.api_key = Rails.application.credentials.stripe[:secret_key]
```

### `config/environments/{development,test,production}.rb`

Diferenças por ambiente:
- `development.rb`: reload de classes a cada request, erro detalhado no browser, cache off.
- `test.rb`: transações por teste, mailer fake, cache off.
- `production.rb`: cache ligado, compressão, log level info, mailer real, etc.

---

## 5.6 A pasta `db/` — banco de dados

```
db/
├── migrate/             # migrations (versionamento do schema)
├── schema.rb            # estado atual do schema (gerado — NÃO edite)
├── seeds.rb             # dados iniciais
├── queue_schema.rb      # Rails 8: schema do Solid Queue
├── cache_schema.rb      # Rails 8: schema do Solid Cache
├── cable_schema.rb      # Rails 8: schema do Solid Cable
└── *.sqlite3            # se SQLite, o arquivo do banco em si
```

### Migrations

Arquivos numerados pelo timestamp. Cada um é uma mudança no schema, versionada.

```ruby
# db/migrate/20260611220000_create_posts.rb
class CreatePosts < ActiveRecord::Migration[8.0]
  def change
    create_table :posts do |t|
      t.string :title, null: false
      t.text :body
      t.references :user, null: false, foreign_key: true
      t.timestamps    # cria created_at e updated_at
    end
  end
end
```

Aplicar: `bin/rails db:migrate`. Aprofundamos tudo no Cap. 6.

### `schema.rb`

Estado atual do banco — **gerado automaticamente** toda vez que você roda `db:migrate`. **Nunca edite à mão**: a próxima migration vai sobrescrever suas mudanças. Se quer mudar algo, escreva nova migration.

### `seeds.rb`

Dados iniciais. Rodado com `bin/rails db:seed`.

```ruby
admin = User.create!(email: "admin@example.com", password: "12345678", admin: true)
3.times { |i| Post.create!(title: "Post #{i}", body: "...", user: admin) }
```

---

## 5.7 A pasta `bin/` — executáveis do projeto

```
bin/
├── rails        # roda comandos rails (PREFIRA esse, não o rails global)
├── rake         # idem
├── setup        # script de setup pra clone fresco
├── dev          # roda dev server (Procfile.dev: web + js + css watchers)
├── kamal        # CLI do Kamal pra deploy (Rails 8)
└── bundle       # bundler do projeto
```

**Regra:** sempre `bin/rails server`, não `rails server`. Por quê?
- `bin/rails` força uso do Bundler do projeto.
- Evita conflito entre versão global do Rails e versão do projeto.
- Funciona idêntico em qualquer máquina, sem depender de PATH.

> 🔄 **Antes vs Depois — comandos e servidor HTTP**
>
> | Tarefa | Rails 1.x (~2007) | Rails 8 (2026) |
> |---|---|---|
> | Subir servidor de desenvolvimento | `script/server` (WEBrick, Ruby puro, single-threaded) | `bin/rails server` ou `bin/dev` (Puma, multi-threaded + watchers de JS/CSS) |
> | Abrir console | `script/console` | `bin/rails console` (alias `bin/rails c`) |
> | Gerar controller | `script/generate controller Blog` | `bin/rails generate controller Blog` |
> | Rodar script ad-hoc no contexto do app | `script/runner "User.count"` | `bin/rails runner "User.count"` |
> | Instalar "plugin" | `script/plugin install <nome>` | `bundle add <gem>` (plugins via diretório morreram em Rails 4) |
>
> WEBrick saiu como default em Rails 5 e foi removido da stdlib do Ruby 3.0. Puma virou padrão por **ser multi-thread + multi-processo**, o que casa com o modelo "1-Person Framework" — uma VPS de US$5/mês aguenta milhares de usuários sem você ter que provisionar 10 réplicas.

> ⚠️ **Cuidado — `master.key` é a chave do reino**
>
> O arquivo `config/master.key` desbloqueia tudo que está em `credentials.yml.enc`: API keys de Stripe, OpenAI, secret_key_base de sessão, etc. Se ele for commitado por engano (e sim, isso acontece com gente sênior), você acabou de publicar **todas** suas chaves no GitHub. O `.gitignore` que `rails new` gera já ignora `master.key` por default — **não remova essa linha por nenhum motivo**. Em produção, suba a master key via variável de ambiente `RAILS_MASTER_KEY` (Kamal faz isso por você). Se vazar, a única remediação real é rotacionar **todas** as credentials e gerar uma master_key nova: não dá pra "des-vazar" o que já está no histórico do git.

---

## 5.8 As pastas restantes

### `test/` (ou `spec/` se RSpec)

Onde os testes vivem. Espelha estrutura de `app/`:

```
test/
├── controllers/
├── models/
├── helpers/
├── mailers/
├── system/             # testes E2E com browser headless
├── fixtures/
└── test_helper.rb
```

### `lib/`

Código não-Rails seu. Tasks customizadas (`lib/tasks/*.rake`), módulos compartilhados, scripts internos. Vale a regra: se faz sentido só dentro do seu app, vai em `app/`. Se é genérico/reutilizável, vai em `lib/`.

### `log/`

Logs do app. `log/development.log`, `log/production.log`, `log/test.log`. Cresce muito — fica fora do git.

### `tmp/`

Cache, PIDs, sockets. Fica fora do git. Apagar não causa danos.

### `public/`

Arquivos servidos **estáticos** pelo servidor web (não passam pelo Rails). Favicon, robots.txt, 404.html, 500.html.

### `vendor/`

Código de terceiros que você copiou pro projeto. Raro hoje em dia (gems resolvem isso).

### `storage/` (Rails 6+)

Active Storage local — uploads em dev. Em prod, vai pra S3/R2/etc.

---

## 5.9 O ciclo de vida de uma requisição

Você acessa `http://localhost:3000/posts/42`. **O que acontece**, do clique ao HTML?

```
1.  Browser  → HTTP GET /posts/42 → seu servidor (Puma)
2.  Puma     → Rack → middlewares (logger, sessions, CSRF, params, etc.)
3.  Router  (config/routes.rb):
                  match GET /posts/:id → "posts#show", id=42
4.  Rails instancia PostsController
5.  Roda before_action callbacks (auth, autorização, etc.)
6.  Executa PostsController#show:
                  @post = Post.find(42)
7.  ActiveRecord gera SQL:
                  SELECT * FROM posts WHERE id = 42 LIMIT 1
8.  Banco retorna linha → Post instance em memória
9.  Action termina → Rails renderiza app/views/posts/show.html.erb
10. ERB interpola Ruby no HTML, usando @post e helpers
11. Layout (app/views/layouts/application.html.erb) envolve o resultado
12. Roda after_action callbacks
13. HTML final volta pelo Rack → Puma → Browser
```

Isso TUDO acontece **sem você configurar acoplamento entre as peças**. Convenção sobre configuração em ação plena: o router sabe que `:id` vira `params[:id]`. O controller sabe que `@post` vai pra view. A view sabe seu nome pelo nome da action. Cada peça consulta a convenção, não uma config explícita.

---

## 5.10 Convenção sobre configuração — exemplos concretos

| Convenção | O que isso significa na prática |
|---|---|
| Classe `Post` → tabela `posts` | Rails infere o nome da tabela do nome da classe (pluraliza) |
| `PostsController#show` → `app/views/posts/show.html.erb` | View padrão, sem dizer pra ninguém |
| `belongs_to :user` → coluna `user_id` | Foreign key inferida do nome da associação |
| Arquivos em `app/` autoloaded por Zeitwerk | Nunca `require` no seu código |
| `params[:id]` numa action `show` | Convenção REST: `/posts/:id` |
| `bin/rails g model Post title:string` → cria model + migration + teste | Generators sabem onde tudo vai |
| `respond_to do |f| ... end` | Mesmo controller serve HTML ou JSON dependendo do `Accept` |

**A regra de ouro:** se você se pega configurando coisa demais, provavelmente está nadando contra a convenção. Pesquise se Rails já tem um jeito padrão. Quase sempre tem.

---

## 5.11 Pegadinhas reais

1. **Autoload e nomes errados** — `app/models/blog_post.rb` deve ter `class BlogPost`. Errar o nome do arquivo dá erro críptico de "uninitialized constant". Use `bin/rails zeitwerk:check` quando houver dúvida.

2. **`master.key` commitada por engano** — você acabou de vazar TODOS seus segredos. Se isso acontecer: revogue tudo (Stripe, OpenAI, etc.) AGORA, gere nova master_key, edite credentials de novo. Não dá pra "des-vazar".

3. **`schema.rb` editado à mão** — você pensa que arrumou, mas a próxima migration vai destruir suas edições. Quer mudar schema? Migration nova.

4. **Rails 8 e SQLite em produção** — funciona DE VERDADE, mas precisa WAL ligado (já vem por default) e **backups fora da VPS**. Sem backup, um `rm` mata sua empresa.

5. **`Rails.env.production?` espalhado pelo código** — code smell. Se você tem `if Rails.env.production?` em vários lugares, melhor abstrair em config (`Rails.application.config.x.feature_xyz`) ou em feature flag.

6. **`bin/rails server` vs `rails server`** — em CI ou Docker, sempre o primeiro. Diferença de versão de Bundler pode dar resultado diferente.

7. **`config.eager_load = false` em dev** — código não é carregado todo no boot, só sob demanda. Bom pra reload rápido, ruim pra detectar erros de autoload. Sempre rode os testes em ambiente de test (que tem eager_load ligado).

---

## 5.12 Lab — mapear cada arquivo do `rails new`

### Objetivo
Criar um projeto fresh e escrever, em uma frase, a função de **cada arquivo** gerado. Quando você terminar, vai ter um mapa mental completo da estrutura Rails.

### Passos

1. Vá pra pasta de labs e gere o projeto:

```bash
cd ~/Desktop/ebooks/Por\ que\ Rails\?/labs/cap_05
rails new anatomia
cd anatomia
```

2. Liste todos os arquivos gerados (excluindo o que não importa):

```bash
find . -type f \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./tmp/*" \
  -not -path "./log/*" \
  -not -path "./vendor/*" \
  | sort > ../MAPEAMENTO_RAW.txt
```

3. Crie um arquivo `MAPEAMENTO.md` ao lado e, pra cada arquivo dessa lista, preencha:

```markdown
| Caminho | Função (1 frase) | Edita? |
|---------|------------------|--------|
| Gemfile | Lista de gems do projeto | Frequente |
| config.ru | Entrada Rack pro servidor HTTP | Nunca |
| ... | ... | ... |
```

Coluna **Edita?**: Nunca / Raro / Frequente.

4. Bônus — mapeie rotas geradas:

Adicione `resources :produtos` em `config/routes.rb`, rode `bin/rails routes -g produtos` e liste as 7 rotas com seus helpers de URL.

### Critério de sucesso

Daqui a um mês, ao abrir um projeto Rails qualquer, você vai saber **exatamente** onde fica cada peça sem pensar. Esse é o ROI deste lab.

### Extra (opcional)

- Compare o output de `rails new anatomia` com `rails new --api anatomia_api` (sem views, sem assets). Liste as diferenças.
- Rode `bin/rails about` — explore cada linha do output.

---

## 5.13 Pra fundo

- **The Rails Doctrine** — https://rubyonrails.org/doctrine (DHH escreveu, leitura obrigatória pra entender o "porquê" de tudo neste capítulo)
- **Rails Guides — Getting Started** — https://guides.rubyonrails.org/getting_started.html
- **Rails Guides — Configuring** — https://guides.rubyonrails.org/configuring.html (cada opção de config explicada)
- **Zeitwerk README** — https://github.com/fxn/zeitwerk (o autoloader que faz a "mágica" funcionar)
- **Source do `railties`** no GitHub do Rails — pra entender como o scaffold é gerado quando você roda `rails new`

---

> **No próximo capítulo:** vamos a fundo no ActiveRecord — como `User.where(...)` vira SQL, todos os tipos de relacionamento, migrations versionadas e o pesadelo do N+1 (com sua solução).
