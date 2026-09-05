# Portal Hórus 2

Aplicação independente para consulta e análise gerencial de dados municipais do SIOPS.

## Objetivo

Centralizar em um painel simples e responsivo os principais indicadores do RREO/SIOPS para os municípios autorizados pela Hórus Serviços e Negócios.

## Arquitetura

- Frontend: HTML, CSS e JavaScript puro.
- Backend: função serverless em `api/dashboard.js`.
- Fonte oficial: API pública do SIOPS/Ministério da Saúde.
- Deploy recomendado: Vercel.

## Critérios do painel

- Receitas: valores efetivamente realizados (`vl_coluna3`).
- Despesas: valores efetivamente pagos (`vl_coluna7`).
- Histórico: sempre consulta o 6º bimestre/período anual (`periodo=2`).
- Percentual de ASPS exibido no painel: visão gerencial com base no valor pago; em períodos intermediários não substitui a aferição legal oficial.

## Municípios autorizados

- Engenheiro Caldas/MG
- Fernandes Tourinho/MG
- Caparaó/MG
- Santo Antônio do Itambé/MG
- São José da Barra/MG
- Santa Maria de Itabira/MG
- Goiás/GO

## Execução local

Use uma plataforma compatível com funções serverless Vercel ou execute com a CLI da Vercel.

## Deploy

Importe este repositório na Vercel. Não há variáveis de ambiente obrigatórias.
