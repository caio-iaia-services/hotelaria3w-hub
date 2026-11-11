// Leitura da planilha de preços da Castor (PDF "TABELA DE PREÇOS - COLCHÕES INDÚSTRIA - ATACADO").
// O parser é puro (recebe itens de texto com posição) para poder ser testado sem navegador.

export interface TextoPos {
  str: string
  x: number // posição horizontal (pt)
  y: number // posição vertical, origem embaixo (padrão do PDF)
  w: number // largura (pt)
}

export interface PaginaPdf {
  itens: TextoPos[]
  altura: number
}

export interface PrecoMedida {
  medida: string
  preco: number
}

export interface ProdutoTabela {
  codigo: string // sem zeros à esquerda (padrão do catálogo no banco)
  codigoOriginal: string
  especificacao: string
  altura: number | null
  linha: string
  precos: PrecoMedida[]
}

export interface TabelaCastor {
  produtos: ProdutoTabela[]
  totalPrecos: number
  avisos: string[]
}

// Colunas de medidas no cabeçalho do PDF. A coluna "m3" é ignorada.
const COLUNAS: Record<string, string> = {
  '069': '69x188', '078': '78x188', '079': '79x198', '088': '88x188',
  '128': '128x188', '138': '138x188', '158': '158x198', '090': '90x200',
  '096': '96x203', '100': '100x200', '120': '120x203', '180': '180x200',
  '193': '193x203',
}

const RE_PRECO = /^\d{1,3}(?:\.\d{3})*,\d{2}$/
const RE_CODIGO = /^\d{3,5}$/
const X_CODIGO_MAX = 30 // código fica colado na margem esquerda
const X_DESC_MAX = 270 // descrição termina antes da coluna de altura
const X_ALTURA_MIN = 270
const X_ALTURA_MAX = 300
const X_PRECO_MIN = 300
const TOLERANCIA_COLUNA = 12
const TOPO_CABECALHO = 66 // tudo acima disso (distância do topo) é cabeçalho da página

/** Divide itens que vieram com várias palavras em um só trecho, distribuindo o x pela largura. */
function palavras(itens: TextoPos[]): TextoPos[] {
  const out: TextoPos[] = []
  for (const it of itens) {
    const txt = it.str
    if (!txt.trim()) continue
    if (!/\s/.test(txt.trim())) {
      out.push({ ...it, str: txt.trim() })
      continue
    }
    const total = txt.length || 1
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(txt))) {
      out.push({
        str: m[0],
        x: it.x + (it.w * m.index) / total,
        y: it.y,
        w: (it.w * m[0].length) / total,
      })
    }
  }
  return out
}

/** Agrupa palavras em linhas pela posição vertical (tolerância de 4pt). */
function linhas(ws: TextoPos[]): TextoPos[][] {
  const ord = [...ws].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: TextoPos[][] = []
  let yRef = Number.POSITIVE_INFINITY
  for (const w of ord) {
    if (rows.length === 0 || yRef - w.y > 4) {
      rows.push([w])
      yRef = w.y
    } else {
      rows[rows.length - 1].push(w)
    }
  }
  return rows.map(r => r.sort((a, b) => a.x - b.x))
}

export function parseTabelaCastor(paginas: PaginaPdf[]): TabelaCastor {
  const avisos: string[] = []
  const mapa = new Map<string, ProdutoTabela>()
  let linha = ''

  paginas.forEach((pg, idx) => {
    const ws = palavras(pg.itens)

    // centros das colunas de medida (linha de cabeçalho com 069, 078, ...)
    const centros: Record<string, number> = {}
    for (const w of ws) {
      if (COLUNAS[w.str] && pg.altura - w.y < TOPO_CABECALHO + 10) {
        centros[w.str] = w.x + w.w / 2
      }
    }
    if (Object.keys(centros).length < 8) {
      avisos.push(`Página ${idx + 1}: cabeçalho de medidas não encontrado`)
      return
    }

    for (const row of linhas(ws)) {
      if (pg.altura - row[0].y < TOPO_CABECALHO) continue // cabeçalho da página
      const primeiro = row[0]
      if (primeiro.x >= X_CODIGO_MAX) continue

      if (RE_CODIGO.test(primeiro.str)) {
        const original = primeiro.str
        const codigo = original.replace(/^0+/, '') || '0'
        const especificacao = row
          .filter(w => w !== primeiro && w.x + w.w <= X_DESC_MAX)
          .map(w => w.str)
          .join(' ')
        const alt = row.find(w => w.x >= X_ALTURA_MIN && w.x < X_ALTURA_MAX && /^\d,\d{2}$/.test(w.str))
        const altura = alt ? parseFloat(alt.str.replace(',', '.')) : null

        let prod = mapa.get(codigo)
        if (!prod) {
          prod = { codigo, codigoOriginal: original, especificacao, altura, linha, precos: [] }
          mapa.set(codigo, prod)
        }
        for (const w of row) {
          if (w.x < X_PRECO_MIN || !RE_PRECO.test(w.str)) continue
          const c = w.x + w.w / 2
          let melhor: [string, number] | null = null
          for (const [col, cx] of Object.entries(centros)) {
            const d = Math.abs(cx - c)
            if (!melhor || d < melhor[1]) melhor = [col, d]
          }
          if (!melhor || melhor[1] > TOLERANCIA_COLUNA) continue // coluna m3 / fora da grade
          const medida = COLUNAS[melhor[0]]
          const preco = parseFloat(w.str.replace(/\./g, '').replace(',', '.'))
          const existente = prod.precos.find(p => p.medida === medida)
          if (existente) {
            if (existente.preco !== preco) avisos.push(`Código ${original}: preço divergente para ${medida}`)
          } else {
            prod.precos.push({ medida, preco })
          }
        }
      } else {
        // linha de seção (ex.: "GOLD STAR POCKET LATEX") — vale para os produtos abaixo dela
        const t = row.filter(w => w.x + w.w <= X_DESC_MAX).map(w => w.str).join(' ').trim()
        if (t && !/^(TABELA|Lista|P[áa]gina)/i.test(t)) linha = t
      }
    }
  })

  const produtos = [...mapa.values()]
  const totalPrecos = produtos.reduce((s, p) => s + p.precos.length, 0)
  if (produtos.length === 0) avisos.push('Nenhum produto encontrado — o arquivo é a tabela de preços Castor?')
  return { produtos, totalPrecos, avisos }
}

/** Código da tabela = 4 primeiros dígitos do nome do arquivo (ex.: "5140 atacado 07.10.2026.pdf" → "5140"). */
export function codigoTabelaDoArquivo(nomeArquivo: string): string | null {
  const m = nomeArquivo.trim().match(/^(\d{4})(?!\d)/)
  return m ? m[1] : null
}

/** Lê o PDF no navegador com pdf.js (carregado sob demanda, é pesado). */
export async function lerPdfCastor(file: File): Promise<TabelaCastor> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const paginas: PaginaPdf[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    const itens: TextoPos[] = []
    for (const it of tc.items as any[]) {
      if (typeof it.str !== 'string') continue
      itens.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })
    }
    paginas.push({ itens, altura: vp.height })
  }
  return parseTabelaCastor(paginas)
}
