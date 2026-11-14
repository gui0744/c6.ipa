# 3105 Yellow — Gerador de Keys

Esta implementação está isolada na branch `3105-key-generator` para preservar o conteúdo atual da branch `main`, que contém o starter Banking App.

## Frontend

- `index.html`: interface preta/amarela e mensagem inicial **“Seja bem-vindo ao gerador!”**.
- `api/config.js`: entrega ao navegador somente a URL pública do serviço, lida da variável de ambiente `KEY_SERVICE_URL`.
- O segredo administrativo nunca é incluído no HTML, no JavaScript entregue ao navegador ou nas variáveis públicas do frontend.
- O navegador mantém a chave administrativa apenas em memória durante a sessão.

## Regras de keys

O Worker valida novamente no servidor a validade como número inteiro entre **1 e 30 dias**. A expiração é considerada atingida quando `Date.now() >= expiresAt`. O painel permite gerar, listar e revogar keys; a validação pública consulta `POST /validate` online.

## Upload de configuração

O painel aceita somente arquivos com extensão `.json`, MIME `application/json` quando informado, tamanho máximo de 64 KB e conteúdo que seja um objeto JSON. O Worker também verifica a extensão, o tamanho e um esquema permitido:

- `appName`: texto de até 60 caracteres;
- `message`: texto de até 280 caracteres;
- `maintenance`: booleano;
- `features`: somente `keyValidation`, `catalog` e `configUpload`, com valores booleanos;
- `theme`: somente `primaryColor` no formato hexadecimal `#RRGGBB`.

Propriedades desconhecidas são recusadas. O Worker apenas armazena e devolve dados JSON; não usa `eval`, não executa scripts, não injeta código e não aceita uploads binários.

## Configuração do Cloudflare (pendente de credenciais da conta)

1. Na conta Cloudflare correta, crie um namespace KV chamado `KEYS`:
   `npx wrangler kv namespace create KEYS`.
2. Copie o ID real retornado pelo Cloudflare para o bloco `[[kv_namespaces]]` comentado em `worker/wrangler.toml`. Não use IDs de exemplo.
3. Defina o segredo administrativo diretamente no Cloudflare, sem passá-lo pelo GitHub ou pelo chat:
   `npx wrangler secret put ADMIN_KEY`.
4. Confira `ALLOWED_ORIGIN` em `worker/wrangler.toml`. O valor inicial corresponde ao domínio Vercel já associado ao projeto; altere-o se o domínio público final for outro.
5. Publique:
   `cd worker && npx wrangler deploy`.
6. Anote a URL `https://…workers.dev` retornada pelo próprio Wrangler.

## Configuração do Vercel (pendente da URL real do Worker)

No projeto Vercel `3105-yellow-admin`, crie a variável de ambiente `KEY_SERVICE_URL` com a URL HTTPS real do Worker, sem barra final, nos ambientes Production e Preview. A variável contém apenas a URL pública do serviço, nunca o segredo administrativo. Depois, faça um novo deployment da branch `3105-key-generator`.

## Testes de aceitação

Depois de configurar KV, `ADMIN_KEY`, `ALLOWED_ORIGIN` e `KEY_SERVICE_URL`:

1. `GET /health` deve indicar `kvConfigured: true` e `adminConfigured: true`.
2. Com autenticação administrativa, gerar com 1 e 30 dias deve funcionar; 0, 31, valores fracionários e strings devem retornar HTTP 400.
3. A lista deve mostrar a key criada; revogá-la deve fazer `POST /validate` retornar `valid: false`.
4. Uma key válida deve retornar `valid: true` antes da expiração e `valid: false` ao expirar.
5. Um arquivo JSON dentro do esquema deve ser aceito. Arquivos `.bin`, `.js`, JSON inválido, arrays, objetos com propriedades desconhecidas e arquivos acima de 64 KB devem ser recusados.
6. Confirmar a página pública sem bloqueio SSO e testar o fluxo no deployment de produção.

**Status:** código preparado nesta branch; publicação e testes online ainda dependem da configuração real do Cloudflare e da liberação pública do domínio Vercel. Nenhum ID, URL de Worker ou segredo foi inventado.
