# 💎 Family Finance

Plataforma premium de **gestão financeira familiar** — planejamento, organização,
educação financeira e realização de sonhos, para toda a família.

**Identidade visual:** 🟣 Violeta · 🟢 Verde vivo · ⚫ Preto — com modo claro e escuro.

## ▶️ Como usar

É um protótipo funcional 100% estático — não precisa de instalação:

1. Abra `index.html` no navegador (ou sirva a pasta com `npx serve .`).
   Com o GitHub Pages ativado, o app fica disponível direto na web.
2. Escolha um perfil na tela inicial:
   - **Eduardo (Pai)** ou **Adriana (Mãe)** → acesso administrador completo.
   - **Sofia (Filha, 16)** → ambiente seguro de educação financeira, sem acesso
     às finanças dos pais.

Os dados ficam salvos no navegador (`localStorage`) — nada sai da sua máquina.

## ✨ Módulos

| Módulo | Descrição |
|---|---|
| 📊 **Dashboard** | Patrimônio, receitas/despesas do mês, saldo, economia, investimentos, fluxo de caixa (6 meses), despesas por categoria, próximos vencimentos e insights inteligentes |
| 💸 **Lançamentos** | Receitas e despesas com proprietário (Pai/Mãe/Família) e tags coloridas 🔴🟠🟡🟢🔵🟣 com filtro por cor |
| 🏦 **Contas & Cartões** | Múltiplos bancos, saldos, cartões com limite/fechamento/vencimento e investimentos |
| 🧾 **Faturas** ⭐ | Área **compartilhada entre pai e mãe** para upload de faturas (cartão, energia, água, escola...) com competência, vencimento, valor e status |
| 📂 **Documentos** ⭐ | Cofre digital **compartilhado entre pai e mãe**: contratos, apólices, comprovantes — upload por arrastar-e-soltar, categorias, preview e download |
| 📅 **Calendário** | Vencimentos, recebimentos e prazos de sonhos com as cores das tags |
| 🌈 **Vision Board** | Mural de sonhos da família com progresso, prioridade, prazo e frase motivacional |
| 🌟 **Área da filha** | Cofrinho virtual, metas pessoais, missões, medalhas, quiz e simulador de poupança |

⭐ = áreas novas solicitadas pelo cliente (upload de documentação e de faturas,
comuns aos pais).

## 📁 Estrutura

```
├── index.html          # SPA — telas, modais e navegação
├── css/styles.css      # Design system (tokens violeta/verde/preto, claro+escuro)
├── js/app.js           # Estado, permissões, uploads, gráficos SVG, calendário
└── docs/
    ├── PRD.md          # Documento de requisitos
    └── ARQUITETURA.md  # Arquitetura de produção + ERD (Mermaid) + APIs + testes
```

## 🔐 Permissões

- **Pai e Mãe** têm exatamente as mesmas permissões (administradores).
- **Filha** vê apenas: Vision Board (edita só os próprios sonhos), cofrinho,
  metas pessoais, missões, conquistas e educação financeira.
- Documentos e faturas são da **família**: quem enviou fica registrado, e ambos
  os pais gerenciam tudo.

## 🚀 Evolução para produção

O caminho Next.js + NestJS + PostgreSQL + Supabase Storage (com notificações
push/e-mail/WhatsApp, 2FA e LGPD) está especificado em
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
