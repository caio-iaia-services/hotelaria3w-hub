import { useState } from "react";
import { Orcamento, OrcamentoItem } from "@/lib/types";
import { Mail, MapPin, Phone, Truck, Package, CreditCard, AlertCircle, DollarSign, Globe, MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { formatDateBR } from "@/lib/date";
import { extrairTextoCondicoesPagamento } from "@/lib/condicoesPagamento";
import {
  resolverCondicoesPagamentoMidea,
  resolverImagemMarketing,
  resolverTermosFornecedor,
} from "@/lib/fornecedorTerms";

interface Props {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  emailUsuario?: string;
  enderecoEntrega: string;
  enderecoCadastral?: string;
}

function normalizarNomeFornecedor(nome: string | null | undefined) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function isMideaLayout(tipoLayout: string | null | undefined, nomeFornecedor: string) {
  if (tipoLayout === "midea") return true;
  const nomeNormalizado = normalizarNomeFornecedor(nomeFornecedor);
  return (
    nomeNormalizado.includes("MIDEA") ||
    nomeNormalizado.includes("SPRINGER") ||
    nomeNormalizado.includes("CLIMAZON") ||
    nomeNormalizado.includes("CARRIER")
  );
}

export function OrcamentoTemplate({ orcamento, itens, emailUsuario, enderecoEntrega, enderecoCadastral }: Props) {
  const [aprovando, setAprovando] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  async function executarAprovacao(orcamentoId: string) {
    setAprovando(true);
    setMostrarConfirmacao(false);
    try {
      const response = await fetch('https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/aprovar-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcamento_id: orcamentoId }),
      });
      if (!response.ok) throw new Error('Erro ao aprovar pedido');
      const resultado = await response.json();
      if (resultado.success) {
        setMensagemSucesso('Pedido confirmado com sucesso! O orçamento foi aprovado.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(resultado.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro ao confirmar pedido:', error);
      setMensagemErro('Erro ao confirmar pedido: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setAprovando(false);
    }
  }

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const emailExibicao = emailUsuario || "comercial1@3whotelaria.com.br";
  const enderecoEntregaFinal = String(enderecoEntrega || "").trim();

  const enderecoCadastralMontado =
    enderecoCadastral ||
    [
      [String((orcamento as any).cliente_logradouro || ""), String((orcamento as any).cliente_numero || "")]
        .filter(Boolean)
        .join(", "),
      (orcamento as any).cliente_complemento,
      (orcamento as any).cliente_bairro,
      [(orcamento as any).cliente_cidade, (orcamento as any).cliente_estado].filter(Boolean).join(" - "),
      (orcamento as any).cliente_cep ? `CEP: ${(orcamento as any).cliente_cep}` : null,
    ]
      .filter(Boolean)
      .join(", ") ||
    enderecoEntregaFinal;

  const tipoLayout = (((orcamento as any).fornecedor_tipo_layout ?? null) as string | null) || "padrao";
  const logotipoFornecedor = ((orcamento as any).fornecedor_logotipo_url ?? null) as string | null;
  const nomeFornecedorExibicao = String(
    (orcamento as any).fornecedor_nome_fantasia || orcamento.fornecedor_nome || orcamento.operacao || "",
  ).trim();
  const imagemTemplateFornecedor = ((orcamento as any).fornecedor_imagem_template_url ?? null) as string | null;
  const corPrimaria = ((orcamento as any).fornecedor_cor_primaria ?? "#C8962E") as string;
  const corSecundaria = ((orcamento as any).fornecedor_cor_secundaria ?? "#1a4168") as string;
  const termosFabricante = ((orcamento as any).fornecedor_termos_fabricante ?? null) as string | null;

  const layoutMidea = isMideaLayout(tipoLayout, nomeFornecedorExibicao);
  const imagemMarketingExibicao = resolverImagemMarketing(
    orcamento.imagem_marketing_url,
    imagemTemplateFornecedor,
    layoutMidea,
  );
  const termosFornecedorExibicao =
    resolverTermosFornecedor(orcamento.termos_fornecedor || termosFabricante, layoutMidea) || "";

  const toNumber = (value: unknown) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const raw = String(value).trim();
    const normalizado = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const parsed = parseFloat(normalizado);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (value: unknown) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));
  };

  const formatDate = (date: string) => formatDateBR(date);

  const dividirCodigo = (codigo: string) => {
    if (!codigo) return [];
    return codigo.split("").filter((c) => c.trim());
  };

  const subtotalDireto = toNumber((orcamento as any).subtotal);
  const subtotalAlt = toNumber((orcamento as any).valor_produtos);
  const subtotalItens = itens.reduce((sum, item) => sum + toNumber(item.total), 0);
  const subtotalCalculado = subtotalDireto > 0 ? subtotalDireto : subtotalAlt > 0 ? subtotalAlt : subtotalItens;

  const impostosPercentualCalculado = toNumber((orcamento as any).impostos_percentual);
  const impostosDireto = toNumber((orcamento as any).impostos);
  const impostosCalculado =
    impostosDireto > 0 ? impostosDireto : subtotalCalculado * (impostosPercentualCalculado / 100);

  const descontoPercentualCalculado = toNumber(
    (orcamento as any).desconto_percentual || (orcamento as any).percentual_desconto,
  );
  const descontoDiretoValor = toNumber((orcamento as any).desconto_valor);
  const descontoDireto = toNumber((orcamento as any).desconto || (orcamento as any).valor_desconto);
  const descontoValorCalculado =
    descontoDiretoValor > 0
      ? descontoDiretoValor
      : descontoDireto > 0
        ? descontoDireto
        : subtotalCalculado * (descontoPercentualCalculado / 100);

  const freteDireto = toNumber((orcamento as any).frete);
  const freteAlt = toNumber((orcamento as any).valor_frete);
  const freteCalculado = freteDireto > 0 ? freteDireto : freteAlt;

  const totalDireto = toNumber((orcamento as any).total);
  const totalAlt = toNumber((orcamento as any).valor_total);
  const totalPorFormula = subtotalCalculado + impostosCalculado - descontoValorCalculado + freteCalculado;
  const totalCalculado =
    totalDireto > 0 ? totalDireto : totalAlt > 0 ? totalAlt : totalPorFormula > 0 ? totalPorFormula : 0;

  const condicoesPagamentoTexto = extrairTextoCondicoesPagamento(orcamento.condicoes_pagamento);
  const condicoesPagamentoMidea = resolverCondicoesPagamentoMidea(condicoesPagamentoTexto);

  const numero = orcamento?.numero || '';

  /* ── Estilos fixos A4 ── */
  const pageStyle: React.CSSProperties = {
    width: "210mm",
    height: "297mm",
    margin: "0 auto",
    background: "white",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  return (
    <div style={{ width: "210mm", margin: "0 auto", background: "white", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* ═══════════ PÁGINA 1 ═══════════ */}
      <div className="pagina-1" style={{ ...pageStyle, display: "flex", flexDirection: "column" }}>
        {/* HEADER AZUL */}
        <div style={{ background: "#1a4168", color: "white", padding: "6mm 8mm 5mm 8mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Lado esquerdo - Logo + contatos */}
            <div>
              <img src="/logo_3Whotelaria.jpeg" alt="3W Hotelaria" style={{ height: "22mm", marginBottom: "3mm" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "2mm", paddingLeft: "4mm", fontSize: "11pt" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                  <Globe style={{ width: "5mm", height: "5mm", flexShrink: 0 }} />
                  <span>www.3whotelaria.com.br</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                  <Phone style={{ width: "5mm", height: "5mm", flexShrink: 0 }} />
                  <span>+55 (11) 5197-5779</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                  <Mail style={{ width: "5mm", height: "5mm", flexShrink: 0 }} />
                  <span>{emailExibicao}</span>
                </div>
              </div>
            </div>

            {/* Lado direito - Nº orçamento, fornecedor, datas, status */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                background: "#c4942c", color: "white", padding: "3mm 8mm",
                borderRadius: "2mm", display: "inline-block", marginBottom: "3mm",
              }}>
                <p style={{ fontSize: "14pt", fontWeight: "bold", margin: 0 }} data-pdf-orcamento-numero>
                  Orçamento {numero}
                </p>
              </div>
              {logotipoFornecedor ? (
                <div style={{ marginBottom: "3mm", display: "flex", justifyContent: "flex-end" }}>
                  <img
                    src={logotipoFornecedor}
                    alt={nomeFornecedorExibicao}
                    style={{ height: "14mm", maxWidth: "50mm", objectFit: "contain" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
              ) : orcamento.fornecedor_nome ? (
                <div style={{ marginBottom: "3mm" }}>
                  <p style={{ fontSize: "16pt", fontWeight: "bold", color: "#ef4444", margin: 0 }}>
                    {orcamento.fornecedor_nome.split(" ")[0]}
                  </p>
                </div>
              ) : null}
              <div style={{ fontSize: "9pt", lineHeight: "1.6" }}>
                <p style={{ margin: 0 }}>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p style={{ margin: 0, fontWeight: 600 }}>Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
              <div style={{
                marginTop: "3mm", background: "#e5e7eb", color: "#374151",
                padding: "1.5mm 5mm", borderRadius: "1.5mm", display: "inline-block",
                fontSize: "8pt", fontWeight: 600,
              }}>
                {orcamento.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* HERO MARKETING */}
        {imagemMarketingExibicao ? (
          <div style={{ flex: 1, background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)", padding: "5mm" }}>
            <img
              src={imagemMarketingExibicao}
              alt="Marketing"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "4mm" }}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerHTML =
                    '<div style="text-align:center;padding:40mm 0"><p style="font-size:24pt;color:#9ca3af;font-weight:bold">Imagem de Marketing</p></div>';
                }
              }}
            />
          </div>
        ) : (
          <div style={{
            flex: 1, background: "linear-gradient(135deg, #eff6ff, #f5f3ff, #fdf2f8)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "10mm",
          }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "28pt", fontWeight: "bold", color: "#1a4168", marginBottom: "3mm" }}>
                {orcamento.fornecedor_nome || orcamento.operacao}
              </h2>
              <p style={{ fontSize: "16pt", color: "#6b7280" }}>é na 3W Hotelaria!</p>
            </div>
          </div>
        )}

        {/* RODAPÉ DOURADO - DADOS DO CLIENTE */}
        <div style={{ background: "#c4942c", padding: "5mm 8mm 4mm 8mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3mm" }}>
            {/* Dados do Cliente - Esquerda */}
            <div>
              <p style={{ fontWeight: "bold", fontSize: "12pt", color: "white", margin: "0 0 1mm 0" }}>
                {orcamento.cliente_cnpj || ""} | {(orcamento as any).cliente_razao_social || orcamento.cliente_nome || ""}
              </p>
              <p style={{ fontWeight: 600, fontSize: "10pt", color: "white", margin: "0 0 2mm 0" }}>
                {orcamento.cliente_nome || ""}
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "2mm", fontSize: "8pt", color: "#1a4168", margin: "0 0 1mm 0" }}>
                <MapPin style={{ width: "3.5mm", height: "3.5mm", flexShrink: 0 }} />
                <span>{enderecoCadastralMontado || "—"}</span>
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "2mm", fontSize: "8pt", color: "#1a4168", margin: "0 0 1mm 0" }}>
                <Mail style={{ width: "3.5mm", height: "3.5mm", flexShrink: 0 }} />
                <span>{orcamento.cliente_email || "—"}</span>
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "2mm", fontSize: "8pt", color: "#1a4168", margin: 0 }}>
                <Phone style={{ width: "3.5mm", height: "3.5mm", flexShrink: 0 }} />
                <span>{orcamento.cliente_telefone || "—"}</span>
              </p>
            </div>

            {/* Endereço de Entrega - Direita */}
            <div style={{ textAlign: "right", maxWidth: "80mm" }}>
              <p style={{ fontWeight: "bold", fontSize: "10pt", color: "#1a4168", margin: "0 0 2mm 0" }}>
                Endereço de Entrega
              </p>
              <p style={{ fontSize: "8pt", color: "#1a4168", margin: 0 }}>{enderecoEntregaFinal || "—"}</p>
            </div>
          </div>
          <div style={{ textAlign: "center", borderTop: "0.3mm solid rgba(26,65,104,0.3)", paddingTop: "3mm" }}>
            <p style={{ color: "#1a4168", fontSize: "8pt", margin: 0 }}>
              Segue abaixo o orçamento solicitado. Estamos a disposição para quaisquer esclarecimentos e alterações.{" "}
              <strong>Bons Negócios!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ PÁGINA 2 ═══════════ */}
      <div className="pagina-2" style={{ ...pageStyle, padding: "5mm 6mm" }}>
        {/* TABELA DE PRODUTOS */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
          <thead>
            <tr style={{ background: "#1a4168", color: "white" }}>
              <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "center", width: "8mm" }}>Item</th>
              {tipoLayout === "castor" ? (
                <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "center" }} colSpan={5}>Código</th>
              ) : (
                <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "center" }}>Código</th>
              )}
              <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "left" }}>Descrição</th>
              {tipoLayout === "castor" && (
                <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "center" }}>Medidas</th>
              )}
              <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "center", width: "12mm" }}>Qtd</th>
              <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "right" }}>Unitário</th>
              <th style={{ border: "0.3mm solid white", padding: "2mm", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => {
              const codigoDividido = dividirCodigo(item.codigo || "");
              return (
                <tr key={item.id} style={{ background: index % 2 === 0 ? "#f9fafb" : "white" }}>
                  <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "center", fontWeight: "bold" }}>
                    {index + 1}
                  </td>
                  {tipoLayout === "castor" ? (
                    <>
                      {codigoDividido.slice(0, 5).map((digito, i) => (
                        <td key={i} style={{
                          border: "0.3mm solid #d1d5db", padding: "1.5mm", textAlign: "center",
                          fontFamily: "monospace", background: "#eff6ff", width: "6mm",
                        }}>
                          {digito}
                        </td>
                      ))}
                      {Array(Math.max(0, 5 - codigoDividido.length))
                        .fill(null)
                        .map((_, i) => (
                          <td key={`empty-${i}`} style={{
                            border: "0.3mm solid #d1d5db", padding: "1.5mm", background: "#f3f4f6", width: "6mm",
                          }}></td>
                        ))}
                    </>
                  ) : (
                    <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "center", fontFamily: "monospace" }}>
                      {item.codigo || "-"}
                    </td>
                  )}
                  <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm" }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{item.descricao}</p>
                    {item.especificacoes && (
                      <p style={{ fontSize: "7pt", color: "#6b7280", margin: "0.5mm 0 0 0" }}>{item.especificacoes}</p>
                    )}
                  </td>
                  {tipoLayout === "castor" && (
                    <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "center", fontSize: "7.5pt" }}>
                      {(item as any).medidas || "-"}
                    </td>
                  )}
                  <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "center", fontWeight: "bold" }}>
                    {item.quantidade}
                  </td>
                  <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "right" }}>
                    {formatCurrency(item.preco_unitario)}
                  </td>
                  <td style={{ border: "0.3mm solid #d1d5db", padding: "2mm", textAlign: "right", fontWeight: "bold" }}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ATENÇÃO + VALORES */}
        <div style={{ display: "flex", gap: "4mm", marginTop: "4mm" }}>
          {/* Box Atenção */}
          <div style={{
            flex: "0 0 48%", background: "#f3f4f6", border: "0.3mm solid #d1d5db",
            borderRadius: "2mm", padding: "4mm",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2mm", marginBottom: "2mm" }}>
              <div style={{
                width: "8mm", height: "8mm", background: "#c4942c", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle style={{ width: "5mm", height: "5mm", color: "white" }} />
              </div>
              <span style={{ fontSize: "12pt", fontWeight: "bold" }}>Atenção</span>
            </div>
            <p style={{ fontSize: "7.5pt", color: "#374151", margin: "0 0 1.5mm 0" }}>
              Antes de confirmar o pedido, recomendamos:
            </p>
            <ul style={{ fontSize: "7.5pt", color: "#374151", margin: 0, padding: 0, listStyle: "none" }}>
              <li style={{ marginBottom: "1mm" }}>• Confira todos os itens do orçamento, em especial a descrição e quantidade.</li>
              <li style={{ marginBottom: "1mm" }}>• Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.</li>
              <li>• Leia atentamente as observações do orçamento.</li>
            </ul>
          </div>

          {/* Box Valores */}
          <div style={{ flex: "0 0 48%" }}>
            <div style={{
              background: "#c4942c", color: "white", padding: "3mm 4mm",
              borderRadius: "2mm 2mm 0 0", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: "bold", fontSize: "10pt" }}>Subtotal</span>
              <span style={{ fontWeight: "bold", fontSize: "14pt" }}>{formatCurrency(subtotalCalculado)}</span>
            </div>
            <div style={{
              background: "white", borderLeft: "0.3mm solid #d1d5db", borderRight: "0.3mm solid #d1d5db",
              padding: "2.5mm 4mm", display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: "8.5pt",
            }}>
              <span>Impostos</span>
              <div>
                <span style={{ marginRight: "4mm" }}>{impostosPercentualCalculado.toFixed(2)}%</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(impostosCalculado)}</span>
              </div>
            </div>
            {descontoValorCalculado > 0 && (
              <div style={{
                background: "white", borderLeft: "0.3mm solid #d1d5db", borderRight: "0.3mm solid #d1d5db",
                padding: "2.5mm 4mm", display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "8.5pt",
              }}>
                <span>Desconto</span>
                <div>
                  <span style={{ marginRight: "4mm" }}>{descontoPercentualCalculado.toFixed(2)}%</span>
                  <span style={{ fontWeight: 600, color: "#dc2626" }}>-{formatCurrency(descontoValorCalculado)}</span>
                </div>
              </div>
            )}
            <div style={{
              background: "#1a4168", color: "white", padding: "3mm 4mm",
              borderRadius: "0 0 2mm 2mm", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: "bold", fontSize: "10pt" }}>Valor Final</span>
              <span style={{ fontWeight: "bold", fontSize: "16pt" }}>{formatCurrency(totalCalculado)}</span>
            </div>
          </div>
        </div>

        {/* FRETE / ENTREGA / DIFAL + CONDIÇÕES PAGAMENTO */}
        <div style={{ display: "flex", gap: "4mm", marginTop: "4mm" }}>
          {/* Frete + Entrega + Difal */}
          <div style={{ flex: "0 0 33%" }}>
            <div style={{ display: "flex", gap: 0 }}>
              <div style={{
                flex: 1, border: "0.3mm solid #d1d5db", borderRadius: "2mm 0 0 0", overflow: "hidden",
              }}>
                <div style={{ background: "#f3f4f6", padding: "2mm", borderBottom: "0.3mm solid #d1d5db", textAlign: "center" }}>
                  <span style={{ fontWeight: "bold", fontSize: "8pt", display: "flex", alignItems: "center", justifyContent: "center", gap: "1mm" }}>
                    <Truck style={{ width: "3.5mm", height: "3.5mm" }} /> Frete
                  </span>
                </div>
                <div style={{ padding: "2mm", textAlign: "center" }}>
                  <p style={{ fontSize: "8pt", fontWeight: 600, margin: 0 }}>{orcamento.frete_tipo || "CIF (Incluso)"}</p>
                </div>
              </div>
              <div style={{
                flex: 1, border: "0.3mm solid #d1d5db", borderLeft: 0, borderRadius: "0 2mm 0 0", overflow: "hidden",
              }}>
                <div style={{ background: "#f3f4f6", padding: "2mm", borderBottom: "0.3mm solid #d1d5db", textAlign: "center" }}>
                  <span style={{ fontWeight: "bold", fontSize: "8pt", display: "flex", alignItems: "center", justifyContent: "center", gap: "1mm" }}>
                    <Package style={{ width: "3.5mm", height: "3.5mm" }} /> Entrega
                  </span>
                </div>
                <div style={{ padding: "2mm", textAlign: "center" }}>
                  <p style={{ fontSize: "8pt", fontWeight: 600, margin: 0 }}>{orcamento.prazo_entrega || "45/60 dias"}</p>
                </div>
              </div>
            </div>
            <div style={{
              border: "0.3mm solid #d1d5db", borderTop: 0, borderRadius: "0 0 2mm 2mm", overflow: "hidden",
            }}>
              <div style={{ background: "#f3f4f6", padding: "2mm", borderBottom: "0.3mm solid #d1d5db", textAlign: "center" }}>
                <span style={{ fontWeight: "bold", fontSize: "8pt", display: "flex", alignItems: "center", justifyContent: "center", gap: "1mm" }}>
                  <DollarSign style={{ width: "3.5mm", height: "3.5mm" }} /> Difal
                </span>
              </div>
              <div style={{ padding: "3mm", background: "#eff6ff", fontSize: "7pt", color: "#374151" }}>
                <p style={{ margin: 0 }}>
                  {orcamento.difal_texto ||
                    "Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários."}
                </p>
              </div>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div style={{
            flex: "0 0 63%", border: "0.3mm solid #d1d5db", borderRadius: "2mm", overflow: "hidden",
          }}>
            <div style={{ background: "#f3f4f6", padding: "2mm", borderBottom: "0.3mm solid #d1d5db", textAlign: "center" }}>
              <span style={{ fontWeight: "bold", fontSize: "8pt", display: "flex", alignItems: "center", justifyContent: "center", gap: "1mm" }}>
                <CreditCard style={{ width: "3.5mm", height: "3.5mm" }} /> Condições e Forma de Pagamento
              </span>
            </div>
            <div style={{ padding: "3mm", fontSize: "7pt" }}>
              {layoutMidea ? (
                <div>
                  <div style={{ fontWeight: 600, color: "#374151", marginBottom: "1mm" }}>CONDIÇÕES DE PAGAMENTO:</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{condicoesPagamentoMidea}</div>
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {condicoesPagamentoTexto ||
                    "ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OBSERVAÇÕES GERAIS */}
        {orcamento.observacoes_gerais && (
          <div style={{ marginTop: "3mm", border: "0.3mm solid #d1d5db", borderRadius: "2mm", overflow: "hidden" }}>
            <div style={{ background: "#f3f4f6", padding: "2mm 3mm", borderBottom: "0.3mm solid #d1d5db" }}>
              <p style={{ fontWeight: "bold", fontSize: "8pt", margin: 0 }}>Observações Gerais</p>
            </div>
            <div style={{ padding: "3mm" }}>
              <p style={{ fontSize: "7pt", whiteSpace: "pre-wrap", margin: 0 }}>{orcamento.observacoes_gerais}</p>
            </div>
          </div>
        )}

        {/* TERMOS DO FORNECEDOR */}
        {termosFornecedorExibicao && (
          <div style={{
            marginTop: "3mm", padding: "3mm", background: "#eff6ff",
            border: "0.3mm solid #1a4168", borderRadius: "2mm",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "3mm",
              marginBottom: "2mm", paddingBottom: "2mm", borderBottom: "0.3mm solid #1a4168",
            }}>
              {logotipoFornecedor && (
                <img src={logotipoFornecedor} alt={nomeFornecedorExibicao || "Fornecedor"} style={{ height: "10mm" }} />
              )}
              <span style={{ fontSize: "10pt", fontWeight: "bold", color: "#1a4168" }}>
                {layoutMidea ? "TERMOS LEGAIS MIDEA CARRIER" : "TERMOS DO FABRICANTE"}
              </span>
            </div>
            <div style={{ fontSize: "6.5pt", color: "#1f2937", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
              {termosFornecedorExibicao}
            </div>
          </div>
        )}

        {/* TERMOS 3W */}
        <div style={{
          marginTop: "3mm", background: "#f9fafb", border: "0.3mm solid #d1d5db",
          borderRadius: "2mm", padding: "3mm 4mm",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2mm", marginBottom: "2mm" }}>
            <div style={{ background: "#1a4168", padding: "1.5mm", borderRadius: "1mm" }}>
              <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: "6mm" }} />
            </div>
            <span style={{ fontSize: "10pt", fontWeight: "bold", color: "#c4942c" }}>TERMOS LEGAIS DA 3W HOTELARIA</span>
          </div>
          <div style={{ fontSize: "6.5pt", color: "#374151", lineHeight: 1.5 }}>
            <p style={{ margin: "0 0 1mm 0" }}>• O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.</p>
            <p style={{ margin: "0 0 1mm 0" }}>• Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.</p>
            <p style={{ margin: "0 0 1mm 0" }}>• As políticas comerciais variam conforme o Fabricante/Fornecedor.</p>
            <p style={{ margin: "0 0 1mm 0" }}>• As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição estadual do cliente, e estado da unidade/fábrica fornecedora.</p>
            <p style={{ margin: "0 0 1mm 0" }}>• Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.</p>
            <p style={{ margin: 0 }}>• Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da {orcamento.fornecedor_nome || "Fabricante"}.</p>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {mensagemSucesso && (
          <div style={{
            marginTop: "3mm", padding: "3mm", background: "#dcfce7", border: "0.3mm solid #4ade80",
            color: "#166534", borderRadius: "2mm", textAlign: "center", fontWeight: 600, fontSize: "8pt",
          }}>
            ✅ {mensagemSucesso}
          </div>
        )}
        {mensagemErro && (
          <div style={{
            marginTop: "3mm", padding: "3mm", background: "#fee2e2", border: "0.3mm solid #f87171",
            color: "#991b1b", borderRadius: "2mm", textAlign: "center", fontWeight: 600, fontSize: "8pt",
          }}>
            ❌ {mensagemErro}
          </div>
        )}

        {/* Confirmação inline */}
        {mostrarConfirmacao && (
          <div style={{
            marginTop: "3mm", padding: "3mm", background: "#fefce8", border: "0.5mm solid #facc15",
            borderRadius: "2mm", textAlign: "center",
          }}>
            <p style={{ fontWeight: "bold", color: "#1f2937", margin: "0 0 2mm 0", fontSize: "8pt" }}>
              Deseja confirmar este pedido? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "3mm", justifyContent: "center" }}>
              <button
                onClick={() => executarAprovacao(orcamento.id)}
                style={{
                  background: "#16a34a", color: "white", fontWeight: "bold",
                  padding: "2mm 5mm", borderRadius: "2mm", border: "none", cursor: "pointer", fontSize: "8pt",
                }}
              >
                Sim, confirmar
              </button>
              <button
                onClick={() => setMostrarConfirmacao(false)}
                style={{
                  background: "#9ca3af", color: "white", fontWeight: "bold",
                  padding: "2mm 5mm", borderRadius: "2mm", border: "none", cursor: "pointer", fontSize: "8pt",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div className="no-print" style={{
          marginTop: "3mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3mm",
        }}>
          <a
            href={`https://wa.me/5511519757779?text=${encodeURIComponent(`Olá, gostaria de falar sobre o orçamento ${orcamento.numero}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#16a34a", color: "white", fontWeight: "bold", padding: "3mm 4mm",
              borderRadius: "2mm", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "2mm", textDecoration: "none", fontSize: "9pt", cursor: "pointer",
            }}
          >
            <MessageCircle style={{ width: "5mm", height: "5mm" }} />
            <span>Clique aqui para falar com o Vendedor</span>
          </a>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMostrarConfirmacao(true); }}
            disabled={aprovando || !!mensagemSucesso}
            style={{
              background: "#c4942c", color: "white", fontWeight: "bold", padding: "3mm 4mm",
              borderRadius: "2mm", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "2mm", border: "none", cursor: "pointer", fontSize: "9pt",
              opacity: aprovando || !!mensagemSucesso ? 0.5 : 1,
            }}
          >
            {aprovando ? (
              <>
                <Loader2 style={{ width: "5mm", height: "5mm" }} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle style={{ width: "5mm", height: "5mm" }} />
                <span>Clique aqui para confirmar o pedido</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════ PÁGINA 3 (publicidade opcional) ═══════════ */}
      {orcamento.imagem_publicidade_url && (
        <div className="pagina-3" style={{ ...pageStyle }}>
          <div style={{ background: "#1a4168", color: "white", padding: "3mm 6mm" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: "8mm" }} />
              <div style={{ fontSize: "7pt" }}>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "1mm" }}>
                  <Globe style={{ width: "2.5mm", height: "2.5mm" }} /> www.3whotelaria.com.br
                </p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "1mm" }}>
                  <Phone style={{ width: "2.5mm", height: "2.5mm" }} /> +55 (11) 5197-5779
                </p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "1mm" }}>
                  <Mail style={{ width: "2.5mm", height: "2.5mm" }} /> {emailExibicao}
                </p>
              </div>
              <div style={{ background: "#c4942c", color: "white", padding: "1.5mm 5mm", borderRadius: "1mm", fontWeight: "bold", fontSize: "8pt" }} data-pdf-orcamento-numero>
                Orçamento {numero}
              </div>
              {orcamento.fornecedor_nome && (
                <div style={{ background: "white", padding: "1.5mm", borderRadius: "1mm" }}>
                  <p style={{ fontSize: "12pt", fontWeight: "bold", color: "#ef4444", margin: 0 }}>
                    {orcamento.fornecedor_nome.split(" ")[0]}
                  </p>
                </div>
              )}
              <div style={{ fontSize: "7pt", textAlign: "right" }}>
                <p style={{ margin: 0 }}>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p style={{ margin: 0, fontWeight: 600 }}>Expira em {formatDate(orcamento.data_validade)}</p>
                <div style={{
                  marginTop: "1mm", background: "#e5e7eb", color: "#374151",
                  padding: "0.5mm 2mm", borderRadius: "1mm", display: "inline-block", fontSize: "6pt",
                }}>
                  {orcamento.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#f3f4f6", padding: "10mm",
          }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "28pt", fontWeight: "bold", color: "#1a4168", marginBottom: "6mm" }}>
                ESPAÇO PARA PUBLICIDADE
              </h2>
              <img
                src={orcamento.imagem_publicidade_url}
                alt="Publicidade"
                style={{ width: "100%", borderRadius: "4mm", marginBottom: "6mm" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10mm" }}>
                <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: "16mm" }} />
                <p style={{ fontSize: "24pt", fontWeight: "bold", color: "#9ca3af" }}>E</p>
                {orcamento.fornecedor_nome && (
                  <p style={{ fontSize: "20pt", fontWeight: "bold", color: "#ef4444" }}>
                    {orcamento.fornecedor_nome.split(" ")[0]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
