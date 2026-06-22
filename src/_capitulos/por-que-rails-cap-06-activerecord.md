---
layout: capitulo
title: "Cap. 6 — ActiveRecord & Migrations"
slug: cap-06-activerecord
livro_slug: por-que-rails
ordem: 6
tempo_leitura: "19 min"
template_engine: none
permalink: /livros/por-que-rails/cap-06-activerecord/
---

> 📖 Este capítulo é parte do livro "Por que Rails?" — versão online gratuita.
> Fonte: `~/Desktop/ebooks/Por que Rails?/capitulos/cap_06_activerecord.md`

# Capítulo 6 — ActiveRecord & Migrations

> "Dado bem modelado é metade do app." — provérbio de Rails dev


> 🎯 **Você vai sair daqui sabendo:**
> - Como `User.where(ativo: true).order(:nome).limit(10)` vira SQL sem você escrever uma linha de SQL
> - Quando usar `belongs_to`, `has_many`, `has_many :through`, polimorfismo — e quando NÃO usar
> - Por que validar `uniqueness` no model não basta e qual é o backup obrigatório no banco
> - Como detectar e matar N+1, o erro de performance mais comum em apps Rails
> - Como escrever migrations reversíveis que não viram dívida técnica em produção
> 📚 **Pré-requisitos:** Cap. 5 (anatomia) e SQL básico (SELECT, JOIN, índice).

> 💬 **Akita, 2007 — palestra "Entendendo Rails":**
>
> > "Convenção: a classe tem o nome no singular (`Post`), a tabela tem o nome do plural (`posts`). Convenção: Surrogate Key, toda tabela tem uma chave primária chamada `id`."
>
> Essas duas frases têm 20 anos. Em Rails 8.1 elas continuam **bit-for-bit idênticas** — o único refinamento foi `id` passar de `integer` para `bigint` em Rails 5.1. Quando uma convenção sobrevive duas décadas de mudanças tecnológicas, ela parou de ser convenção e virou DNA.

**Pergunta provocativa pra abrir o capítulo:** quanto código você escreveria, em Java + Hibernate ou em Node + Prisma, pra mapear uma tabela `users` com 7 colunas, validar email único, ter associação com `posts`, e expor finders por todos os campos? Em Rails 8, a resposta é **três linhas** — incluindo `class User < ApplicationRecord; end` e `belongs_to :posts`. Este capítulo destrincha como isso é possível sem ser bruxaria.

**Mini-história — o dia que o N+1 derrubou a homepage.** Sexta de Black Friday, app no ar há 2 horas, homepage lista os 50 produtos em destaque com nome da marca de cada um. Em dev, com 5 produtos no SQLite, tudo funcionava em 12ms. Em produção, com cada request gerando 51 queries no Postgres (1 produto + 50 marcas) e 200 visitas concorrentes na primeira hora, o pool de conexões evaporou em 4 minutos. O fix foi uma única palavra adicionada no controller: `.includes(:marca)`. Este capítulo te ensina a não viver essa história — e a reconhecer N+1 ainda em dev, antes do tráfego real chegar.

## 6.1 Por quê este capítulo é o coração do livro

**ActiveRecord (AR)** é a alma do Rails. É o ORM — Object-Relational Mapper. Ele te deixa escrever:

```ruby
User.where(ativo: true).order(:nome).limit(10)
```

E gera automaticamente:

```sql
SELECT * FROM users WHERE ativo = TRUE ORDER BY nome ASC LIMIT 10
```

Mas AR não é só "SQL bonito". É um **padrão de design** com posição forte: cada objeto do seu domínio é responsável por **se persistir, se validar, e conhecer suas relações** com outros objetos.

Isso vai contra o que se aprende em Java/C# (Repository Pattern, DAOs separadas, "anemic domain model"). Rails escolhe o lado oposto: objetos "gordos" que sabem tudo sobre si. O padrão se chama, literalmente, **Active Record** (de Martin Fowler) — Rails levou esse nome.

**Por que esse trade-off ganha?** Velocidade de desenvolvimento absurda. Você modela uma vez, e o model serve a controllers, views, jobs, mailers e testes. Não tem 5 camadas pra atravessar.

**Custo:** sem disciplina, models viram "Deus" com 3000 linhas. Veremos como mitigar (services, concerns, POROs).

Domine este capítulo, e você desbloqueia 70% do poder do Rails.

---

## 6.2 O básico — um model do nada

Comecemos do esqueleto. Migration que cria a tabela:

```ruby
# db/migrate/20260611220000_create_users.rb
class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string  :email, null: false
      t.string  :nome
      t.integer :idade
      t.boolean :ativo, default: true
      t.timestamps
    end
    add_index :users, :email, unique: true
  end
end
```

Aplique:

```bash
bin/rails db:migrate
```

Crie o model — **vazio**:

```ruby
# app/models/user.rb
class User < ApplicationRecord
end
```

Pronto. Sem escrever nada além disso, você já tem:

```ruby
User.create!(email: "ana@x.com", nome: "Ana", idade: 30)
User.find(1)
User.where(ativo: true)
User.first.update!(nome: "Ana Silva")
User.last.destroy!
User.count
User.order(:idade).limit(5)
```

Bem-vindo ao Rails. Isso é o ROI da convenção.

> 🎯 **Princípio atemporal — singular/plural + surrogate key**
>
> > "Convenção: a classe tem o nome no singular (Post), a tabela tem o nome do plural (posts). Convenção: Surrogate Key, toda tabela tem uma chave primária chamada `id` autoincrementável." — Fabio Akita, *Entendendo Rails* (2007)
>
> Repare o que aconteceu acima: `class User < ApplicationRecord` (singular) liga automaticamente em `users` (plural), e nenhuma linha das nossas precisou declarar isso. Esse pareamento singular-classe / plural-tabela e a surrogate key `id` (bigint autoincrementável desde Rails 5.1) atravessaram **vinte anos** de evolução do framework sem mudar. Não é coincidência: surrogate key é a base que permite que `belongs_to :user` infira a foreign key `user_id` sem você dizer; e o par singular/plural é o que permite que Zeitwerk localize `app/models/user.rb` a partir do nome `User` referenciado num controller. Quebrar essa convenção em 2026 (`class User; self.table_name = "tb_usuario"; end`) é tecnicamente possível, mas você está pagando preço de migração legada — não faça isso em projeto novo.

---

## 6.3 Como `User.where(...)` vira SQL — por dentro

ActiveRecord usa **Arel** por baixo (uma DSL pra construir SQL programaticamente, escrita em Ruby).

O fluxo de uma query:

```ruby
User.where(ativo: true).order(:nome).limit(10)
```

1. `User.where(ativo: true)` retorna um `ActiveRecord::Relation` — **não executa SQL ainda**. É lazy.
2. `.order(:nome)` adiciona `ORDER BY` à Relation. Ainda lazy.
3. `.limit(10)` adiciona `LIMIT`. Ainda lazy.
4. O SQL só dispara quando você **força a execução** — chamando `.to_a`, `.each`, `.first`, `.count`, etc.

```ruby
rel = User.where(ativo: true)    # nenhuma query no banco
rel.to_sql                        # mostra o SQL que SERIA gerado
rel.each { |u| puts u.email }    # AGORA dispara a query
```

**Por que isso importa?** Porque você pode encadear queries em vários lugares (controller, helper, scope) sem disparar 10 SQLs. Tudo vira **uma** query no final, quando você renderiza.

Pra ver SQLs no console:

```ruby
# bin/rails console
ActiveRecord::Base.logger = Logger.new(STDOUT)

User.where(ativo: true).first
# => D, [2026-06-11T22:00:00] DEBUG -- :   User Load (0.2ms)  SELECT "users".* FROM "users" WHERE "users"."ativo" = 1 ORDER BY "users"."id" ASC LIMIT 1
```

Em qualquer dev, SQLs já vão no `log/development.log`. Acostume-se a ler esse arquivo.

---

> 🕰️ **Curiosidade histórica — de `Post.find(:all, :conditions => ...)` a `Post.where(...)`**
>
> Na era Rails 1.x / 2.x, **toda** busca passava pelo método `find` com um hash de opções gigante:
>
> ```ruby
> # Rails 1.x / 2.x (legado — você ainda encontra em código antigo)
> Post.find(:all,
>           :conditions => ["user_id = ? AND publicado = ?", user.id, true],
>           :order      => "created_at DESC",
>           :limit      => 10,
>           :include    => :user)
> ```
>
> Rails 3 (2010) trouxe o **Arel** e a noção de `ActiveRecord::Relation` lazy. A query lá em cima virou o que você vai escrever no resto deste capítulo:
>
> ```ruby
> # Rails 3+ até hoje (Rails 8)
> Post.where(user: user, publicado: true)
>     .order(created_at: :desc)
>     .limit(10)
>     .includes(:user)
> ```
>
> Existiam ainda os "dynamic finders": `Post.find_by_title_and_user_id("X", 42)` — Rails gerava o método em runtime via `method_missing`. Bonito em demo, lento em produção (cache de método poluído), e deprecado em Rails 4 em favor de `Post.find_by(title: "X", user_id: 42)`. Se você ler um tutorial de blog com `find_all_by_…`, feche a aba: é de 2009.

## 6.4 Queries comuns — o vocabulário diário

```ruby
# Buscar
User.all                          # Relation com todos
User.find(42)                     # por id, ERRO se não acha
User.find_by(email: "x@y.com")    # NIL se não acha
User.find_by!(email: "x@y.com")   # ERRO se não acha
User.where(idade: 18..30)         # ranges funcionam
User.where(idade: [18, 21, 30])   # IN (...)
User.where("idade > ?", 18)       # SQL cru — sempre com placeholders!
User.where.not(ativo: true)       # NOT
User.where(ativo: true).or(User.where(admin: true))   # OR

# Ordenar
User.order(:nome)                 # ASC default
User.order(nome: :asc, idade: :desc)
User.order(created_at: :desc).limit(5)

# Contar/agregar
User.count
User.where(ativo: true).count
User.sum(:idade)
User.average(:idade)
User.maximum(:created_at)
User.group(:idade).count          # {25 => 10, 30 => 3, ...}
User.group(:idade).average(:salario)

# Extrair só colunas (mais rápido que carregar objetos)
User.pluck(:email)                # ["x@y.com", "a@b.com"]
User.pluck(:id, :email)           # [[1, "x@y.com"], ...]

# Existência
User.exists?(email: "x@y.com")    # true/false rápido
User.any?
User.none?

# JOIN com associação
Post.joins(:user).where(users: { ativo: true })
#                       └─ note: nome da TABELA (plural) no where, não da associação
```

### Cuidado com SQL injection

```ruby
# ERRADO — vulnerável
User.where("nome = '#{params[:nome]}'")

# CERTO — placeholder
User.where("nome = ?", params[:nome])

# AINDA MELHOR — hash
User.where(nome: params[:nome])
```

Rails escapa automaticamente quando você usa hash ou placeholders. **Nunca** interpole strings em queries cruas.

---

## 6.5 Relacionamentos

### `belongs_to` — "eu tenho a foreign key"

```ruby
class Post < ApplicationRecord
  belongs_to :user      # tabela posts tem coluna user_id
end
```

A coluna `user_id` deve existir em `posts`. Em Rails 5+, `belongs_to` **exige presença** por default (validação implícita). Pra deixar opcional:

```ruby
belongs_to :user, optional: true
```

### `has_many` — "o outro lado tem minha foreign key"

```ruby
class User < ApplicationRecord
  has_many :posts, dependent: :destroy
  #                  └─ deleta posts se o user for deletado
end

user.posts                              # Relation com os posts dele
user.posts.create!(title: "Oi")         # cria post já com user_id setado
user.posts.where(publicado: true)       # encadeável!
user.posts.count
```

`dependent` aceita:
- `:destroy` — chama `destroy` em cada (roda callbacks)
- `:delete_all` — DELETE direto (pula callbacks, rápido)
- `:nullify` — seta foreign key como NULL nos filhos
- `:restrict_with_error` — impede deletar se tem filhos
- nada — filhos viram órfãos no banco (perigoso)

### `has_one` — mesma ideia, só um

```ruby
class User < ApplicationRecord
  has_one :perfil
end

user.perfil                  # 1 record ou nil
user.create_perfil!(bio: "...")
```

### `has_many :through` — muitos-pra-muitos com tabela intermediária

Caso clássico: user pode estar em vários grupos; grupo tem vários users; e a relação tem atributos próprios (role, data de entrada).

```ruby
class User < ApplicationRecord
  has_many :memberships
  has_many :groups, through: :memberships
end

class Group < ApplicationRecord
  has_many :memberships
  has_many :users, through: :memberships
end

class Membership < ApplicationRecord
  belongs_to :user
  belongs_to :group
  # tabela memberships: user_id, group_id, role (string), joined_at (datetime)
end

user.groups          # SELECT groups.* FROM groups JOIN memberships ON ...
group.users          # idem oposto
user.memberships.where(role: "admin").map(&:group)
```

### `has_and_belongs_to_many` (HABTM) — variante simples

Mesma ideia, mas **sem model intermediário** (tabela de junção pura).

```ruby
class Post < ApplicationRecord
  has_and_belongs_to_many :tags
end

class Tag < ApplicationRecord
  has_and_belongs_to_many :posts
end

# migration:
create_join_table :posts, :tags do |t|
  t.index :post_id
  t.index :tag_id
end
```

**Use quando** não há atributos na junção. Se precisar de atributos (data, role, ordem), volte pra `has_many :through`.

### Polimorfismo — `belongs_to :commentable, polymorphic: true`

Quando um model pode pertencer a vários tipos. Caso clássico: comentário em post **OU** em foto **OU** em vídeo, com a mesma tabela `comments`.

```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end

class Post < ApplicationRecord
  has_many :comments, as: :commentable
end

class Photo < ApplicationRecord
  has_many :comments, as: :commentable
end

# migration:
create_table :comments do |t|
  t.text :body
  t.references :commentable, polymorphic: true, null: false
  # cria commentable_id (int) + commentable_type (string com nome da classe)
  t.timestamps
end

# uso:
post.comments.create!(body: "Boa!")
photo.comments.create!(body: "Linda!")
comment.commentable    # retorna o Post ou Photo dono
```

**Trade-off:** flexibilidade alta, mas o banco perde foreign key constraint real (não dá pra apontar pra duas tabelas). Use com moderação.

### Self-join — model que se relaciona consigo

```ruby
class Employee < ApplicationRecord
  belongs_to :manager, class_name: "Employee", optional: true
  has_many :subordinates, class_name: "Employee", foreign_key: "manager_id"
end

# migration: t.references :manager
employee.manager
employee.subordinates
```

---

## 6.6 Validations — antes de salvar

Rodam **antes** de `save`/`create`. Se falham:
- Sem `!` (ex: `user.save`): retorna `false`, popula `user.errors`.
- Com `!` (ex: `user.save!`): levanta `ActiveRecord::RecordInvalid`.

```ruby
class User < ApplicationRecord
  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }

  validates :idade, numericality: {
    greater_than: 0,
    less_than: 150,
    only_integer: true
  }

  validates :senha, length: { minimum: 8 }, if: -> { senha.present? }

  validate :nome_nao_pode_ser_admin   # validação customizada

  private

  def nome_nao_pode_ser_admin
    errors.add(:nome, "não pode ser 'admin'") if nome&.downcase == "admin"
  end
end
```

Verificando erros:

```ruby
user = User.new(email: "")
user.valid?              # false
user.errors.full_messages
# => ["Email não pode ficar em branco", "Idade não é um número"]
user.errors[:email]      # ["não pode ficar em branco"]
```

### Validações comuns built-in

| Validação | Exemplo |
|---|---|
| `presence` | `validates :nome, presence: true` |
| `uniqueness` | `validates :email, uniqueness: true` |
| `length` | `validates :senha, length: { minimum: 8, maximum: 72 }` |
| `format` | `validates :cpf, format: { with: /\A\d{11}\z/ }` |
| `numericality` | `validates :idade, numericality: { greater_than: 0 }` |
| `inclusion` | `validates :status, inclusion: { in: %w[ativo pausado] }` |
| `exclusion` | `validates :nome, exclusion: { in: ["admin", "root"] }` |
| `confirmation` | `validates :senha, confirmation: true` (cria virtual `senha_confirmation`) |
| `acceptance` | `validates :termos, acceptance: true` (checkbox de aceite) |

### Aviso crítico: validação no Ruby ≠ constraint no banco

`validates :email, uniqueness: true` **não é atômico**. Duas requests simultâneas podem ambas passar na validação e gravar dois registros iguais. **Sempre acompanhe com índice UNIQUE no banco**:

```ruby
add_index :users, :email, unique: true
```

Regra mental:
- **Validação Ruby** → UX (mensagem amigável pro usuário)
- **Constraint no banco** → segurança real (consistência)

Use os dois.

---

## 6.7 Callbacks — hooks no ciclo de vida

Métodos que rodam em momentos específicos:

```ruby
class User < ApplicationRecord
  before_validation :normalizar_email
  before_save       :gerar_slug
  after_create      :enviar_email_boas_vindas
  after_update_commit :limpar_cache
  before_destroy    :verificar_pode_deletar

  private

  def normalizar_email
    self.email = email.downcase.strip if email.present?
  end

  def gerar_slug
    self.slug ||= nome.parameterize
  end

  def enviar_email_boas_vindas
    UserMailer.boas_vindas(self).deliver_later
  end

  def limpar_cache
    Rails.cache.delete("user_#{id}")
  end

  def verificar_pode_deletar
    throw :abort if posts.any?
  end
end
```

Ciclo completo (mais usados):

```
before_validation
  ↓
validations
  ↓
after_validation
  ↓
before_save
  ↓
before_create (ou before_update)
  ↓
[INSERT/UPDATE]
  ↓
after_create (ou after_update)
  ↓
after_save
  ↓
after_commit (após commit da transação)
```

### Direto ao ponto: callbacks viciam

Quando você tem 8 callbacks no model, fica impossível debugar. Cada save dispara uma cascata de efeitos colaterais.

**Regra prática:**
- Use callbacks para **normalização e integridade** (`before_validation :normalizar_email`).
- Para **lógica de negócio** (enviar email, integrar com API, criar registros relacionados), use **services** ou **jobs explícitos**.

Exemplo de refactor:

```ruby
# ❌ Ruim — callback escondido
class User < ApplicationRecord
  after_create :setup_perfil_e_envia_email_e_cria_workspace
end

# ✅ Bom — explícito no service
class CadastrarUsuario
  def self.call(params)
    user = User.create!(params)
    CriarPerfil.call(user)
    EnviarBoasVindasJob.perform_later(user.id)
    CriarWorkspaceJob.perform_later(user.id)
    user
  end
end
```

---

## 6.8 Scopes — queries reutilizáveis

Scopes são queries nomeadas dentro do model. Composáveis e legíveis.

```ruby
class Post < ApplicationRecord
  scope :publicados,    -> { where(publicado: true) }
  scope :recentes,      -> { order(created_at: :desc).limit(10) }
  scope :por_autor,     ->(user) { where(user: user) }
  scope :com_tag,       ->(tag) { joins(:tags).where(tags: { nome: tag }) }
  scope :neste_mes,     -> { where(created_at: Time.current.beginning_of_month..) }
end

# Encadeáveis livremente:
Post.publicados.recentes.por_autor(current_user)
Post.publicados.com_tag("rails").neste_mes
```

Default scope (cuidado):

```ruby
class Post < ApplicationRecord
  default_scope { where(arquivado: false) }
end

Post.all   # já filtra arquivados — onipresente, fácil esquecer
Post.unscoped.all   # remove o default
```

**Conselho:** evite `default_scope`. Implícito demais, surpresas demais. Prefira scope explícito (`Post.ativos`).

---

## 6.9 Migrations — versionando o schema

Cada migration é uma mudança ao schema, com timestamp único no nome. Rails roda em ordem cronológica.

> 🕰️ **Curiosidade histórica — de `001_create_posts.rb` ao timestamp UTC**
>
> Até Rails 2.0, migrations eram **numeradas sequencialmente**: `001_create_users.rb`, `002_create_posts.rb`, `003_add_email_to_users.rb`. O controle ficava numa tabela chamada `schema_info` com uma única coluna `version` (integer). Funcionava em time de 1 dev. Em time de 3+ devs trabalhando em branches paralelas, virava inferno: dois devs criavam `005_*.rb` ao mesmo tempo, e o merge dava conflito **na numeração**, não no conteúdo.
>
> Rails 2.1 (2008) trocou o esquema por **timestamps UTC** no nome (`20260611220000_create_posts.rb`) e a tabela passou a se chamar `schema_migrations` (uma linha por versão aplicada). Você nunca mais terá conflito de "qual é o próximo número" — o `rails generate migration` carimba o instante atual e segue. Outra mudança da época: `self.up` + `self.down` virou `change` único (Rails 3.1), com Rails inferindo a reversão automaticamente pra operações comuns.

> 🔄 **Antes vs Depois — migration de criação de tabela**
>
> | Rails 1.x (Akita era) | Rails 8 |
> |---|---|
> | `001_create_posts.rb` | `20260611220000_create_posts.rb` |
> | `class CreatePosts < ActiveRecord::Migration` | `class CreatePosts < ActiveRecord::Migration[8.0]` |
> | `def self.up` + `def self.down` obrigatórios | `def change` único, reversão inferida |
> | `t.column :title, :string` | `t.string :title` |
> | `t.column :created_at, :datetime` + `t.column :updated_at, :datetime` | `t.timestamps` (uma linha) |
> | Tabela de controle: `schema_info(version int)` | Tabela de controle: `schema_migrations(version varchar)` |
> | `rake migrate` | `bin/rails db:migrate` |

### Gerando migration

```bash
bin/rails generate migration AdicionarTituloEmPosts titulo:string
```

Rails entende o nome `AdicionarXEmY` e infere a operação. O arquivo gerado:

```ruby
class AdicionarTituloEmPosts < ActiveRecord::Migration[8.0]
  def change
    add_column :posts, :titulo, :string
  end
end
```

Convenções de nome reconhecidas pelo generator:
- `AdicionarXEmY` → `add_column :y, :x, ...`
- `RemoverXDeY` → `remove_column :y, :x, ...`
- `CreateY` → `create_table :y do |t| ... end`
- `DropY` → `drop_table :y`

### `change` vs `up`/`down`

**`change`** — método único, Rails sabe reverter sozinho:

```ruby
def change
  add_column :posts, :title, :string         # reversível: remove na down
  create_table :tags do |t| ... end          # reversível: drop_table
  add_index :posts, :user_id                 # reversível
  add_reference :posts, :user, foreign_key: true   # reversível
end
```

**`up` / `down`** — quando Rails não consegue inferir a reversão (mudanças de dados, lógica condicional):

```ruby
def up
  add_column :posts, :status, :string
  execute "UPDATE posts SET status = 'published' WHERE published = true"
  remove_column :posts, :published
end

def down
  add_column :posts, :published, :boolean, default: false
  execute "UPDATE posts SET published = (status = 'published')"
  remove_column :posts, :status
end
```

### `reversible`

Pra migrations com lógica condicional reversível dentro de um `change`:

```ruby
def change
  reversible do |dir|
    dir.up   { execute "UPDATE posts SET slug = LOWER(REPLACE(title, ' ', '-'))" }
    dir.down { execute "UPDATE posts SET slug = NULL" }
  end
  remove_column :posts, :legacy_slug, :string
end
```

### Comandos essenciais

```bash
bin/rails db:migrate                         # roda migrations pendentes
bin/rails db:migrate:status                  # ver o que rodou / o que falta
bin/rails db:rollback                        # desfaz a última
bin/rails db:rollback STEP=3                 # desfaz 3
bin/rails db:migrate VERSION=20260611220000  # vai pra versão específica (down até ali)
bin/rails db:reset                           # drop + create + load schema + seed (PERDE DADOS)
bin/rails db:seed                            # roda db/seeds.rb
bin/rails db:schema:load                     # carrega schema.rb num banco zerado (CI)
```

### Boas práticas com migrations

1. **Migrations são imutáveis em produção.** Depois de rodadas, **nunca** edite — sempre faça nova.
2. **Reversibilidade importa.** Se você não consegue rollback, vai ficar refém de migration ruim.
3. **Adicionar NOT NULL em tabela grande precisa 2 passos:**
   - Migration A: adiciona coluna nullable + backfill async (job).
   - Migration B: adiciona NOT NULL após confirmar 100% preenchido.
4. **Índices em tabelas grandes** (Postgres): use `algorithm: :concurrently` — não trava a tabela:
   ```ruby
   class AddIndexConcurrent < ActiveRecord::Migration[8.0]
     disable_ddl_transaction!
     def change
       add_index :posts, :user_id, algorithm: :concurrently
     end
   end
   ```
5. **Migration grande de dados (milhões de linhas)** vai em **job**, não em migration. Migration só cria a estrutura.
6. **Sempre rode `bin/rails db:migrate` em dev antes de commitar** — pra garantir `schema.rb` atualizado.

### Strong migrations (gem opcional, recomendada)

A gem `strong_migrations` te avisa em CI/dev quando uma migration é potencialmente perigosa em produção (NOT NULL em tabela grande, remoção de coluna sem `ignored_columns`, etc.). Vale a pena adicionar em projetos sérios.

---

## 6.10 N+1 — o erro que mata performance

Você lista 100 posts e mostra o autor de cada um:

```ruby
# controller
@posts = Post.all
```

```erb
<%# view %>
<% @posts.each do |post| %>
  <p><%= post.title %> — por <%= post.user.nome %></p>
<% end %>
```

SQL gerado:

```sql
SELECT * FROM posts;                       -- 1 query
SELECT * FROM users WHERE id = 1 LIMIT 1;  -- + 100 queries
SELECT * FROM users WHERE id = 2 LIMIT 1;
...
SELECT * FROM users WHERE id = 100 LIMIT 1;
```

Isso é **N+1**: 1 query pra carregar os posts + N queries pra carregar os users. Em produção, com tráfego, derruba o banco.

### A solução: `includes`

```ruby
@posts = Post.includes(:user).all
```

SQL:

```sql
SELECT * FROM posts;
SELECT * FROM users WHERE id IN (1, 2, ..., 100);   -- 1 query só
```

**2 queries totais.** Resolvido.

### Detectando N+1 em dev

Gem **bullet**:

```ruby
# Gemfile
gem 'bullet', group: [:development, :test]
```

Configure em `config/environments/development.rb`:

```ruby
config.after_initialize do
  Bullet.enable        = true
  Bullet.alert         = true   # popup no browser
  Bullet.bullet_logger = true   # log/bullet.log
  Bullet.console       = true   # console.log do browser
  Bullet.rails_logger  = true
end
```

Bullet te avisa toda vez que detecta N+1 (e também eager loading desnecessário — também ruim).

### `includes` vs `joins` vs `preload` vs `eager_load`

Quatro métodos parecidos, propósitos diferentes:

- **`joins`** — INNER JOIN pra **filtrar**, mas NÃO carrega o lado associado. Usa quando você precisa de `where` na associação mas não vai usar os dados dela.
  ```ruby
  User.joins(:posts).where(posts: { publicado: true })
  ```
- **`preload`** — sempre 2 queries (a do model + `WHERE id IN (...)`). Não permite usar associação no `where`.
  ```ruby
  Post.preload(:user)
  ```
- **`eager_load`** — LEFT JOIN com 1 query gigante. Permite `where` na associação.
  ```ruby
  Post.eager_load(:user).where(users: { ativo: true })
  ```
- **`includes`** — Rails decide entre preload e eager_load conforme contexto. **99% do tempo, use `includes`.**

---

## 6.11 Transações

Operações que precisam ser atômicas (tudo dá certo ou nada acontece):

```ruby
ActiveRecord::Base.transaction do
  from.update!(saldo: from.saldo - valor)
  to.update!(saldo: to.saldo + valor)
  Transferencia.create!(de: from, para: to, valor: valor)
end
```

Se qualquer linha levantar exceção, **tudo é revertido**. Se você não usa `!`, falhas silenciosas não disparam rollback — sempre use `save!`, `update!`, `create!` dentro de transação.

### `with_lock` — lock pessimista pra evitar race

```ruby
account.with_lock do
  account.saldo -= 100
  account.save!
end
```

Pega `SELECT ... FOR UPDATE` no banco. Outras transações esperam.

---

## 6.12 Pegadinhas reais

1. **`belongs_to` exige presença por default** — Rails 5+. Pra opcional: `belongs_to :user, optional: true`.

2. **`uniqueness: true` não é atômico** — sempre acompanhe com índice UNIQUE no banco.

3. **`destroy_all` é lento** — instancia cada record e roda callbacks. Pra deletar em massa sem callbacks: `delete_all`. **Cuidado:** `delete_all` pula callbacks E pode quebrar integridade (se você dependia de `dependent: :destroy` em cascata).

4. **Callbacks em cascata** — `after_create` que dispara outro `create` pode causar loop. Sempre saiba o que cada callback faz.

5. **`Time.now` vs `Time.current`** — `Time.now` usa o relógio da máquina (UTC ou hora local da VPS); `Time.current` respeita `Rails.application.config.time_zone`. **Sempre `Time.current` em código Rails.**

6. **Strong parameters esquecidos** — `Post.create(params)` (sem `.permit`) é vulnerabilidade de mass assignment. Use sempre:
   ```ruby
   params.require(:post).permit(:title, :body, :publicado)
   ```

7. **`scope` que retorna `nil`** — se a lambda do scope tem `if`/`return`, pode quebrar encadeamento. Sempre retorne uma Relation.

8. **`update_columns` pula validations E callbacks** — útil pra "marcar atualizado" sem efeitos colaterais, perigoso por padrão.

9. **`find_or_create_by` tem race condition** — entre o find e o create, alguém pode criar. Pra resolver: `find_or_create_by!` + rescue, ou use `upsert`.

10. **`counter_cache`** — quando você quer `post.comments.count` rápido (sem SQL), use:
    ```ruby
    belongs_to :post, counter_cache: true
    # migration: add_column :posts, :comments_count, :integer, default: 0
    ```

---

## 6.13 Lab — sistema de biblioteca

### Objetivo

Modelar uma biblioteca real: livros, autores, leitores, empréstimos. Você vai praticar **todos os relacionamentos**, validations, scopes, callbacks (com moderação) e N+1.

### Especificação funcional

- Um **autor** tem nome, bio, e vários livros.
- Um **livro** tem título, ISBN único, ano, pertence a um autor.
- Um **leitor** tem email único, nome, e faz vários empréstimos.
- Um **empréstimo** liga livro e leitor, com data de saída, data prevista de devolução, data real de devolução (pode ser nil), e multa (decimal).
- Um livro está **disponível** se não tem empréstimo ativo (devolução nil).
- **Não pode** ter dois empréstimos ativos pro mesmo livro ao mesmo tempo.
- Multa de **R$ 2,00/dia** atrasado.

### Passos

#### 1. Crie o projeto

```bash
cd ~/Desktop/ebooks/Por\ que\ Rails\?/labs/cap_06
rails new biblioteca
cd biblioteca
```

> ⚠️ **Cuidado — "Rails NÃO é Scaffold"**
>
> > "CUIDADO: Rails NÃO é Scaffold. Scaffold é apenas uma pequena funcionalidade para facilitar prototipação." — Fabio Akita, *Entendendo Rails* (2007)
>
> Esse aviso tem 20 anos e continua sendo o que mais salva carreira de dev junior. Os `bin/rails g model …` abaixo geram migration + model + teste, e isso é ótimo pra estudar. Mas se você abrir um codebase de SaaS de verdade, vai ver models com lógica de negócio (não-trivial), services, jobs, concerns, view components — coisas que `bin/rails g scaffold` nunca vai gerar pra você. Generators são **andaime**, não construção. Muito dev junior confunde "código gerado feio" com "Rails feio" e desiste. Errado: o feio é o andaime, e o andaime sai depois que a casa fica em pé. Use `g` à vontade neste lab; mas saiba que produção é o que **você** escreve em cima do que ele gerou.

#### 2. Gere models e migrations

```bash
bin/rails g model Autor nome:string bio:text
bin/rails g model Livro titulo:string isbn:string ano:integer autor:references
bin/rails g model Leitor email:string nome:string
bin/rails g model Emprestimo livro:references leitor:references \
  data_saida:date data_prevista:date data_devolucao:date multa:decimal
```

Edite a migration de Livro pra garantir ISBN único e títulos não-nulos:

```ruby
class CreateLivros < ActiveRecord::Migration[8.0]
  def change
    create_table :livros do |t|
      t.string :titulo, null: false
      t.string :isbn, null: false
      t.integer :ano
      t.references :autor, null: false, foreign_key: true
      t.timestamps
    end
    add_index :livros, :isbn, unique: true
  end
end
```

Idem pra Leitor (email único):

```ruby
add_index :leitores, :email, unique: true
```

Rode:

```bash
bin/rails db:migrate
```

#### 3. Models com relacionamentos, validações e scopes

```ruby
# app/models/autor.rb
class Autor < ApplicationRecord
  has_many :livros, dependent: :destroy
  validates :nome, presence: true
end
```

```ruby
# app/models/livro.rb
class Livro < ApplicationRecord
  belongs_to :autor
  has_many :emprestimos, dependent: :restrict_with_error

  validates :titulo, presence: true
  validates :isbn, presence: true, uniqueness: true
  validates :ano, numericality: { only_integer: true, greater_than: 1450 }, allow_nil: true

  scope :disponiveis, -> {
    where.not(id: Emprestimo.ativos.select(:livro_id))
  }

  def disponivel?
    !emprestimos.ativos.exists?
  end
end
```

```ruby
# app/models/leitor.rb
class Leitor < ApplicationRecord
  has_many :emprestimos, dependent: :restrict_with_error
  has_many :livros, through: :emprestimos

  validates :nome, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }

  before_validation :normalizar_email

  private

  def normalizar_email
    self.email = email.downcase.strip if email.present?
  end
end
```

```ruby
# app/models/emprestimo.rb
class Emprestimo < ApplicationRecord
  VALOR_MULTA_DIA = 2.0

  belongs_to :livro
  belongs_to :leitor

  validates :data_saida, :data_prevista, presence: true
  validate  :livro_disponivel, on: :create
  validate  :datas_coerentes

  before_save :calcular_multa, if: :data_devolucao?

  scope :ativos,    -> { where(data_devolucao: nil) }
  scope :atrasados, -> { ativos.where("data_prevista < ?", Date.current) }
  scope :devolvidos, -> { where.not(data_devolucao: nil) }

  def atrasado?
    data_devolucao.nil? && data_prevista < Date.current
  end

  def dias_de_atraso
    return 0 unless data_devolucao && data_devolucao > data_prevista
    (data_devolucao - data_prevista).to_i
  end

  private

  def livro_disponivel
    return unless livro
    if livro.emprestimos.ativos.where.not(id: id).exists?
      errors.add(:livro, "já está emprestado")
    end
  end

  def datas_coerentes
    return unless data_saida && data_prevista
    errors.add(:data_prevista, "deve ser depois de data_saida") if data_prevista < data_saida
  end

  def calcular_multa
    self.multa = dias_de_atraso * VALOR_MULTA_DIA
  end
end
```

#### 4. Seeds

```ruby
# db/seeds.rb
puts "Limpando..."
Emprestimo.destroy_all
Livro.destroy_all
Leitor.destroy_all
Autor.destroy_all

puts "Criando autores e livros..."
machado = Autor.create!(nome: "Machado de Assis", bio: "Pai do realismo brasileiro.")
clarice = Autor.create!(nome: "Clarice Lispector", bio: "Modernista.")

Livro.create!(autor: machado, titulo: "Dom Casmurro", isbn: "978-85-1", ano: 1899)
Livro.create!(autor: machado, titulo: "Memórias Póstumas", isbn: "978-85-2", ano: 1881)
Livro.create!(autor: clarice, titulo: "A Hora da Estrela", isbn: "978-85-3", ano: 1977)

puts "Criando leitores..."
ana = Leitor.create!(email: "ana@x.com", nome: "Ana")
joao = Leitor.create!(email: "joao@x.com", nome: "João")

puts "Criando empréstimos..."
Emprestimo.create!(
  livro: Livro.first, leitor: ana,
  data_saida: 10.days.ago, data_prevista: 3.days.ago
)
Emprestimo.create!(
  livro: Livro.second, leitor: joao,
  data_saida: 1.day.ago, data_prevista: 14.days.from_now
)

puts "Pronto! Livros: #{Livro.count}, Leitores: #{Leitor.count}, Empréstimos: #{Emprestimo.count}"
```

Rode:

```bash
bin/rails db:seed
```

#### 5. Brinque no console

```bash
bin/rails console
```

```ruby
# Listar livros disponíveis
Livro.disponiveis.pluck(:titulo)
# => ["A Hora da Estrela"]

# Empréstimos atrasados
Emprestimo.atrasados.map { |e| "#{e.livro.titulo} (#{e.leitor.nome})" }

# Demonstrar N+1 (RUIM):
Livro.all.each { |l| puts "#{l.titulo} — #{l.autor.nome}" }
# Veja no log: 1 query pra livros + N pra autores

# Solução (BOM):
Livro.includes(:autor).each { |l| puts "#{l.titulo} — #{l.autor.nome}" }
# Veja no log: só 2 queries

# Tentar emprestar livro já emprestado:
emp_invalido = Emprestimo.new(
  livro: Livro.first, leitor: Leitor.last,
  data_saida: Date.current, data_prevista: 7.days.from_now
)
emp_invalido.valid?
emp_invalido.errors.full_messages
# => ["Livro já está emprestado"]

# Devolver com atraso e ver multa
emp = Emprestimo.atrasados.first
emp.update!(data_devolucao: Date.current)
emp.multa
# => 6.0 (3 dias * R$2 — ajuste pelos seeds)
```

#### 6. Detecte N+1 com bullet (opcional)

Adicione ao `Gemfile`:

```ruby
group :development, :test do
  gem "bullet"
end
```

`bundle install` e configure em `config/environments/development.rb`:

```ruby
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
end
```

Rode o app, navegue, veja os warnings.

### Critério de sucesso

- Você consegue criar autor → livro → leitor → empréstimo
- Validação **impede** emprestar livro já emprestado
- Validação **impede** data_prevista < data_saida
- Scopes (`disponiveis`, `atrasados`) funcionam
- Multa é calculada automaticamente ao setar `data_devolucao`
- Você roda `includes` quando faz sentido e vê o SQL otimizado no log
- Email é normalizado (lowercase + trim) antes de salvar

### Extras

- Adicione `has_and_belongs_to_many :tags` em Livro (gênero, categoria).
- Crie migration pra adicionar `quantidade_estoque` em Livro e ajuste `disponivel?` pra considerar estoque > emprestados ativos.
- Escreva 3 testes em `test/models/emprestimo_test.rb` cobrindo validations.
- Adicione `counter_cache` em `Autor` pra contagem rápida de livros.

---

## 6.14 Pra fundo

- **Rails Guides — Active Record Basics** — https://guides.rubyonrails.org/active_record_basics.html
- **Rails Guides — Active Record Query Interface** — https://guides.rubyonrails.org/active_record_querying.html
- **Rails Guides — Active Record Associations** — https://guides.rubyonrails.org/association_basics.html
- **Rails Guides — Active Record Migrations** — https://guides.rubyonrails.org/active_record_migrations.html
- **The Bullet gem** — https://github.com/flyerhzm/bullet (detecção de N+1)
- **strong_migrations** — https://github.com/ankane/strong_migrations (avisa migrations perigosas)
- **"Crafting Rails 4 Applications"** — José Valim (datado mas conceitos atemporais)
- **Postgres docs sobre EXPLAIN** — útil quando você precisar otimizar queries de verdade
- **"Patterns of Enterprise Application Architecture"** — Martin Fowler (capítulo "Active Record" original)

---

> **No próximo capítulo:** routes, controllers e a arquitetura REST do Rails. Como `resources :posts` cria 7 rotas de uma só vez e por que isso é uma decisão de design genial.
