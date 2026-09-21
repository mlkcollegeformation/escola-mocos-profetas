// Cole abaixo os dados do seu projeto Supabase.
// A chave ANON do Supabase pode ficar no front-end; a segurança real deve ser feita com RLS.
window.APP_CONFIG = {
  SUPABASE_URL: "https://saazlvlpjogiwcuosmdo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_YjknSAfw0t3hr24eoAyKig_mEdTzF3n",

  // ==========================================================================
  // NOTIFICAÇÕES NO WHATSAPP (CALLMEBOT - 100% GRATUITO)
  // ==========================================================================
  // Veja o passo a passo completo no arquivo GUIA_NOTIFICACOES_WHATSAPP.md
  NOTIFICACOES: {
    ATIVO: true, // true para enviar notificação a cada nova inscrição, false para desligar
    PROVEDOR: "callmebot", // "callmebot" ou "webhook"

    CALLMEBOT: {
      // Seu número de celular com DDI (55 para Brasil) + DDD + número (apenas números)
      NUMERO: "5511915117067",

      // Chave API obtida gratuitamente no WhatsApp via CallMeBot
      API_KEY: "1373883"
    },

    // (Opcional) URL de Webhook para Make / n8n / Evolution API caso queira no futuro
    WEBHOOK_URL: ""
  }
};

