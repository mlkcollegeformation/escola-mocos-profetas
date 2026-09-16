// ==========================================================================
// MLK COLLEGE FORMATION — ESCOLA DE MOÇOS E PROFETAS
// FLUXO PÚBLICO DE INSCRIÇÃO & GERAÇÃO DE COMPROVANTE
// ==========================================================================

const form = document.getElementById("registrationForm");
const submitButton = document.getElementById("submitButton");
const formStatus = document.getElementById("formStatus");
const voucherCard = document.getElementById("voucherCard");
const voucherNumber = document.getElementById("voucherNumber");
const voucherName = document.getElementById("voucherName");
const downloadVoucherBtn = document.getElementById("downloadVoucherBtn");

let currentVoucherData = null;

// Normalização de telefone para apenas dígitos
function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

// Mensagens de erro por campo
function setError(field, message = "") {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) el.textContent = message;
}

// Validação front-end amigável
function validateForm() {
  let ok = true;
  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const consent = document.getElementById("consent").checked;

  ["fullName", "phone", "email"].forEach((f) => setError(f));

  if (fullName.length < 3 || !fullName.includes(" ")) {
    setError("fullName", "Informe seu nome completo (ao menos nome e sobrenome).");
    ok = false;
  }

  const phoneDigits = normalizePhone(phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    setError("phone", "Informe um telefone válido com DDD (Ex.: 11 99999-9999).");
    ok = false;
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    setError("email", "Informe um endereço de e-mail válido.");
    ok = false;
  }

  if (!consent) {
    formStatus.className = "form-status error";
    formStatus.textContent = "É necessário autorizar o uso dos dados para concluir a inscrição.";
    ok = false;
  } else {
    formStatus.textContent = "";
    formStatus.className = "form-status";
  }

  return ok;
}

// Máscara dinâmica de telefone brasileiro (DDD + 8 ou 9 dígitos)
const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else {
      v = v.replace(/^(\d*)/, "($1");
    }
    e.target.value = v;
  });
}

// Envio de formulário via RPC segura do Supabase (create_registration)
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cfg = window.APP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
        cfg.SUPABASE_URL.includes("COLE_AQUI") ||
        cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
      formStatus.className = "form-status error";
      formStatus.textContent = "Configuração pendente: conecte o Supabase em config.js antes de publicar.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "PROCESSANDO INSCRIÇÃO...";
    formStatus.textContent = "";

    try {
      const supabaseClient = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const registeredFullName = document.getElementById("fullName").value.trim();
      const registeredPhone = normalizePhone(document.getElementById("phone").value);
      const registeredEmail = document.getElementById("email").value.trim().toLowerCase();
      const registeredConsent = document.getElementById("consent").checked;

      // Chamada RPC segura create_registration (SECURITY DEFINER no Supabase)
      const { data, error } = await supabaseClient.rpc("create_registration", {
        p_full_name: registeredFullName,
        p_phone: registeredPhone,
        p_email: registeredEmail,
        p_consent: registeredConsent
      });

      if (error) {
        if (error.code === "23505" || (error.message && error.message.includes("duplicate"))) {
          throw new Error("Este e-mail ou telefone já foi cadastrado para este evento.");
        }
        throw error;
      }

      const regData = Array.isArray(data) ? data[0] : data;
      const rawNumber = regData?.registration_number;

      if (rawNumber === null || rawNumber === undefined) {
        throw new Error("Não foi possível obter o número oficial de inscrição gerado.");
      }

      const formattedNumber = String(rawNumber).padStart(3, "0");
      const confirmedName = regData?.full_name || registeredFullName;

      // Ocultar formulário e exibir comprovante oficial MLK
      form.classList.add("hidden");
      voucherNumber.textContent = formattedNumber;
      voucherName.textContent = confirmedName;
      voucherCard.classList.remove("hidden");

      currentVoucherData = {
        number: formattedNumber,
        name: confirmedName
      };

      voucherCard.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error("Erro na inscrição:", err);
      formStatus.className = "form-status error";
      formStatus.textContent = err.message || "Não foi possível concluir agora. Tente novamente em instantes.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "REALIZAR INSCRIÇÃO";
    }
  });
}

// Download do comprovante oficial em formato PNG via HTML5 Canvas 2D
if (downloadVoucherBtn) {
  downloadVoucherBtn.addEventListener("click", async () => {
    const number = (currentVoucherData?.number || voucherNumber?.textContent || "001").trim();
    const name = (currentVoucherData?.name || voucherName?.textContent || "Participante").trim();

    const originalText = downloadVoucherBtn.textContent;
    downloadVoucherBtn.disabled = true;
    downloadVoucherBtn.textContent = "⏳ GERANDO COMPROVANTE PNG...";

    try {
      await downloadVoucherAsPng(number, name);
    } catch (err) {
      console.error("Erro ao gerar comprovante:", err);
      alert("Não foi possível gerar o arquivo de download automaticamente. Tente novamente.");
    } finally {
      downloadVoucherBtn.disabled = false;
      downloadVoucherBtn.textContent = originalText;
    }
  });
}

// Função de renderização em Canvas com a nova identidade MLK College Formation
async function downloadVoucherAsPng(number, name) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Alta Resolução: 1080 x 1350 px (proporção 4:5 ideal para celulares e compartilhamento)
  canvas.width = 1080;
  canvas.height = 1350;

  // Fundo Azul-marinho Profundo em Degradê
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#040d17");
  bgGrad.addColorStop(0.35, "#061525");
  bgGrad.addColorStop(0.7, "#071827");
  bgGrad.addColorStop(1, "#03080e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Brilho Radial Dourado no Centro/Superior
  const glowGrad = ctx.createRadialGradient(540, 420, 50, 540, 420, 550);
  glowGrad.addColorStop(0, "rgba(201, 162, 77, 0.16)");
  glowGrad.addColorStop(1, "rgba(201, 162, 77, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Moldura Externa Dupla Dourada
  ctx.save();
  ctx.strokeStyle = "rgba(201, 162, 77, 0.65)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 42, 42, 996, 1266, 26);
  ctx.stroke();

  ctx.strokeStyle = "rgba(201, 162, 77, 0.25)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 54, 54, 972, 1242, 20);
  ctx.stroke();

  // Cantoneiras Ornamentais Douradas
  drawCornerAccents(ctx, 54, 54, 972, 1242, 34);
  ctx.restore();

  // Tentar carregar o brasão oficial MLK
  try {
    const logoImg = await loadImage("assets/logo-mlk.png");
    if (logoImg) {
      const logoW = 105;
      const logoH = 115;
      ctx.drawImage(logoImg, 540 - logoW / 2, 85, logoW, logoH);
    }
  } catch (err) {
    console.warn("Logo MLK não carregou para o Canvas, continuando sem ele:", err);
  }

  ctx.textAlign = "center";

  // Identificação Institucional
  ctx.font = "bold 26px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "#F8F6F0";
  ctx.fillText("MLK COLLEGE FORMATION", 540, 230);

  ctx.font = "600 15px 'Montserrat', sans-serif";
  ctx.fillStyle = "#E4C36A";
  ctx.letterSpacing = "2px";
  ctx.fillText("FACULDADE DE TEOLOGIA MARTIN LUTHER KING", 540, 256);

  // Badge: ✓ INSCRIÇÃO CONFIRMADA
  const badgeY = 285;
  const badgeW = 440;
  const badgeH = 46;
  ctx.save();
  ctx.fillStyle = "rgba(62, 207, 142, 0.12)";
  ctx.strokeStyle = "rgba(62, 207, 142, 0.55)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 540 - badgeW / 2, badgeY, badgeW, badgeH, 23);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 19px 'Montserrat', sans-serif";
  ctx.fillStyle = "#5fe29e";
  ctx.fillText("✓ INSCRIÇÃO CONFIRMADA", 540, badgeY + 30);
  ctx.restore();

  // Rótulo: Nº DE INSCRIÇÃO
  ctx.font = "700 18px 'Montserrat', sans-serif";
  ctx.fillStyle = "#C9A24D";
  ctx.fillText("Nº DE INSCRIÇÃO", 540, 385);

  // Número Oficial em Destaque Dourado Metálico
  ctx.font = "bold 96px 'Cormorant Garamond', Georgia, serif";
  const numGrad = ctx.createLinearGradient(0, 410, 0, 505);
  numGrad.addColorStop(0, "#FFFFFF");
  numGrad.addColorStop(0.5, "#F7DF94");
  numGrad.addColorStop(1, "#9A752B");
  ctx.fillStyle = numGrad;
  ctx.fillText(number, 540, 485);

  // Linha Divisória Dourada
  const divGrad = ctx.createLinearGradient(160, 0, 920, 0);
  divGrad.addColorStop(0, "rgba(201, 162, 77, 0)");
  divGrad.addColorStop(0.5, "rgba(201, 162, 77, 0.8)");
  divGrad.addColorStop(1, "rgba(201, 162, 77, 0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 525);
  ctx.lineTo(920, 525);
  ctx.stroke();

  // Saudação com Nome Real
  ctx.font = "bold 30px 'Montserrat', sans-serif";
  ctx.fillStyle = "#F8F6F0";
  const displayName = name.length > 32 ? name.slice(0, 30) + "..." : name;
  ctx.fillText(`${displayName}, sua inscrição foi realizada com sucesso!`, 540, 580);

  // Card do Evento
  const cardX = 110;
  const cardY = 625;
  const cardW = 860;
  const cardH = 430;

  ctx.save();
  ctx.fillStyle = "rgba(7, 24, 39, 0.75)";
  ctx.strokeStyle = "rgba(201, 162, 77, 0.35)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.stroke();

  // Título do Evento
  ctx.font = "bold 40px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "#F7DF94";
  ctx.fillText("ESCOLA DE MOÇOS E PROFETAS", 540, cardY + 70);

  ctx.font = "500 20px 'Montserrat', sans-serif";
  ctx.fillStyle = "#C8D3DE";
  ctx.fillText("Formação dos 5 Ministérios — Coluna Profética", 540, cardY + 110);

  // Linha Interna Sutil
  ctx.strokeStyle = "rgba(201, 162, 77, 0.22)";
  ctx.beginPath();
  ctx.moveTo(cardX + 70, cardY + 145);
  ctx.lineTo(cardX + cardW - 70, cardY + 145);
  ctx.stroke();

  // Datas e Local
  ctx.font = "600 26px 'Montserrat', sans-serif";
  ctx.fillStyle = "#F8F6F0";
  ctx.fillText("📅 07/11 — das 16h às 22h", 540, cardY + 205);
  ctx.fillText("📅 08/11 — das 08h às 11h", 540, cardY + 265);
  ctx.fillText("📍 Vila Maria Alta — São Paulo / SP", 540, cardY + 325);

  ctx.font = "400 21px 'Montserrat', sans-serif";
  ctx.fillStyle = "#8E9EAF";
  ctx.fillText("Av. Alberto Byington, 2354", 540, cardY + 368);
  ctx.restore();

  // Tag: SUA VAGA ESTÁ CONFIRMADA
  const tagY = 1085;
  const tagW = 860;
  const tagH = 72;
  ctx.save();
  ctx.fillStyle = "rgba(201, 162, 77, 0.12)";
  ctx.strokeStyle = "rgba(201, 162, 77, 0.4)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 540 - tagW / 2, tagY, tagW, tagH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 26px 'Montserrat', sans-serif";
  ctx.fillStyle = "#E4C36A";
  ctx.fillText("SUA VAGA ESTÁ CONFIRMADA", 540, tagY + 46);
  ctx.restore();

  // Rodapé Institucional
  ctx.font = "400 17px 'Montserrat', sans-serif";
  ctx.fillStyle = "#8E9EAF";
  ctx.fillText("Apresente este comprovante oficial no credenciamento do evento.", 540, 1205);

  ctx.font = "italic 19px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "#C9A24D";
  ctx.fillText("“Instruir hoje, transformar o amanhã.”", 540, 1240);

  // Baixar imagem gerada
  return new Promise((resolve) => {
    const filename = `comprovante-mlk-${number}.png`;
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          triggerDataUrlDownload(canvas, filename);
          resolve();
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.style.display = "none";
        downloadLink.download = filename;
        downloadLink.href = blobUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          if (downloadLink.parentNode) {
            downloadLink.parentNode.removeChild(downloadLink);
          }
          URL.revokeObjectURL(blobUrl);
        }, 2000);
        resolve();
      }, "image/png");
    } else {
      triggerDataUrlDownload(canvas, filename);
      resolve();
    }
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function triggerDataUrlDownload(canvas, filename) {
  const dataUrl = canvas.toDataURL("image/png");
  const downloadLink = document.createElement("a");
  downloadLink.style.display = "none";
  downloadLink.download = filename;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  setTimeout(() => {
    if (downloadLink.parentNode) {
      downloadLink.parentNode.removeChild(downloadLink);
    }
  }, 2000);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCornerAccents(ctx, x, y, width, height, len) {
  ctx.strokeStyle = "rgba(201, 162, 77, 0.75)";
  ctx.lineWidth = 2.5;

  // Canto superior esquerdo
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();

  // Canto superior direito
  ctx.beginPath();
  ctx.moveTo(x + width - len, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + len);
  ctx.stroke();

  // Canto inferior esquerdo
  ctx.beginPath();
  ctx.moveTo(x, y + height - len);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + len, y + height);
  ctx.stroke();

  // Canto inferior direito
  ctx.beginPath();
  ctx.moveTo(x + width - len, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - len);
  ctx.stroke();
}

// ==========================================================================
// CONTROLE DE VÍDEO & SOM (HEADLINE BACKGROUND)
// ==========================================================================
const heroVideo = document.getElementById("heroVideo");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const soundText = document.getElementById("soundText");

if (heroVideo && soundToggle) {
  soundToggle.addEventListener("click", () => {
    if (heroVideo.muted) {
      heroVideo.muted = false;
      heroVideo.play().catch(() => {});
      if (soundIcon) soundIcon.textContent = "🔇";
      if (soundText) soundText.textContent = "Silenciar";
      soundToggle.setAttribute("aria-label", "Silenciar vídeo");
    } else {
      heroVideo.muted = true;
      if (soundIcon) soundIcon.textContent = "🔊";
      if (soundText) soundText.textContent = "Ativar som";
      soundToggle.setAttribute("aria-label", "Ativar som do vídeo");
    }
  });
}

// ==========================================================================
// NAVEGAÇÃO MOBILE (MENU DRAWER)
// ==========================================================================
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileDrawer = document.getElementById("mobileDrawer");
const drawerCloseBtn = document.getElementById("drawerCloseBtn");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const mobileNavLinks = document.querySelectorAll(".mobile-nav-link, .mobile-drawer__cta");

function openMobileMenu() {
  if (mobileDrawer) {
    mobileDrawer.classList.add("open");
    mobileDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeMobileMenu() {
  if (mobileDrawer) {
    mobileDrawer.classList.remove("open");
    mobileDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener("click", openMobileMenu);
}
if (drawerCloseBtn) {
  drawerCloseBtn.addEventListener("click", closeMobileMenu);
}
if (drawerBackdrop) {
  drawerBackdrop.addEventListener("click", closeMobileMenu);
}
mobileNavLinks.forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});
