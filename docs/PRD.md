# Family Finance — Documento de Requisitos (PRD)

**Versão:** 1.0 · **Status:** Protótipo funcional entregue + especificação de produção

## 1. Visão do produto

O **Family Finance** é uma plataforma premium de gestão financeira familiar que une
planejamento, organização, educação financeira e realização de sonhos. Não é apenas
um controle de receitas e despesas: é uma experiência colaborativa que transmite
tranquilidade, segurança e prosperidade.

**Identidade visual:** 🟣 Violeta (planejamento e inovação) · 🟢 Verde vivo
(prosperidade e crescimento) · ⚫ Preto (sofisticação e elegância). Modo claro e escuro.

## 2. Usuários e permissões

| Perfil | Papel | Acesso |
|---|---|---|
| **Pai** (corretor de seguros) | Administrador | Total — mesmas permissões da mãe |
| **Mãe** (empresária de marketing) | Administradora | Total — mesmas permissões do pai |
| **Filha** (16 anos) | Dependente | Somente Vision Board, sonhos/metas pessoais, cofrinho, missões, educação financeira, simuladores e conquistas |

- Cada lançamento tem um **proprietário**: Pai, Mãe ou Família → relatórios individuais e consolidados.
- A filha **nunca** acessa contas, cartões, receitas, despesas, patrimônio, investimentos, extratos, fluxo de caixa, relatórios, documentos ou faturas.

## 3. Módulos

### 3.1 Dashboard (administradores)
Patrimônio familiar, receitas/despesas do mês, saldo disponível, economia do mês,
investimentos, fluxo de caixa (6 meses), despesas por categoria, próximos
vencimentos, metas em andamento e insights do assistente inteligente.

### 3.2 Gestão financeira
Cadastro de receitas, despesas, contas, cartões, investimentos, recorrências,
parcelamentos, categorias e centros de custo. Contas bancárias com saldo e
movimentações; cartões com limite, fechamento, vencimento e fatura.

### 3.3 Sistema inteligente de tags
| Tag | Cor | Significado |
|---|---|---|
| 🔴 Vencida | vermelho | conta vencida |
| 🟠 Vence hoje | laranja | vencimento no dia |
| 🟡 Até 7 dias | amarelo | vence em até uma semana |
| 🟢 Paga | verde | conta quitada |
| 🔵 Recorrente | azul | despesa/receita mensal |
| 🟣 Meta | roxo | vinculada a um sonho/meta |

Com filtros por cor em todos os módulos e as mesmas cores no calendário.

### 3.4 📂 Área de Documentos (novo — requisito do cliente)
Cofre digital **compartilhado entre pai e mãe**:
- Upload por arrastar-e-soltar ou seleção de arquivo (PDF, imagens, documentos).
- Categorias: Identidade, Contratos, Seguros & Apólices, Imóveis, Veículos, Impostos, Saúde, Comprovantes, Outros.
- Metadados: nome, categoria, observações, quem enviou, data, tamanho.
- Visualização, download e exclusão; filtro por categoria.
- **Produção:** arquivos no Supabase Storage com criptografia em repouso; URLs assinadas com expiração; limite configurável por arquivo.

### 3.5 🧾 Área de Faturas (novo — requisito do cliente)
Central de faturas **compartilhada entre pai e mãe**:
- Upload de faturas de cartão, energia, água, internet, escola, condomínio, plano de saúde etc.
- Metadados: origem, valor, competência (mês), vencimento e status.
- Status integrado ao sistema de tags (pendente / vencida / paga) e ao calendário.
- Filtros: todas, pendentes, vencidas, pagas. Ação rápida "marcar como paga".

### 3.6 Calendário financeiro
Grade mensal com vencimentos, recebimentos, faturas e prazos de sonhos, usando as
cores das tags. Navegação por mês e atalho "hoje".

### 3.7 Vision Board da Família
- Nome da família no topo com ícone de casa; frase motivacional no rodapé.
- Sonhos com imagem/emoji, título, descrição, categoria (🏠 Família / 👨 Pai / 👩 Mãe / 👧 Filha), valor da meta, valor economizado, percentual, prazo, prioridade e barra de progresso.
- Pais: criam, editam e excluem qualquer sonho. Filha: vê todos, cria/edita **apenas os próprios**.

### 3.8 Educação financeira (área da filha)
Cofrinho virtual, metas pessoais, missões com recompensas, sistema de medalhas,
quiz, simulador de poupança e trilha de conteúdos.

### 3.9 Assistente inteligente
Insights gerados a partir dos dados: variação de gastos por categoria, cobertura da
reserva de emergência, projeção de conclusão de metas e revisão de assinaturas.
**Produção:** camada de regras + LLM (API Claude) para recomendações em linguagem natural.

### 3.10 Notificações (produção)
Lembretes 7/3/1 dias antes, no dia e após o vencimento, via push (FCM), e-mail e
WhatsApp Cloud API (opcional, configurável). Cada usuário recebe apenas as próprias
notificações ou as de contas compartilhadas.

### 3.11 Relatórios (produção)
Fluxo de caixa, receitas, despesas, categorias, investimentos, patrimônio,
comparativos mensal/anual; exportação em PDF, Excel e CSV.

## 4. Segurança (produção)
Login individual, senhas com Argon2, JWT + refresh token, 2FA (TOTP), criptografia
em trânsito (TLS) e em repouso, logs de auditoria, backups diários e conformidade LGPD
(consentimento, minimização, direito ao esquecimento).

## 5. Métricas de sucesso
- 100% das contas do mês com status atualizado (nenhuma "esquecida").
- Todos os documentos críticos da família centralizados no cofre.
- Pelo menos 1 sonho da família com aporte mensal recorrente.
- Engajamento semanal da filha nas missões de educação financeira.
