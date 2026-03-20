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

export function OrcamentoTemplate({ orcamento, itens, emailUsuario, enderecoEntrega, enderecoCadastral }: Props) {
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
      .join(", ");

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

  return (
    <div className="bg-white font-sans">
      {/* PÁGINA 1 */}
      <div className="min-h-screen flex flex-col page-break">
        {/* HEADER */}
        <div className="bg-[#1a4168] text-white p-6">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            <div>
              <img src="/logo_3Whotelaria.jpeg" alt="3W Hotelaria" className="h-24 mb-4" />
              <div className="flex flex-col gap-3 text-base pl-6">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">www.3whotelaria.com.br</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">+55 (11) 5197-5779</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 flex-shrink-0" />
                  <span className="text-lg">{emailExibicao}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-[#c4942c] text-white px-10 py-4 rounded-lg inline-block mb-4">
                <p className="text-xl font-bold" data-pdf-orcamento-numero>
                  Orçamento {orcamento.numero}
                </p>
              </div>
              {logotipoFornecedor ? (
                <div className="mb-4 flex justify-end">
                  <img
                    src={logotipoFornecedor}
                    alt={nomeFornecedorExibicao}
                    className="h-16 max-w-[200px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : orcamento.fornecedor_nome ? (
                <div className="mb-4">
                  <p className="text-2xl font-bold text-red-600">{orcamento.fornecedor_nome.split(" ")[0]}</p>
                </div>
              ) : null}
              <div className="space-y-1 text-sm">
                <p>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
              </div>
              <div
                className="mt-6 bg-gray-200 text-gray-700 px-6 py-2.5 rounded text-sm font-semibold"
                style={{ display: "inline-block", lineHeight: "1", verticalAlign: "middle" }}
              >
                <span style={{ display: "inline-block", transform: "translateY(0px)" }}>
                  {orcamento.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO MARKETING */}
        {imagemMarketingExibicao ? (
          <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 p-8">
            <div className="max-w-7xl mx-auto">
              <img
                src={imagemMarketingExibicao}
                alt="Marketing"
                className="w-full h-auto rounded-2xl shadow-2xl"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.innerHTML =
                      '<div class="text-center py-20"><p class="text-4xl font-bold text-gray-400">Imagem de Marketing</p></div>';
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-12">
            <div className="text-center">
              <h2 className="text-5xl font-bold text-[#1a4168] mb-4">
                {orcamento.fornecedor_nome || orcamento.operacao}
              </h2>
              <p className="text-2xl text-gray-600">é na 3W Hotelaria!</p>
            </div>
          </div>
        )}

        {/* RODAPÉ - DADOS DO CLIENTE */}
        <div className="bg-[#c4942c] p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              {/* Dados do Cliente - Esquerda (endereço CADASTRAL) */}
              <div className="space-y-1">
                <p className="font-bold text-xl text-[#1a4168] mb-3">
                  {orcamento.cliente_cnpj || ""} {orcamento.cliente_nome || ""}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{orcamento.cliente_email || "—"}</span>
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{enderecoCadastralMontado || enderecoEntregaFinal || "—"}</span>
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-[#1a4168] flex-shrink-0" />
                  <span>{orcamento.cliente_telefone || "—"}</span>
                </p>
              </div>
              {/* Endereço de Entrega - Direita (endereço EDITÁVEL) */}
              <div className="text-right space-y-1">
                <p className="font-bold text-base text-[#1a4168] mb-3">Endereço de Entrega</p>
                <p className="text-sm">{enderecoEntregaFinal || "—"}</p>
              </div>
            </div>
            <div className="text-center border-t border-[#1a4168]/30 pt-4">
              <p className="text-[#1a4168] text-sm">
                Segue abaixo o orçamento solicitado. Estamos a disposição para quaisquer esclarecimentos e alterações.{" "}
                <strong>Bons Negócios!</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 2 */}
      <div className="min-h-screen flex flex-col page-break">
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1a4168] text-white">
                  <th className="border border-white p-3 text-center">Item</th>
                  {tipoLayout === "castor" ? (
                    <th className="border border-white p-3 text-center" colSpan={5}>
                      Código
                    </th>
                  ) : (
                    <th className="border border-white p-3 text-center">Código</th>
                  )}
                  <th className="border border-white p-3 text-left">Descrição</th>
                  {tipoLayout === "castor" && <th className="border border-white p-3 text-center">Medidas</th>}
                  <th className="border border-white p-3 text-center">Qtd</th>
                  <th className="border border-white p-3 text-right">Unitário</th>
                  <th className="border border-white p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => {
                  const codigoDividido = dividirCodigo(item.codigo || "");
                  return (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="border border-gray-300 p-3 text-center font-bold">{index + 1}</td>
                      {tipoLayout === "castor" ? (
                        <>
                          {codigoDividido.slice(0, 5).map((digito, i) => (
                            <td key={i} className="border border-gray-300 p-2 text-center font-mono bg-blue-50">
                              {digito}
                            </td>
                          ))}
                          {Array(Math.max(0, 5 - codigoDividido.length))
                            .fill(null)
                            .map((_, i) => (
                              <td key={`empty-${i}`} className="border border-gray-300 p-2 bg-gray-100"></td>
                            ))}
                        </>
                      ) : (
                        <td className="border border-gray-300 p-3 text-center font-mono">{item.codigo || "-"}</td>
                      )}
                      <td className="border border-gray-300 p-3">
                        <p className="font-semibold">{item.descricao}</p>
                        {item.especificacoes && <p className="text-sm text-gray-600 mt-1">{item.especificacoes}</p>}
                      </td>
                      {tipoLayout === "castor" && (
                        <td className="border border-gray-300 p-3 text-center text-sm">
                          {(item as any).medidas || "-"}
                        </td>
                      )}
                      <td className="border border-gray-300 p-3 text-center font-bold">{item.quantidade}</td>
                      <td className="border border-gray-300 p-3 text-right">{formatCurrency(item.preco_unitario)}</td>
                      <td className="border border-gray-300 p-3 text-right font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="grid md:grid-cols-2 gap-6 mt-8 page-break-inside-avoid">
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#c4942c] rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Atenção</h3>
                </div>
                <p className="text-sm text-gray-700 mb-3">Antes de confirmar o pedido, recomendamos:</p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Confira todos os itens do orçamento, em especial a descrição e quantidade.</li>
                  <li>• Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.</li>
                  <li>• Leia atentamente as observações do orçamento.</li>
                  <li>• Veja os Termos Gerais da 3W Hotelaria.</li>
                </ul>
              </div>
              <div>
                <div className="bg-[#c4942c] text-white p-4 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Subtotal</span>
                    <span className="font-bold text-2xl">{formatCurrency(subtotalCalculado)}</span>
                  </div>
                </div>
                <div className="bg-white border-x-2 border-gray-300 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">Impostos</div>
                    <div className="w-20 text-center">{impostosPercentualCalculado.toFixed(2)}%</div>
                    <div className="w-32 text-right font-semibold">{formatCurrency(impostosCalculado)}</div>
                  </div>
                </div>
                {descontoValorCalculado > 0 && (
                  <div className="bg-white border-x-2 border-gray-300 p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">Desconto</div>
                      <div className="w-20 text-center">{descontoPercentualCalculado.toFixed(2)}%</div>
                      <div className="w-32 text-right font-semibold text-red-600">
                        -{formatCurrency(descontoValorCalculado)}
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-[#1a4168] text-white p-4 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Valor Final</span>
                    <span className="font-bold text-3xl">{formatCurrency(totalCalculado)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 mt-8 page-break-inside-avoid">
              <div className="col-span-4 flex flex-col gap-0 h-full">
                <div className="grid grid-cols-2 gap-0">
                  <div className="border-2 border-gray-300 rounded-tl-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                      <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                        <Truck className="w-5 h-5" /> Frete
                      </p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-semibold">{orcamento.frete_tipo || "CIF (Incluso)"}</p>
                    </div>
                  </div>
                  <div className="border-2 border-l-0 border-gray-300 rounded-tr-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                      <p className="font-bold text-center text-sm flex items-center justify-center gap-1">
                        <Package className="w-5 h-5" /> Entrega
                      </p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-semibold">{orcamento.prazo_entrega || "45/60 dias"}</p>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-t-0 border-gray-300 rounded-b-lg overflow-hidden flex-1 flex flex-col">
                  <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                    <p className="font-bold text-center flex items-center justify-center gap-2">
                      <DollarSign className="w-5 h-5" /> Difal
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 text-sm text-gray-700 flex-1">
                    <p>
                      {orcamento.difal_texto ||
                        "Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-8 border-2 border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold text-center flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" /> Condições e Forma de Pagamento
                  </p>
                </div>
                <div className="p-4">
                  {layoutMidea ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-gray-700">CONDIÇÕES DE PAGAMENTO:</div>
                      <div className="text-xs space-y-1 whitespace-pre-wrap">{condicoesPagamentoMidea}</div>
                    </div>
                  ) : (
                    <div className="text-xs space-y-1 whitespace-pre-wrap">
                      {condicoesPagamentoTexto ||
                        "ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {orcamento.observacoes_gerais && (
              <div className="mt-6 border-2 border-gray-300 rounded-lg overflow-hidden page-break-inside-avoid">
                <div className="bg-gray-100 p-3 border-b-2 border-gray-300">
                  <p className="font-bold">Observações Gerais</p>
                </div>
                <div className="p-4 min-h-[100px]">
                  <p className="text-sm whitespace-pre-wrap">{orcamento.observacoes_gerais}</p>
                </div>
              </div>
            )}

            {termosFornecedorExibicao && (
              <div className="mt-8 mb-8 p-6 bg-blue-50 border-2 border-[#1a4168] rounded-lg page-break-inside-avoid">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-[#1a4168]">
                  {logotipoFornecedor && (
                    <img src={logotipoFornecedor} alt={nomeFornecedorExibicao || "Fornecedor"} className="h-16" />
                  )}
                  <h3 className="text-xl font-bold text-[#1a4168]">
                    {layoutMidea ? "TERMOS LEGAIS MIDEA CARRIER" : "TERMOS DO FABRICANTE"}
                  </h3>
                </div>
                <div className="text-sm text-gray-800 leading-relaxed space-y-3 whitespace-pre-wrap">
                  {termosFornecedorExibicao}
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 border-2 border-gray-300 rounded-lg p-6 page-break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#1a4168] p-2 rounded">
                  <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#c4942c]">TERMOS LEGAIS DA 3W HOTELARIA</h3>
              </div>
              <div className="text-xs text-gray-700 space-y-2">
                <p>• O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.</p>
                <p>
                  • Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente
                  pelo Fabricante/Fornecedor.
                </p>
                <p>• As políticas comerciais variam conforme o Fabricante/Fornecedor.</p>
                <p>
                  • As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição
                  estadual do cliente, e estado da unidade/fábrica fornecedora.
                </p>
                <p>
                  • Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração
                  vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do
                  Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.
                </p>
                <p>
                  • Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da{" "}
                  {orcamento.fornecedor_nome || "Fabricante"}.
                </p>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4 page-break-inside-avoid">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <Phone className="w-6 h-6" />
                <span>Clique aqui para falar com o Vendedor</span>
              </button>
              <button className="bg-[#c4942c] hover:bg-[#a87d24] text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors">
                <Package className="w-6 h-6" />
                <span>Clique aqui para confirmar o pedido</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {orcamento.imagem_publicidade_url && (
        <div className="min-h-screen flex flex-col page-break">
          <div className="bg-[#1a4168] text-white p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-10" />
              <div className="text-sm space-y-1">
                <p className="flex items-center gap-1">
                  <Globe className="w-3 h-3" /> www.3whotelaria.com.br
                </p>
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> +55 (11) 5197-5779
                </p>
                <p className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {emailExibicao}
                </p>
              </div>
              <div className="bg-[#c4942c] text-white px-6 py-2 rounded font-bold" data-pdf-orcamento-numero>
                Orçamento {orcamento.numero}
              </div>
              {orcamento.fornecedor_nome && (
                <div className="bg-white p-2 rounded">
                  <p className="text-xl font-bold text-red-600">{orcamento.fornecedor_nome.split(" ")[0]}</p>
                </div>
              )}
              <div className="text-sm text-right">
                <p>Emitido em {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}</p>
                <p className="font-semibold">Expira em {formatDate(orcamento.data_validade)}</p>
                <div className="mt-1 bg-gray-200 text-gray-700 px-3 py-1 rounded inline-block text-xs">
                  {orcamento.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-12">
            <div className="text-center max-w-4xl">
              <h2 className="text-6xl font-bold text-[#1a4168] mb-8">ESPAÇO PARA PUBLICIDADE</h2>
              <img
                src={orcamento.imagem_publicidade_url}
                alt="Publicidade"
                className="w-full rounded-2xl shadow-2xl mb-8"
              />
              <div className="flex items-center justify-center gap-12">
                <img src="/logo_3Whotelaria.jpeg" alt="3W" className="h-20" />
                <p className="text-5xl font-bold text-gray-400">E</p>
                {orcamento.fornecedor_nome && (
                  <p className="text-4xl font-bold text-red-600">{orcamento.fornecedor_nome.split(" ")[0]}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
