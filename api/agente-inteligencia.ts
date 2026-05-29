/**
 * Agente de Inteligência 3W Hotelaria
 * Proxy para Claude API com contexto completo do negócio.
 * Variável de ambiente necessária: ANTHROPIC_API_KEY
 */

export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `Você é o Agente de Inteligência da 3W Hotelaria — uma empresa de representação comercial especializada em hotelaria e gastronomia.

Seu papel é analisar os dados do negócio, identificar tendências, gerar insights acionáveis e responder perguntas sobre performance, vendas, comissões e estratégia.

DIRETRIZES:
- Seja direto, objetivo e use linguagem de negócios em português brasileiro
- Quando identificar problemas, sugira ações concretas
- Formate respostas com markdown quando útil (negrito, listas, tabelas)
- Se não houver dados suficientes para uma análise, diga claramente e sugira o que coletar
- Foque em insights acionáveis, não apenas em descrever os dados
- Use R$ e % com precisão nos valores citados

Os dados do negócio são fornecidos no contexto de cada mensagem.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, context } = await req.json();

    // Monta contexto do negócio como texto estruturado
    const contextText = context
      ? `\n\n---\nCONTEXTO ATUAL DO NEGÓCIO (${new Date().toLocaleDateString("pt-BR")}):\n${JSON.stringify(context, null, 2)}\n---`
      : "";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT + contextText,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[agente-inteligencia] Anthropic error:", res.status, err);
      return new Response(
        JSON.stringify({ error: `Erro da API (${res.status})` }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[agente-inteligencia] erro:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
