-- Adiciona 'anuncio_click_to_whatsapp' como origem válida de opt-in.
-- Decisão do Caio em 2026-08-05: caminho de menor atrito para coletar
-- consentimento — o próprio cliente manda a mensagem inicial (ação
-- afirmativa mais forte que existe), clicando num anúncio Meta com botão
-- "Enviar mensagem" e um texto pré-preenchido que já declara o interesse
-- em receber promoções/novidades da 3W. Ver memória modulo_marketing_whatsapp.md.
--
-- Registro continua manual por enquanto — detectar automaticamente o
-- metadado `referral` (anúncio) no webhook de recepção e criar o opt-in
-- sozinho exigiria mexer no workflow n8n, fora do escopo desta sessão.

alter table whatsapp_opt_in drop constraint if exists whatsapp_opt_in_origem_check;
alter table whatsapp_opt_in add constraint whatsapp_opt_in_origem_check
  check (origem in (
    'formulario_site',
    'confirmacao_atendimento',
    'importacao_manual_confirmada',
    'anuncio_click_to_whatsapp',
    'outro'
  ));
