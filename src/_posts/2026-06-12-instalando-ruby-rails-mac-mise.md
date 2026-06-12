  ---
  layout: post
  title: "Instalando Ruby 3.3 e Rails 8 no Mac com mise"
  date: 2026-06-12 10:00:00 -0300
  categories: [rails, setup]
  --- 

  ---
layout: post
title: "Instalar Ruby 3.3 e Rails 8 no Mac com mise (2026)"
date: 2026-06-12 10:00:00 -0300
categories: [rails, ruby, setup]
description: "Guia prático pra instalar Ruby 3.3 e Rails 8 no Mac usando mise, sem mexer no Ruby do sistema nem usar sudo. Passo a passo testado em 2026."
---

Abri o terminal, digitei `ruby --version` e o Mac me respondeu, com toda a calma do mundo:

```bash
ruby 2.6.10p210 (2022-04-12 revision 67668) [universal.x86_64-darwin24]
```

Ruby **2.6.10**. De 2022. End-of-life. Aposentado. E o Rails 8, que eu queria usar, exige **Ruby 3.1 ou mais novo**. Ou seja: o Ruby que veio de fábrica no macOS não serve pra nada que eu pretendo fazer.

Esse é o post de estreia do blog. E nada mais justo do que começar do começo: montar um ambiente Rails moderno do zero, num Mac, em 2026. Vou te contar exatamente o que fiz, por que fiz, e quais pegadinhas quase me derrubaram pelo caminho.

No fim você vai ter **Ruby 3.3.11** e **Rails 8.1.3** rodando, isolados, limpinhos, sem ter encostado um dedo no Ruby do sistema.

Bora.

## Por que não usar o Ruby que já vem no Mac

A tentação é grande. O Ruby já está ali, em `/usr/bin/ruby`. Por que não usar logo ele?

Três motivos, e os três doem:

1. **Ele é velho.** 2.6.10 saiu de linha em 2022. Rails 8 nem liga.
2. **Ele é da Apple, não seu.** Aquele Ruby existe pra rodar ferramentas internas do macOS. Mexer nele é mexer no sistema operacional.
3. **`sudo gem install` é uma armadilha.** Pra instalar gem no Ruby do sistema você precisa de `sudo`. E aí você começa a espalhar arquivos com permissão de root pela sua máquina, criar conflitos de permissão e, no melhor dos casos, dor de cabeça. No pior, um ambiente que você não consegue mais limpar.

Regra de ouro que eu sigo religiosamente: **nunca toque no Ruby do sistema, e nunca use `sudo gem install`.** Se a solução pede `sudo` pra instalar uma gem, a solução está errada.

A saída é instalar um Ruby *seu*, num cantinho seu, gerenciado por uma ferramenta feita pra isso. Esse tipo de ferramenta tem nome: **gerenciador de versões**.

## mise, rbenv ou asdf? Escolhendo o gerenciador de versões

Antes de instalar qualquer coisa, eu parei pra decidir *qual* gerenciador usar. Existem três grandes nomes nesse mundo, e cada um tem sua filosofia.

| Critério | rbenv | asdf | mise |
| --- | --- | --- | --- |
| Linguagens | Só Ruby | Várias (Ruby, Node, Python...) | Várias (Ruby, Node, Python...) |
| Escrito em | Shell/C | Shell (Bash) | **Rust** |
| Velocidade | Leve e rápido | Mais lento (shell hooks pesados) | **Rápido** |
| Arquivo de versão | `.ruby-version` | `.tool-versions` | `.tool-versions` / `.mise.toml` |
| `.env` por projeto | Não | Não | **Sim** |
| Task runner | Não | Não | **Sim** |
| Plugins asdf | — | Nativo | **Compatível** |
| Surgiu em | 2011 | 2019 | **2023+** |

Resumindo a história de cada um:

- **rbenv** é o clássico. Desde 2011, faz uma coisa só (gerenciar Ruby) e faz muito bem. Super estável, leve. Se você só vai mexer com Ruby pra sempre, é uma escolha excelente.
- **asdf** trouxe a ideia genial de *um gerenciador pra todas as linguagens*. Ruby, Node, Python, Elixir... tudo num lugar só, via plugins. O problema: ele é escrito em shell script e usa hooks pesados, o que deixa seu terminal perceptivelmente mais lento.
- **mise** (lê-se "miz", como em *mise en place*) pegou a ideia multi-linguagem do asdf e reescreveu tudo em **Rust**. Resultado: rápido como o rbenv, abrangente como o asdf. De quebra, é **compatível com os plugins do asdf**, gerencia variáveis de ambiente (`.env`) por projeto e ainda tem um task runner embutido.

### Por que eu escolhi o mise

Confissão: eu não vivo só de Ruby. Também mexo com **Python e Node**. E ter três gerenciadores diferentes, cada um com sua sintaxe e seus arquivos de config, é exatamente o tipo de bagunça que eu fujo.

Um gerenciador pra tudo > três gerenciadores separados. O mise me dá isso, é rápido (o detalhe do Rust importa no dia a dia), e o gerenciamento de ambiente por projeto fecha com o jeito que eu gosto de trabalhar. Decisão tomada.

## Passo a passo: instalando tudo no Mac

Agora a parte prática. São cinco passos. Cada bloco abaixo é copiável.

### 1. Instalar o mise

Eu uso [Homebrew](https://brew.sh) pra tudo no Mac, então instalei o mise por ele:

```bash
brew install mise
```

Simples assim. O mise é um binário único em Rust, sem dependências bizarras.

### 2. Ativar o mise no shell

Esse passo é o que **todo mundo esquece** e depois passa raiva. Instalar o mise não basta: você precisa *ativá-lo* no seu shell pra que ele assuma o controle de qual Ruby roda quando você digita `ruby`.

No Mac, o shell padrão é o **zsh**. Então a gente adiciona a linha de ativação no final do `~/.zshrc`:

```bash
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

> **Pegadinha número 1:** o `~/.zshrc` só é lido quando um novo shell começa. Editar o arquivo **não** ativa o mise na janela de terminal que já está aberta. Você precisa de um terminal novo. Ou feche e reabra o Terminal, ou rode `exec zsh` pra recarregar. Se você pular isso e for direto pro próximo comando, o mise vai parecer "quebrado" — e na verdade ele só não foi carregado ainda.

Abra um terminal novo e confirme que o mise responde:

```bash
mise --version
```

### 3. Instalar o Ruby 3.3

Com o mise ativo, instalar o Ruby é uma linha:

```bash
mise install ruby@3.3
```

Aqui vale um aviso pra você não achar que travou: o mise **compila o Ruby a partir do código-fonte** (ele usa o `ruby-build` por baixo). Isso significa que esse comando **demora alguns minutos** — ele está literalmente construindo o Ruby na sua máquina. É normal. Vai fazer um café.

No fim, ele instalou a versão mais recente da linha 3.3: a **Ruby 3.3.11**.

### 4. Definir o Ruby 3.3 como global

Instalar não é o mesmo que *usar*. Agora a gente diz ao mise: "esse é o Ruby padrão da minha máquina".

```bash
mise use -g ruby@3.3
```

O `-g` é de *global*. Esse comando cria (ou atualiza) o arquivo `~/.config/mise/config.toml`, que é onde o mise guarda suas escolhas globais. A partir de agora, em qualquer pasta que não tenha uma config própria, o `ruby` vai ser o 3.3.11.

Confere:

```bash
ruby --version
# => ruby 3.3.11 ...
```

Se ainda aparecer 2.6.10 aqui, respira: provavelmente é a **pegadinha número 1** de novo. Abra um terminal novo.

### 5. Instalar o Rails 8

Agora que temos um Ruby decente e *nosso*, o Rails entra sem `sudo`, sem drama:

```bash
gem install rails
```

Repara que **não tem `sudo`** ali. E é assim mesmo que tem que ser. Como o Ruby agora vive na sua pasta de usuário (em `~/.local/share/mise/installs/ruby/3.3/`), o `gem install` escreve ali, com suas permissões normais. Sem root, sem conflito.

Isso me deu o **Rails 8.1.3**.

## Conferindo: deu tudo certo?

Momento da verdade. Os dois comandos que importam:

```bash
ruby --version
# ruby 3.3.11 ...

rails --version
# Rails 8.1.3
```

Se você viu `ruby 3.3.11` e `Rails 8.1.3`, parabéns: você tem um ambiente Rails moderno, isolado em `~/.local/share/mise/installs/ruby/3.3/`, sem ter encostado no Ruby 2.6.10 da Apple. O Ruby do sistema continua lá, intocado, fazendo as coisas dele. E o seu Ruby faz as suas.

É essa separação que evita 90% das dores de cabeça de ambiente Ruby no Mac.

## Por que isso vale a pena: o que o Rails 8 te entrega

"Tá, Zd4, instalei. E daí?"

E daí que o **Rails 8** é provavelmente a versão mais empolgante do framework em anos — especialmente pra quem trabalha sozinho ou em time pequeno. Olha só o que vem na caixa:

- **Solid Stack** — `Solid Queue`, `Solid Cache` e `Solid Cable` rodam em cima do banco de dados. Tradução: filas, cache e WebSockets **sem precisar de Redis**. Menos infra pra manter.
- **Kamal 2** — deploy da sua app pra um servidor com um comando, usando Docker, sem depender de Heroku/plataforma cara.
- **Autenticação nativa** — o Rails 8 gera um sistema de login pra você, sem precisar colar gem de terceiro.
- **SQLite viável em produção** — sim, sério. Pra muitos projetos, dá pra subir com SQLite e dormir tranquilo.

Junta tudo: um dev solo, com uma máquina e o ambiente que a gente acabou de montar, consegue subir um SaaS completo do zero ao deploy. Esse é o tipo de coisa que me empolga — e é o que eu quero explorar aqui no blog.

## Próximos passos

Ambiente pronto. Ruby 3.3.11, Rails 8.1.3, tudo no lugar.

No **próximo post** eu vou usar exatamente esse setup pra criar a primeira aplicação Rails 8 de verdade — `rails new`, estrutura de pastas, primeiro servidor de pé — e a gente vai começar a entender o que cada peça faz.

Esse blog vai ser uma série sobre construir coisas com Rails moderno, contando a experiência real, erros inclusos. Se isso te interessa, fica de olho por aqui (e me acompanha no LinkedIn, onde eu posto quando sai coisa nova).

Até o próximo `ruby --version`.