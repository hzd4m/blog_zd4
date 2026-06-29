---
layout: post
title: "Resolvendo: Luan e o Time de Treinamento"
date: 2026-06-29 12:00:00 -0300
categories: [Tecnologia]
tags: [competitive-programming, cpp, modelagem, condicionais, estudos]
description: "Outra variação autoral, dessa vez inspirada no clássico 231A do Codeforces. Mostro como modelar uma decisão com duas condições sem cair nas armadilhas e resolvo em C++ passo a passo."
---

Mais um problema que eu mesmo criei. O "Luan e o Time de Treinamento" é uma variação autoral do clássico *A. Team* (231A) do Codeforces — peguei a ideia de "votação de três pessoas" e acrescentei uma segunda condição pra obrigar o leitor a montar uma regra composta. O enunciado está no `questao.md` e a resolução no `main.cpp`.

Direto ao ponto: modelagem primeiro, código depois.

## A modelagem

Cada questão chega como quatro inteiros: `e s g p`. Os três primeiros são flags (0 ou 1) dizendo se Erik, Sandoval e Genival sabem resolver. O quarto, `p`, é o risco: 0 baixo, 1 médio, 2 alto.

O grupo resolve a questão quando duas condições acontecem ao mesmo tempo:

1. pelo menos dois amigos sabem  -> `e + s + g >= 2`
2. o risco não é alto            -> `p != 2`

A sacada da modelagem está em duas escolhas. A primeira é perceber que, como os votos são 0 ou 1, somar as três flags já conta quantos sabem — não preciso de três `if` separados, só de `e + s + g`. A segunda é traduzir "não muito arriscada" como `p != 2`, e não como `p == 0` — porque risco médio também vale. Esse é o tipo de detalhe que, se você ler rápido, modela errado.

Juntando as duas, a regra inteira vira uma única condição:

```cpp
e + s + g >= 2 && p != 2
```

E o problema todo é só contar quantas questões satisfazem isso.

## O passo a passo do código

A estrutura é um acumulador clássico. Lê `n`, zera o contador e percorre as questões:

```cpp
int n;
cin >> n;

int resposta = 0;
for (int i = 0; i < n; i++) {
    int e, s, g, p;
    cin >> e >> s >> g >> p;
    ...
}
```

Dentro do laço, o primeiro passo é colapsar os três votos em um número — quantos sabem resolver:

```cpp
int soma = e + s + g;
```

O segundo passo é aplicar a regra composta da modelagem e, se passar, incrementar o contador:

```cpp
if (soma > 1 && p != 2) {
    resposta++;
}
```

Vale notar que eu escrevi `soma > 1` em vez de `soma >= 2` — dá no mesmo, já que `soma` é inteiro, mas é justamente onde mora a pegadinha clássica desse tipo de problema: confundir "pelo menos dois" (`>= 2`) com "mais de dois" (`> 2`). Aqui está correto, mas é o ponto que eu mais reviso.

No fim, só imprimo o acumulador:

```cpp
cout << resposta << "\n";
```

E coloquei o `entrada()` no topo com `sync_with_stdio(false)` pra desligar a sincronização de I/O — não é necessário com `n ≤ 1000`, mas é hábito que carrego pra entradas maiores.

## Conferindo com um caso

Pega o primeiro exemplo:

```
1 1 0 0 -> soma 2, risco 0  -> 2>=2 e !=2  -> conta  (1)
1 0 1 2 -> soma 2, risco 2  -> risco alto  -> não
1 1 1 1 -> soma 3, risco 1  -> ok          -> conta  (2)
0 1 0 0 -> soma 1           -> poucos       -> não
0 1 1 2 -> soma 2, risco 2  -> risco alto  -> não
```

Resultado: 2. Bate com a saída esperada. Repara como os casos *risco alto* e *só uma pessoa sabe* caem cada um por um motivo diferente — é justamente o que a regra composta separa.

## Complexidade

Uma passada por questão, operações constantes em cada uma:

```
Tempo:   O(n)
Memória: O(1)
```

Não guardo nada além do contador. Com `n ≤ 1000`, sobra folga de qualquer forma.

O foco aqui nunca foi algoritmo, e sim modelar uma decisão com duas condições sem cair nas duas armadilhas: tratar risco médio como proibido, ou confundir "pelo menos dois" com "mais de dois". Quando a regra fica clara em uma linha, o resto é só um acumulador.

Enunciado no `questao.md`, solução no `main.cpp`. Tente modelar a condição antes de olhar a resposta.

zd4▮
