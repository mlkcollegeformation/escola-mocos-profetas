// Inicialização do cliente Supabase para a Área Administrativa
(function() {
  const cfg = window.APP_CONFIG || {};

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_URL.includes("COLE_AQUI") ||
      cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    alert("Supabase não configurado no config.js. Verifique as credenciais.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );

  // Elementos do DOM
  const loginView = document.getElementById("loginView");
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const loginStatus = document.getElementById("loginStatus");

  // Elementos da Tela de Redefinição de Senha
  const resetPasswordView = document.getElementById("resetPasswordView");
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const savePasswordSubmit = document.getElementById("savePasswordSubmit");
  const resetStatus = document.getElementById("resetStatus");
  const cancelResetBtn = document.getElementById("cancelResetBtn");

  const dashboardView = document.getElementById("dashboardView");
  const userEmailBadge = document.getElementById("userEmailBadge");
  const logoutBtn = document.getElementById("logoutBtn");

  const statTotal = document.getElementById("statTotal");
  const statToday = document.getElementById("statToday");
  const todayDateHint = document.getElementById("todayDateHint");

  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn") || document.getElementById("exportCsvBtn");
  const testWhatsappBtn = document.getElementById("testWhatsappBtn");
  const resultCount = document.getElementById("resultCount");
  const registrationsTbody = document.getElementById("registrationsTbody");

  // Estado da aplicação
  let allRegistrations = [];
  let isRecoveringPassword = false;

  // Detectar se a URL contém tokens REAIS de recuperação vindo do e-mail do Supabase
  if ((window.location.hash.includes("type=recovery") && window.location.hash.includes("access_token")) ||
      (window.location.search.includes("type=recovery") && window.location.search.includes("code="))) {
    isRecoveringPassword = true;
  } else if (window.location.hash.includes("type=recovery") && !window.location.hash.includes("access_token")) {
    // Se for apenas uma hash de teste residual na barra de endereço, limpa para não travar o login
    if (window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  // Exibir a data de hoje no card de métricas
  if (todayDateHint) {
    const todayStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    todayDateHint.textContent = `Hoje (${todayStr})`;
  }

  function showResetPasswordView() {
    isRecoveringPassword = true;
    loginView.classList.add("hidden");
    dashboardView.classList.add("hidden");
    if (resetPasswordView) resetPasswordView.classList.remove("hidden");
    if (newPassword) newPassword.value = "";
    if (confirmPassword) confirmPassword.value = "";
    if (resetStatus) {
      resetStatus.textContent = "";
      resetStatus.className = "auth-status";
    }
  }

  function showLogin() {
    allRegistrations = [];
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    if (resetPasswordView) resetPasswordView.classList.add("hidden");
    if (loginPassword) loginPassword.value = "";
    if (loginStatus && !loginStatus.classList.contains("success")) {
      loginStatus.textContent = "";
      loginStatus.className = "auth-status";
    }
  }

  function showDashboard(user) {
    if (isRecoveringPassword) {
      showResetPasswordView();
      return;
    }
    loginView.classList.add("hidden");
    if (resetPasswordView) resetPasswordView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    if (userEmailBadge) {
      userEmailBadge.textContent = user.email || "Administrador";
    }
    fetchRegistrations();
  }

  // Checar sessão ativa no início
  async function initAuth() {
    if (isRecoveringPassword) {
      showResetPasswordView();
      return;
    }

    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (isRecoveringPassword) {
        showResetPasswordView();
      } else if (session && session.user) {
        showDashboard(session.user);
      } else {
        showLogin();
      }
    } catch (err) {
      console.error("Erro ao verificar sessão:", err);
      showLogin();
    }
  }

  // Ouvir mudanças de autenticação
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      isRecoveringPassword = true;
      showResetPasswordView();
    } else if (event === "SIGNED_IN" && session?.user) {
      if (isRecoveringPassword) {
        showResetPasswordView();
      } else {
        showDashboard(session.user);
      }
    } else if (event === "SIGNED_OUT") {
      if (!isRecoveringPassword) {
        showLogin();
      }
    }
  });

  // Evento de Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Ao enviar o login diretamente, cancela qualquer estado pendente de recuperação
    isRecoveringPassword = false;
    if (window.history.replaceState && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      loginStatus.className = "auth-status error";
      loginStatus.textContent = "Preencha o e-mail e a senha.";
      return;
    }

    loginSubmit.disabled = true;
    loginSubmit.textContent = "Autenticando...";
    loginStatus.className = "auth-status";
    loginStatus.textContent = "";

    try {
      console.log("Tentando login com:", email);
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Erro no signInWithPassword:", error);
        let msg = "Não foi possível autenticar.";
        if (error.message.includes("Invalid login credentials")) {
          msg = "E-mail ou senha incorretos. Verifique os dados ou crie o usuário em Authentication > Users no Supabase.";
        } else if (error.message.includes("Email not confirmed")) {
          msg = "Este e-mail ainda não foi confirmado. No painel do Supabase em Authentication > Users, confirme o usuário manualmente.";
        } else {
          msg = error.message;
        }
        throw new Error(msg);
      }

      console.log("Login autorizado para:", data.user?.email);
      loginStatus.className = "auth-status success";
      loginStatus.textContent = "Login autorizado! Carregando painel...";
      showDashboard(data.user);
    } catch (err) {
      console.error("Falha no login:", err);
      loginStatus.className = "auth-status error";
      const rawMsg = String(err?.message || err || "");
      if (
        rawMsg.includes("Failed to fetch") ||
        rawMsg.includes("Load failed") ||
        rawMsg.includes("NetworkError") ||
        rawMsg.includes("TypeError")
      ) {
        loginStatus.textContent = "Não foi possível conectar ao banco de dados Supabase. Verifique se o projeto está ativo no painel do Supabase.";
      } else {
        loginStatus.textContent = err.message;
      }
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Entrar no painel";
    }
  });

  // Recuperação de Senha do Administrador
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const currentEmail = (loginEmail.value || "").trim();
      const email = window.prompt("Informe o e-mail do administrador para recuperação de senha:", currentEmail);

      if (email === null) return; // cancelado pelo usuário

      const emailTrimmed = email.trim();
      if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        loginStatus.className = "auth-status error";
        loginStatus.textContent = "Por favor, informe um e-mail válido.";
        return;
      }

      loginStatus.className = "auth-status";
      loginStatus.textContent = "Solicitando e-mail de recuperação...";

      try {
        const targetRedirect = window.location.origin.includes("localhost")
          ? "http://localhost:3000/admin.html"
          : window.location.href.split("#")[0].split("?")[0];

        const { error } = await supabaseClient.auth.resetPasswordForEmail(emailTrimmed, {
          redirectTo: targetRedirect
        });

        if (error) throw error;

        loginStatus.className = "auth-status success";
        loginStatus.textContent = "E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.";
      } catch (err) {
        console.error("Erro ao recuperar senha:", err);
        loginStatus.className = "auth-status error";
        loginStatus.textContent = err.message || "Não foi possível enviar o e-mail de recuperação.";
      }
    });
  }

  // Evento de Logout
  logoutBtn.addEventListener("click", async () => {
    try {
      logoutBtn.disabled = true;
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      logoutBtn.disabled = false;
      showLogin();
    }
  });

  // Consultar cadastros na tabela registrations
  async function fetchRegistrations() {
    registrationsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="table-empty">Atualizando lista de cadastros...</td>
      </tr>
    `;
    resultCount.textContent = "Carregando dados...";

    try {
      const { data, error } = await supabaseClient
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Alerta amigável se faltar política de SELECT no RLS
        if (error.code === "42501" || error.message.includes("policy") || error.message.includes("permission denied")) {
          throw new Error("Permissão insuficiente (RLS). Execute a política de SELECT para 'authenticated' no SQL Editor do Supabase.");
        }
        throw error;
      }

      allRegistrations = data || [];
      updateStats();
      renderTable();
    } catch (err) {
      console.error("Erro ao buscar inscrições:", err);
      registrationsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty" style="color: var(--danger);">
            ⚠️ ${err.message || "Erro ao carregar os dados. Verifique a conexão e as permissões RLS."}
          </td>
        </tr>
      `;
      resultCount.textContent = "Erro no carregamento";
      statTotal.textContent = "0";
      statToday.textContent = "0";
    }
  }

  // Atualizar contadores
  function updateStats() {
    statTotal.textContent = allRegistrations.length.toString();

    // Data de hoje no formato local YYYY-MM-DD
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const todayCount = allRegistrations.filter((item) => {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      return (
        d.getFullYear() === todayYear &&
        d.getMonth() === todayMonth &&
        d.getDate() === todayDate
      );
    }).length;

    statToday.textContent = todayCount.toString();
  }

  // Formatação do número de inscrição com no mínimo 3 dígitos
  function formatRegNumber(num) {
    if (num === null || num === undefined || num === "") return "—";
    return String(num).padStart(3, "0");
  }

  // Formatação de data em português
  function formatDate(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  }

  // Formatar telefone para exibição e link do WhatsApp
  function formatPhone(phone) {
    if (!phone) return { display: "—", link: null };
    const digits = phone.replace(/\D/g, "");

    let display = phone;
    if (digits.length === 11) {
      display = digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (digits.length === 10) {
      display = digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }

    const link = digits.length >= 10 ? `https://wa.me/55${digits}` : null;
    return { display, link };
  }

  // Renderizar a tabela com filtro de busca
  function renderTable() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = allRegistrations.filter((item) => {
      if (!query) return true;
      const regNum = formatRegNumber(item.registration_number).toLowerCase();
      const name = (item.full_name || "").toLowerCase();
      const phone = (item.phone || "").toLowerCase();
      const email = (item.email || "").toLowerCase();
      return regNum.includes(query) || name.includes(query) || phone.includes(query) || email.includes(query);
    });

    // Atualizar texto de contagem
    if (allRegistrations.length === 0) {
      resultCount.innerHTML = "Nenhuma inscrição registrada até o momento.";
    } else if (query) {
      resultCount.innerHTML = `Mostrando <strong>${filtered.length}</strong> de <strong>${allRegistrations.length}</strong> inscritos`;
    } else {
      resultCount.innerHTML = `Total de <strong>${allRegistrations.length}</strong> inscritos registrados`;
    }

    if (filtered.length === 0) {
      registrationsTbody.innerHTML = `
        <tr>
          <td colspan="5" class="table-empty">
            ${query ? "Nenhum cadastro corresponde ao termo pesquisado." : "Nenhum cadastro encontrado."}
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered.map((item) => {
      const regNumFormatted = formatRegNumber(item.registration_number);
      const dateFormatted = formatDate(item.created_at);
      const phoneInfo = formatPhone(item.phone);
      const phoneHtml = phoneInfo.link
        ? `<a href="${phoneInfo.link}" target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp">${phoneInfo.display} ↗</a>`
        : phoneInfo.display;

      const emailSafe = (item.email || "—").toLowerCase();
      const emailHtml = emailSafe !== "—"
        ? `<a href="mailto:${emailSafe}" title="Enviar e-mail">${emailSafe}</a>`
        : "—";

      return `
        <tr>
          <td class="td-num"><strong>${regNumFormatted}</strong></td>
          <td class="td-name">${escapeHtml(item.full_name || "—")}</td>
          <td class="td-phone">${phoneHtml}</td>
          <td class="td-email">${emailHtml}</td>
          <td class="td-date">${dateFormatted}</td>
        </tr>
      `;
    }).join("");

    registrationsTbody.innerHTML = rowsHtml;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Busca em tempo real
  searchInput.addEventListener("input", () => {
    if (searchInput.value.trim().length > 0) {
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }
    renderTable();
  });

  // Limpar busca
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    searchInput.focus();
    renderTable();
  });

  // Botão Testar WhatsApp
  if (testWhatsappBtn) {
    testWhatsappBtn.addEventListener("click", async () => {
      const notif = cfg.NOTIFICACOES || {};
      const callmebot = notif.CALLMEBOT || {};
      const phone = (callmebot.NUMERO || "").replace(/\D/g, "");
      const apiKey = (callmebot.API_KEY || "").trim();

      if (!notif.ATIVO) {
        alert("As notificações estão desativadas no config.js (ATIVO: false). Altere para ATIVO: true para enviar alertas.");
        return;
      }

      if (notif.PROVEDOR === "callmebot") {
        if (!phone || !apiKey || apiKey.includes("COLE_") || phone === "5511999999999") {
          alert("⚠️ Configuração pendente:\n\nAbra o arquivo config.js e preencha seu número de telefone e a API_KEY do CallMeBot.\n\nConsulte o arquivo GUIA_NOTIFICACOES_WHATSAPP.md para ver como obter sua chave gratuita em 1 minuto!");
          return;
        }

        const originalText = testWhatsappBtn.textContent;
        testWhatsappBtn.disabled = true;
        testWhatsappBtn.textContent = "⏳ Enviando teste...";

        try {
          const agora = new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });

          const mensagemTeste = [
            `🧪 *TESTE DE NOTIFICAÇÃO - MLK* 🔔`,
            `_Escola de Moços e Profetas_`,
            ``,
            `Olá! Esta é uma notificação de teste confirmando que a integração com o seu WhatsApp está *100% ativa e funcionando*!`,
            ``,
            `⏰ *Disparado em:* ${agora}`
          ].join("\n");

          const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(mensagemTeste)}&apikey=${encodeURIComponent(apiKey)}`;

          await fetch(endpoint, {
            method: "GET",
            mode: "no-cors",
            cache: "no-cache"
          });

          alert(`✅ Notificação de teste enviada com sucesso!\n\nVerifique as mensagens no seu WhatsApp (${phone}). Em alguns segundos ela deve aparecer no seu celular.`);
        } catch (err) {
          console.error("Erro ao enviar teste:", err);
          alert("Aviso: Tentativa de envio realizada. Verifique seu WhatsApp.");
        } finally {
          testWhatsappBtn.disabled = false;
          testWhatsappBtn.textContent = originalText;
        }
      } else if (notif.PROVEDOR === "webhook" && notif.WEBHOOK_URL) {
        alert("Provedor configurado como Webhook: " + notif.WEBHOOK_URL);
      }
    });
  }

  // Botão Atualizar
  refreshBtn.addEventListener("click", () => {
    fetchRegistrations();
  });

  // ============================================================================
  // EXPORTAÇÃO EM PDF INSTITUCIONAL (MLK COLLEGE FORMATION)
  // ============================================================================
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      exportToPdf();
    });
  }

  function exportToPdf() {
    if (!allRegistrations || allRegistrations.length === 0) {
      alert("Não há dados de inscrições para exportar.");
      return;
    }

    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const listToExport = query
      ? allRegistrations.filter((item) => {
          const regNum = formatRegNumber(item.registration_number).toLowerCase();
          const name = (item.full_name || "").toLowerCase();
          const phone = (item.phone || "").toLowerCase();
          const email = (item.email || "").toLowerCase();
          return regNum.includes(query) || name.includes(query) || phone.includes(query) || email.includes(query);
        })
      : allRegistrations;

    if (listToExport.length === 0) {
      alert("Nenhuma inscrição encontrada com o filtro de busca atual.");
      return;
    }

    const rows = listToExport.map((item) => {
      const numInscricao = formatRegNumber(item.registration_number);
      const dataHora = formatDate(item.created_at);
      const phoneInfo = formatPhone(item.phone);
      return [
        numInscricao,
        item.full_name || "—",
        phoneInfo.display,
        item.email || "—",
        dataHora
      ];
    });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const dataEmissao = now.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // Tentativa com jsPDF e autotable
    if (window.jspdf && (window.jspdf.jsPDF || typeof window.jspdf === "function")) {
      try {
        const jsPDFClass = window.jspdf.jsPDF || window.jspdf;
        const doc = new jsPDFClass({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        // Dimensões A4: 210 x 297 mm
        // Cabeçalho institucional (Azul-marinho e Dourado)
        doc.setFillColor(6, 21, 37); // #061525 Azul marinho
        doc.rect(0, 0, 210, 26, "F");

        // Faixa dourada decorativa
        doc.setFillColor(201, 162, 77); // #C9A24D Dourado
        doc.rect(0, 26, 210, 1.5, "F");

        // Textos institucionais do cabeçalho
        doc.setTextColor(201, 162, 77);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("MLK COLLEGE FORMATION • FACULDADE MARTIN LUTHER KING", 14, 9);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("ESCOLA DE MOÇOS E PROFETAS", 14, 16);

        doc.setTextColor(200, 211, 222);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Relatório Oficial de Inscrições Confirmadas", 14, 22);

        // Metadados à direita
        doc.setTextColor(220, 230, 240);
        doc.setFontSize(7.5);
        doc.text(`Emissão: ${dataEmissao}`, 196, 11, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(`Total: ${listToExport.length} inscrito(s)`, 196, 18, { align: "right" });

        let startY = 32;
        if (query) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(90, 100, 110);
          doc.text(`* Filtro aplicado na busca: "${query}" (${listToExport.length} resultado(s))`, 14, 32);
          startY = 36;
        }

        // Tabela formatada via autoTable
        if (typeof doc.autoTable === "function") {
          doc.autoTable({
            startY: startY,
            head: [["Nº", "Nome Completo", "Telefone", "E-mail", "Data da Inscrição"]],
            body: rows,
            theme: "striped",
            margin: { left: 10, right: 10, top: 12, bottom: 16 },
            headStyles: {
              fillColor: [6, 21, 37],
              textColor: [247, 223, 148],
              fontStyle: "bold",
              fontSize: 8.5,
              halign: "left",
              cellPadding: 2.8
            },
            styles: {
              font: "helvetica",
              fontSize: 8,
              cellPadding: 2.5,
              textColor: [30, 41, 59],
              lineColor: [226, 232, 240],
              lineWidth: 0.1,
              overflow: "linebreak"
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            columnStyles: {
              0: { cellWidth: 16, halign: "center", fontStyle: "bold", textColor: [6, 21, 37] },
              1: { cellWidth: 54 },
              2: { cellWidth: 32 },
              3: { cellWidth: 54 },
              4: { cellWidth: 34, halign: "center" }
            },
            didDrawPage: function(data) {
              if (data.pageNumber > 1) {
                doc.setFontSize(7.5);
                doc.setTextColor(130, 140, 150);
                doc.setFont("helvetica", "normal");
                doc.text("MLK College Formation • Escola de Moços e Profetas — Relatório de Inscrições", 10, 8);
                doc.setDrawColor(201, 162, 77);
                doc.setLineWidth(0.3);
                doc.line(10, 9.5, 200, 9.5);
              }
            }
          });

          // Rodapé e paginação em todas as páginas
          const totalPages = doc.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(10, 289, 200, 289);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(130, 140, 150);
            doc.text("Documento gerado pelo Painel Administrativo MLK College Formation", 10, 293);
            doc.text(`Página ${i} de ${totalPages}`, 200, 293, { align: "right" });
          }

          doc.save(`inscritos_escola_mocos_profetas_${dateStr}.pdf`);
          return;
        }
      } catch (err) {
        console.warn("Erro ao gerar PDF com jsPDF, utilizando impressão do navegador:", err);
      }
    }

    // Fallback: Impressão direta do navegador configurada para salvar em PDF
    generatePrintPdfFallback(listToExport, rows, dataEmissao, query);
  }

  function generatePrintPdfFallback(listToExport, rows, dataEmissao, query) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups nesta página para extrair o relatório em PDF.");
      return;
    }

    const tableRowsHtml = rows.map((r) => `
      <tr>
        <td style="text-align:center; font-weight:bold; color:#061525;">${escapeHtml(r[0])}</td>
        <td>${escapeHtml(r[1])}</td>
        <td>${escapeHtml(r[2])}</td>
        <td>${escapeHtml(r[3])}</td>
        <td style="text-align:center;">${escapeHtml(r[4])}</td>
      </tr>
    `).join("");

    const filterNote = query
      ? `<p style="font-size:12px; color:#64748b; margin:6px 0 14px 0; font-style:italic;">* Filtro aplicado na busca: "${escapeHtml(query)}" (${listToExport.length} resultados)</p>`
      : "";

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Inscrições - Escola de Moços e Profetas</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 12px; }
    .header { background: #061525; color: #ffffff; padding: 14px 18px; border-bottom: 3px solid #c9a24d; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 16px; margin: 0 0 3px 0; color: #ffffff; font-weight: 700; letter-spacing: 0.5px; }
    .header h2 { font-size: 11px; margin: 0; color: #c9a24d; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
    .header p { margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; }
    .header .meta { text-align: right; font-size: 11px; color: #cbd5e1; }
    .header .meta strong { color: #f7df94; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
    th { background: #061525; color: #f7df94; text-align: left; padding: 7px 8px; font-size: 11px; border: 1px solid #1e293b; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 22px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>MLK College Formation</h2>
      <h1>ESCOLA DE MOÇOS E PROFETAS</h1>
      <p>Relatório Oficial de Inscrições Confirmadas</p>
    </div>
    <div class="meta">
      <div>Emissão: ${dataEmissao}</div>
      <div>Total: <strong>${listToExport.length} inscrito(s)</strong></div>
    </div>
  </div>
  ${filterNote}
  <table>
    <thead>
      <tr>
        <th style="width: 50px; text-align:center;">Nº</th>
        <th>Nome Completo</th>
        <th style="width: 120px;">Telefone</th>
        <th>E-mail</th>
        <th style="width: 130px; text-align:center;">Data da Inscrição</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <div class="footer">
    <span>Documento gerado pelo Painel Administrativo MLK College Formation</span>
    <span>Faculdade de Teologia Martin Luther King</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  // Alternar visibilidade de senha (mostrar/ocultar)
  document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
        btn.setAttribute("aria-label", "Ocultar senha");
      } else {
        input.type = "password";
        btn.textContent = "👁️";
        btn.setAttribute("aria-label", "Mostrar senha");
      }
    });
  });

  // Salvar Nova Senha no Supabase
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const novaSenha = newPassword.value;
      const confirmar = confirmPassword.value;

      if (!novaSenha || novaSenha.length < 8) {
        resetStatus.className = "auth-status error";
        resetStatus.textContent = "A nova senha deve possuir no mínimo 8 caracteres.";
        return;
      }

      if (novaSenha !== confirmar) {
        resetStatus.className = "auth-status error";
        resetStatus.textContent = "As duas senhas não coincidem. Confirme a mesma senha nos dois campos.";
        return;
      }

      savePasswordSubmit.disabled = true;
      savePasswordSubmit.textContent = "Salvando nova senha...";
      resetStatus.className = "auth-status";
      resetStatus.textContent = "";

      try {
        const { error } = await supabaseClient.auth.updateUser({
          password: novaSenha
        });

        if (error) throw error;

        resetStatus.className = "auth-status success";
        resetStatus.textContent = "Senha alterada com sucesso.";

        // Aguarda exibição da mensagem de sucesso, desloga e retorna à tela normal de login
        setTimeout(async () => {
          isRecoveringPassword = false;
          // Remove hash de recuperação da URL para evitar loops
          if (window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
          }
          await supabaseClient.auth.signOut();
          showLogin();
          loginStatus.className = "auth-status success";
          loginStatus.textContent = "Senha alterada com sucesso. Faça login com sua nova senha.";
        }, 1600);

      } catch (err) {
        console.error("Erro ao redefinir senha:", err);
        resetStatus.className = "auth-status error";
        resetStatus.textContent = err.message || "Não foi possível alterar a senha. Tente novamente.";
        savePasswordSubmit.disabled = false;
        savePasswordSubmit.textContent = "Salvar nova senha";
      }
    });
  }

  // Cancelar redefinição e voltar ao login
  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", async () => {
      isRecoveringPassword = false;
      if (window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      await supabaseClient.auth.signOut();
      showLogin();
    });
  }

  // Inicializar
  initAuth();
})();
