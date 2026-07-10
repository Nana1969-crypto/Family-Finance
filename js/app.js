/* ============================================================
   FAMILY FINANCE — SPA (protótipo funcional)
   Persistência: localStorage. Em produção: PostgreSQL + Supabase Storage.
   ============================================================ */

(() => {
  "use strict";

  const STORAGE_KEY = "family-finance-v1";
  const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB por arquivo (limite do protótipo)

  const CATEGORIES = [
    "Moradia", "Alimentação", "Transporte", "Educação", "Saúde",
    "Lazer", "Assinaturas", "Seguros", "Impostos", "Salário", "Outros",
  ];

  const DOC_CATEGORIES = [
    "Identidade", "Contratos", "Seguros & Apólices", "Imóveis",
    "Veículos", "Impostos", "Saúde", "Comprovantes", "Outros",
  ];

  const INVOICE_ORIGINS = [
    "Cartão de crédito", "Energia", "Água", "Internet", "Telefone",
    "Escola", "Condomínio", "Plano de saúde", "Outros",
  ];

  const OWNER_LABEL = { pai: "👨 Pai", mae: "👩 Mãe", familia: "👨‍👩‍👧 Família", filha: "👧 Filha" };

  const TAGS = {
    vencida:    { label: "Vencida",       cls: "tag-vencida",    color: "var(--tag-red)" },
    hoje:       { label: "Vence hoje",    cls: "tag-hoje",       color: "var(--tag-orange)" },
    semana:     { label: "Vence em 7 dias", cls: "tag-semana",   color: "var(--tag-yellow)" },
    paga:       { label: "Paga",          cls: "tag-paga",       color: "var(--tag-green)" },
    recorrente: { label: "Recorrente",    cls: "tag-recorrente", color: "var(--tag-blue)" },
    meta:       { label: "Meta",          cls: "tag-meta",       color: "var(--tag-purple)" },
  };

  const DREAM_CATS = {
    familia: { label: "🏠 Família", grad: "linear-gradient(135deg, rgba(124,58,237,.35), rgba(34,197,94,.25))" },
    pai:     { label: "👨 Pai",     grad: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(63,140,243,.25))" },
    mae:     { label: "👩 Mãe",     grad: "linear-gradient(135deg, rgba(224,85,158,.35), rgba(139,92,246,.25))" },
    filha:   { label: "👧 Filha",   grad: "linear-gradient(135deg, rgba(34,197,94,.35), rgba(250,204,21,.2))" },
  };

  const USERS = {
    pai:   { name: "Eduardo", role: "Corretor de seguros", type: "admin", avatar: "👨", cls: "pai" },
    mae:   { name: "Adriana", role: "Empresária de marketing", type: "admin", avatar: "👩", cls: "mae" },
    filha: { name: "Sofia", role: "16 anos · educação financeira", type: "dep", avatar: "👧", cls: "filha" },
  };

  /* ---------------- utilidades ---------------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (v) => BRL.format(v || 0);

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const isoAddDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const parseISO = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const daysUntil = (iso) => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((parseISO(iso) - base) / 86400000);
  };

  const fmtDate = (iso) => parseISO(iso).toLocaleDateString("pt-BR");
  const monthKey = (iso) => iso.slice(0, 7);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtBytes = (b) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* ---------------- estado + seed ---------------- */

  let state = null;

  function seedState() {
    const txs = [];
    const now = new Date();

    // Histórico dos últimos 6 meses (tudo pago) para gráficos e comparativos
    for (let off = 5; off >= 1; off--) {
      const d = new Date(now.getFullYear(), now.getMonth() - off, 8);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-08`;
      const v = 1 + ((off * 7) % 5 - 2) * 0.04; // variação determinística ±8%
      txs.push(
        { id: uid(), type: "receita", desc: "Comissões de seguros", valor: Math.round(8600 * v), categoria: "Salário", owner: "pai", vencimento: iso, pago: true, recorrente: true },
        { id: uid(), type: "receita", desc: "Receita da agência de marketing", valor: Math.round(9900 * (2 - v)), categoria: "Salário", owner: "mae", vencimento: iso, pago: true, recorrente: true },
        { id: uid(), type: "despesa", desc: "Financiamento da casa", valor: 3200, categoria: "Moradia", owner: "familia", vencimento: iso, pago: true, recorrente: true },
        { id: uid(), type: "despesa", desc: "Supermercado", valor: Math.round(1750 * v), categoria: "Alimentação", owner: "familia", vencimento: iso, pago: true },
        { id: uid(), type: "despesa", desc: "Escola da Sofia", valor: 1650, categoria: "Educação", owner: "familia", vencimento: iso, pago: true, recorrente: true },
        { id: uid(), type: "despesa", desc: "Plano de saúde", valor: 980, categoria: "Saúde", owner: "familia", vencimento: iso, pago: true, recorrente: true },
        { id: uid(), type: "despesa", desc: "Combustível e transporte", valor: Math.round(880 * (2 - v)), categoria: "Transporte", owner: "familia", vencimento: iso, pago: true },
        { id: uid(), type: "despesa", desc: "Lazer em família", valor: Math.round(620 * v), categoria: "Lazer", owner: "familia", vencimento: iso, pago: true },
        { id: uid(), type: "despesa", desc: "Streaming e assinaturas", valor: 190, categoria: "Assinaturas", owner: "familia", vencimento: iso, pago: true, recorrente: true },
      );
    }

    // Mês atual — mistura de pagos e pendentes para exercitar as tags
    const thisMonth8 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-05`;
    txs.push(
      { id: uid(), type: "receita", desc: "Comissões de seguros", valor: 8900, categoria: "Salário", owner: "pai", vencimento: thisMonth8, pago: true, recorrente: true },
      { id: uid(), type: "receita", desc: "Receita da agência de marketing", valor: 10200, categoria: "Salário", owner: "mae", vencimento: thisMonth8, pago: true, recorrente: true },
      { id: uid(), type: "despesa", desc: "Financiamento da casa", valor: 3200, categoria: "Moradia", owner: "familia", vencimento: thisMonth8, pago: true, recorrente: true },
      { id: uid(), type: "despesa", desc: "Escola da Sofia", valor: 1650, categoria: "Educação", owner: "familia", vencimento: thisMonth8, pago: true, recorrente: true },
      { id: uid(), type: "despesa", desc: "Supermercado", valor: 1920, categoria: "Alimentação", owner: "familia", vencimento: isoAddDays(-6), pago: true },
      { id: uid(), type: "despesa", desc: "IPVA — parcela 4/6", valor: 480, categoria: "Impostos", owner: "pai", vencimento: isoAddDays(-3), pago: false },
      { id: uid(), type: "despesa", desc: "Internet fibra", valor: 129.9, categoria: "Assinaturas", owner: "familia", vencimento: isoAddDays(0), pago: false, recorrente: true },
      { id: uid(), type: "despesa", desc: "Conta de energia", valor: 342.5, categoria: "Moradia", owner: "familia", vencimento: isoAddDays(3), pago: false },
      { id: uid(), type: "despesa", desc: "Streaming e assinaturas", valor: 190, categoria: "Assinaturas", owner: "familia", vencimento: isoAddDays(5), pago: false, recorrente: true },
      { id: uid(), type: "despesa", desc: "Fatura cartão Violeta Black", valor: 2680, categoria: "Outros", owner: "familia", vencimento: isoAddDays(12), pago: false },
      { id: uid(), type: "despesa", desc: "Seguro do carro", valor: 310, categoria: "Seguros", owner: "pai", vencimento: isoAddDays(9), pago: false, recorrente: true },
      { id: uid(), type: "despesa", desc: "Aporte — Viagem Internacional", valor: 800, categoria: "Outros", owner: "familia", vencimento: isoAddDays(15), pago: false, metaLink: true },
    );

    return {
      familyName: "Família Oliveira",
      theme: "dark",
      currentUser: null,
      transactions: txs,
      accounts: [
        { id: uid(), banco: "Banco Violeta", tipo: "Conta corrente", owner: "pai", saldo: 6420.8 },
        { id: uid(), banco: "Banco Esmeralda", tipo: "Conta corrente", owner: "mae", saldo: 8130.45 },
        { id: uid(), banco: "Banco Violeta", tipo: "Conta conjunta", owner: "familia", saldo: 4980.0 },
      ],
      cards: [
        { id: uid(), nome: "Violeta Black", bandeira: "Mastercard", owner: "pai", limite: 15000, usado: 2680, fechamento: 28, vencimento: 10 },
        { id: uid(), nome: "Esmeralda Gold", bandeira: "Visa", owner: "mae", limite: 12000, usado: 1840, fechamento: 25, vencimento: 5 },
      ],
      investments: [
        { id: uid(), nome: "Tesouro Selic 2029", tipo: "Renda fixa", owner: "familia", valor: 38500 },
        { id: uid(), nome: "CDB Banco Esmeralda", tipo: "Renda fixa", owner: "mae", valor: 21200 },
        { id: uid(), nome: "Fundo de ações", tipo: "Renda variável", owner: "pai", valor: 14700 },
        { id: uid(), nome: "Reserva de emergência", tipo: "Liquidez diária", owner: "familia", valor: 26800 },
      ],
      dreams: [
        { id: uid(), titulo: "Viagem Internacional", descricao: "Europa em família nas férias de julho", categoria: "familia", emoji: "✈️", valorMeta: 28000, valorEconomizado: 16800, prazo: isoAddDays(330), prioridade: "alta", createdBy: "mae" },
        { id: uid(), titulo: "Casa Nova", descricao: "Entrada para a casa com quintal", categoria: "familia", emoji: "🏡", valorMeta: 120000, valorEconomizado: 41500, prazo: isoAddDays(900), prioridade: "media", createdBy: "pai" },
        { id: uid(), titulo: "Carro do Pai", descricao: "Trocar o carro em 2027", categoria: "pai", emoji: "🚗", valorMeta: 45000, valorEconomizado: 12300, prazo: isoAddDays(540), prioridade: "baixa", createdBy: "pai" },
        { id: uid(), titulo: "Intercâmbio no Canadá", descricao: "Curso de inglês de 6 meses", categoria: "filha", emoji: "🍁", valorMeta: 35000, valorEconomizado: 6200, prazo: isoAddDays(700), prioridade: "alta", createdBy: "filha" },
        { id: uid(), titulo: "Notebook novo", descricao: "Para os estudos e projetos", categoria: "filha", emoji: "💻", valorMeta: 4500, valorEconomizado: 1850, prazo: isoAddDays(180), prioridade: "media", createdBy: "filha" },
        { id: uid(), titulo: "Reserva Financeira", descricao: "12 meses de despesas guardados", categoria: "familia", emoji: "🛡️", valorMeta: 90000, valorEconomizado: 26800, prazo: isoAddDays(720), prioridade: "alta", createdBy: "mae" },
      ],
      documents: [
        { id: uid(), nome: "Apólice — Seguro Residencial 2026", categoria: "Seguros & Apólices", descricao: "Vigência até dez/2026", tipoArquivo: "pdf", tamanho: 0, dataUrl: null, demo: true, enviadoPor: "pai", data: isoAddDays(-40) },
        { id: uid(), nome: "Contrato de financiamento — Casa", categoria: "Contratos", descricao: "Banco Violeta · 240 parcelas", tipoArquivo: "pdf", tamanho: 0, dataUrl: null, demo: true, enviadoPor: "mae", data: isoAddDays(-120) },
        { id: uid(), nome: "CRLV — Carro da família", categoria: "Veículos", descricao: "Documento 2026 quitado", tipoArquivo: "pdf", tamanho: 0, dataUrl: null, demo: true, enviadoPor: "pai", data: isoAddDays(-15) },
      ],
      invoices: [
        { id: uid(), nome: "Fatura Violeta Black — junho", origem: "Cartão de crédito", valor: 2410.33, competencia: monthKey(isoAddDays(-30)), vencimento: isoAddDays(-20), status: "paga", tipoArquivo: "pdf", tamanho: 0, dataUrl: null, demo: true, enviadoPor: "pai", data: isoAddDays(-22) },
        { id: uid(), nome: "Energia elétrica — mês atual", origem: "Energia", valor: 342.5, competencia: monthKey(todayISO()), vencimento: isoAddDays(3), status: "pendente", tipoArquivo: "pdf", tamanho: 0, dataUrl: null, demo: true, enviadoPor: "mae", data: isoAddDays(-2) },
      ],
      piggy: { saldo: 185, historico: [] },
      personalGoals: [
        { id: uid(), titulo: "Fone de ouvido", valorMeta: 350, valorAtual: 120 },
        { id: uid(), titulo: "Presente do dia das mães", valorMeta: 150, valorAtual: 90 },
      ],
      missions: [
        { id: uid(), icone: "💰", titulo: "Guardar R$ 20 no cofrinho", recompensa: "+ medalha Poupadora", done: true },
        { id: uid(), icone: "📅", titulo: "Economizar durante uma semana inteira", recompensa: "+ 50 pontos", done: false },
        { id: uid(), icone: "🎯", titulo: "Poupar 10% da mesada", recompensa: "+ 30 pontos", done: false },
        { id: uid(), icone: "🎓", titulo: "Concluir a aula sobre investimentos", recompensa: "+ medalha Investidora Júnior", done: false },
      ],
      badges: [
        { id: "b1", icone: "🥇", nome: "Primeira economia", unlocked: true },
        { id: "b2", icone: "🐷", nome: "Poupadora bronze", unlocked: true },
        { id: "b3", icone: "🎯", nome: "Meta cumprida", unlocked: false },
        { id: "b4", icone: "📈", nome: "Investidora júnior", unlocked: false },
        { id: "b5", icone: "🧠", nome: "Mestre do quiz", unlocked: false },
      ],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { state = JSON.parse(raw); return; }
    } catch (e) { /* estado corrompido — recomeça */ }
    state = seedState();
    save();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast("⚠️ Armazenamento cheio — remova arquivos grandes para continuar salvando.");
    }
  }

  /* ---------------- tags de status ---------------- */

  function txTag(tx) {
    if (tx.pago) return "paga";
    const d = daysUntil(tx.vencimento);
    if (d < 0) return "vencida";
    if (d === 0) return "hoje";
    if (d <= 7) return "semana";
    return null;
  }

  function tagHTML(key) {
    const t = TAGS[key];
    if (!t) return "";
    return `<span class="tag ${t.cls}"><span class="dot"></span>${t.label}</span>`;
  }

  function txTagsHTML(tx) {
    let html = "";
    const primary = txTag(tx);
    if (primary) html += tagHTML(primary);
    if (tx.recorrente) html += " " + tagHTML("recorrente");
    if (tx.metaLink) html += " " + tagHTML("meta");
    return html || "—";
  }

  /* ---------------- navegação / perfis ---------------- */

  const NAV = {
    admin: [
      { section: "Visão geral" },
      { page: "dashboard", ico: "📊", label: "Dashboard" },
      { page: "lancamentos", ico: "💸", label: "Lançamentos" },
      { page: "contas", ico: "🏦", label: "Contas & Cartões" },
      { section: "Arquivos da família" },
      { page: "faturas", ico: "🧾", label: "Faturas" },
      { page: "documentos", ico: "📂", label: "Documentos" },
      { section: "Planejamento" },
      { page: "calendario", ico: "📅", label: "Calendário" },
      { page: "visionboard", ico: "🌈", label: "Vision Board" },
    ],
    dep: [
      { section: "Meu espaço" },
      { page: "painel-filha", ico: "🌟", label: "Meu painel" },
      { page: "visionboard", ico: "🌈", label: "Vision Board" },
      { page: "educacao", ico: "🎓", label: "Educação financeira" },
    ],
  };

  let currentPage = null;

  function isAdmin() { return state.currentUser && USERS[state.currentUser].type === "admin"; }

  function renderLogin() {
    $("#profileList").innerHTML = Object.entries(USERS).map(([key, u]) => `
      <button class="profile-btn" data-login="${key}">
        <span class="profile-avatar ${u.cls}">${u.avatar}</span>
        <span><strong>${u.name}</strong><span>${u.role}</span></span>
        <span class="profile-role ${u.type}">${u.type === "admin" ? "Admin" : "Dependente"}</span>
      </button>
    `).join("");
  }

  function login(userKey) {
    state.currentUser = userKey;
    save();
    $("#loginScreen").style.display = "none";
    $("#appShell").classList.add("active");
    renderShell();
    goto(isAdmin() ? "dashboard" : "painel-filha");
  }

  function logout() {
    state.currentUser = null;
    save();
    $("#appShell").classList.remove("active");
    $("#loginScreen").style.display = "flex";
  }

  function renderShell() {
    const u = USERS[state.currentUser];
    $("#userChip").innerHTML = `
      <span class="profile-avatar ${u.cls}">${u.avatar}</span>
      <span><strong>${u.name}</strong><span>${u.type === "admin" ? "Administrador(a)" : "Dependente"}</span></span>`;

    $("#navContainer").innerHTML = NAV[u.type].map((item) =>
      item.section
        ? `<div class="nav-section">${item.section}</div>`
        : `<button class="nav-item" data-page="${item.page}"><span class="ico">${item.ico}</span>${item.label}</button>`
    ).join("");

    $$("#navContainer .nav-item").forEach((btn) =>
      btn.addEventListener("click", () => { goto(btn.dataset.page); $("#sidebar").classList.remove("open"); })
    );
  }

  function goto(page) {
    // dependente nunca acessa páginas financeiras
    if (!isAdmin() && !NAV.dep.some((i) => i.page === page)) page = "painel-filha";
    currentPage = page;
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
    $$("#navContainer .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    const active = $(`#navContainer .nav-item[data-page="${page}"]`);
    $("#mobileTitle").textContent = active ? active.textContent.trim() : "Family Finance";
    renderPage(page);
    window.scrollTo({ top: 0 });
  }

  function renderPage(page) {
    const renders = {
      dashboard: renderDashboard,
      lancamentos: renderTransactions,
      contas: renderAccounts,
      faturas: renderInvoices,
      documentos: renderDocuments,
      calendario: renderCalendar,
      visionboard: renderVisionBoard,
      "painel-filha": renderFilha,
      educacao: renderEducacao,
    };
    (renders[page] || (() => {}))();
  }

  /* ---------------- dashboard ---------------- */

  function monthTotals(offset = 0) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1 + offset).padStart(2, "0")}`;
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let receitas = 0, despesas = 0;
    for (const tx of state.transactions) {
      if (monthKey(tx.vencimento) !== k) continue;
      if (tx.type === "receita") receitas += tx.valor;
      else despesas += tx.valor;
    }
    return { receitas, despesas, key: k, date: d };
  }

  function renderDashboard() {
    const u = USERS[state.currentUser];
    const h = new Date().getHours();
    const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    $("#dashGreeting").textContent = `${saud}, ${u.name} 👋`;

    const cur = monthTotals(0);
    const saldoContas = state.accounts.reduce((s, a) => s + a.saldo, 0);
    const investTotal = state.investments.reduce((s, i) => s + i.valor, 0);
    const patrimonio = saldoContas + investTotal;
    const economia = cur.receitas - cur.despesas;

    $("#dashStats").innerHTML = `
      <div class="stat-card hero">
        <div class="label">🏛️ Patrimônio familiar</div>
        <div class="value">${fmt(patrimonio)}</div>
        <div class="delta">contas + investimentos</div>
      </div>
      <div class="stat-card">
        <div class="label">Receitas do mês</div>
        <div class="value green">${fmt(cur.receitas)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Despesas do mês</div>
        <div class="value violet">${fmt(cur.despesas)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Saldo disponível</div>
        <div class="value">${fmt(saldoContas)}</div>
        <div class="delta">em ${state.accounts.length} contas</div>
      </div>
      <div class="stat-card">
        <div class="label">Economia do mês</div>
        <div class="value ${economia >= 0 ? "green" : "red"}">${fmt(economia)}</div>
        <div class="delta">${cur.receitas ? Math.round((economia / cur.receitas) * 100) : 0}% das receitas</div>
      </div>
      <div class="stat-card">
        <div class="label">Investimentos</div>
        <div class="value">${fmt(investTotal)}</div>
      </div>`;

    renderCashflowChart();
    renderCategoryDonut();
    renderDueSoon();
    renderInsights();
    renderDashGoals();
  }

  function renderCashflowChart() {
    const months = [];
    for (let off = -5; off <= 0; off++) {
      const t = monthTotals(off);
      months.push({ label: t.date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), ...t });
    }
    const max = Math.max(...months.map((m) => Math.max(m.receitas, m.despesas)), 1);

    const W = 560, H = 240, padL = 44, padB = 28, padT = 12;
    const plotW = W - padL - 10, plotH = H - padT - padB;
    const groupW = plotW / months.length;
    const barW = Math.min(26, groupW / 2 - 6);

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = padT + plotH - f * plotH;
      const val = Math.round((max * f) / 1000);
      return `<line x1="${padL}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="var(--grid-line)" stroke-width="1"/>
              <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text-3)">${val}k</text>`;
    }).join("");

    let bars = "";
    months.forEach((m, i) => {
      const cx = padL + i * groupW + groupW / 2;
      const hR = (m.receitas / max) * plotH;
      const hD = (m.despesas / max) * plotH;
      bars += `
        <rect class="cf-bar" data-i="${i}" data-s="receitas" x="${cx - barW - 1}" y="${padT + plotH - hR}" width="${barW}" height="${hR}" rx="4" fill="var(--series-2)"/>
        <rect class="cf-bar" data-i="${i}" data-s="despesas" x="${cx + 1}" y="${padT + plotH - hD}" width="${barW}" height="${hD}" rx="4" fill="var(--series-1)"/>
        <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--text-3)">${m.label}</text>`;
    });

    $("#cashflowChart").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fluxo de caixa dos últimos 6 meses">
        ${gridLines}
        <line x1="${padL}" y1="${padT + plotH}" x2="${W - 10}" y2="${padT + plotH}" stroke="var(--axis-line)" stroke-width="1"/>
        ${bars}
      </svg>
      <div class="chart-legend">
        <span class="key"><span class="swatch" style="background:var(--series-2)"></span>Receitas</span>
        <span class="key"><span class="swatch" style="background:var(--series-1)"></span>Despesas</span>
      </div>`;

    const wrap = $("#cashflowChart");
    $$(".cf-bar", wrap).forEach((bar) => {
      bar.addEventListener("mousemove", (e) => {
        const m = months[+bar.dataset.i];
        showTooltip(e, `<div class="tt-title">${m.label.toUpperCase()} / ${m.date.getFullYear()}</div>
          <div class="tt-row"><span class="swatch" style="width:8px;height:8px;border-radius:2px;background:var(--series-2)"></span>Receitas: <strong>${fmt(m.receitas)}</strong></div>
          <div class="tt-row"><span class="swatch" style="width:8px;height:8px;border-radius:2px;background:var(--series-1)"></span>Despesas: <strong>${fmt(m.despesas)}</strong></div>`);
      });
      bar.addEventListener("mouseleave", hideTooltip);
    });
  }

  function renderCategoryDonut() {
    const k = monthKey(todayISO());
    const byCat = {};
    for (const tx of state.transactions) {
      if (tx.type !== "despesa" || monthKey(tx.vencimento) !== k) continue;
      byCat[tx.categoria] = (byCat[tx.categoria] || 0) + tx.valor;
    }
    let entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (entries.length > 5) {
      const top = entries.slice(0, 4);
      const rest = entries.slice(4).reduce((s, e) => s + e[1], 0);
      entries = [...top, ["Demais categorias", rest]];
    }
    const total = entries.reduce((s, e) => s + e[1], 0) || 1;
    const colors = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

    const R = 62, C = 2 * Math.PI * R;
    let acc = 0;
    const segs = entries.map(([cat, val], i) => {
      const frac = val / total;
      const seg = `<circle r="${R}" cx="80" cy="80" fill="none" class="donut-seg" data-i="${i}"
        stroke="${colors[i % colors.length]}" stroke-width="20"
        stroke-dasharray="${Math.max(frac * C - 2, 0.5)} ${C}" stroke-dashoffset="${-acc * C}"
        transform="rotate(-90 80 80)"/>`;
      acc += frac;
      return seg;
    }).join("");

    $("#categoryDonut").innerHTML = `
      <div class="donut-layout chart-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Despesas por categoria">
          ${segs}
          <text x="80" y="76" text-anchor="middle" font-size="11" fill="var(--text-3)">Total</text>
          <text x="80" y="94" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-1)">${fmt(total).replace(",00", "")}</text>
        </svg>
        <div class="donut-list">
          ${entries.map(([cat, val], i) => `
            <div class="donut-item"><span class="swatch" style="background:${colors[i % colors.length]}"></span>${esc(cat)}<span class="val">${fmt(val)}</span></div>
          `).join("")}
        </div>
      </div>`;

    $$("#categoryDonut .donut-seg").forEach((seg) => {
      seg.addEventListener("mousemove", (e) => {
        const [cat, val] = entries[+seg.dataset.i];
        showTooltip(e, `<div class="tt-title">${esc(cat)}</div><div class="tt-row">${fmt(val)} · ${Math.round((val / total) * 100)}%</div>`);
      });
      seg.addEventListener("mouseleave", hideTooltip);
    });
  }

  function renderDueSoon() {
    const pend = state.transactions
      .filter((t) => t.type === "despesa" && !t.pago)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 6);

    $("#dueSoonList").innerHTML = pend.length ? `
      <table class="data">
        <thead><tr><th>Descrição</th><th>Vencimento</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${pend.map((t) => `
          <tr>
            <td>${esc(t.desc)}<br><span class="owner-chip">${OWNER_LABEL[t.owner]}</span></td>
            <td>${fmtDate(t.vencimento)}</td>
            <td>${tagHTML(txTag(t)) || `<span class="owner-chip">📌 Agendada</span>`}</td>
            <td style="text-align:right" class="money">${fmt(t.valor)}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : `<div class="empty-state"><span class="big">🎉</span>Nenhuma conta pendente!</div>`;
  }

  function renderInsights() {
    const cur = monthTotals(0), prev = monthTotals(-1);
    const insights = [];

    // Alimentação vs mês anterior
    const catMonth = (cat, off) => {
      const d = new Date(); d.setMonth(d.getMonth() + off);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return state.transactions.filter((t) => t.type === "despesa" && t.categoria === cat && monthKey(t.vencimento) === k)
        .reduce((s, t) => s + t.valor, 0);
    };
    const alimNow = catMonth("Alimentação", 0), alimPrev = catMonth("Alimentação", -1);
    if (alimPrev > 0) {
      const diff = Math.round(((alimNow - alimPrev) / alimPrev) * 100);
      insights.push({ ico: diff > 0 ? "🍽️" : "✅", text: diff > 0
        ? `Você gastou <strong>${diff}% a mais</strong> com alimentação do que no mês passado.`
        : `Alimentação está <strong>${Math.abs(diff)}% menor</strong> que no mês passado. Ótimo controle!` });
    }

    // Reserva de emergência
    const reserva = state.investments.filter((i) => /reserva/i.test(i.nome)).reduce((s, i) => s + i.valor, 0);
    const mediaDespesas = (prev.despesas + cur.despesas) / 2 || 1;
    const meses = (reserva / mediaDespesas).toFixed(1);
    insights.push({ ico: meses < 6 ? "🛡️" : "💪", text: `Sua reserva de emergência cobre <strong>${String(meses).replace(".", ",")} meses</strong> de despesas${meses < 6 ? " — o ideal são 6 a 12 meses" : ""}.` });

    // Projeção da meta principal
    const mainDream = [...state.dreams].filter((d) => d.categoria === "familia").sort((a, b) => (a.prioridade === "alta" ? -1 : 1))[0];
    const economiaMedia = Math.max((prev.receitas - prev.despesas + cur.receitas - cur.despesas) / 2, 1);
    if (mainDream) {
      const falta = mainDream.valorMeta - mainDream.valorEconomizado;
      const mesesMeta = Math.ceil(falta / economiaMedia);
      insights.push({ ico: "🎯", text: `No ritmo atual de economia, <strong>${esc(mainDream.titulo)}</strong> pode ser alcançada em <strong>~${mesesMeta} meses</strong>.` });
    }

    // Assinaturas
    const assin = catMonth("Assinaturas", 0);
    if (assin > 0) insights.push({ ico: "📺", text: `Assinaturas somam <strong>${fmt(assin)}/mês</strong> (${fmt(assin * 12)}/ano). Vale revisar as pouco usadas.` });

    $("#aiInsights").innerHTML = insights.map((i) => `
      <div class="insight-item"><span class="i-ico">${i.ico}</span><span>${i.text}</span></div>`).join("");
  }

  function renderDashGoals() {
    const top = [...state.dreams]
      .sort((a, b) => (b.valorEconomizado / b.valorMeta) - (a.valorEconomizado / a.valorMeta))
      .slice(0, 3);
    $("#dashGoals").innerHTML = top.map(dreamCardHTML).join("");
    bindDreamCardActions($("#dashGoals"));
  }

  /* ---------------- lançamentos ---------------- */

  let txFilter = "todos";

  function renderTransactions() {
    const filters = [["todos", "Todos", "var(--text-3)"], ...Object.entries(TAGS).map(([k, t]) => [k, t.label, t.color])];
    $("#tagFilters").innerHTML = filters.map(([key, label, color]) => `
      <button class="filter-chip ${txFilter === key ? "active" : ""}" data-filter="${key}">
        <span class="dot" style="background:${color}"></span>${label}
      </button>`).join("");
    $$("#tagFilters .filter-chip").forEach((c) =>
      c.addEventListener("click", () => { txFilter = c.dataset.filter; renderTransactions(); }));

    let txs = [...state.transactions].sort((a, b) => b.vencimento.localeCompare(a.vencimento));
    if (txFilter !== "todos") {
      txs = txs.filter((t) => {
        if (txFilter === "recorrente") return t.recorrente;
        if (txFilter === "meta") return t.metaLink;
        return txTag(t) === txFilter;
      });
    }

    $("#txTable").innerHTML = txs.length ? `
      <table class="data">
        <thead><tr><th>Descrição</th><th>Proprietário</th><th>Categoria</th><th>Data</th><th>Status</th><th style="text-align:right">Valor</th><th></th></tr></thead>
        <tbody>${txs.map((t) => `
          <tr>
            <td><strong>${esc(t.desc)}</strong></td>
            <td><span class="owner-chip">${OWNER_LABEL[t.owner]}</span></td>
            <td style="color:var(--text-3)">${esc(t.categoria)}</td>
            <td>${fmtDate(t.vencimento)}</td>
            <td>${txTagsHTML(t)}</td>
            <td style="text-align:right"><span class="money ${t.type === "receita" ? "pos" : "neg"}">${t.type === "receita" ? "+" : "−"} ${fmt(t.valor)}</span></td>
            <td>
              <div class="row-actions">
                ${t.type === "despesa" && !t.pago ? `<button class="mini-btn pay" data-pay="${t.id}" title="Marcar como paga">✓ Pagar</button>` : ""}
                <button class="mini-btn" data-edit-tx="${t.id}" title="Editar">✎</button>
                <button class="mini-btn danger" data-del-tx="${t.id}" title="Excluir">🗑</button>
              </div>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>` : `<div class="empty-state"><span class="big">🔍</span>Nenhum lançamento com esse filtro.</div>`;

    $$("[data-pay]", $("#txTable")).forEach((b) => b.addEventListener("click", () => {
      const tx = state.transactions.find((t) => t.id === b.dataset.pay);
      tx.pago = true; save(); renderTransactions(); toast("✅ Conta marcada como paga!");
    }));
    $$("[data-del-tx]", $("#txTable")).forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Excluir este lançamento?")) return;
      state.transactions = state.transactions.filter((t) => t.id !== b.dataset.delTx);
      save(); renderTransactions(); toast("Lançamento excluído.");
    }));
    $$("[data-edit-tx]", $("#txTable")).forEach((b) => b.addEventListener("click", () => openTxModal(b.dataset.editTx)));
  }

  /* ---------------- contas & cartões ---------------- */

  function renderAccounts() {
    $("#accountsList").innerHTML = state.accounts.map((a) => `
      <div class="mission-item">
        <span class="m-ico">🏦</span>
        <span><strong>${esc(a.banco)}</strong><span>${esc(a.tipo)} · ${OWNER_LABEL[a.owner]}</span></span>
        <span class="money" style="margin-left:auto">${fmt(a.saldo)}</span>
      </div>`).join("");

    $("#cardsList").innerHTML = state.cards.map((c) => {
      const pct = Math.round((c.usado / c.limite) * 100);
      return `
      <div class="mission-item" style="flex-wrap:wrap;">
        <span class="m-ico">💳</span>
        <span style="flex:1"><strong>${esc(c.nome)}</strong><span>${esc(c.bandeira)} · ${OWNER_LABEL[c.owner]} · fecha dia ${c.fechamento}, vence dia ${c.vencimento}</span></span>
        <span class="money">${fmt(c.usado)} <span style="color:var(--text-3); font-weight:400">/ ${fmt(c.limite)}</span></span>
        <div class="progress-track" style="width:100%; margin-top:4px;"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join("");

    $("#investList").innerHTML = `
      <table class="data">
        <thead><tr><th>Ativo</th><th>Tipo</th><th>Proprietário</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${state.investments.map((i) => `
          <tr>
            <td><strong>${esc(i.nome)}</strong></td>
            <td style="color:var(--text-3)">${esc(i.tipo)}</td>
            <td><span class="owner-chip">${OWNER_LABEL[i.owner]}</span></td>
            <td style="text-align:right" class="money pos">${fmt(i.valor)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  /* ---------------- upload compartilhado (docs + faturas) ---------------- */

  let pendingUpload = null; // { kind: 'doc'|'invoice', file, dataUrl }

  function setupDropzone(zoneId, inputId, kind) {
    const zone = $(zoneId), input = $(inputId);
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { handleFiles(input.files, kind); input.value = ""; });
    ["dragover", "dragenter"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("dragover"); }));
    zone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files, kind));
  }

  function handleFiles(fileList, kind) {
    const file = fileList && fileList[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast(`⚠️ "${file.name}" excede 2 MB. Neste protótipo os arquivos ficam no navegador — use arquivos menores.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingUpload = { kind, file, dataUrl: reader.result };
      openUploadMetaModal(kind, file);
    };
    reader.readAsDataURL(file);
  }

  function openUploadMetaModal(kind, file) {
    const isInvoice = kind === "invoice";
    $("#docMetaTitle").textContent = isInvoice ? "Enviar fatura" : "Enviar documento";
    $("#docMetaFile").value = `${file.name} · ${fmtBytes(file.size)}`;
    const form = $("#docMetaForm");
    form.reset();
    $("#docMetaFile").value = `${file.name} · ${fmtBytes(file.size)}`;
    form.nome.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

    $("#docMetaCatField").style.display = isInvoice ? "none" : "";
    ["#invMetaOrigem", "#invMetaValor", "#invMetaComp", "#invMetaVenc"].forEach((id) =>
      $(id).style.display = isInvoice ? "" : "none");

    if (isInvoice) {
      form.origem.innerHTML = INVOICE_ORIGINS.map((o) => `<option>${o}</option>`).join("");
      form.competencia.value = monthKey(todayISO());
      form.vencimento.value = isoAddDays(7);
    } else {
      $("#docMetaCat").innerHTML = DOC_CATEGORIES.map((c) => `<option>${c}</option>`).join("");
    }
    openModal("docmeta");
  }

  function fileKind(file) {
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) return "pdf";
    if (/^image\//.test(file.type)) return "img";
    return "file";
  }

  function saveUpload(formData) {
    if (!pendingUpload) return;
    const { kind, file, dataUrl } = pendingUpload;
    const base = {
      id: uid(),
      nome: formData.get("nome").trim() || file.name,
      descricao: (formData.get("descricao") || "").trim(),
      tipoArquivo: fileKind(file),
      nomeArquivo: file.name,
      tamanho: file.size,
      dataUrl,
      enviadoPor: state.currentUser,
      data: todayISO(),
    };

    if (kind === "invoice") {
      state.invoices.unshift({
        ...base,
        origem: formData.get("origem"),
        valor: parseFloat(formData.get("valor")) || 0,
        competencia: formData.get("competencia") || monthKey(todayISO()),
        vencimento: formData.get("vencimento") || isoAddDays(7),
        status: "pendente",
      });
    } else {
      state.documents.unshift({ ...base, categoria: formData.get("categoria") });
    }

    pendingUpload = null;
    save();
    closeModals();
    if (kind === "invoice") renderInvoices(); else renderDocuments();
    toast(kind === "invoice" ? "🧾 Fatura enviada e compartilhada com a família!" : "📂 Documento salvo no cofre da família!");
  }

  function fileCardThumb(item) {
    if (item.tipoArquivo === "img" && item.dataUrl) return `<img src="${item.dataUrl}" alt="">`;
    if (item.tipoArquivo === "pdf") return "📄";
    return "📎";
  }

  function downloadItem(item) {
    if (!item.dataUrl) { toast("Arquivo de demonstração — envie os seus para ter download."); return; }
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = item.nomeArquivo || item.nome;
    a.click();
  }

  function previewItem(item) {
    if (!item.dataUrl) { toast("Arquivo de demonstração — sem conteúdo para visualizar."); return; }
    const w = window.open("about:blank");
    if (item.tipoArquivo === "img") w.document.write(`<img src="${item.dataUrl}" style="max-width:100%">`);
    else w.location.href = item.dataUrl;
  }

  /* ---------------- documentos ---------------- */

  let docFilter = "Todas";

  function renderDocuments() {
    const cats = ["Todas", ...DOC_CATEGORIES.filter((c) => state.documents.some((d) => d.categoria === c))];
    $("#docFilters").innerHTML = cats.map((c) => `
      <button class="filter-chip ${docFilter === c ? "active" : ""}" data-doccat="${esc(c)}">${esc(c)}</button>`).join("");
    $$("#docFilters .filter-chip").forEach((b) =>
      b.addEventListener("click", () => { docFilter = b.dataset.doccat; renderDocuments(); }));

    const docs = state.documents.filter((d) => docFilter === "Todas" || d.categoria === docFilter);

    $("#docGrid").innerHTML = docs.length ? docs.map((d) => `
      <div class="doc-card">
        <div class="doc-thumb">${fileCardThumb(d)}</div>
        <div class="doc-body">
          <span class="doc-cat">${esc(d.categoria)}</span>
          <div class="doc-name">${esc(d.nome)}</div>
          ${d.descricao ? `<div class="doc-meta">${esc(d.descricao)}</div>` : ""}
          <div class="doc-meta">
            <span>👤 ${USERS[d.enviadoPor]?.name || "—"}</span>
            <span>📅 ${fmtDate(d.data)}</span>
            ${d.tamanho ? `<span>${fmtBytes(d.tamanho)}</span>` : ""}
          </div>
          <div class="doc-actions">
            <button class="mini-btn" data-preview="${d.id}">👁 Ver</button>
            <button class="mini-btn" data-download="${d.id}">⬇ Baixar</button>
            <button class="mini-btn danger" data-del-doc="${d.id}">🗑</button>
          </div>
        </div>
      </div>`).join("") :
      `<div class="empty-state" style="grid-column:1/-1"><span class="big">📂</span>Nenhum documento nesta categoria ainda.<br>Arraste um arquivo acima para começar.</div>`;

    bindFileActions($("#docGrid"), state.documents, (id) => {
      state.documents = state.documents.filter((d) => d.id !== id);
      save(); renderDocuments(); toast("Documento removido.");
    }, "del-doc");
  }

  /* ---------------- faturas ---------------- */

  let invFilter = "todas";

  function invoiceTag(inv) {
    if (inv.status === "paga") return "paga";
    const d = daysUntil(inv.vencimento);
    if (d < 0) return "vencida";
    if (d === 0) return "hoje";
    if (d <= 7) return "semana";
    return null;
  }

  function renderInvoices() {
    const filters = [
      ["todas", "Todas", "var(--text-3)"],
      ["pendente", "Pendentes", "var(--tag-yellow)"],
      ["vencida", "Vencidas", "var(--tag-red)"],
      ["paga", "Pagas", "var(--tag-green)"],
    ];
    $("#invoiceFilters").innerHTML = filters.map(([k, l, c]) => `
      <button class="filter-chip ${invFilter === k ? "active" : ""}" data-invf="${k}">
        <span class="dot" style="background:${c}"></span>${l}
      </button>`).join("");
    $$("#invoiceFilters .filter-chip").forEach((b) =>
      b.addEventListener("click", () => { invFilter = b.dataset.invf; renderInvoices(); }));

    let invoices = [...state.invoices].sort((a, b) => (b.vencimento || "").localeCompare(a.vencimento || ""));
    if (invFilter === "paga") invoices = invoices.filter((i) => i.status === "paga");
    if (invFilter === "vencida") invoices = invoices.filter((i) => i.status !== "paga" && daysUntil(i.vencimento) < 0);
    if (invFilter === "pendente") invoices = invoices.filter((i) => i.status !== "paga" && daysUntil(i.vencimento) >= 0);

    const compLabel = (c) => {
      if (!c) return "";
      const [y, m] = c.split("-");
      return new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    };

    $("#invoiceGrid").innerHTML = invoices.length ? invoices.map((inv) => `
      <div class="doc-card">
        <div class="doc-thumb">${fileCardThumb(inv)}</div>
        <div class="doc-body">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <span class="doc-cat">${esc(inv.origem)}</span>
            ${tagHTML(invoiceTag(inv))}
          </div>
          <div class="doc-name">${esc(inv.nome)}</div>
          <div class="doc-meta">
            ${inv.valor ? `<span class="money">💰 ${fmt(inv.valor)}</span>` : ""}
            <span>📆 ${compLabel(inv.competencia)}</span>
          </div>
          <div class="doc-meta">
            <span>⏰ vence ${fmtDate(inv.vencimento)}</span>
            <span>👤 ${USERS[inv.enviadoPor]?.name || "—"}</span>
          </div>
          <div class="doc-actions">
            ${inv.status !== "paga" ? `<button class="mini-btn pay" data-pay-inv="${inv.id}">✓ Paga</button>` : ""}
            <button class="mini-btn" data-preview="${inv.id}">👁</button>
            <button class="mini-btn" data-download="${inv.id}">⬇</button>
            <button class="mini-btn danger" data-del-inv="${inv.id}">🗑</button>
          </div>
        </div>
      </div>`).join("") :
      `<div class="empty-state" style="grid-column:1/-1"><span class="big">🧾</span>Nenhuma fatura aqui ainda.<br>Envie a primeira arrastando o arquivo acima.</div>`;

    bindFileActions($("#invoiceGrid"), state.invoices, (id) => {
      state.invoices = state.invoices.filter((i) => i.id !== id);
      save(); renderInvoices(); toast("Fatura removida.");
    }, "del-inv");

    $$("[data-pay-inv]", $("#invoiceGrid")).forEach((b) => b.addEventListener("click", () => {
      const inv = state.invoices.find((i) => i.id === b.dataset.payInv);
      inv.status = "paga"; save(); renderInvoices(); toast("✅ Fatura marcada como paga!");
    }));
  }

  function bindFileActions(root, collection, onDelete, delAttr) {
    $$("[data-preview]", root).forEach((b) => b.addEventListener("click", () =>
      previewItem(collection.find((i) => i.id === b.dataset.preview))));
    $$("[data-download]", root).forEach((b) => b.addEventListener("click", () =>
      downloadItem(collection.find((i) => i.id === b.dataset.download))));
    $$(`[data-${delAttr}]`, root).forEach((b) => b.addEventListener("click", () => {
      if (confirm("Remover este arquivo da área da família?")) onDelete(b.dataset[delAttr.replace(/-(\w)/g, (_, c) => c.toUpperCase())]);
    }));
  }

  /* ---------------- calendário ---------------- */

  let calCursor = new Date();

  function calendarEvents() {
    const evs = {};
    const push = (iso, ev) => { (evs[iso] = evs[iso] || []).push(ev); };
    for (const tx of state.transactions) {
      if (tx.type === "receita") push(tx.vencimento, { label: `+ ${tx.desc}`, color: "var(--tag-green)", bg: "var(--tag-green-bg)" });
      else {
        const tag = txTag(tx) || "semana";
        const t = TAGS[tx.pago ? "paga" : tag] || TAGS.semana;
        push(tx.vencimento, { label: tx.desc, color: t.color, bg: `var(--tag-${tx.pago ? "green" : tag === "vencida" ? "red" : tag === "hoje" ? "orange" : "yellow"}-bg)` });
      }
    }
    for (const inv of state.invoices) {
      if (inv.vencimento && inv.status !== "paga") push(inv.vencimento, { label: `🧾 ${inv.nome}`, color: "var(--tag-blue)", bg: "var(--tag-blue-bg)" });
    }
    for (const d of state.dreams) {
      if (d.prazo) push(d.prazo, { label: `🌟 ${d.titulo}`, color: "var(--tag-purple)", bg: "var(--tag-purple-bg)" });
    }
    return evs;
  }

  function renderCalendar() {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    $("#calTitle").textContent = calCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const evs = calendarEvents();
    const tISO = todayISO();

    const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join("");

    for (let i = 0; i < startDow; i++) html += `<div class="cal-day other"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvs = evs[iso] || [];
      html += `
        <div class="cal-day ${iso === tISO ? "today" : ""}">
          <span class="d-num">${d}</span>
          ${dayEvs.slice(0, 3).map((e) => `<span class="cal-ev" style="color:${e.color}; background:${e.bg}">${esc(e.label)}</span>`).join("")}
          ${dayEvs.length > 3 ? `<span class="cal-ev" style="color:var(--text-3)">+${dayEvs.length - 3} mais</span>` : ""}
          <span class="ev-dots">${dayEvs.slice(0, 5).map((e) => `<span class="ev-dot" style="background:${e.color}"></span>`).join("")}</span>
        </div>`;
    }
    $("#calGrid").innerHTML = html;

    $("#calLegend").innerHTML = [
      ["var(--tag-red)", "Vencida"], ["var(--tag-orange)", "Vence hoje"], ["var(--tag-yellow)", "Até 7 dias"],
      ["var(--tag-green)", "Paga / receita"], ["var(--tag-blue)", "Fatura"], ["var(--tag-purple)", "Meta / sonho"],
    ].map(([c, l]) => `<span class="key"><span class="swatch" style="background:${c}; border-radius:50%"></span>${l}</span>`).join("");
  }

  /* ---------------- vision board ---------------- */

  let dreamFilter = "todos";

  function canEditDream(d) {
    if (isAdmin()) return true;
    return d.createdBy === state.currentUser; // filha só edita os próprios sonhos
  }

  function dreamCardHTML(d) {
    const pct = Math.min(Math.round((d.valorEconomizado / d.valorMeta) * 100), 100);
    const cat = DREAM_CATS[d.categoria] || DREAM_CATS.familia;
    const prioLabel = { alta: "● Alta", media: "● Média", baixa: "● Baixa" }[d.prioridade] || "";
    return `
      <div class="dream-card">
        <div class="dream-cover" style="background:${cat.grad}">${esc(d.emoji || "🌟")}</div>
        <div class="dream-body">
          <div class="dream-top">
            <h4>${esc(d.titulo)}</h4>
            <span class="dream-cat">${cat.label}</span>
          </div>
          ${d.descricao ? `<div class="desc">${esc(d.descricao)}</div>` : ""}
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="dream-nums">
            <span><strong>${fmt(d.valorEconomizado)}</strong> de ${fmt(d.valorMeta)}</span>
            <span><strong>${pct}%</strong></span>
          </div>
          <div class="dream-foot">
            <span class="prio ${d.prioridade}">${prioLabel}</span>
            ${d.prazo ? `<span>🗓 ${fmtDate(d.prazo)}</span>` : "<span></span>"}
            ${canEditDream(d) ? `
              <span class="row-actions">
                <button class="mini-btn" data-add-dream-money="${d.id}" title="Adicionar valor">+ R$</button>
                <button class="mini-btn" data-edit-dream="${d.id}" title="Editar">✎</button>
                <button class="mini-btn danger" data-del-dream="${d.id}" title="Excluir">🗑</button>
              </span>` : ""}
          </div>
        </div>
      </div>`;
  }

  function bindDreamCardActions(root) {
    $$("[data-edit-dream]", root).forEach((b) => b.addEventListener("click", () => openDreamModal(b.dataset.editDream)));
    $$("[data-del-dream]", root).forEach((b) => b.addEventListener("click", () => {
      const d = state.dreams.find((x) => x.id === b.dataset.delDream);
      if (!canEditDream(d)) return;
      if (!confirm(`Excluir o sonho "${d.titulo}"?`)) return;
      state.dreams = state.dreams.filter((x) => x.id !== d.id);
      save(); renderPage(currentPage); toast("Sonho removido do mural.");
    }));
    $$("[data-add-dream-money]", root).forEach((b) => b.addEventListener("click", () => {
      const d = state.dreams.find((x) => x.id === b.dataset.addDreamMoney);
      const v = parseFloat((prompt(`Quanto adicionar em "${d.titulo}"? (R$)`) || "").replace(",", "."));
      if (!v || v <= 0) return;
      d.valorEconomizado = Math.min(d.valorEconomizado + v, d.valorMeta);
      save(); renderPage(currentPage);
      if (d.valorEconomizado >= d.valorMeta) toast(`🎉 Sonho "${d.titulo}" 100% alcançado! Parabéns!`);
      else toast(`💚 ${fmt(v)} adicionados ao sonho!`);
    }));
  }

  function renderVisionBoard() {
    $("#vbFamilyName").textContent = state.familyName;

    const cats = [["todos", "Todos"], ...Object.entries(DREAM_CATS).map(([k, c]) => [k, c.label])];
    $("#dreamFilters").innerHTML = cats.map(([k, l]) => `
      <button class="filter-chip ${dreamFilter === k ? "active" : ""}" data-dreamf="${k}">${l}</button>`).join("");
    $$("#dreamFilters .filter-chip").forEach((b) =>
      b.addEventListener("click", () => { dreamFilter = b.dataset.dreamf; renderVisionBoard(); }));

    const dreams = state.dreams.filter((d) => dreamFilter === "todos" || d.categoria === dreamFilter);
    $("#dreamGrid").innerHTML = dreams.length
      ? dreams.map(dreamCardHTML).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><span class="big">🌈</span>Nenhum sonho nesta categoria — crie o primeiro!</div>`;
    bindDreamCardActions($("#dreamGrid"));
  }

  /* ---------------- área da filha ---------------- */

  function renderFilha() {
    $("#filhaGreeting").textContent = `Oi, ${USERS.filha.name}! 🌟`;
    $("#piggyValue").textContent = fmt(state.piggy.saldo);

    $("#personalGoals").innerHTML = state.personalGoals.length ? state.personalGoals.map((g) => {
      const pct = Math.min(Math.round((g.valorAtual / g.valorMeta) * 100), 100);
      return `
      <div style="margin-bottom:13px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
          <strong>${esc(g.titulo)}</strong>
          <span style="color:var(--text-3)">${fmt(g.valorAtual)} / ${fmt(g.valorMeta)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join("") : `<div class="empty-state">Crie sua primeira meta! 🎯</div>`;

    $("#missionList").innerHTML = state.missions.map((m) => `
      <div class="mission-item ${m.done ? "done" : ""}">
        <span class="m-ico">${m.icone}</span>
        <span><strong>${esc(m.titulo)}</strong><span>${esc(m.recompensa)}</span></span>
        ${m.done
          ? `<span class="tag tag-paga" style="margin-left:auto"><span class="dot"></span>Feita!</span>`
          : `<button class="btn btn-green btn-sm" data-mission="${m.id}">Concluir</button>`}
      </div>`).join("");

    $$("[data-mission]").forEach((b) => b.addEventListener("click", () => {
      const m = state.missions.find((x) => x.id === b.dataset.mission);
      m.done = true;
      if (/investimentos/i.test(m.titulo)) { const badge = state.badges.find((x) => x.id === "b4"); if (badge) badge.unlocked = true; }
      save(); renderFilha(); toast(`🚀 Missão concluída! ${m.recompensa}`);
    }));

    $("#badgeRow").innerHTML = state.badges.map((b) => `
      <div class="badge ${b.unlocked ? "" : "locked"}">
        <span class="b-ico">${b.icone}</span>
        <span class="b-name">${esc(b.nome)}</span>
      </div>`).join("");
  }

  /* ---------------- educação financeira ---------------- */

  const QUIZ = [
    { q: "O que é uma reserva de emergência?", opts: ["Dinheiro para gastar nas férias", "Dinheiro guardado para imprevistos", "Um tipo de cartão de crédito"], ans: 1 },
    { q: "Se você guarda 10% de R$ 100 de mesada, quanto poupa por mês?", opts: ["R$ 1", "R$ 10", "R$ 100"], ans: 1 },
    { q: "O que os juros compostos fazem com o dinheiro investido?", opts: ["Fazem ele crescer cada vez mais rápido", "Deixam ele igual", "Fazem ele diminuir"], ans: 0 },
  ];

  let quizIndex = 0, quizScore = 0;

  function renderEducacao() {
    renderQuiz();
    updateSim();

    $("#articleList").innerHTML = [
      ["🐷", "Por que guardar antes de gastar?", "A regra de ouro: pague-se primeiro. Separe uma parte assim que receber."],
      ["📊", "Juros compostos: a bola de neve do bem", "Pequenos valores guardados todo mês crescem muito com o tempo."],
      ["🎯", "Como definir uma meta SMART", "Específica, mensurável, alcançável, relevante e com prazo."],
      ["💳", "Cartão de crédito não é renda extra", "Entenda faturas, limites e por que juros rotativos são vilões."],
    ].map(([ico, t, d]) => `
      <div class="mission-item">
        <span class="m-ico">${ico}</span>
        <span><strong>${t}</strong><span>${d}</span></span>
      </div>`).join("");
  }

  function renderQuiz() {
    const box = $("#quizBox");
    if (quizIndex >= QUIZ.length) {
      const perfect = quizScore === QUIZ.length;
      if (perfect) { const b = state.badges.find((x) => x.id === "b5"); if (b && !b.unlocked) { b.unlocked = true; save(); } }
      box.innerHTML = `
        <div class="empty-state">
          <span class="big">${perfect ? "🏆" : "🎉"}</span>
          Você acertou <strong>${quizScore} de ${QUIZ.length}</strong>!
          ${perfect ? "<br>Medalha <strong>Mestre do Quiz</strong> desbloqueada! 🧠" : ""}
          <br><br><button class="btn btn-primary btn-sm" id="quizRestart">Jogar de novo</button>
        </div>`;
      $("#quizRestart").addEventListener("click", () => { quizIndex = 0; quizScore = 0; renderQuiz(); });
      return;
    }
    const q = QUIZ[quizIndex];
    box.innerHTML = `
      <p style="font-size:12px; color:var(--text-3); margin-bottom:8px;">Pergunta ${quizIndex + 1} de ${QUIZ.length}</p>
      <p style="font-weight:600; margin-bottom:12px;">${q.q}</p>
      ${q.opts.map((o, i) => `<button class="quiz-option" data-opt="${i}">${o}</button>`).join("")}`;
    $$(".quiz-option", box).forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.opt;
      if (i === q.ans) { b.classList.add("correct"); quizScore++; }
      else { b.classList.add("wrong"); $$(".quiz-option", box)[q.ans].classList.add("correct"); }
      $$(".quiz-option", box).forEach((x) => (x.disabled = true));
      setTimeout(() => { quizIndex++; renderQuiz(); }, 900);
    }));
  }

  function updateSim() {
    const monthly = parseFloat($("#simMonthly").value) || 0;
    const months = parseInt($("#simMonths").value) || 0;
    const total = monthly * months;
    // rendimento simples de referência (~0,7% a.m., poupança)
    let comJuros = 0;
    for (let i = 0; i < months; i++) comJuros = (comJuros + monthly) * 1.007;
    $("#simResult").textContent = fmt(total);
    $("#simHint").textContent = months > 0 ? `Rendendo ~0,7% ao mês, viraria ${fmt(comJuros)} 🌱` : "";
  }

  /* ---------------- modais ---------------- */

  function openModal(name) { $(`#modal-${name}`).classList.add("active"); }
  function closeModals() { $$(".modal-overlay").forEach((m) => m.classList.remove("active")); }

  let editingTxId = null;
  let editingDreamId = null;

  function openTxModal(txId = null) {
    editingTxId = txId;
    const form = $("#txForm");
    form.reset();
    $("#txCategorySelect").innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join("");
    $("#txModalTitle").textContent = txId ? "Editar lançamento" : "Novo lançamento";
    if (txId) {
      const t = state.transactions.find((x) => x.id === txId);
      form.type.value = t.type;
      form.owner.value = t.owner;
      form.desc.value = t.desc;
      form.valor.value = t.valor;
      form.vencimento.value = t.vencimento;
      form.categoria.value = t.categoria;
      form.recorrente.value = t.recorrente ? "sim" : "nao";
    } else {
      form.vencimento.value = todayISO();
    }
    openModal("tx");
  }

  function openDreamModal(dreamId = null) {
    editingDreamId = dreamId;
    const form = $("#dreamForm");
    form.reset();
    $("#dreamModalTitle").textContent = dreamId ? "Editar sonho" : "Novo sonho";

    // filha só cria sonhos na própria categoria
    const catSel = $("#dreamCatSelect");
    if (!isAdmin()) {
      catSel.value = "filha";
      catSel.disabled = true;
    } else {
      catSel.disabled = false;
    }

    if (dreamId) {
      const d = state.dreams.find((x) => x.id === dreamId);
      if (!canEditDream(d)) { toast("Você só pode editar os seus próprios sonhos 😉"); return; }
      form.titulo.value = d.titulo;
      form.descricao.value = d.descricao || "";
      form.categoria.value = d.categoria;
      form.emoji.value = d.emoji || "";
      form.valorMeta.value = d.valorMeta;
      form.valorEconomizado.value = d.valorEconomizado;
      form.prazo.value = d.prazo || "";
      form.prioridade.value = d.prioridade;
    }
    openModal("dream");
  }

  /* ---------------- tooltip ---------------- */

  function showTooltip(e, html) {
    const tt = $("#chartTooltip");
    tt.innerHTML = html;
    tt.classList.add("visible");
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    const r = tt.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
    tt.style.position = "fixed";
  }

  function hideTooltip() { $("#chartTooltip").classList.remove("visible"); }

  /* ---------------- tema ---------------- */

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $("#themeToggle").textContent = state.theme === "dark" ? "☀️ Tema" : "🌙 Tema";
  }

  /* ---------------- eventos globais ---------------- */

  function bindGlobal() {
    // login
    $("#profileList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-login]");
      if (btn) login(btn.dataset.login);
    });

    $("#logoutBtn").addEventListener("click", logout);
    $("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save(); applyTheme();
      if (currentPage === "dashboard") renderDashboard(); // re-render gráficos com a paleta do modo
    });

    $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

    // navegação por botões "ver todos"
    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goto]");
      if (g) goto(g.dataset.goto);
      const om = e.target.closest("[data-open-modal]");
      if (om) {
        if (om.dataset.openModal === "tx") openTxModal();
        if (om.dataset.openModal === "dream") openDreamModal();
      }
      if (e.target.closest("[data-close-modal]")) closeModals();
    });

    $$(".modal-overlay").forEach((ov) => ov.addEventListener("click", (e) => { if (e.target === ov) closeModals(); }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });

    // form lançamento
    $("#txForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = {
        type: f.get("type"),
        owner: f.get("owner"),
        desc: f.get("desc").trim(),
        valor: parseFloat(f.get("valor")),
        vencimento: f.get("vencimento"),
        categoria: f.get("categoria"),
        recorrente: f.get("recorrente") === "sim",
      };
      if (editingTxId) {
        Object.assign(state.transactions.find((t) => t.id === editingTxId), data);
        toast("Lançamento atualizado!");
      } else {
        state.transactions.push({ id: uid(), pago: data.type === "receita", ...data });
        toast("Lançamento criado!");
      }
      editingTxId = null;
      save(); closeModals();
      renderPage(currentPage);
    });

    // form sonho
    $("#dreamForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = {
        titulo: f.get("titulo").trim(),
        descricao: (f.get("descricao") || "").trim(),
        categoria: isAdmin() ? f.get("categoria") : "filha",
        emoji: (f.get("emoji") || "").trim() || "🌟",
        valorMeta: parseFloat(f.get("valorMeta")),
        valorEconomizado: parseFloat(f.get("valorEconomizado")) || 0,
        prazo: f.get("prazo") || null,
        prioridade: f.get("prioridade"),
      };
      if (editingDreamId) {
        Object.assign(state.dreams.find((d) => d.id === editingDreamId), data);
        toast("Sonho atualizado! ✨");
      } else {
        state.dreams.push({ id: uid(), createdBy: state.currentUser, ...data });
        toast("Novo sonho no mural da família! 🌈");
      }
      editingDreamId = null;
      save(); closeModals();
      renderPage(currentPage);
    });

    // form metadados de upload
    $("#docMetaForm").addEventListener("submit", (e) => {
      e.preventDefault();
      saveUpload(new FormData(e.target));
    });

    // cofrinho
    $("#piggyDeposit").addEventListener("click", () => {
      const v = parseFloat((prompt("Quanto você quer guardar no cofrinho? (R$)") || "").replace(",", "."));
      if (!v || v <= 0) return;
      state.piggy.saldo += v;
      state.piggy.historico.push({ valor: v, data: todayISO() });
      if (state.piggy.saldo >= 300) { const b = state.badges.find((x) => x.id === "b3"); if (b) b.unlocked = true; }
      save(); renderFilha(); toast(`🐷 ${fmt(v)} guardados! Seu futuro agradece.`);
    });

    // meta pessoal da filha
    $("#addPersonalGoal").addEventListener("click", () => {
      const titulo = (prompt("Qual é a sua nova meta?") || "").trim();
      if (!titulo) return;
      const meta = parseFloat((prompt("Quanto ela custa? (R$)") || "").replace(",", "."));
      if (!meta || meta <= 0) return;
      state.personalGoals.push({ id: uid(), titulo, valorMeta: meta, valorAtual: 0 });
      save(); renderFilha(); toast("🎯 Meta criada! Agora é poupar.");
    });

    // simulador
    ["#simMonthly", "#simMonths"].forEach((id) => $(id).addEventListener("input", updateSim));

    // dropzones (documentos + faturas)
    setupDropzone("#docDropzone", "#docFileInput", "doc");
    setupDropzone("#invoiceDropzone", "#invoiceFileInput", "invoice");
  }

  /* ---------------- init ---------------- */

  load();
  applyTheme();
  renderLogin();
  bindGlobal();

  if (state.currentUser && USERS[state.currentUser]) {
    login(state.currentUser);
  }
})();
