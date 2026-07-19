# Configuração do Supabase (uma única vez)

O app já vem com a URL e a chave pública do projeto **finanças familiares**
configuradas. Faltam 3 passos no painel do Supabase, feitos pelo dono do projeto:

## 1. Criar as tabelas e regras de segurança

1. No painel do Supabase, menu lateral → **SQL Editor** (ícone `>_`)
2. Abra o arquivo [`supabase/schema.sql`](../supabase/schema.sql) deste repositório,
   copie **todo** o conteúdo e cole no editor
3. Clique em **Run** (ou Ctrl+Enter). Deve aparecer "Success. No rows returned"

Isso cria as tabelas (`families`, `members`, `family_data`), as regras que
impedem o dependente de ler dados financeiros (RLS) e as funções de convite.

## 2. Configurar a URL do site (para os e-mails de recuperação)

1. Menu lateral → **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque: `https://nana1969-crypto.github.io/Family-Finance/`
3. Salve

Sem isso, os links de "esqueci minha senha" apontariam para localhost.

## 3. Simplificar o cadastro (recomendado para uso familiar)

1. Menu lateral → **Authentication** → **Sign In / Providers** → **Email**
2. Desative a opção **"Confirm email"** e salve

Assim, criar conta no app entra direto, sem precisar clicar em link de
confirmação. A recuperação de senha por e-mail continua funcionando normalmente.

## Como a família começa a usar

1. **Adriana** abre o app → **Criar conta** (e-mail + senha) → **Criar a família**
   → anota os dois códigos de convite exibidos (também ficam em Configurações)
2. **Roberto** cria a conta dele → **Entrar com código** → usa o código **admin** → escolhe "Pai"
3. **Sofia** cria a conta dela → **Entrar com código** → usa o código **dependente**

A partir daí, tudo o que um lançar aparece para os outros — e o servidor
garante que a Sofia só acessa a área dela.

## Segurança

- A chave `sb_publishable_...` no código é **pública por design** — a proteção
  real são as políticas RLS criadas no passo 1.
- A chave `sb_secret_...` e a senha do banco **nunca** devem ir para o código.
