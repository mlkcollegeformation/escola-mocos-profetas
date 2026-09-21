# 📱 Guia de Ativação: Notificações no WhatsApp

Este guia ensina como ativar o envio automático de notificações no seu WhatsApp toda vez que uma pessoa se inscrever na plataforma **Escola de Moços e Profetas**.

---

## ⚡ Como Funciona (Opção 1 - CallMeBot)

O **CallMeBot** é um serviço 100% gratuito que permite enviar mensagens diretas para o seu próprio WhatsApp via API, sem precisar contratar plataformas pagas.

A ativação leva **menos de 1 minuto** diretamente pelo seu celular.

---

## 📋 Passo a Passo de Ativação

### Passo 1: Salvar o contato do Bot no seu celular
Adicione aos seus contatos no WhatsApp o novo número oficial do CallMeBot:
- **Nome:** CallMeBot Novo
- **Número:** `+34 623 78 95 80`

> 💡 **Dica rápida:** Você pode clicar neste link direto para abrir a conversa no WhatsApp:  
> [👉 Abrir conversa com o novo CallMeBot](https://wa.me/34623789580?text=I%20allow%20callmebot%20to%20call%20me)

---

### Passo 2: Autorizar e gerar a chave
Na conversa com o novo número, envie a mensagem indicada pelo bot:

```text
I allow callmebot to call me
```
*(ou se preferir enviar texto: `I allow callmebot to send me messages`)*

---

### Passo 3: Receber sua API Key
Em poucos segundos, o bot responderá com uma mensagem confirmando a ativação:

```text
CallMeBot API Activated for [seu_numero]
Your apikey is: 1234567
```

Guarde esse número da **apikey**.

---

### Passo 4: Configurar no site (`config.js`)
Abra o arquivo `config.js` e preencha o seu número de WhatsApp e a sua chave:

```javascript
window.APP_CONFIG = {
  SUPABASE_URL: "https://saazlvlpjogiwcuosmdo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_...",

  NOTIFICACOES: {
    ATIVO: true,
    PROVEDOR: "callmebot",

    CALLMEBOT: {
      // 55 (Brasil) + DDD (ex: 11) + seu número celular (apenas dígitos)
      NUMERO: "5511999999999",

      // Cole aqui a apikey recebida do bot
      API_KEY: "1234567"
    },

    WEBHOOK_URL: ""
  }
};
```

---

### Passo 5: Testar o funcionamento
1. Abra o painel administrativo (`admin.html`) no seu navegador;
2. Faça login e clique no botão **📲 Testar WhatsApp** no topo da tabela;
3. Em poucos instantes você receberá a mensagem de confirmação no seu celular!
4. Você também pode fazer uma inscrição de teste na página inicial (`index.html`) para conferir o comprovante e a notificação completa.

---

## 💬 Exemplo da Notificação Recebida

Toda vez que alguém se inscrever, você receberá no seu WhatsApp:

```text
🔔 NOVA INSCRIÇÃO CONFIRMADA!
Escola de Moços e Profetas — MLK

🎫 Nº Inscrição: #001
👤 Nome: João Silva
📱 WhatsApp: (11) 98765-4321
📧 E-mail: joao@gmail.com
⏰ Horário: 21/09/2026 às 15:50

💬 Conversar com o inscrito:
https://wa.me/5511987654321
```

> Clicando no link da mensagem, seu WhatsApp abre na hora a conversa com o participante cadastrado.

---

## ⚙️ Dúvidas Frequentes

1. **O serviço é gratuito?**
   Sim, o CallMeBot é gratuito para notificações pessoais de alertas.
2. **Posso desligar quando quiser?**
   Sim, basta trocar `ATIVO: true` para `ATIVO: false` no arquivo `config.js`.
3. **E se eu quiser usar outro serviço no futuro (ex: Make, n8n, Z-API)?**
   Basta trocar `PROVEDOR: "webhook"` e preencher o endereço no campo `WEBHOOK_URL` no `config.js`.
