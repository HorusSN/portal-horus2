const SIOPS_BASE_URL = 'https://siops-consulta-publica-api.saude.gov.br';

const PERIODOS_VALIDOS = new Set(['12', '14', '1', '18', '20', '2']);

const MUNICIPIOS = [
  { nome: 'Engenheiro Caldas', uf: 'MG', codigoUf: '31', codigoIbge: '3123700', codigoSiops: '312370', label: 'Engenheiro Caldas/MG', ordem: 1 },
  { nome: 'Fernandes Tourinho', uf: 'MG', codigoUf: '31', codigoIbge: '3125804', codigoSiops: '312580', label: 'Fernandes Tourinho/MG', ordem: 2 },
  { nome: 'Caparaó', uf: 'MG', codigoUf: '31', codigoIbge: '3112109', codigoSiops: '311210', label: 'Caparaó/MG', ordem: 3 },
  { nome: 'Santo Antônio do Itambé', uf: 'MG', codigoUf: '31', codigoIbge: '3160207', codigoSiops: '316020', label: 'Santo Antônio do Itambé/MG', ordem: 4 },
  { nome: 'São José da Barra', uf: 'MG', codigoUf: '31', codigoIbge: '3162948', codigoSiops: '316294', label: 'São José da Barra/MG', ordem: 5 },
  { nome: 'Santa Maria de Itabira', uf: 'MG', codigoUf: '31', codigoIbge: '3158003', codigoSiops: '315800', label: 'Santa Maria de Itabira/MG', ordem: 6 },
  { nome: 'Goiás', uf: 'GO', codigoUf: '52', codigoIbge: '5208905', codigoSiops: '520890', label: 'Goiás/GO', ordem: 7 }
];

function textoSeguro(valor) {
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

function numeroOuNull(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function diferencaOuNull(total, parcela) {
  const a = numeroOuNull(total);
  const b = numeroOuNull(parcela);
  return a === null || b === null ? null : a - b;
}

function normalizarCodigoMunicipio(codigo) {
  const texto = textoSeguro(codigo).replace(/\D/g, '');
  return texto.length === 7 ? texto.substring(0, 6) : texto;
}

function validarParametros(codigoUf, codigoMunicipio, ano, periodo) {
  const uf = textoSeguro(codigoUf).replace(/\D/g, '');
  const municipio = normalizarCodigoMunicipio(codigoMunicipio);
  const anoNumero = Number(ano);
  const periodoTexto = textoSeguro(periodo);

  if (!/^\d{2}$/.test(uf)) throw new Error('Código da UF inválido.');
  if (!/^\d{6}$/.test(municipio)) throw new Error('Código do município inválido.');
  if (!Number.isInteger(anoNumero) || anoNumero < 2002 || anoNumero > 2100) throw new Error('Ano da consulta inválido.');
  if (!PERIODOS_VALIDOS.has(periodoTexto)) throw new Error('Período SIOPS inválido.');

  return { codigoUf: uf, codigoSiops: municipio, ano: anoNumero, periodo: periodoTexto };
}

function localizarMunicipio(codigoUf, codigoSiops) {
  return MUNICIPIOS.find(m => m.codigoUf === codigoUf && m.codigoSiops === codigoSiops) || null;
}

function nomePeriodo(periodo) {
  const nomes = {
    '12': '1º Bimestre',
    '14': '2º Bimestre',
    '1': '3º Bimestre',
    '18': '4º Bimestre',
    '20': '5º Bimestre',
    '2': '6º Bimestre / Anual'
  };
  return nomes[String(periodo)] || String(periodo);
}

async function consultarSiops(codigoUf, codigoSiops, ano, periodo) {
  const url = `${SIOPS_BASE_URL}/v1/rreo/municipal/${codigoUf}/${codigoSiops}/${ano}/${periodo}`;
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } });

  if (resposta.status === 404) {
    return { disponivel: false, semDados: true, status: 404, url, dados: [] };
  }

  if (!resposta.ok) {
    throw new Error(`O SIOPS retornou erro HTTP ${resposta.status}.`);
  }

  const dados = await resposta.json();
  if (!Array.isArray(dados) || dados.length === 0) {
    return { disponivel: false, semDados: true, status: resposta.status, url, dados: [] };
  }

  return { disponivel: true, semDados: false, status: resposta.status, url, dados };
}

function itemPorCodigo(dados, codigo) {
  return Array.isArray(dados) ? dados.find(item => String(item?.coItem) === String(codigo)) || null : null;
}

const coluna3 = (dados, codigo) => numeroOuNull(itemPorCodigo(dados, codigo)?.vl_coluna3);
const coluna7 = (dados, codigo) => numeroOuNull(itemPorCodigo(dados, codigo)?.vl_coluna7);

function extrairReceitas(dados) {
  return {
    impostos: {
      iptu: coluna3(dados, '6001'),
      itbi: coluna3(dados, '6004'),
      iss: coluna3(dados, '6007'),
      irrf: coluna3(dados, '6010'),
      total: coluna3(dados, '6000')
    },
    transferenciasConstitucionais: {
      fpm: coluna3(dados, '6012'),
      itr: coluna3(dados, '6013'),
      ipva: coluna3(dados, '6014'),
      icms: coluna3(dados, '6015'),
      ipiExportacao: coluna3(dados, '6016'),
      compensacoesFinanceiras: coluna3(dados, '6017'),
      total: coluna3(dados, '6011')
    },
    receitaTotal: coluna3(dados, '6020'),
    criterio: 'Receitas efetivamente realizadas'
  };
}

function extrairMinimoConstitucional(dados) {
  return {
    minimo15: coluna3(dados, '6048'),
    valorPago: coluna3(dados, '6047'),
    percentualPago: coluna3(dados, '6052'),
    diferenca: coluna3(dados, '6050'),
    criterio: 'Perspectiva gerencial baseada no valor pago',
    observacao: 'Nos períodos intermediários, o percentual pago é indicador gerencial e não substitui o critério oficial de aferição do cumprimento constitucional.'
  };
}

function extrairReceitasAdicionais(dados) {
  return {
    uniao: coluna3(dados, '6073'),
    estado: coluna3(dados, '6074'),
    outrosMunicipios: coluna3(dados, '6075'),
    total: coluna3(dados, '6141'),
    criterio: 'Receitas efetivamente realizadas'
  };
}

function extrairDespesas(dados) {
  const totalPago = coluna7(dados, '6157');
  const recursosProprios = coluna7(dados, '6158');
  return {
    atencaoBasica: coluna7(dados, '6150'),
    hospitalarAmbulatorial: coluna7(dados, '6151'),
    suporteProfilaticoTerapeutico: coluna7(dados, '6152'),
    vigilanciaSanitaria: coluna7(dados, '6153'),
    vigilanciaEpidemiologica: coluna7(dados, '6154'),
    alimentacaoNutricao: coluna7(dados, '6155'),
    outrasSubfuncoes: coluna7(dados, '6156'),
    totalPago,
    recursosProprios,
    recursosNaoProprios: diferencaOuNull(totalPago, recursosProprios),
    criterio: 'Despesas efetivamente pagas'
  };
}

function normalizarPeriodo(dados) {
  const despesas = extrairDespesas(dados);
  return {
    receitasMunicipais: extrairReceitas(dados),
    minimoConstitucional: extrairMinimoConstitucional(dados),
    receitasAdicionais: extrairReceitasAdicionais(dados),
    financiamento: {
      municipio: despesas.recursosProprios,
      recursosTransferidos: despesas.recursosNaoProprios,
      descricaoFonteTransferida: 'Recursos não próprios',
      criterio: 'Participação calculada exclusivamente sobre despesas efetivamente pagas'
    },
    despesas
  };
}

async function consultarAnoHistorico(municipio, ano) {
  try {
    const consulta = await consultarSiops(municipio.codigoUf, municipio.codigoSiops, ano, '2');
    if (!consulta.disponivel) {
      return { ano, disponivel: false, erro: false, percentualPago: null, valorPago: null };
    }
    return {
      ano,
      disponivel: true,
      erro: false,
      percentualPago: coluna3(consulta.dados, '6052'),
      valorPago: coluna3(consulta.dados, '6047')
    };
  } catch {
    return { ano, disponivel: false, erro: true, percentualPago: null, valorPago: null };
  }
}

async function montarHistorico(municipio, anoSelecionado) {
  const anos = Array.from({ length: 5 }, (_, i) => anoSelecionado - i);
  return Promise.all(anos.map(ano => consultarAnoHistorico(municipio, ano)));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'GET' && req.query?.acao === 'municipios') {
    const municipiosOrdenados = [...MUNICIPIOS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    return res.status(200).json({ sucesso: true, municipios: municipiosOrdenados });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ sucesso: false, mensagem: 'Método não permitido.' });
  }

  try {
    const { codigoUf, codigoSiops, ano, periodo } = req.query || {};
    const parametros = validarParametros(codigoUf, codigoSiops, ano, periodo);
    const municipio = localizarMunicipio(parametros.codigoUf, parametros.codigoSiops);

    if (!municipio) {
      return res.status(403).json({ sucesso: false, mensagem: 'Município não autorizado para consulta no Portal Hórus.' });
    }

    const consulta = await consultarSiops(municipio.codigoUf, municipio.codigoSiops, parametros.ano, parametros.periodo);

    if (!consulta.disponivel) {
      return res.status(200).json({
        sucesso: false,
        semDados: true,
        mensagem: 'O SIOPS não possui dados disponíveis para o município, ano e período selecionados.',
        consulta: { ...municipio, ano: parametros.ano, periodo: parametros.periodo, periodoLabel: nomePeriodo(parametros.periodo) }
      });
    }

    const normalizado = normalizarPeriodo(consulta.dados);
    const historico = await montarHistorico(municipio, parametros.ano);

    return res.status(200).json({
      sucesso: true,
      consulta: { ...municipio, ano: parametros.ano, periodo: parametros.periodo, periodoLabel: nomePeriodo(parametros.periodo) },
      ...normalizado,
      historico5Anos: historico,
      metadados: {
        fonte: 'SIOPS — Ministério da Saúde',
        criterioGeral: 'Receitas realizadas e despesas efetivamente pagas',
        origem: 'API pública SIOPS',
        quantidadeItensRecebidos: consulta.dados.length,
        consultadoEm: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error?.message || 'Erro inesperado ao consultar o Dashboard SIOPS.' });
  }
}
