import { Orcamento, OrcamentoItem } from "@/lib/types";
import { extrairTextoCondicoesPagamento } from "@/lib/condicoesPagamento";
import { formatDateBR } from "@/lib/date";
import {
  resolverCondicoesPagamentoMidea,
  resolverImagemMarketing,
  resolverTermosFornecedor,
} from "@/lib/fornecedorTerms";

// ── Helpers ──

function parseNum(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  if (str.includes(",")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseNum(value));
}

function formatDate(date: string | null | undefined) {
  return formatDateBR(date);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailIcon(unicode: string, color = "#ffffff") {
  return `<span style="font-size:14px;color:${color};margin-right:6px;vertical-align:middle;">${unicode}</span>`;
}

function getAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url.replace(/^\/+/, "")}`;
}

const F = "font-family:Arial,Helvetica,sans-serif;";
const esc = escapeHtml;
const nl2br = (t: string) => (t ? esc(t).replace(/\n/g, "<br/>") : "—");

// ── Interface ──

export interface GerarHtmlOrcamentoParams {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  enderecoEntrega: string;
  emailUsuario?: string;
}

// ── Gerador de HTML ──

export function gerarHtmlOrcamento({
  orcamento,
  itens,
  enderecoEntrega,
  emailUsuario,
}: GerarHtmlOrcamentoParams): string {
  const enderecoEntregaFinal = String(enderecoEntrega || "").trim();
  const fornecedorNome =
    (orcamento as any).fornecedor_nome_fantasia || orcamento.fornecedor_nome || orcamento.operacao || "3W Hotelaria";
  const fornecedorNomeNorm = fornecedorNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const fornecedorTipoLayout = String((orcamento as any).fornecedor_tipo_layout || "").toLowerCase();
  const layoutCastor = fornecedorTipoLayout === "castor";
  const layoutMidea =
    fornecedorTipoLayout === "midea" ||
    ["MIDEA", "SPRINGER", "CLIMAZON", "CARRIER"].some((k) => fornecedorNomeNorm.includes(k));
  const corPrimaria = (orcamento as any).fornecedor_cor_primaria || "#C8962E";
  const corSecundaria = (orcamento as any).fornecedor_cor_secundaria || "#1a4168";
  const subtotal = parseNum((orcamento as any).subtotal) || itens.reduce((a, i) => a + parseNum(i.total), 0);
  const impostosPerc = parseNum((orcamento as any).impostos_percentual);
  const impostos = parseNum((orcamento as any).impostos) || subtotal * (impostosPerc / 100);
  const descontoPerc = parseNum((orcamento as any).desconto_percentual);
  const descontoVal =
    parseNum((orcamento as any).desconto_valor) ||
    parseNum((orcamento as any).desconto) ||
    subtotal * (descontoPerc / 100);
  const frete = parseNum((orcamento as any).frete);
  const total = parseNum((orcamento as any).total) || subtotal + impostos - descontoVal + frete;
  const logo3w = getAbsoluteUrl("/logo_3Whotelaria_transp.png") || getAbsoluteUrl("/logo_3Whotelaria.jpeg");
  const logoFornecedor = getAbsoluteUrl((orcamento as any).fornecedor_logotipo_url || null);
  const marketingUrl = getAbsoluteUrl(
    resolverImagemMarketing(
      orcamento.imagem_marketing_url,
      (orcamento as any).fornecedor_imagem_template_url || null,
      layoutMidea,
    ),
  );
  const condBase = extrairTextoCondicoesPagamento(orcamento.condicoes_pagamento);
  const condicoesPag = layoutMidea
    ? resolverCondicoesPagamentoMidea(condBase)
    : condBase ||
      "ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\n- para 30/60/90/120/150 acréscimo de 3,80%\n- para 30/60/90/120/150/180 acréscimo de 4,20%\n- para 30/60/90/120/150/180/210 acréscimo de 4,80%\n- para 30/60/90/120/150/180/210/240 acréscimo de 5,20%\n- para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%\n- para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.";
  const termosForn = resolverTermosFornecedor(orcamento.termos_fornecedor, layoutMidea);
  const emailExib = emailUsuario || "comercial1@3whotelaria.com.br";
  const whatsHref =
    "https://wa.me/551151975779?text=" +
    encodeURIComponent(`Olá, gostaria de falar sobre o orçamento ${orcamento.numero}.`);
  const confirmHref = `mailto:${emailExib}?subject=${encodeURIComponent(`Confirmação do orçamento ${orcamento.numero}`)}`;
  const dividirCodigoCastor = (codigo: string | null | undefined) =>
    String(codigo || "")
      .trim()
      .split("")
      .slice(0, 5);
  const temMedidas = layoutCastor || itens.some((i) => (i as any).medidas && String((i as any).medidas).trim());
  const colHeaders = layoutCastor
    ? ["Item", "Código", "Descrição", "Medidas", "Qtd", "Unitário", "Total"]
    : temMedidas
      ? ["Item", "Código", "Descrição", "Medidas", "Qtd", "Unitário", "Total"]
      : ["Item", "Código", "Descrição", "Qtd", "Unitário", "Total"];

  const itemRows = itens
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? "#f9fafb" : "#ffffff";
      if (layoutCastor) {
        const codigoBoxes =
          dividirCodigoCastor(item.codigo)
            .map(
              (char) =>
                `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin-right:4px;"><tr><td style="width:24px;height:28px;border:1px solid #d1d5db;background-color:#eff6ff;text-align:center;${F}font-size:13px;font-weight:700;color:#111827;">${esc(char)}</td></tr></table>`,
            )
            .join("") || "—";
        return `<tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:center;vertical-align:top;">${idx + 1}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:center;vertical-align:top;white-space:nowrap;">${codigoBoxes}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:left;vertical-align:top;"><strong>${esc(item.descricao)}</strong>${item.especificacoes ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(item.especificacoes)}</span>` : ""}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:center;vertical-align:top;">${esc((item as any).medidas || "—")}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:center;vertical-align:top;">${item.quantidade}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:right;vertical-align:top;">${esc(formatCurrency(item.preco_unitario))}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:right;vertical-align:top;">${esc(formatCurrency(item.total))}</td>
      </tr>`;
      }
      const cols = temMedidas
        ? [
            String(idx + 1),
            esc(item.codigo || "—"),
            `<strong>${esc(item.descricao)}</strong>${item.especificacoes ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(item.especificacoes)}</span>` : ""}`,
            esc((item as any).medidas || "—"),
            String(item.quantidade),
            esc(formatCurrency(item.preco_unitario)),
            esc(formatCurrency(item.total)),
          ]
        : [
            String(idx + 1),
            esc(item.codigo || "—"),
            `<strong>${esc(item.descricao)}</strong>${item.especificacoes ? `<br/><span style="color:#6b7280;font-size:12px;">${esc(item.especificacoes)}</span>` : ""}`,
            String(item.quantidade),
            esc(formatCurrency(item.preco_unitario)),
            esc(formatCurrency(item.total)),
          ];
      const aligns = temMedidas
        ? ["center", "center", "left", "center", "center", "right", "right"]
        : ["center", "center", "left", "center", "right", "right"];
      return `<tr>${cols.map((c, i) => `<td style="padding:8px 10px;border:1px solid #d1d5db;${F}font-size:13px;color:#111827;background-color:${bg};text-align:${aligns[i]};vertical-align:top;">${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const iconGlobe = (c: string) => emailIcon("🌐", c);
  const iconPhone = (c: string) => emailIcon("📞", c);
  const iconEnvelope = (c: string) => emailIcon("✉️", c);
  const iconPin = (c: string) => emailIcon("📍", c);
  const iconTruck = emailIcon("🚚", "#111827");
  const iconBox = emailIcon("📦", "#111827");
  const iconDollar = emailIcon("💲", "#111827");
  const iconCard = emailIcon("💳", "#111827");
  const iconAlert = `<span style="font-size:20px;vertical-align:middle;">⚠️</span>`;
  const iconCheck = `<span style="font-size:16px;color:#ffffff;margin-right:6px;vertical-align:middle;">✅</span>`;
  const termosFornecedorTitulo = `TERMOS LEGAIS ${fornecedorNome.toUpperCase()}`;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      rascunho: "Rascunho",
      enviado: "Enviado",
      aprovado: "Aprovado",
      rejeitado: "Rejeitado",
      expirado: "Expirado",
    };
    return labels[status] || status;
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no"/>
<title>Orcamento ${esc(orcamento.numero)}</title>
<!--[if mso]><style type="text/css">body,table,td,th{font-family:Arial,Helvetica,sans-serif !important;}table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;${F}-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;mso-table-lspace:0pt;mso-table-rspace:0pt;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr><td style="background-color:${esc(corSecundaria)};padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;width:55%;">
          ${logo3w ? `<img src="${esc(logo3w)}" alt="3W Hotelaria" style="display:block;height:70px;width:auto;margin-bottom:12px;"/>` : ""}
          <table cellpadding="0" cellspacing="0" border="0" style="padding-left:8px;">
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;">${iconGlobe("#ffffff")}www.3whotelaria.com.br</td></tr>
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;">${iconPhone("#ffffff")}+55 (11) 5197-5779</td></tr>
            <tr><td style="padding:3px 0;${F}font-size:14px;color:#ffffff;">${iconEnvelope("#ffffff")}${esc(emailExib)}</td></tr>
          </table>
        </td>
        <td style="vertical-align:top;text-align:right;width:45%;">
          <div style="display:inline-block;padding:10px 20px;background-color:${esc(corPrimaria)};color:#ffffff;${F}font-size:18px;font-weight:700;border-radius:8px;margin-bottom:12px;">Orçamento ${esc(orcamento.numero)}</div>
          ${logoFornecedor ? `<div style="margin:12px 0;text-align:right;"><img src="${esc(logoFornecedor)}" alt="${esc(fornecedorNome)}" style="display:inline-block;height:48px;max-width:160px;"/></div>` : orcamento.fornecedor_nome ? `<div style="margin:8px 0;${F}font-size:20px;font-weight:700;color:#ef4444;">${esc(orcamento.fornecedor_nome.split(" ")[0])}</div>` : ""}
          <div style="${F}font-size:13px;color:#ffffff;line-height:20px;">Emitido em ${esc(formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at))}<br/><strong>Expira em ${esc(formatDate(orcamento.data_validade))}</strong></div>
          <div style="display:inline-block;margin-top:10px;padding:5px 14px;background-color:#e5e7eb;color:#374151;${F}font-size:11px;font-weight:700;border-radius:4px;">${esc(getStatusLabel(orcamento.status))}</div>
        </td>
      </tr>
    </table>
  </td></tr>
  ${marketingUrl ? `<tr><td style="padding:0;background-color:#f3f4f6;"><img src="${esc(marketingUrl)}" alt="Marketing" style="display:block;width:100%;height:auto;"/></td></tr>` : `<tr><td style="padding:40px 24px;background-color:#eff6ff;text-align:center;"><div style="${F}font-size:28px;font-weight:700;color:${esc(corSecundaria)};margin-bottom:8px;">${esc(fornecedorNome)}</div><div style="${F}font-size:18px;color:#6b7280;">é na 3W Hotelaria!</div></td></tr>`}
  <tr><td style="background-color:${esc(corPrimaria)};padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:top;width:60%;">
          <div style="${F}font-size:16px;font-weight:700;color:#ffffff;margin-bottom:10px;">${esc(orcamento.cliente_cnpj || "")} &nbsp; ${esc(orcamento.cliente_nome || "")}</div>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:3px 0;vertical-align:middle;width:22px;">${iconEnvelope("#ffffff")}</td><td style="padding:3px 0;padding-left:2px;${F}font-size:13px;color:#ffffff;vertical-align:middle;">${esc(orcamento.cliente_email || "—")}</td></tr>
            <tr><td style="padding:3px 0;vertical-align:middle;width:22px;">${iconPin("#ffffff")}</td><td style="padding:3px 0;padding-left:2px;${F}font-size:13px;color:#ffffff;vertical-align:middle;">${esc(enderecoEntregaFinal || "—")}</td></tr>
            <tr><td style="padding:3px 0;vertical-align:middle;width:22px;">${iconPhone("#ffffff")}</td><td style="padding:3px 0;padding-left:2px;${F}font-size:13px;color:#ffffff;vertical-align:middle;">${esc(orcamento.cliente_telefone || "—")}</td></tr>
          </table>
        </td>
        <td style="vertical-align:top;text-align:right;width:40%;">
          <div style="${F}font-size:14px;font-weight:700;color:#ffffff;margin-bottom:8px;">Endereço de Entrega</div>
          <div style="${F}font-size:13px;color:#ffffff;">${esc(enderecoEntregaFinal || "—")}</div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:12px;border-top:1px solid rgba(255,255,255,0.4);text-align:center;"><div style="${F}font-size:13px;color:#ffffff;">Segue abaixo o orçamento solicitado. Estamos à disposição para quaisquer esclarecimentos e alterações. <strong>Bons Negócios!</strong></div></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>${colHeaders.map((h) => `<th style="padding:10px 8px;background-color:${esc(corSecundaria)};color:#ffffff;${F}font-size:12px;font-weight:700;border:1px solid #ffffff;text-align:center;">${h}</th>`).join("")}</tr>
      ${itemRows}
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="48%" style="vertical-align:top;padding-right:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;border:2px solid #d1d5db;border-radius:8px;">
            <tr><td style="padding:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr><td style="width:36px;height:36px;background-color:${esc(corPrimaria)};border-radius:50%;text-align:center;vertical-align:middle;">${iconAlert}</td><td style="padding-left:10px;${F}font-size:16px;font-weight:700;color:#111827;">Atenção</td></tr></table>
              <div style="${F}font-size:12px;color:#374151;line-height:18px;">Antes de confirmar o pedido, recomendamos:<br/><br/>• Confira todos os itens do orçamento, em especial a descrição e quantidade.<br/>• Verifique as condições e forma de pagamento, informações sobre o frete, entrega e Difal.<br/>• Leia atentamente as observações do orçamento.<br/>• Veja os Termos Gerais da 3W Hotelaria.</div>
            </td></tr>
          </table>
        </td>
        <td width="52%" style="vertical-align:top;padding-left:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;">
            <tr><td style="padding:12px 16px;background-color:${esc(corPrimaria)};"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${F}font-size:14px;font-weight:700;color:#ffffff;">Subtotal</td><td align="right" style="${F}font-size:18px;font-weight:700;color:#ffffff;">${esc(formatCurrency(subtotal))}</td></tr></table></td></tr>
            <tr><td style="padding:10px 16px;background-color:#ffffff;border-left:2px solid #d1d5db;border-right:2px solid #d1d5db;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${F}font-size:13px;color:#374151;">Impostos</td><td align="center" style="${F}font-size:13px;color:#374151;width:60px;">${impostosPerc.toFixed(2)}%</td><td align="right" style="${F}font-size:13px;font-weight:600;color:#374151;width:100px;">${esc(formatCurrency(impostos))}</td></tr></table></td></tr>
            ${descontoVal > 0 ? `<tr><td style="padding:10px 16px;background-color:#ffffff;border-left:2px solid #d1d5db;border-right:2px solid #d1d5db;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${F}font-size:13px;color:#374151;">Desconto</td><td align="center" style="${F}font-size:13px;color:#374151;width:60px;">${descontoPerc.toFixed(2)}%</td><td align="right" style="${F}font-size:13px;font-weight:600;color:#dc2626;width:100px;">-${esc(formatCurrency(descontoVal))}</td></tr></table></td></tr>` : ""}
            <tr><td style="padding:14px 16px;background-color:${esc(corSecundaria)};"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${F}font-size:14px;font-weight:700;color:#ffffff;">Valor Final</td><td align="right" style="${F}font-size:22px;font-weight:700;color:#ffffff;">${esc(formatCurrency(total))}</td></tr></table></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="35%" style="vertical-align:top;padding-right:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;">
            <tr>
              <td width="50%" style="border-right:1px solid #d1d5db;border-bottom:2px solid #d1d5db;"><div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;"><strong style="${F}font-size:12px;color:#111827;">${iconTruck}Frete</strong></div><div style="padding:10px;text-align:center;${F}font-size:12px;font-weight:600;color:#111827;">${esc(orcamento.frete_tipo || "CIF (Incluso)")}</div></td>
              <td width="50%" style="border-bottom:2px solid #d1d5db;"><div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;"><strong style="${F}font-size:12px;color:#111827;">${iconBox}Entrega</strong></div><div style="padding:10px;text-align:center;${F}font-size:12px;font-weight:600;color:#111827;">${esc(orcamento.prazo_entrega || "45/60 dias")}</div></td>
            </tr>
            <tr><td colspan="2"><div style="background-color:#f3f4f6;padding:8px;text-align:center;border-bottom:1px solid #d1d5db;"><strong style="${F}font-size:12px;color:#111827;">${iconDollar}Difal</strong></div><div style="padding:10px;background-color:#eff6ff;${F}font-size:11px;color:#374151;line-height:16px;">${nl2br(orcamento.difal_texto || "Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.")}</div></td></tr>
          </table>
        </td>
        <td width="65%" style="vertical-align:top;padding-left:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;">
            <tr><td style="background-color:#f3f4f6;padding:10px;text-align:center;border-bottom:2px solid #d1d5db;"><strong style="${F}font-size:13px;color:#111827;">${iconCard}Condições e Forma de Pagamento</strong></td></tr>
            <tr><td style="padding:14px;${F}font-size:12px;line-height:18px;color:#374151;">${nl2br(condicoesPag)}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>
  ${orcamento.observacoes_gerais ? `<tr><td style="padding:0 24px 24px 24px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;overflow:hidden;"><tr><td style="padding:10px 16px;background-color:#f3f4f6;border-bottom:2px solid #d1d5db;${F}font-size:14px;font-weight:700;color:#111827;">Observações Gerais</td></tr><tr><td style="padding:14px 16px;${F}font-size:13px;line-height:20px;color:#374151;">${nl2br(orcamento.observacoes_gerais)}</td></tr></table></td></tr>` : ""}
  ${termosForn ? `<tr><td style="padding:0 24px 24px 24px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${esc(corSecundaria)};border-radius:8px;background-color:#eff6ff;overflow:hidden;"><tr><td style="padding:14px 16px;border-bottom:2px solid ${esc(corSecundaria)};"><table cellpadding="0" cellspacing="0" border="0"><tr>${logoFornecedor ? `<td style="padding-right:12px;"><img src="${esc(logoFornecedor)}" alt="" style="height:40px;width:auto;"/></td>` : ""}<td style="${F}font-size:16px;font-weight:700;color:${esc(corSecundaria)};text-transform:uppercase;">${esc(termosFornecedorTitulo)}</td></tr></table></td></tr><tr><td style="padding:14px 16px;${F}font-size:12px;line-height:19px;color:#1f2937;">${nl2br(termosForn)}</td></tr></table></td></tr>` : ""}
  <tr><td style="padding:0 24px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #d1d5db;border-radius:8px;background-color:#f9fafb;overflow:hidden;">
      <tr><td style="padding:14px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr><td style="background-color:${esc(corSecundaria)};padding:6px;border-radius:4px;"><img src="${esc(logo3w || "")}" alt="3W" style="height:24px;width:auto;display:block;"/></td><td style="padding-left:10px;${F}font-size:14px;font-weight:700;color:${esc(corPrimaria)};">TERMOS LEGAIS DA 3W HOTELARIA</td></tr></table>
        <div style="${F}font-size:11px;line-height:17px;color:#374151;">• O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.<br/>• Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.<br/>• As políticas comerciais variam conforme o Fabricante/Fornecedor.<br/>• As questões de DIFAL dependem do estado de localização do cliente, situação cadastral de inscrição estadual do cliente, e estado da unidade/fábrica fornecedora.<br/>• Embora o sistema atribua automaticamente a validade do Orçamento conforme política de expiração vigente, a 3W não se responsabiliza por eventuais mudanças de tabela de preços do Fabricante/Fornecedor, ainda que isto ocorra no período de validade do orçamento.<br/>• Para eventuais questões pós-venda, o cliente deverá fazer contato diretamente com o SAC da ${esc(fornecedorNome)}.</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="48%" align="center" style="padding-right:8px;"><a href="${esc(whatsHref)}" target="_blank" style="display:block;background-color:#22c55e;color:#ffffff;${F}font-size:14px;font-weight:700;text-decoration:none;padding:14px 10px;text-align:center;">${iconPhone("#ffffff")}Falar com o Vendedor</a></td>
        <td width="48%" align="center" style="padding-left:8px;"><a href="${esc(confirmHref)}" target="_blank" style="display:block;background-color:${esc(corPrimaria)};color:#ffffff;${F}font-size:14px;font-weight:700;text-decoration:none;padding:14px 10px;text-align:center;">${iconCheck}Confirmar Pedido</a></td>
      </tr>
    </table>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;
}
