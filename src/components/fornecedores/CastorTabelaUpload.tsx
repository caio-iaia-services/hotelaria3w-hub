import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { codigoTabelaDoArquivo, lerPdfCastor, type TabelaCastor } from '@/lib/castorTabela'
import { useTabelasCastor } from '@/hooks/useTabelasCastor'

interface Analise {
  file: File
  codigo: string
  tabela: TabelaCastor
  novos: number
  jaImportada: boolean
}

interface Resultado {
  produtos: number
  produtos_novos: number
  especificacoes: number
  precos_atualizados: number
  precos_novos: number
}

function limparNome(nome: string) {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '')
}

/** Mapa "seção do PDF" → descrição/linha usadas pelos produtos que já existem no catálogo. */
async function carregarCatalogo() {
  const existentes = new Map<string, { descricao: string; linha: string }>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('produtos_castor_view')
      .select('codigo, descricao, linha')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Não foi possível ler o catálogo atual: ${error.message}`)
    for (const r of data || []) if (r.codigo) existentes.set(r.codigo, { descricao: r.descricao || '', linha: r.linha || '' })
    if (!data || data.length < pageSize) break
  }
  return existentes
}

export function CastorTabelaUpload() {
  const { registros, recarregar } = useTabelasCastor()
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [resultado, setResultado] = useState<(Resultado & { codigo: string }) | null>(null)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setResultado(null)
    setAnalise(null)

    if (!/\.pdf$/i.test(file.name)) {
      toast({ title: 'Envie o PDF da tabela de preços', variant: 'destructive' })
      return
    }
    const codigo = codigoTabelaDoArquivo(file.name)
    if (!codigo) {
      toast({
        title: 'Nome do arquivo sem código de tabela',
        description: 'O nome do arquivo precisa começar com os 4 dígitos da tabela. Ex.: "5140 atacado 07.10.2026.pdf"',
        variant: 'destructive',
      })
      return
    }

    setLendo(true)
    try {
      const [tabela, existentes] = await Promise.all([lerPdfCastor(file), carregarCatalogo()])
      if (tabela.produtos.length === 0) {
        toast({ title: 'Não encontrei produtos no PDF', description: tabela.avisos.join(' · ') || 'Confira se é a tabela de preços Castor.', variant: 'destructive' })
        return
      }
      const novos = tabela.produtos.filter(p => !existentes.has(p.codigo)).length
      setAnalise({ file, codigo, tabela, novos, jaImportada: registros.some(r => r.codigo === codigo) })
    } catch (err: any) {
      toast({ title: 'Erro ao ler o PDF', description: err.message, variant: 'destructive' })
    } finally {
      setLendo(false)
    }
  }

  async function importar() {
    if (!analise) return
    setImportando(true)
    try {
      const existentes = await carregarCatalogo()

      // produtos novos herdam descrição/linha dos vizinhos da mesma seção que já existem
      const porSecao = new Map<string, { descricao: string; linha: string }>()
      for (const p of analise.tabela.produtos) {
        const ex = existentes.get(p.codigo)
        if (ex && ex.descricao && ex.linha && !porSecao.has(p.linha)) porSecao.set(p.linha, ex)
      }
      const itens = analise.tabela.produtos.map(p => {
        const herdado = porSecao.get(p.linha)
        return {
          codigo: p.codigo,
          descricao: herdado?.descricao || p.linha,
          especificacao: p.especificacao,
          altura: p.altura,
          linha: herdado?.linha || p.linha,
          precos: p.precos,
        }
      })

      // guarda o PDF original
      const path = `castor/tabelas/${analise.codigo}_${Date.now()}_${limparNome(analise.file.name)}`
      const { error: upErr } = await supabase.storage
        .from('fornecedores-documentos')
        .upload(path, analise.file, { upsert: true, contentType: 'application/pdf' })
      if (upErr) throw new Error(`Falha no upload do arquivo: ${upErr.message}`)
      const { data: urlData } = supabase.storage.from('fornecedores-documentos').getPublicUrl(path)

      const { data, error } = await (supabase as any).rpc('importar_tabela_castor', {
        p_codigo: analise.codigo,
        p_nome_arquivo: analise.file.name,
        p_arquivo_url: urlData?.publicUrl ?? null,
        p_itens: itens,
      })
      if (error) throw new Error(error.message)

      setResultado({ ...(data as Resultado), codigo: analise.codigo })
      setAnalise(null)
      await recarregar()
      toast({ title: `Tabela ${analise.codigo} importada`, description: 'Catálogo e preços atualizados.' })
    } catch (err: any) {
      toast({ title: 'Erro ao importar a tabela', description: err.message, variant: 'destructive' })
    } finally {
      setImportando(false)
    }
  }

  const atual = registros[0]

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <Label>Tabela de Preços (catálogo Castor)</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Envie o PDF da nova tabela. O nome do arquivo precisa começar com os 4 dígitos da tabela (ex.: <b>5140</b> atacado 07.10.2026.pdf).
          O catálogo e os preços são atualizados e a tabela passa a aparecer no campo “Tabela” do orçamento.
        </p>
      </div>

      {atual && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Tabela vigente: <b>{atual.codigo}</b>
          {atual.total_produtos ? ` · ${atual.total_produtos} produtos` : ''}
          {atual.importado_em ? ` · importada em ${new Date(atual.importado_em).toLocaleDateString('pt-BR')}` : ''}
          {atual.arquivo_url && (
            <a href={atual.arquivo_url} target="_blank" rel="noreferrer" className="underline ml-1">ver arquivo</a>
          )}
        </p>
      )}

      {!analise && (
        <label className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-input bg-background ${lendo ? 'opacity-60' : 'cursor-pointer hover:bg-muted'}`}>
          {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {lendo ? 'Lendo PDF…' : 'Enviar nova tabela (PDF)'}
          <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={lendo || importando} onChange={aoEscolher} />
        </label>
      )}

      {analise && (
        <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
          <p className="font-medium">Tabela {analise.codigo} — {analise.file.name}</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>{analise.tabela.produtos.length} produtos · {analise.tabela.totalPrecos} preços</li>
            <li>{analise.novos} produtos novos no catálogo</li>
          </ul>
          {analise.jaImportada && (
            <p className="text-xs flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" /> A tabela {analise.codigo} já foi importada — os preços serão sobrescritos.
            </p>
          )}
          {analise.tabela.avisos.length > 0 && (
            <p className="text-xs flex items-start gap-1.5 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {analise.tabela.avisos.slice(0, 3).join(' · ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Os preços do catálogo serão substituídos pelos desta tabela.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={importar} disabled={importando}>
              {importando && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {importando ? 'Importando…' : 'Importar e atualizar catálogo'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAnalise(null)} disabled={importando}>Cancelar</Button>
          </div>
        </div>
      )}

      {resultado && (
        <p className="text-xs flex items-start gap-1.5 text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Tabela {resultado.codigo} importada: {resultado.precos_atualizados} preços atualizados, {resultado.precos_novos} novos,
          {' '}{resultado.produtos_novos} produtos novos.
        </p>
      )}
    </div>
  )
}
