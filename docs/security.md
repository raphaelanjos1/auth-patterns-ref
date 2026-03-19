# Medidas de Seguranca

Documentacao das medidas de seguranca aplicadas na API para protecao contra vulnerabilidades comuns.

## 1. Helmet

**Arquivo:** `src/main.ts`

```typescript
app.use(helmet());
```

O Helmet configura automaticamente diversos headers HTTP de seguranca na resposta da API:

- **X-Content-Type-Options: nosniff** — impede que o navegador tente adivinhar o tipo de conteudo (MIME sniffing), evitando execucao de arquivos maliciosos.
- **Strict-Transport-Security (HSTS)** — forca o uso de HTTPS, protegendo contra ataques man-in-the-middle.
- **X-Frame-Options: SAMEORIGIN** — impede que a aplicacao seja carregada dentro de iframes de outros dominios, protegendo contra clickjacking.
- **Remove X-Powered-By** — oculta a tecnologia do servidor, dificultando ataques direcionados.

**Protege contra:** clickjacking, MIME sniffing, ataques man-in-the-middle, fingerprinting de servidor.

---

## 2. CORS (Cross-Origin Resource Sharing)

**Arquivo:** `src/main.ts`

```typescript
app.enableCors({ origin: ['http://localhost:3000'] });
```

Restringe quais dominios podem fazer requisicoes a API. Apenas as origens listadas no array `origin` sao autorizadas. Requisicoes de qualquer outro dominio serao bloqueadas pelo navegador.

**Protege contra:** requisicoes nao autorizadas de origens desconhecidas, abuso da API por sites de terceiros.

---

## 3. Rate Limiting (Throttler)

**Arquivos:** `src/app.module.ts`, `src/auth/auth.controller.ts`

### Limites globais (todas as rotas)

| Janela | Limite          |
| ------ | --------------- |
| 1s     | 3 requisicoes   |
| 10s    | 20 requisicoes  |
| 60s    | 100 requisicoes |

### Limites da rota `/auth/sign-in` (mais restritivos)

| Janela | Limite          |
| ------ | --------------- |
| 1s     | 1 requisicao    |
| 1min   | 5 requisicoes   |
| 10min  | 10 requisicoes  |

O rate limiting controla a quantidade de requisicoes que um mesmo cliente pode fazer em determinado intervalo de tempo. Quando o limite e excedido, a API retorna `429 Too Many Requests`.

A rota de login possui limites mais agressivos por ser o principal alvo de ataques de forca bruta.

**Protege contra:** ataques de forca bruta, DDoS a nivel de aplicacao, abuso de recursos da API.

---

## 4. Validacao de Input (ValidationPipe)

**Arquivo:** `src/main.ts`

```typescript
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
);
```

- **whitelist: true** — remove automaticamente campos que nao estao declarados no DTO.
- **forbidNonWhitelisted: true** — rejeita a requisicao com `400 Bad Request` se houver campos nao declarados no DTO.

Exemplo: se o DTO aceita `email` e `password`, enviar `{ "email": "...", "password": "...", "role": "admin" }` retorna erro informando que `role` nao deveria existir.

**Protege contra:** mass assignment, injecao de campos maliciosos, manipulacao de propriedades como `role` ou `isAdmin`.

---

## 5. Autenticacao JWT com Guard Global

**Arquivos:** `src/auth/auth.guard.ts`, `src/app.module.ts`

O `AuthGuard` e registrado globalmente via `APP_GUARD`, garantindo que **todas as rotas sao protegidas por padrao**. Apenas rotas marcadas explicitamente com o decorator `@Public()` ficam acessiveis sem autenticacao.

O token JWT e enviado pelo cliente no header `Authorization: Bearer <token>` e validado a cada requisicao.

**Protege contra:** acesso nao autorizado a endpoints da API, exposicao acidental de rotas sem autenticacao.

---

## 6. Hashing de Senhas com Argon2

**Arquivo:** `src/auth/hashing.service.ts`

As senhas dos usuarios sao armazenadas utilizando o algoritmo Argon2, que e resistente a ataques de GPU e considerado o estado da arte em hashing de senhas.

**Protege contra:** vazamento de senhas em texto claro em caso de comprometimento do banco de dados, ataques de rainbow table e forca bruta offline.
