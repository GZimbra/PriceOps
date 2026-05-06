# PriceOps - Simulador de Pricing Estrategico

Aplicacao web estatica para simulacao de pricing, margem, desconto, break-even, otimizacao por elasticidade e unit economics. Tudo roda localmente no navegador.

## Funcionalidades

- Pricing por margem alvo com CMV, custo fixo rateado, impostos e comissao.
- Composicao do preco por barras: CMV, fixo, impostos, comissao e lucro.
- Markup sobre custo total, take rate, preco minimo de lucro zero e desconto limite.
- Simulacao de cenarios de desconto com receita, margem e lucro total.
- Break-even em unidades e faturamento minimo, com grafico receita x custo.
- Otimizacao por curva preco-demanda:
  - faixa minima e maxima de preco;
  - elasticidade-preco;
  - demanda base;
  - preco concorrente;
  - capacidade mensal;
  - melhor preco por lucro total.
- Unit economics:
  - CAC;
  - ticket recorrente;
  - churn;
  - novos clientes por mes;
  - LTV;
  - LTV/CAC;
  - payback CAC;
  - projecao de contribuicao acumulada.
- Black-Scholes-Merton:
  - precificacao teorica de call e put europeias;
  - taxa livre de risco, volatilidade, dividend yield e prazo;
  - Delta, Gamma, Vega, Theta, Rho e valor intrinseco;
  - grafico de payoff liquido no vencimento.
- Diagnostico de risco comercial e operacional.
- Historico local via `localStorage`.
- Exportacao CSV da simulacao atual.
- Barra global de acoes disponivel em todas as abas.
- Relatorio em PDF pela impressao nativa do navegador, mantendo o visual do HTML com cards, tabelas, graficos e valores, sem paineis de controle.

## Como executar

Abra o arquivo `index.html` diretamente no navegador.

Opcionalmente, use um servidor local:

```powershell
python -m http.server 8080
```

Acesse:

```text
http://localhost:8080
```

## Formulas principais

| Metrica | Formula |
|---|---|
| Preco alvo | `(CMV + fixo rateado) / (1 - margem - impostos - comissao)` |
| Preco com desconto | `preco * (1 - desconto)` |
| Lucro unitario | `preco - CMV - fixo rateado - impostos - comissao` |
| Margem real | `lucro unitario / preco` |
| Preco minimo lucro zero | `(CMV + fixo rateado) / (1 - impostos - comissao)` |
| Markup | `(preco / custo total - 1) * 100` |
| Margem de contribuicao | `preco - CMV - impostos - comissao` |
| Break-even | `custo fixo mensal / margem de contribuicao` |
| Demanda estimada | `demanda base * (preco base / preco analisado) ^ elasticidade` |
| LTV | `contribuicao mensal / churn mensal` |
| LTV/CAC | `LTV / CAC` |
| Payback CAC | `CAC / contribuicao mensal` |
| Black-Scholes call | `S * e^(-qT) * N(d1) - K * e^(-rT) * N(d2)` |
| Black-Scholes put | `K * e^(-rT) * N(-d2) - S * e^(-qT) * N(-d1)` |

## Stack

- HTML5
- CSS3
- JavaScript vanilla
- Chart.js 4.4 via CDN

## Estrutura

```text
Simulador_Pricing/
|-- index.html
|-- assets/
|   |-- css/
|   |   `-- styles.css
|   `-- js/
|       `-- script.js
|-- .editorconfig
|-- .gitattributes
|-- .gitignore
`-- README.md
```

## Ambiente

- O projeto nao exige build.
- O Chart.js ainda e carregado por CDN no `index.html`.
- Para uso offline, coloque o bundle local em `assets/vendor/` e ajuste o `<script>`.

## Observacoes

- Nenhum dado e enviado para servidor.
- O historico fica somente no navegador do usuario.
- Para ambiente offline, baixe o bundle do Chart.js e substitua o CDN por arquivo local.
