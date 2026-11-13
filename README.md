# 3105 Yellow — demonstração iOS

Projeto demonstrativo de carteira fictícia, sem vínculo com o C6 Bank ou qualquer instituição financeira.
Não realiza Pix, transferências, pagamentos, consulta de saldo real ou operações financeiras.

## O que inclui
- Interface SwiftUI inspirada nas referências visuais enviadas, mas com identidade própria.
- Saldo fictício editável e ocultável.
- Foto de perfil selecionável.
- Autenticação local do aparelho (Face ID/Touch ID/código do aparelho), sem capturar ou transmitir biometria.
- Aba Investir protegida por uma KEY de demonstração.
- Painel web de administração de chaves (gerar, listar e revogar) usando Cloudflare Worker + KV.
- GitHub Actions para compilar o app em macOS e empacotar um IPA **não assinado**.

## Segurança / limites
- Não use nome, logotipo, telas de login ou dados reais do C6.
- Não peça senha bancária, número de conta, CPF ou códigos bancários.
- A biometria é validada somente pelo iOS via LocalAuthentication.
- O sistema de KEY libera apenas o painel fictício de investimento.
- A entrega do painel remoto é configuração JSON (feature flags), não execução/injeção de código arbitrário.
- O painel web usa um token de administrador. Configure-o como secret no Cloudflare; nunca publique o token em repositório público.

## 1. Criar o serviço de KEY (Cloudflare)
1. Crie uma conta em Cloudflare e instale/configure Wrangler.
2. Crie um namespace KV chamado `KEYS`.
3. Edite `worker/wrangler.toml` e preencha o `id` do namespace.
4. Defina um segredo: `wrangler secret put ADMIN_TOKEN`.
5. Publique: `cd worker && wrangler deploy`.
6. Copie a URL `https://...workers.dev`.

O Worker oferece:
- `POST /admin/generate` — gera uma KEY.
- `GET /admin/keys` — lista KEYs.
- `POST /admin/revoke` — revoga uma KEY.
- `POST /validate` — valida uma KEY para o app.

Para o painel web, abra `admin/index.html`, informe a URL do Worker e o token de administrador. Para uso real, hospede o painel em HTTPS e restrinja o acesso administrativo.

## 2. Configurar o app
Abra `ios/YellowDemo.xcodeproj` no Xcode, ou configure `ios/Config.swift`:
- `keyServiceBaseURL`: URL do Worker.
- Se estiver vazio, o app informa que o serviço ainda não foi configurado; não aceita KEYs fictícias.

## 3. Compilar IPA no GitHub
1. Envie o conteúdo deste ZIP para a raiz do repositório `gui0744/c6.ipa`.
2. A workflow `.github/workflows/build-ipa.yml` compila em macOS.
3. Abra **Actions** → **Build Yellow Demo IPA** → **Run workflow**.
4. Baixe o artefato `YellowDemo-unsigned-ipa`.

O IPA gerado é não assinado. Para instalar no iPhone, assine com seu certificado/perfil legítimos usando seu instalador. Não inclua certificados ou chaves privadas no GitHub.

## 4. Upload pelo iPhone
No repositório, toque em **Add file → Upload files**, selecione os arquivos extraídos deste ZIP e faça **Commit changes**.
