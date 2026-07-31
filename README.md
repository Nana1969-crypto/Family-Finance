# 💎 Family Finance

Plataforma premium de **gestão financeira familiar** — planejamento, organização,
educação financeira e realização de sonhos, para toda a família.

**Identidade visual:** 🟣 Violeta · 🟢 Verde vivo · ⚫ Preto — com modo claro e escuro.

## ▶️ Como usar

É um protótipo funcional 100% estático — não precisa de instalação:

1. Abra `index.html` no navegador (ou sirva a pasta com `npx serve .`).
   Com o GitHub Pages ativado, o app fica disponível direto na web.
2. Escolha um perfil na tela inicial:
   - **👨 Pai (Roberto)** e **👩 Mãe (Adriana)** → administradores com acesso completo.
   - **🌟 Dependente (Sofia)** → ambiente seguro de educação financeira e sonhos.

   Nomes personalizáveis em **Configurações**.
3. No primeiro acesso, cada membro **cria sua senha** e uma pergunta de
   segurança, e recebe um **código de recuperação** de uso único.

**Recuperação de senha (3 caminhos):** responder a pergunta de segurança,
usar o código de recuperação, ou pedir a um administrador para redefinir
em Configurações → Segurança.

**📱 É um app instalável (PWA):** ao abrir o site no celular, use
"Adicionar à tela inicial" — ele ganha ícone próprio, abre em tela cheia
sem a barra do navegador e funciona offline.

Os dados ficam salvos no navegador (`localStorage`) — nada sai da sua máquina.

## ✨ Módulos

| Módulo | Descrição |
|---|---|
| 📊 **Dashboard** | Patrimônio, receitas/despesas do mês, saldo, economia, investimentos, fluxo de caixa (6 meses), despesas por categoria, próximos vencimentos e insights inteligentes |
| 💸 **Lançamentos** | Receitas e despesas com proprietário (Admin/Família) e tags coloridas 🔴🟠🟡🟢🔵🟣 com filtro por cor |
| 📥 **Importar extrato** | Solte o **PDF**, CSV ou OFX baixado do seu banco: o app lê os lançamentos no navegador (sem enviar nada a servidores), sugere categorias automaticamente, detecta duplicados e importa com um clique |
| 🏦 **Contas & Cartões** | Múltiplos bancos, saldos, cartões com limite/fechamento/vencimento e investimentos |
| 🧾 **Faturas** ⭐ | Área **compartilhada entre pai e mãe** para upload de faturas (cartão, energia, água, escola...) com competência, vencimento, valor e status |
| 📂 **Documentos** ⭐ | Cofre digital **compartilhado entre pai e mãe**: contratos, apólices, comprovantes — upload por arrastar-e-soltar, categorias, preview e download |
| 📅 **Calendário** | Vencimentos, recebimentos e prazos de sonhos com as cores das tags |
| 🌈 **Vision Board** | Mural de sonhos da família com progresso, prioridade, prazo e frase motivacional |
| 🌟 **Área da filha** | Cofrinho virtual, metas pessoais, missões, medalhas, quiz e simulador de poupança |
| 📈 **Relatórios** | Resumo mensal, individual e consolidado por proprietário, despesas por categoria, comparativo de 6 meses, exportação CSV e impressão/PDF |
| ⚙️ **Configurações** | Nome da família, nomes dos membros, categorias personalizadas, redefinição de senhas e restauração dos dados |
| 🔐 **Login com conta (Supabase)** | Conta por e-mail e senha, recuperação por link no e-mail, e família conectada por códigos de convite — com modo local opcional |
| ☁️ **Sincronização** | Os dados da família vivem no Supabase (Postgres + RLS): o que um lança aparece para os outros; o servidor garante que a dependente não acessa o financeiro |
| 📱 **PWA** | Instalável no celular e no computador, com ícone próprio, tela cheia e funcionamento offline |

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

- **Pai e Mãe (admins)**: acesso total — finanças, documentos, faturas, relatórios e configurações — com as mesmas permissões.
- **Dependente**: vê apenas Vision Board (edita só os próprios sonhos), cofrinho,
  metas pessoais, missões, conquistas e educação financeira.
- Documentos e faturas são da **família**: quem enviou fica registrado e os
  administradores gerenciam tudo.

## ☁️ Configurar a nuvem

O passo a passo (SQL + URL do site + e-mail) está em
[`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md).

## 🚀 Evolução para produção

O caminho Next.js + NestJS + PostgreSQL + Supabase Storage (com notificações
push/e-mail/WhatsApp, 2FA e LGPD) está especificado em
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
