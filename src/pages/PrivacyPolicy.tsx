export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo_3Whotelaria_transp.png" alt="3W Hotelaria" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-gray-700">3W Hotelaria</span>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-gray-900">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: Abril de 2026</p>

        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Quem somos</h2>
            <p>
              A <strong>3W Hotelaria</strong> é uma empresa de hospitalidade que utiliza canais digitais,
              incluindo WhatsApp, para oferecer atendimento ao cliente, reservas e suporte aos seus hóspedes e parceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Dados coletados</h2>
            <p>Podemos coletar as seguintes informações quando você interage conosco via WhatsApp ou outros canais digitais:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>Número de telefone</li>
              <li>Nome fornecido no perfil ou durante a conversa</li>
              <li>Conteúdo das mensagens enviadas voluntariamente</li>
              <li>Data e horário das interações</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Finalidade do uso dos dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>Prestação de serviços de atendimento ao cliente</li>
              <li>Processamento de reservas e solicitações</li>
              <li>Envio de informações relevantes ao serviço contratado</li>
              <li>Melhoria contínua da qualidade do atendimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Compartilhamento de dados</h2>
            <p>
              Não compartilhamos seus dados pessoais com terceiros para fins comerciais.
              Os dados poderão ser compartilhados apenas quando exigido por lei ou por ordem judicial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Retenção dos dados</h2>
            <p>
              Os dados são mantidos pelo período necessário para a prestação dos serviços e pelo prazo
              mínimo exigido pela legislação brasileira (Lei Geral de Proteção de Dados — LGPD, Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Seus direitos (LGPD)</h2>
            <p>Em conformidade com a LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>Acessar os dados que temos sobre você</li>
              <li>Solicitar correção de dados incorretos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>
            <p className="mt-2">
              Para exercer esses direitos, entre em contato conosco pelo WhatsApp ou pelo e-mail abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado,
              perda ou alteração. As comunicações via WhatsApp são protegidas pela criptografia de ponta a ponta
              oferecida pela plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Contato</h2>
            <p>Em caso de dúvidas sobre esta política, entre em contato:</p>
            <ul className="mt-2 space-y-1 text-gray-700">
              <li><strong>Empresa:</strong> 3W Hotelaria</li>
              <li><strong>E-mail:</strong> contato@3whotelaria.com.br</li>
              <li><strong>WhatsApp:</strong> Pelo mesmo canal de atendimento</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} 3W Hotelaria. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
