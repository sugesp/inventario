# Auditoria de segurança

Data da auditoria: 13/11/2026  
Escopo: código e configurações presentes no repositório, sem testes contra ambientes externos ou banco de produção.

## Resumo executivo

Foram inspecionados a API ASP.NET Core, serviços e regras de negócio, autenticação JWT, autorização por perfil e por recurso, persistência EF Core/MySQL, upload e download de fotos, aplicação Angular, Docker, Nginx, configurações e dependências diretas e transitivas.

Foram registrados 13 achados: 1 crítico, 6 altos, 5 médios e 1 baixo. Nove foram corrigidos nesta revisão. Quatro permanecem pendentes por exigirem migração major, alteração do fluxo funcional de credenciais, rotação operacional de certificados ou decisão arquitetural sobre sessão/CSP.

O resultado reduz de forma relevante a superfície de ataque, mas não significa que o sistema esteja livre de vulnerabilidades. Não houve DAST, pentest autenticado em execução, inspeção da configuração real do banco, análise das permissões do host/volumes nem validação do terminador TLS de produção.

## Inventário e superfície de ataque

- Backend: .NET 8, ASP.NET Core Controllers, JWT Bearer, EF Core/Pomelo 9 e MySQL.
- Frontend: Angular 17, token Bearer persistido no navegador e Nginx estático.
- Infraestrutura: Docker Compose com backend e frontend apenas na rede interna e um Nginx publicado na porta configurável.
- Entradas anônimas: `POST /api/auth/login`, `POST /api/auth/pre-register` e `GET /health`.
- Entradas autenticadas: usuários, comissões, equipes, locais, itens inventariados, levantamentos, transferências, laudos, fotos e auditoria.
- Dados sensíveis: CPF, credenciais, permissões, localização, fotos, inventário patrimonial, logs de acesso e documentos de laudo.
- Integrações de saída: MapaCNPJ e consulta pública do E-Estado, ambas com endereço-base fixo; não foi identificada URL arbitrária controlada pelo cliente nesses clientes HTTP.
- Persistência de arquivos: volume local, nomes aleatórios e download por endpoints autenticados.

## Achados

### SEC-001 — Bootstrap administrativo com credenciais conhecidas

- Severidade: Alta
- Categoria: OWASP A07 Identification and Authentication Failures; CWE-798
- Evidência: a versão anterior de `Backend/API/Program.cs` criava o CPF `00000000000` com a senha fixa `12345678` e podia reaplicar essa senha no startup.
- Exploração e impacto: qualquer implantação nova ou esquecida permitia tomada administrativa com credenciais públicas no código.
- Correção: o bootstrap agora é opt-in, lê CPF e senha da configuração, exige senha de ao menos 12 caracteres e não redefine senha de conta existente (`Backend/API/Program.cs:195-251`). A configuração de exemplo orienta remover o segredo após o primeiro uso.
- Validação: build .NET concluído sem erros.
- Status: Corrigido.

### SEC-002 — Elevação de privilégio na atualização de item

- Severidade: Alta
- Categoria: OWASP A01 Broken Access Control; CWE-862
- Evidência: `ItensInventariadosController.Update` passava literalmente `true` ao parâmetro `usuarioAdministrador` do serviço.
- Exploração e impacto: um usuário apenas com perfil `Inventario` podia obter o comportamento reservado ao administrador nas validações de atualização.
- Correção: o serviço recebe agora o resultado real de `User.IsInRole("Administrador")` (`Backend/API/Controllers/ItensInventariadosController.cs:235-242`).
- Validação: build .NET e revisão do fluxo de chamada.
- Status: Corrigido.

### SEC-003 — Fotos privadas publicadas por caminho estático

- Severidade: Alta
- Categoria: OWASP A01 Broken Access Control; CWE-200
- Evidência: os uploads ficavam em `wwwroot/uploads` e `UseStaticFiles()` era habilitado, embora existam endpoints autenticados específicos para download.
- Exploração e impacto: quem obtivesse ou inferisse a URL persistida poderia ignorar a autorização do endpoint e acessar fotos diretamente.
- Correção: o middleware de arquivos estáticos foi removido; fotos continuam disponíveis pelos endpoints autenticados (`Backend/API/Program.cs:172-191`).
- Validação: o frontend já busca fotos como blob pelos endpoints autenticados; build Angular concluído.
- Status: Corrigido.

### SEC-004 — Upload confiava no nome e Content-Type do cliente

- Severidade: Alta
- Categoria: OWASP A04 Insecure Design; CWE-434
- Evidência: a extensão original era preservada e a validação de laudos aceitava qualquer `Content-Type` iniciado por `image/`; itens inventariados não possuíam validação de conteúdo equivalente.
- Exploração e impacto: conteúdo ativo ou arquivo arbitrário poderia ser armazenado como imagem, com risco ampliado pela publicação estática anterior.
- Correção: validação central por limite de 10 MB e assinatura binária de JPG, PNG, GIF, WEBP ou BMP; a extensão armazenada deriva do conteúdo e SVG é rejeitado (`Backend/Application/Services/FileStorageService.cs:20-47,160-200`).
- Validação: build .NET e compatibilidade com os formatos usados pelo frontend.
- Status: Corrigido.

### SEC-005 — Vulnerabilidade crítica transitiva em DOMPurify

- Severidade: Crítica
- Categoria: OWASP A06 Vulnerable and Outdated Components; CWE-79
- Evidência: `npm audit --omit=dev` indicou DOMPurify vulnerável a múltiplos bypasses de sanitização, incluindo severidade crítica.
- Exploração e impacto: um fluxo que sanitizasse HTML controlado poderia permitir XSS.
- Correção: transitivos compatíveis foram atualizados com `npm audit fix`, sem `--force`; o alerta crítico deixou de aparecer.
- Validação: novo audit, build Angular e 7 testes Angular aprovados.
- Status: Corrigido.

### SEC-006 — MySqlConnector vulnerável a exposição de senha em cenário TLS específico

- Severidade: Média
- Categoria: OWASP A06 Vulnerable and Outdated Components; CWE-200
- Evidência: scan NuGet encontrou `MySqlConnector 2.4.0`, afetado pelo GHSA-473q-m89c-ghf8 em configurações `VerifyCA`/`VerifyFull` sem CA configurada.
- Exploração e impacto: um proxy MySQL malicioso poderia obter a senha em texto claro no cenário descrito pelo advisory.
- Correção: dependência fixada em `MySqlConnector 2.6.1` (`Backend/Persistence/Persistence.csproj:8`).
- Validação: `dotnet list package --vulnerable --include-transitive` passou a retornar zero pacotes vulneráveis para os quatro projetos.
- Status: Corrigido.

### SEC-007 — Ausência de limitação no login e pré-cadastro

- Severidade: Média
- Categoria: OWASP API4 Unrestricted Resource Consumption; CWE-307
- Evidência: endpoints anônimos não tinham limitação de frequência.
- Exploração e impacto: força bruta de senha, enumeração em volume e criação abusiva de cadastros pendentes.
- Correção: janela fixa de 10 requisições por minuto aplicada a login e pré-cadastro (`Backend/API/Program.cs:136-146`; `Backend/API/Controllers/AuthController.cs:22-24,76-77`).
- Limitação residual: o limitador atual é global por instância, não distribuído nem particionado por IP/conta.
- Status: Corrigido.

### SEC-008 — CORS irrestrito

- Severidade: Média
- Categoria: OWASP A05 Security Misconfiguration; CWE-942
- Evidência: política usava `AllowAnyOrigin`, `AllowAnyHeader` e `AllowAnyMethod`.
- Exploração e impacto: origens arbitrárias podiam chamar a API a partir do navegador quando obtivessem um token Bearer.
- Correção: somente origens explicitamente configuradas em `Cors:AllowedOrigins` recebem CORS (`Backend/API/Program.cs:147-160`). O cenário same-origin não precisa de CORS.
- Status: Corrigido.

### SEC-009 — Divulgação de exceções internas

- Severidade: Média
- Categoria: OWASP A05 Security Misconfiguration; CWE-209
- Evidência: operações de criação e atualização devolviam `InnerException.Message` ou `Exception.Message` em HTTP 500.
- Exploração e impacto: mensagens do EF, banco ou filesystem poderiam revelar esquema e detalhes internos.
- Correção: respostas inesperadas agora usam mensagem genérica (`Backend/API/Controllers/ItensInventariadosController.cs:184-189,249-254`).
- Status: Corrigido.

### SEC-010 — Angular 17 com advisories sem correção compatível

- Severidade: Alta
- Categoria: OWASP A06 Vulnerable and Outdated Components
- Evidência: o scan final npm informa 12 vulnerabilidades (7 moderadas e 5 altas) na linha Angular; o reparo sugerido instala Angular 21.2.26 e é explicitamente breaking.
- Impacto: inclui classes de XSS, vazamento XSRF e problemas de cache/DoS. Parte dos cenários (SSR/hydration/transfer cache) não aparenta estar habilitada nesta SPA, mas os alertas não devem ser ignorados.
- Recomendação: planejar migração testada Angular 17 → 18 → 19 → 20 → 21, alinhando Material, CDK e bibliotecas de terceiros; repetir testes funcionais e `npm audit` a cada etapa.
- Status: Pendente — requer migração major controlada.

### SEC-011 — Chaves privadas e certificados versionados

- Severidade: Alta
- Categoria: OWASP A02 Cryptographic Failures; CWE-321
- Evidência: `certs/inventario-key.pem`, `certs/inventario-cert.pfx` e `nginx/certs/selfsigned.key` estão rastreados pelo Git.
- Exploração e impacto: se qualquer chave foi usada fora de desenvolvimento, todo leitor do histórico pode se passar pelo serviço ou descriptografar tráfego nos cenários aplicáveis.
- Recomendação: identificar uso, emitir novos certificados, rotacionar/revogar os antigos, mover chaves para secret/volume externo e removê-las do índice e histórico com procedimento coordenado. A remoção automática não foi feita porque poderia interromper deploy e não elimina exposição histórica.
- Status: Pendente — ação operacional obrigatória.

### SEC-012 — Senha temporária previsível no cadastro e reset

- Severidade: Média
- Categoria: OWASP A07 Identification and Authentication Failures; CWE-521
- Evidência: cadastro administrativo e reset definem `12345678` (`Backend/Application/Services/AuthService.cs:19,59-71,241-262`); a UI informa esse valor.
- Exploração e impacto: contas recém-criadas ou recém-resetadas podem ser acessadas antes da troca obrigatória. O token atual não restringe ações enquanto `MustChangePassword` é verdadeiro.
- Recomendação: gerar segredo aleatório de uso único, entregá-lo por canal administrativo seguro, expirar rapidamente e restringir o token pré-troca exclusivamente ao endpoint de alteração de senha. Isso altera o fluxo funcional e o contrato de API, portanto exige aprovação e teste de UX.
- Status: Pendente — mudança funcional/arquitetural.

### SEC-013 — Token Bearer persistido em localStorage e políticas web incompletas

- Severidade: Baixa
- Categoria: OWASP A07/A05; CWE-922
- Evidência: o token é persistido em `localStorage` (`Frontend/Inventario/src/app/auth/auth.service.ts:162-191`). Headers defensivos básicos foram configurados, mas CSP e HSTS dependem da topologia TLS real.
- Impacto: uma falha XSS pode extrair o token. HSTS não deve ser emitido antes de confirmar HTTPS integral no domínio; CSP estrita precisa contemplar mapas, blobs e estilos usados pela aplicação.
- Recomendação: avaliar cookie HttpOnly/Secure/SameSite com proteção CSRF ou token somente em memória com renovação; criar CSP em modo Report-Only antes de enforcement; habilitar HSTS no terminador HTTPS de produção.
- Status: Requer validação arquitetural.

## Controles revisados sem achado confirmado

- Consultas de aplicação usam LINQ/EF parametrizado; SQL textual encontrado limita-se a migrations estáticas.
- Clientes HTTP possuem hosts fixos e tombamento normalizado para dígitos; não foi confirmado SSRF controlável pelo usuário.
- JWT valida assinatura, emissor, audiência, expiração e estado atual do usuário, com `ClockSkew` zero.
- Levantamentos verificam criador/compartilhamento no servidor; operações críticas de comissão, local e exclusão de item possuem verificações adicionais de presidente/administrador.
- Impressão HTML no frontend escapa valores dinâmicos antes de `document.write`.
- Swagger é exposto somente em ambiente Development.

## Validação executada

- `dotnet restore Inventario.sln`: sucesso.
- `dotnet build Inventario.sln --no-restore`: sucesso, 0 erros e 0 avisos.
- `dotnet list Inventario.sln package --vulnerable --include-transitive`: nenhum pacote vulnerável após a correção.
- `npm audit --omit=dev`: 12 pendências Angular; nenhum alerta crítico após atualização compatível.
- `npm run build`: sucesso; permanecem avisos de orçamento de bundle/SCSS e módulos CommonJS, sem falha de build.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 7/7 testes aprovados.
- `git diff --check`: sucesso.

Não existe projeto de testes automatizados do backend no repositório. A validação de autorização foi feita por inspeção dos controllers e serviços e por compilação; testes HTTP de integração com usuários de perfis distintos continuam recomendados.

## Recomendações priorizadas

1. Rotacionar e retirar do Git todas as chaves privadas rastreadas.
2. Substituir o fluxo de senha temporária fixa e bloquear o uso do sistema até a troca inicial.
3. Planejar a migração controlada para uma versão Angular corrigida.
4. Adicionar testes de integração da API para 401, 403, BOLA/IDOR, upload inválido, limite 429 e usuário desativado.
5. Aplicar rate limiting distribuído/particionado no proxy ou gateway e monitorar tentativas de autenticação.
6. Executar containers com usuário não-root, validando antes as permissões dos volumes de uploads e auditoria.
7. Definir CSP em Report-Only e HSTS no terminador TLS após inventariar domínios de mapas, imagens, fontes e APIs.
8. Restringir o usuário MySQL a somente schema e operações necessárias; configurar TLS com CA validada.
