---
layout: post
published: false
title: "Eu achava que sabia usar IA. Eu só sabia perguntar."
date: 2026-06-12 14:00:00 -0300
categories: [Tecnologia]
serie: "engenharia-de-prompt"
tags: [llm, prompt, iniciantes, ia]
description: "Primeiro post de uma sequência sobre engenharia de prompt para iniciantes. A virada: prompt não é mágica, é briefing — com exemplos e um pouco de técnica."
---

Antes de culpar o ChatGPT, o Gemini ou o Claude pela resposta ruim, vale uma desconfiança: talvez o problema não seja a IA. Talvez seja o jeito como você está pedindo.

Esse é o primeiro de uma **sequência de posts sobre engenharia de prompt para iniciantes** — de forma prática, com exemplos, sem fórmula secreta. E quero abrir com a frase que organiza tudo o que vem depois: **prompt não é mágica, é briefing.**

## Meu primeiro choque com IA

Meu primeiro contato forte com um modelo de linguagem não foi num laboratório nem num projeto sofisticado. Foi numa tarefa chata de trabalho.

Um gestor de projeto me pediu para ajustar um texto. Era aquela situação clássica: você escreve, entrega, recebe uma observação, ajusta, entrega de novo — e mesmo assim a pessoa do outro lado sente que "não chegou lá". Eu reescrevia, mudava o tom, trocava palavras. O retorno continuava vindo com aquela sensação de que ainda faltava alguma coisa.

Até que joguei o texto numa ferramenta de IA e pedi ajuda. A resposta veio mais limpa, mais organizada, mais direta. Quando mostrei a nova versão, o gestor reagiu com um **"aí sim."**

Naquele momento eu achei que tinha descoberto uma máquina mágica de resolver textos. Joga uma frase lá dentro, ela devolve algo melhor, alguém aprova. Mas aquilo não era domínio. Era só o primeiro impacto — e eu ainda não tinha entendido a parte mais importante.

## Por que a IA "inventa": ela está adivinhando a próxima palavra

Com o tempo, a mágica começou a falhar. A IA inventava informação, exagerava, respondia genérico, fugia do tom. Pior: respondia com a maior confiança do mundo, mesmo sem base. São as tais **"alucinações"**. E pra usar IA bem, você precisa entender de onde elas vêm — porque a causa explica quase tudo.

No fundo, uma LLM (modelo de linguagem) é uma **máquina de prever o próximo pedaço de texto**. Ela quebra tudo em *tokens* (pedaços de palavra), olha tudo que veio antes e calcula: "dado esse contexto, qual o próximo token mais provável?". Escolhe um, anexa, e repete o processo — token a token — até formar a resposta inteira.

Repara no que isso significa:

- Ela **não consulta um banco de fatos**. Ela reconhece padrões estatísticos da linguagem que viu no treino.
- Quando o padrão mais provável **bate com a verdade**, você recebe uma resposta certa. 
- Quando **não bate**, ela escreve algo *plausível e errado* — com exatamente a mesma confiança. Ela não "sabe" que errou; ela só seguiu a probabilidade.

> A IA não está mentindo nem com preguiça. Ela está fazendo a única coisa que sabe fazer: completar o texto com o que parece mais provável.

Existe até um botão que mexe nisso: a **temperatura**. Temperatura baixa = ela escolhe quase sempre o token mais provável (mais previsível, mais "seguro"). Temperatura alta = ela arrisca opções menos óbvias (mais criativa, mais propensa a viajar). Você nem sempre controla isso direto no chat, mas é bom saber que existe.

E aqui está o pulo do gato, que conecta com o resto do post: **se a resposta é guiada por probabilidade, então o contexto que você dá é o que empurra essa probabilidade pro lado certo.** Pedido pobre → ela adivinha no escuro. Pedido rico em contexto → você ancora o modelo perto da resposta que você quer. Foi essa ficha que caiu pra mim: o problema, muitas vezes, não era a IA. Era o meu pedido.

## Uma linha do tempo rápida (pra situar)

Engenharia de prompt não é modinha de coach — ela nasceu junto com a própria tecnologia. Uns marcos pra você ter referência:

- **2017** — O paper *Attention Is All You Need* (Vaswani et al.) apresenta a arquitetura **Transformer**, a base de praticamente toda LLM moderna.
- **2020** — *Language Models are Few-Shot Learners* (Brown et al.) lança o **GPT-3** e mostra que dá pra "ensinar" o modelo só com exemplos dentro do prompt — o chamado *few-shot prompting*. É aqui que prompt vira disciplina.
- **2022 (jan)** — *Chain-of-Thought Prompting* (Wei et al.) mostra que pedir pro modelo **"pensar passo a passo"** melhora bastante o raciocínio.
- **2022 (mar)** — *InstructGPT* (Ouyang et al.) usa RLHF (aprendizado por reforço com feedback humano) pra alinhar o modelo a **seguir instruções**. É o que torna o "briefing" possível na prática.
- **2022 (nov)** — O **ChatGPT** é lançado e leva tudo isso pro grande público.

Não precisa decorar nada disso. A mensagem é só: a forma como você escreve o pedido sempre foi parte da tecnologia, não um truque por fora dela.

## O erro mais comum de quem está começando

Quase todo mundo começa com pedidos assim:

```
Melhore esse texto.
Me explique esse assunto.
Faça um post sobre isso.
```

Esses pedidos até geram alguma coisa, mas são vagos demais. A LLM não sabe para quem é o texto, qual o objetivo, qual tom usar, qual formato você espera, o que evitar, qual profundidade. Então ela faz o que dá: gera a resposta mais provável a partir do pouquíssimo contexto que recebeu.

Daí o usuário reclama que "a IA respondeu de forma genérica". Mas ela respondeu genérico porque recebeu uma instrução genérica. Entra lixo, sai lixo — e contexto vago é um tipo de lixo.

## Prompt não é pergunta. É briefing.

Pensa em como você pede algo para uma pessoa num projeto. Você não chega e fala só "faz aí um texto melhor". Você explica o contexto, diz quem vai ler, mostra o objetivo, define o tom, aponta os limites.

Com IA é igual. A diferença é que o modelo não conhece a sua intenção — ele só tem o que você escreveu na caixa de texto. Tudo que ficou na sua cabeça e não virou texto, pra ele não existe.

Um bom briefing responde, mais ou menos nesta ordem:

- **O que** deve ser feito?
- **Para quem**?
- **Com qual objetivo**?
- **Em qual formato**?
- **Com qual tom**?
- **Com quais critérios** — e o que **evitar**?

## Exemplo 1: reescrever um texto

O prompt fraco é o clássico:

```
Melhore esse texto:
[texto]
```

Curto e pobre. A IA pode melhorar a gramática, mudar o tom, resumir, inflar, ou inventar uma intenção que nunca foi sua. Você perde o controle do resultado.

Agora o mesmo pedido virando briefing:

```
Reescreva o texto abaixo.

Papel: você é um editor escrevendo para um gestor de projetos
ocupado, que lê rápido.
Objetivo: deixar a mensagem mais clara e direta, sem mudar o sentido.
Tom: profissional, direto, nada robótico.
Critérios:
- mantenha a ideia central
- abra com uma frase forte
- corte repetições
Evite: linguagem artificial, jargão e promessas exageradas.

Texto:
[texto]
```

Sente a diferença? No segundo, a IA não está só "melhorando" no escuro — está trabalhando dentro de critérios. Mesma ferramenta, resultado completamente diferente. A única coisa que mudou foi a qualidade do pedido.

## Exemplo 2: pedir uma explicação

Pra mostrar que isso não vale só pra texto, vamos a um pedido de estudo. O fraco:

```
Me explique recursão.
```

A IA não sabe o seu nível, então chuta um meio-termo: provavelmente uma explicação genérica, com jargão, que serve pra todo mundo e pra ninguém. Agora com briefing:

```
Explique o conceito de recursão.

Para quem: alguém que está aprendendo a programar há 1 mês.
Formato:
1. uma analogia do dia a dia
2. um exemplo em pseudocódigo de até 8 linhas
3. um aviso sobre o erro mais comum de iniciante
Tom: didático e leve.
Limite: no máximo 200 palavras, sem termos acadêmicos.
```

O segundo prompt não é "mais bonito" — ele é mais **específico**. Ele tira da IA a necessidade de adivinhar o seu nível, o seu objetivo e o seu formato. E adivinhar, como a gente viu lá em cima, é justamente onde ela escorrega.

## O que essa experiência me ensinou

A IA não substitui clareza. Ela **amplifica** clareza. Se o pedido é confuso, ela amplifica a confusão. Se é vago, devolve genérico. Se é bem estruturado, vira uma ferramenta absurda de produção e criação.

Por isso a primeira habilidade de quem usa IA não é decorar o nome da ferramenta da moda nem caçar "prompts secretos" vendidos por aí. É saber formular intenção. O iniciante não precisa de mágica — precisa do básico bem feito:

**Tarefa · Contexto · Objetivo · Formato · Critérios · Limites · Exemplos.**

Essa estrutura simples já muda o nível da resposta. Trate a LLM como uma colaboradora recebendo briefing, não como um oráculo. Sem direção, ela adivinha. E quando começa a adivinhar demais, você perde o controle do resultado.

## Pense antes de digitar

Fica a provocação para a próxima vez que você abrir o ChatGPT, o Gemini ou o Claude. Antes de digitar qualquer coisa, responda na sua cabeça:

- O que eu quero produzir?
- Quem vai consumir isso?
- Qual o contexto e o formato que eu espero?
- Qual tom?
- O que seria uma resposta ruim — o que a IA precisa evitar?

Engenharia de prompt não começa digitando. Começa pensando.

Eu achava que sabia usar IA porque conseguia fazer perguntas. Mas usar IA bem não é só perguntar: é orientar, contextualizar, definir critério, transformar intenção em instrução. Aquele "aí sim" do gestor me mostrou o poder da IA. O tempo me mostrou algo mais importante — a qualidade da resposta depende da qualidade do pedido.

Então pare de fazer perguntas soltas. Comece a construir briefings.

## É só o começo

Esse foi o post de estreia da sequência. Nos próximos, eu vou descer mais fundo: a anatomia de um prompt bom peça por peça, como usar exemplos a seu favor (o tal *few-shot*), o "pense passo a passo" (*chain-of-thought*), refinamento e crítica de respostas, e os primeiros passos rumo a agentes.

Se a ideia de tratar prompt como briefing fez sentido pra você, fica de olho. Até o próximo, escolhe uma tarefa real e tenta reescrever o teu pedido como um briefing — papel, objetivo, formato, critérios, limites. Você vai sentir a diferença na primeira tentativa.

zd4▮
