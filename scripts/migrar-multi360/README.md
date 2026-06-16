# Migração Multi360 → Hub 3W

Importa contatos + histórico de conversas (texto e mídia) dos atendimentos
ativos do Multi360 para o módulo de Atendimento do hub 3W.

## Passo a passo

1. **Rodar a migration** (uma vez), no SQL Editor do Supabase:
   `supabase/migrations/20260611120000_migracao_multi360.sql`

2. **Criar o `.env`** nesta pasta a partir do `.env.example`:
   - `MULTI360_TOKEN`: F12 → Application → Local Storage → `painel.multi360.com.br`
     → `ngStorage-token` (valor sem as aspas externas). Expira quando a sessão
     do Multi360 cai — se der erro 401, pegue de novo.
   - `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → Project Settings → API → `service_role`.

3. **Testar com poucos** antes de rodar tudo:
   ```
   cd scripts/migrar-multi360
   node --env-file=.env migrar.mjs --limit 5
   ```
   Confira no hub (Atendimento) se as 5 conversas chegaram corretas.

4. **Rodar a migração completa**:
   ```
   node --env-file=.env migrar.mjs
   ```
   É idempotente e tem checkpoint (`.progress.json`): se cair, rode de novo que
   ele retoma de onde parou, sem duplicar.

## Flags
- `--limit N` — processa só N atendimentos (teste).
- `--dry` — extrai do Multi360 mas **não grava** no Supabase (conta volumes).
- `--sem-midia` — **muito mais rápido**: migra só o texto. Imagens/áudios/vídeos
  não são baixados; a mensagem fica como `[imagem]`/`[video]`/`[audio]` ou o nome
  do arquivo. Use se o cliente não precisar abrir as mídias antigas.
- `--midia-desde YYYY-MM-DD` — baixa mídia só de mensagens a partir da data; as
  anteriores viram rótulo. Texto de TODAS as conversas é sempre migrado.
  Ex.: `--midia-desde 2026-01-01` (anexos só de janeiro/2026 pra frente).

## Mapeamento de canais (ajustável em `migrar.mjs`)
- Fabiano / Comercial 1 → **G1**
- Alex / Comercial 4 → **G4**
- Celso / Admin → **ADM**
- Fornecedores → **FORNECEDORES**
- Demais (Comercial 2/3/5, Gabriel, Selma) → **G1** (fallback; veja o resumo
  "Distribuição por canal" ao final para decidir se quer reclassificar).

## Notas
- **Mídia**: imagens/áudios/vídeos são baixados do Multi360 e re-hospedados no
  bucket `chat-midia` do Supabase. As URLs originais (`mz-css.net`) morrem quando
  o cliente cancelar o Multi360 — por isso a migração baixa os arquivos.
- **Escopo atual**: 1.060 atendimentos ativos. Os ~1.412 encerrados não têm
  endpoint exposto na API e ficam para uma segunda fase, se o cliente precisar.
- Eventos de sistema (transferência de atendente, etc.) são ignorados.
