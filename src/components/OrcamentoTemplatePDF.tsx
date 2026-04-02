import { Orcamento, OrcamentoItem } from "@/lib/types";
import { Mail, MapPin, Phone, Truck, Package, CreditCard, AlertCircle, DollarSign, Globe } from "lucide-react";
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

export function OrcamentoTemplatePDF({ orcamento, itens, emailUsuario, enderecoEntrega, enderecoCadastral }: Props) {
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

  return (
    <div style={{ width: '210mm', margin: '0 auto', background: 'white', fontFamily: 'Arial, sans-serif' }}>
      {/* PÁGINA 1 */}
      <div
        className="pagina-1"
        style={{
          width: '210mm',
          height: '297mm',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HEADER */}
        <div style={{ backgroundColor: '#1a4168', color: 'white', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <img src="/logo_3Whotelaria.jpeg" alt="3W Hotelaria" style={{ height: '80px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span style={{ fontSize: '15px' }}>www.3whotelaria.com.br</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span style={{ fontSize: '15px' }}>+55 (11) 5197-5779</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                  <span style={{ fontSize: '15px' }}>{emailExibicao}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ backgroundColor: '#c4942c', color: '#1a4168', padding: '12px 32px', borderRadius: '8px', display: 'inline-block', marginBottom: '12px' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  Orçamento {numero}
                </p>
              </div>
              {logotipoFornecedor ? (
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <img
                    src={logotipoFornecedor}
                    alt={nomeFornecedorExibicao}
                    style={{ height: '50px', maxWidth: '160px', objectFit: 'contain' }}
                  />
                </div>
              ) : orcamento.fornecedor_nome ? (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>{orcamento.fornecedor_nome.split(" ")[0]}</p>
                </div>
              ) : null}
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                <p style={{ margin: 0 }}>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p style={{ fontWeight: 600, margin: 0 }}>Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
              <div
                style={{ marginTop: '16px', backgroundColor: '#e5e7eb', color: '#374151', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }}
              >
                {orcamento.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* HERO MARKETING */}
        {imagemMarketingExibicao ? (
          <div style={{ flex: 1, background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)', padding: '24px', overflow: 'hidden' }}>
            <img
              src={imagemMarketingExibicao}
              alt="Marketing"
              style={{ width: '100%', height: 'auto', maxHeight: '100%', borderRadius: '12px', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, background: 'linear-gradient(to bottom right, #eff6ff, #f5f3ff, #fdf2f8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1a4168', marginBottom: '12px' }}>
                {orcamento.fornecedor_nome || orcamento.operacao}
              </h2>
              <p style={{ fontSize: '20px', color: '#4b5563' }}>é na 3W Hotelaria!</p>
            </div>
          </div>
        )}

        {/* RODAPÉ - DADOS DO CLIENTE */}
        <div style={{ backgroundColor: '#c4942c', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '16px', color: 'white', margin: '0 0 4px 0' }}>
                {orcamento.cliente_cnpj || ""} | {(orcamento as any).cliente_razao_social || orcamento.cliente_nome || ""}
              </p>
              <p style={{ fontWeight: 600, fontSize: '13px', color: 'white', margin: '0 0 8px 0' }}>{orcamento.cliente_nome || ""}</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1a4168', margin: '2px 0' }}>
                <MapPin style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                <span>{enderecoCadastralMontado || "—"}</span>
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1a4168', margin: '2px 0' }}>
                <Mail style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                <span>{orcamento.cliente_email || "—"}</span>
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1a4168', margin: '2px 0' }}>
                <Phone style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                <span>{orcamento.cliente_telefone || "—"}</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#1a4168', marginBottom: '8px' }}>Endereço de Entrega</p>
              <p style={{ fontSize: '11px', color: '#1a4168' }}>{enderecoEntregaFinal || "—"}</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(26,65,104,0.3)', paddingTop: '12px' }}>
            <p style={{ color: '#1a4168', fontSize: '11px', margin: 0 }}>
              Segue abaixo o orçamento solicitado. Estamos a disposição para quaisquer esclarecimentos e alterações.{" "}
              <strong>Bons Negócios!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* PÁGINA 2 */}
      <div
        className="pagina-2"
        style={{
          width: '210mm',
          height: '297mm',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, padding: '16px 20px' }}>
          {/* TABELA DE ITENS */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a4168', color: 'white' }}>
                <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'center' }}>Item</th>
                {tipoLayout === "castor" ? (
                  <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'center' }} colSpan={5}>Código</th>
                ) : (
                  <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'center' }}>Código</th>
                )}
                <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'left' }}>Descrição</th>
                {tipoLayout === "castor" && <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'center' }}>Medidas</th>}
                <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'center' }}>Qtd</th>
                <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'right' }}>Unitário</th>
                <th style={{ border: '1px solid white', padding: '6px 8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => {
                const codigoDividido = dividirCodigo(item.codigo || "");
                return (
                  <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                    {tipoLayout === "castor" ? (
                      <>
                        {codigoDividido.slice(0, 5).map((digito, i) => (
                          <td key={i} style={{ border: '1px solid #d1d5db', padding: '4px', textAlign: 'center', fontFamily: 'monospace', backgroundColor: '#eff6ff' }}>
                            {digito}
                          </td>
                        ))}
                        {Array(Math.max(0, 5 - codigoDividido.length))
                          .fill(null)
                          .map((_, i) => (
                            <td key={`empty-${i}`} style={{ border: '1px solid #d1d5db', padding: '4px', backgroundColor: '#f3f4f6' }}></td>
                          ))}
                      </>
                    ) : (
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{item.codigo || "-"}</td>
                    )}
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px' }}>
                      <p style={{ fontWeight: 600, margin: 0 }}>{item.descricao}</p>
                      {item.especificacoes && <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', marginBottom: 0 }}>{item.especificacoes}</p>}
                    </td>
                    {tipoLayout === "castor" && (
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontSize: '10px' }}>
                        {(item as any).medidas || "-"}
                      </td>
                    )}
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantidade}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(item.preco_unitario)}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ATENÇÃO + TOTAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <div style={{ backgroundColor: '#f3f4f6', border: '2px solid #d1d5db', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#c4942c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Atenção</h3>
              </div>
              <p style={{ fontSize: '10px', color: '#374151', marginBottom: '6px' }}>Antes de confirmar o pedido, recomendamos:</p>
              <ul style={{ fontSize: '10px', color: '#374151', listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '3px' }}>• Confira todos os itens do orçamento, em especial a descrição e quantidade.</li>
                <li style={{ marginBottom: '3px' }}>• Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.</li>
                <li style={{ marginBottom: '3px' }}>• Leia atentamente as observações do orçamento.</li>
                <li>• Veja os Termos Gerais da 3W Hotelaria.</li>
              </ul>
            </div>
            <div>
              <div style={{ backgroundColor: '#c4942c', color: 'white', padding: '10px 12px', borderRadius: '8px 8px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Subtotal</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{formatCurrency(subtotalCalculado)}</span>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderLeft: '2px solid #d1d5db', borderRight: '2px solid #d1d5db', padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <div style={{ flex: 1 }}>Impostos</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>{impostosPercentualCalculado.toFixed(2)}%</div>
                  <div style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(impostosCalculado)}</div>
                </div>
              </div>
              {descontoValorCalculado > 0 && (
                <div style={{ backgroundColor: 'white', borderLeft: '2px solid #d1d5db', borderRight: '2px solid #d1d5db', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <div style={{ flex: 1 }}>Desconto</div>
                    <div style={{ width: '60px', textAlign: 'center' }}>{descontoPercentualCalculado.toFixed(2)}%</div>
                    <div style={{ width: '100px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{formatCurrency(descontoValorCalculado)}</div>
                  </div>
                </div>
              )}
              <div style={{ backgroundColor: '#1a4168', color: 'white', padding: '10px 12px', borderRadius: '0 0 8px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Valor Final</span>
                  <span style={{ fontWeight: 'bold', fontSize: '22px' }}>{formatCurrency(totalCalculado)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* FRETE / ENTREGA / DIFAL / CONDIÇÕES */}
          <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ border: '2px solid #d1d5db', borderTopLeftRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px 8px', borderBottom: '2px solid #d1d5db' }}>
                    <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}>
                      <Truck style={{ width: '14px', height: '14px' }} /> Frete
                    </p>
                  </div>
                  <div style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, margin: 0 }}>{orcamento.frete_tipo || "CIF (Incluso)"}</p>
                  </div>
                </div>
                <div style={{ border: '2px solid #d1d5db', borderLeft: 0, borderTopRightRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px 8px', borderBottom: '2px solid #d1d5db' }}>
                    <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}>
                      <Package style={{ width: '14px', height: '14px' }} /> Entrega
                    </p>
                  </div>
                  <div style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, margin: 0 }}>{orcamento.prazo_entrega || "45/60 dias"}</p>
                  </div>
                </div>
              </div>
              <div style={{ border: '2px solid #d1d5db', borderTop: 0, borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ backgroundColor: '#f3f4f6', padding: '6px 8px', borderBottom: '2px solid #d1d5db' }}>
                  <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <DollarSign style={{ width: '14px', height: '14px' }} /> Difal
                  </p>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#eff6ff', fontSize: '9px', color: '#374151', flex: 1 }}>
                  <p style={{ margin: 0 }}>
                    {orcamento.difal_texto ||
                      "Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários."}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ border: '2px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '6px 8px', borderBottom: '2px solid #d1d5db' }}>
                <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                  <CreditCard style={{ width: '14px', height: '14px' }} /> Condições e Forma de Pagamento
                </p>
              </div>
              <div style={{ padding: '8px 10px' }}>
                {layoutMidea ? (
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>CONDIÇÕES DE PAGAMENTO:</div>
                    <div style={{ fontSize: '9px', whiteSpace: 'pre-wrap' }}>{condicoesPagamentoMidea}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '9px', whiteSpace: 'pre-wrap' }}>
                    {condicoesPagamentoTexto ||
                      "ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES GERAIS */}
          {orcamento.observacoes_gerais && (
            <div style={{ marginTop: '10px', border: '2px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '6px 8px', borderBottom: '2px solid #d1d5db' }}>
                <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>Observações Gerais</p>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <p style={{ fontSize: '10px', whiteSpace: 'pre-wrap', margin: 0 }}>{orcamento.observacoes_gerais}</p>
              </div>
            </div>
          )}

          {/* TERMOS DO FABRICANTE */}
          {termosFornecedorExibicao && (
            <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#eff6ff', border: '2px solid #1a4168', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '2px solid #1a4168' }}>
                {logotipoFornecedor && (
                  <img src={logotipoFornecedor} alt={nomeFornecedorExibicao || "Fornecedor"} style={{ height: '40px' }} />
                )}
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a4168', margin: 0 }}>
                  {layoutMidea ? "TERMOS LEGAIS MIDEA CARRIER" : "TERMOS DO FABRICANTE"}
                </h3>
              </div>
              <div style={{ fontSize: '9px', color: '#1f2937', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {termosFornecedorExibicao}
              </div>
            </div>
          )}

          {/* TERMOS 3W */}
          <div style={{ marginTop: '10px', backgroundColor: '#f9fafb', border: '2px solid #d1d5db', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#1a4168', padding: '4px', borderRadius: '4px' }}>
                <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: '20px' }} />
              </div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#c4942c', margin: 0 }}>TERMOS LEGAIS DA 3W HOTELARIA</h3>
            </div>
            <div style={{ fontSize: '9px', color: '#374151' }}>
              <p style={{ margin: '3px 0' }}>• O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.</p>
              <p style={{ margin: '3px 0' }}>• Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.</p>
              <p style={{ margin: '3px 0' }}>• As políticas comerciais variam conforme o Fabricante/Fornecedor.</p>
              <p style={{ margin: '3px 0' }}>• As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição estadual do cliente, e estado da unidade/fábrica fornecedora.</p>
              <p style={{ margin: '3px 0' }}>• Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.</p>
              <p style={{ margin: '3px 0' }}>• Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da {orcamento.fornecedor_nome || "Fabricante"}.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 3 - PUBLICIDADE (se houver) */}
      {orcamento.imagem_publicidade_url && (
        <div
          className="pagina-3"
          style={{
            width: '210mm',
            height: '297mm',
            overflow: 'hidden',
            pageBreakBefore: 'always',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ backgroundColor: '#1a4168', color: 'white', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: '32px' }} />
              <div style={{ fontSize: '10px' }}>
                <p style={{ margin: '1px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe style={{ width: '10px', height: '10px' }} /> www.3whotelaria.com.br
                </p>
                <p style={{ margin: '1px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone style={{ width: '10px', height: '10px' }} /> +55 (11) 5197-5779
                </p>
                <p style={{ margin: '1px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail style={{ width: '10px', height: '10px' }} /> {emailExibicao}
                </p>
              </div>
              <div style={{ backgroundColor: '#c4942c', color: '#1a4168', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                Orçamento {numero}
              </div>
              {orcamento.fornecedor_nome && (
                <div style={{ backgroundColor: 'white', padding: '6px', borderRadius: '4px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{orcamento.fornecedor_nome.split(" ")[0]}</p>
                </div>
              )}
              <div style={{ fontSize: '10px', textAlign: 'right' }}>
                <p style={{ margin: 0 }}>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p style={{ fontWeight: 600, margin: 0 }}>Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '40px' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1a4168', marginBottom: '24px' }}>ESPAÇO PARA PUBLICIDADE</h2>
              <img
                src={orcamento.imagem_publicidade_url}
                alt="Publicidade"
                style={{ width: '100%', borderRadius: '12px', marginBottom: '24px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
                <img src="/logo_3Whotelaria.jpeg" alt="3W" style={{ height: '60px' }} />
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#9ca3af', margin: 0 }}>E</p>
                {orcamento.fornecedor_nome && (
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>{orcamento.fornecedor_nome.split(" ")[0]}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
