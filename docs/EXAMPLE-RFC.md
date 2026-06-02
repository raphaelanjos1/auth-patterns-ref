**Tema**: Arquitetura Geral  
**Número do RFC**: 09  
**Data de início**: 20/11/2025  
**Responsável**: @waldemarnt  
**Contribuidor**: @wcalderipe  

> **Nota (auth-patterns-ref):** Este arquivo é o **registro de decisão original** (contexto monorepo Fakeflix, GraphQL, TypeORM). A versão **adaptada e normativa** para este repositório está em **[FEATURE-FOLDERS-GUIDELINES.md](./FEATURE-FOLDERS-GUIDELINES.md)**.

## Terminologia

Para evitar confusão, usamos os seguintes termos nesta RFC:

- **Domain Module** ou **Package**: Módulo NestJS completo no monorepo (ex: `@identity`, `@billing`)
  - **É** a unidade de deploy
  - **Tem** boundaries técnicos (package boundaries)
- **Feature**: Conceito de negócio dentro de um package (ex: `authentication`, `user` dentro de Identity)
  - **Não é** unidade de deploy (sempre deploym junto com o package)
  - **Não tem** boundaries técnicos (só organização)
- **Feature Folders**: Organizar código em pastas por features de negócio, sem boundaries técnicos entre elas

---

## Índice

1. [Definição do Problema](#definição-do-problema)
2. [Opções Avaliadas](#opções-avaliadas)
   - [Opção A: Feature Folders (Recomendado)](#opção-a-feature-folders)
   - [Opção B: Feature Modules (Padrão NestJS)](#opção-b-feature-modules)
3. [Comparação](#comparação)
4. [Decisão e Justificativa](#decisão-e-justificativa)
5. [Estudo de Caso: @billing](#estudo-de-caso-billing)

---

## Definição do Problema

### Estado Atual: Package by Layer (Identity)

O os módulos de domínio como o `identity` seguem a estrutura tradicional **package by layer**:

```
identity/
├── core/
│   ├── exception/
│   │   └── user-unauthorized.exception.ts
│   └── service/
│       ├── authentication.service.ts
│       └── user-management.service.ts
├── http/
│   └── graphql/
│       ├── resolver/
│       │   ├── auth.resolver.ts
│       │   └── user.resolver.ts
│       └── type/
│           ├── auth-token.type.ts
│           ├── user.type.ts
│           └── ...
└── persistence/
    ├── entity/
    │   └── user.entity.ts
    ├── repository/
    │   └── user.repository.ts
    ├── migration/
    └── typeorm-datasource.ts
```

### Problemas

**1. Navegação Fragmentada por Camadas Técnicas**

Para entender **"authentication"** (conceito de negócio), desenvolvedores precisam navegar entre **4 pastas técnicas**:

1. `core/service/authentication.service.ts` — Lógica de autenticação
2. `http/graphql/resolver/auth.resolver.ts` — Endpoint GraphQL
3. `http/graphql/type/auth-token.type.ts` — Tipos GraphQL
4. `persistence/entity/user.entity.ts` — Dados do usuário
5. `persistence/repository/user.repository.ts` — Acesso ao banco

**Resultado**: Código de um **único conceito de negócio** espalhado por **3 pastas principais**.

**2. Difícil Identificar Domínios**

Olhando a estrutura de pastas, não é óbvio quais são os domínios de negócio:
- "Authentication" é um domínio?
- "User Management" é um domínio?
- Onde fica a separação entre conceitos?

A estrutura **esconde os conceitos de negócio** atrás de camadas técnicas.

**3. Ownership Não Claro**

Se dois times precisam trabalhar em `identity`:
- Quem é dono de `core/service/`?
- Quem é dono de `persistence/`?
- Não há como dividir por domínio de negócio

---

## Opções Avaliadas

Para resolver os problemas de organização interna dos Domain Modules, avaliamos duas abordagens:

---

### Opção A: Feature Folders (Recomendado)

**Conceito**: Organizar código em **pastas por features de negócio**, mantendo um **módulo NestJS único**.

**Importante**: Esta abordagem usa **pastas** para organização visual, não cria boundaries técnicos entre features. Tudo permanece no mesmo módulo NestJS com acesso livre entre features.

#### Origem: Organização Visual por Features

O conceito de organizar código por **features de negócio** (ao invés de camadas técnicas) é comum em várias linguagens e frameworks.

**Diferença de outras abordagens**:

1. **Go/Java "Package by Feature"**: Usa packages/módulos técnicos como boundaries
   - Go Package = boundary de compilação
   - Java Package = namespace técnico
   - Controle de visibilidade forçado

2. **NestJS Feature Modules (Opção B)**: Usa módulos NestJS como boundaries
   - Imports/exports explícitos
   - Encapsulamento via DI
   - Similar a Go/Java packages

3. **Nossa Abordagem (Feature Folders)**: Usa apenas pastas
   - **Sem boundaries técnicos**
   - Organização visual
   - Acesso livre entre features
   - Mais simples, mas menos isolamento

### Comparação: Feature Folders vs Feature Modules

Nossa **Opção A (Feature Folders)** é mais simples que abordagens em outras linguagens:

| Linguagem | Abordagem | Boundaries Técnicos | Similar a |
|-----------|-----------|---------------------|-----------|
| **Go** | Package by Feature | ✅ Packages (compilação) | **Opção B** |
| **Java** | Package by Feature | ✅ Packages (namespaces) | **Opção B** |
| **Python** | Package by Feature | ✅ Packages (`__init__.py`) | **Opção B** |
| **NestJS** | **Feature Modules** | ✅ Modules (DI) | **Opção B** |
| **NestJS** | **Feature Folders** | ❌ Só pastas | **Opção A** |

**Nossa Opção A** é única porque **não cria boundaries técnicos**, apenas organização visual.

**Por que funciona**:
- **Princípio universal**: Organizar por features de negócio facilita navegação e manutenção
- **Simplicidade**: Sem overhead de modules/packages quando não necessário
- **Apropriado para alta coesão**: Quando features são naturalmente acopladas

---

## Solução Proposta

### Feature Folders + Single NestJS Module Pattern

Essa RFC propõe organizar o código **dentro de Domain Modules** (packages) usando **feature folders** ao invés de **camadas técnicas globais**.

**Exemplo**:
- **Domain Module**: `@identity` (package NestJS)
- **Features**: `authentication/`, `user/` (pastas organizando código)
  
Ao invés de organizar por camadas técnicas (`core/`, `http/`, `persistence/`).

**Decisão Chave**: Usar **um módulo NestJS** para todo o Domain Module, com organização de pastas baseada em features de negócio.

### O que é Feature Folders?

**Definição**: Organizar código em **pastas por features de negócio** (authentication, user, subscription, invoice), co-localizando todo o código relacionado (service, entity, resolver, DTOs) dentro de uma única pasta.

**Níveis de organização**:
1. **Monorepo** → divide em **NestJS Packages**: `@identity`, `@billing`, `@content`
2. **Package** (ex: `@identity`) → divide em **feature folders**: `authentication/`, `user/`
3. **Feature folder** → divide em **camadas técnicas**: `core/`, `persistence/`, `http/`

**Características**:
- ✅ Organização visual por features
- ❌ Sem boundaries técnicos (tudo no mesmo módulo)
- ✅ Acesso livre entre features
- ✅ Mais simples que Feature Modules (Opção B)

**Objetivo**: Melhorar navegação e clareza organizacional sem adicionar complexidade de múltiplos módulos.

#### Estrutura Proposta

```
identity/
├── core/service/
│   ├── authentication.service.ts      # Espalhado
│   └── user-management.service.ts     # Espalhado
├── http/graphql/resolver/
│   ├── auth.resolver.ts               # Espalhado
│   └── user.resolver.ts               # Espalhado
└── persistence/
    ├── entity/user.entity.ts          # Espalhado
    └── repository/user.repository.ts   # Espalhado
```

**Problema**: Para entender "authentication", abrir 3 pastas diferentes.

#### Depois (by domain)

```
identity/
├── authentication/                # Domínio: Autenticação
│   ├── core/
│   │   ├── service/
│   │   │   └── authentication.service.ts
│   │   └── exception/
│   │       └── user-unauthorized.exception.ts
│   └── http/
│       └── graphql/
│           ├── resolver/
│           │   └── auth.resolver.ts
│           └── type/
│               ├── auth-token.type.ts
│               └── sign-in-input.type.ts
├── user/                          # Domínio: Gestão de usuários
│   ├── core/
│   │   └── service/
│   │       └── user-management.service.ts
│   ├── persistence/
│   │   ├── entity/
│   │   │   └── user.entity.ts
│   │   └── repository/
│   │       └── user.repository.ts
│   └── http/
│       └── graphql/
│           ├── resolver/
│           │   └── user.resolver.ts
│           └── type/
│               ├── user.type.ts
│               └── create-user-input.type.ts
├── shared/
│   └── persistence/
│       ├── migration/
│       ├── typeorm-datasource.ts
│       └── identity-persistence.module.ts
└── identity.module.ts             # Módulo NestJS único
```

**Benefício**: Tudo sobre "authentication" em `authentication/`. Tudo sobre "user" em `user/`.

### Esclarecendo Terminologia

**Importante**: Evitamos confusão entre níveis:

| Termo | O que é | Exemplo |
|-------|---------|---------|
| **Package/Domain Module** | Módulo NestJS completo no monorepo | `@identity`, `@billing`, `@content` |
| **Domínio de Negócio** | Conceito de negócio dentro do package | `authentication`, `user` (dentro de Identity) |
| | | `subscription`, `invoice` (dentro de Billing) |

Nesta RFC, quando falamos **"organizar por domínio"**, referimo-nos aos **domínios de negócio** dentro de um package.

#### Template Padrão

```
<business-domain>/                 # Ex: authentication/, user/, subscription/
├── core/                          # Lógica de negócio
│   ├── service/                   # Services do domínio
│   ├── enum/                      # Enums (opcional)
│   ├── exception/                 # Exceptions (opcional)
│   └── interface/                 # Interfaces (opcional)
├── persistence/                   # Camada de dados
│   ├── entity/                    # TypeORM entities
│   └── repository/                # Repositories
└── http/                          # Interface externa
    ├── graphql/                   # GraphQL (se aplicável)
    │   ├── resolver/
    │   └── type/
    └── rest/                      # REST (se aplicável)
        ├── controller/
        └── dto/
```

#### Prós

✅ **Navegação Intuitiva**
- Todo código relacionado a um domínio em uma pasta
- Desenvolvedores encontram tudo sobre "authentication" em `authentication/`

✅ **Baixa Complexidade**
- Um módulo NestJS único = DI simples
- Sem `forwardRef()`, sem imports/exports complexos
- Menos arquivos de configuração

✅ **Onboarding Rápido**
- Estrutura de pastas "grita" os conceitos de negócio
- Novos desenvolvedores entendem domínios rapidamente

✅ **Preparado para Extração**
- Boundaries claros via pastas
- Se precisar extrair para um módulo de domínio, código já está organizado

#### Contras

⚠️ **Boundaries Mais Fracos**
- Pastas não impedem dependências
- Desenvolvedores podem acessar qualquer service sem controle explícito
- Requer disciplina do time

⚠️ **Estrutura de Pastas Mais Profunda**
- 3-4 níveis de profundidade (`subscription/core/service/`)
- Pode parecer verbose inicialmente

---

### Opção B: Feature Modules (Padrão NestJS)

**Conceito**: Criar um **feature module do NestJS** para cada feature de negócio.

#### Origem

Esta é a abordagem oficial recomendada pela [documentação do NestJS](https://docs.nestjs.com/modules#feature-modules).

**Feature Modules** no NestJS são módulos que encapsulam funcionalidades relacionadas, organizando código por features/domínios com boundaries técnicos fortes.

#### Estrutura Proposta

```typescript
identity/
├── authentication/                # Feature Module
│   ├── authentication.module.ts   # Módulo NestJS
│   ├── authentication.service.ts
│   ├── auth.resolver.ts
│   └── dto/
│       └── sign-in-input.dto.ts
├── user/                          # Feature Module
│   ├── user.module.ts             # Módulo NestJS
│   ├── user.service.ts
│   ├── user.resolver.ts
│   ├── user.entity.ts
│   ├── user.repository.ts
│   └── dto/
│       └── create-user.dto.ts
├── shared/
│   └── persistence/
│       └── identity-persistence.module.ts
└── identity.module.ts             # Root module (imports feature modules)
```

**Código dos Módulos**:

```typescript
// authentication/authentication.module.ts
@Module({
  imports: [forwardRef(() => UserModule)],  // Resolve circular dep
  providers: [AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}

// user/user.module.ts
@Module({
  imports: [forwardRef(() => AuthenticationModule)],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}

// identity.module.ts (root)
@Module({
  imports: [
    AuthenticationModule,
    UserModule,
    IdentityPersistenceModule,
  ],
})
export class IdentityModule {}
```

#### Prós

✅ **Boundaries Técnicos Fortes**
- Imports/exports explícitos controlam o que é acessível
- Compilador ajuda a impor boundaries
- Difícil acessar código não exportado

✅ **Testing Isolado**
- Cada módulo pode ser testado completamente isolado
- Mock de dependências é explícito
- Útil para testes unitários de módulo

✅ **Reutilização Clara**
- Módulos podem ser importados em múltiplos lugares
- Interface clara (exports) do que está disponível

✅ **Padrão Oficial NestJS**
- Documentado oficialmente
- Muitos exemplos e tutoriais
- Comunidade familiar com o padrão

#### Contras

⚠️ **Overhead de Configuração**
- Cada domínio precisa de arquivo `*.module.ts`
- Gerenciar imports/exports entre módulos
- Mais linhas de código para manter

⚠️ **Circular Dependencies**
- Domínios acoplados criam circular dependencies
- Requer `forwardRef()` frequentemente
- Pode ser verboso e repetitivo

⚠️ **Configuração Transacional Mais Complexa**
- Transações funcionam via CLS, mas requerem atenção
- Precisa garantir mesmo `connectionName` em todos módulos
- CLS precisa estar configurado corretamente
- Mais pontos de configuração = maior chance de erro

⚠️ **Mental Overhead**
- Precisa lembrar "qual service está em qual módulo?"
- Gerenciar dependências entre feature modules
- Maior curva de aprendizado para juniors

⚠️ **Overhead sem Benefício (em alguns contextos)**
- Se deploy é sempre conjunto: não há benefício de separação
- Se mesmo time mantém: não há benefício de boundaries fortes
- Complexidade > Benefício quando coesão é alta

**Exemplo real**:
- Package: `@identity` (Domain Module NestJS)
  - Domínio de negócio: `authentication/` 
  - Domínio de negócio: `user/`

---

## Comparação

| Aspecto | Feature Folders (A) | Feature Modules (B) |
|---------|---------------------|---------------------|
| **Boundaries** | ❌ Apenas pastas (visual) | ✅ Módulos NestJS (técnicos) |
| **Unidade de Deploy** | Domain Module (package) | Domain Module (package) |
| **Deploy Separado de Features** | ❌ Não faz sentido | ❌ Não faz sentido |
| **DI Complexity** | Simples (injeção direta) | Complexo (imports/exports, forwardRef) |
| **Linhas de Código** | ~20 linhas (1 module) | ~60+ linhas (múltiplos modules) |
| **Circular Deps** | Impossível entre módulos (só há 1) | Comum, requer `forwardRef()` |
| **Encapsulamento** | ❌ Nenhum (acesso livre) | ✅ Via exports |
| **Similar a** | Pastas simples | Go packages, Java packages |
| **Curva de Aprendizado** | Baixa | Média-Alta |
| **Ideal para** | Alta coesão interna | Boundaries fortes requeridos |

---

## Decisão e Justificativa

### Recomendação: Opção A - Feature Folders

Para **@identity e @billing**, recomendamos **Feature Folders** (organização por pastas com módulo único).

#### Justificativa Contextual

**1. Alta Coesão Transacional**
- Identity: `signup()` envolve `user` + `authentication` + email verification
- Billing: `changePlan()` envolve `subscription` + `invoice` + `payment`
- Operações de negócio **naturalmente abrangem múltiplas features**
- Módulo único torna essas operações **simples de implementar**

**2. Mesmo Time e Deploy**
- Identity e Billing são mantidos pelo **mesmo time**
- Deployam sempre **juntos como unidade**
- Não há necessidade real de separação técnica forte
- Boundaries fortes (Option B) não agregam valor

**3. Granularidade Já Existe**
- Já temos separação no nível de **packages**: `@identity`, `@billing`, `@content`
- Criar feature modules internos adiciona camada **extra de granularidade**
- Para nosso contexto: **organização por pastas é suficiente**

**4. Simplicidade > Complexidade**
- **Evita**: `forwardRef()`, imports/exports complexos, configuração CLS
- **Ganha**: Código mais simples, DI direto, transações naturais
- **Resultado**: Menos código para manter, mais foco em lógica de negócio

#### Unidade de Deploy: Domain Module, não Features

**Ponto crucial**: A **unidade de deploy** no nosso monorepo é o **Domain Module (package)**, não features individuais.

```
Unidades de Deploy:
├── @identity    ← Deploy como unidade
├── @billing     ← Deploy como unidade  
└── @content     ← Deploy como unidade

NUNCA deployamos:
├── @identity/authentication  ← Não é unidade de deploy
├── @billing/subscription     ← Não é unidade de deploy
```

**Implicação**: Feature Modules (Opção B) cria boundaries **dentro** do que sempre será deployado junto.

**O Problema na Comunidade NestJS**:

A comunidade NestJS frequentemente **não distingue claramente** entre:
1. **Domain Modules** (packages) = Unidade de deploy, boundaries reais
2. **Features internas** = Organização dentro da unidade de deploy

Resultado: Projetos criam Feature Modules internos quando deveriam ser apenas pastas.

**Nossa Visão**:

| Nível | Propósito | Boundaries Técnicos | Deployment |
|-------|-----------|---------------------|------------|
| **Domain Module** (`@billing`) | Separação de domínios de negócio | ✅ Package boundaries | ✅ Unidade de deploy |
| **Features** (`subscription/`) | Organização interna | ❌ Apenas pastas | ❌ Sempre junto com package |

**Diagrama Visual**:

```
┌─────────────────────────────────────────────┐
│  @identity (Domain Module - Deploy Unit)   │ ← Unidade de deploy
│  ┌─────────────────┬────────────────────┐  │
│  │ authentication/ │  user/             │  │ ← Features (pastas)
│  │ (pasta)         │  (pasta)           │  │    NÃO são unidades
│  └─────────────────┴────────────────────┘  │    de deploy
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  @billing (Domain Module - Deploy Unit)    │ ← Outra unidade de deploy
│  ┌──────────┬─────────┬──────────────────┐ │
│  │ subscrip │ invoice │  payment         │ │ ← Features (pastas)
│  │ tion/    │ /       │  /               │ │
│  └──────────┴─────────┴──────────────────┘ │
└─────────────────────────────────────────────┘
```

**Conclusão**: 
- Boundaries entre **packages** (@identity, @billing) = necessários (deploy separado)
- Boundaries entre **features internas** (subscription/, invoice/) = overhead desnecessário (deployam sempre juntos)

#### Quando Reavaliar para Option B

Considere **Feature Modules** se no futuro (cenários improváveis para features internas):
- ✅ Features dentro do package precisarem de **isolamento técnico forte** (compliance, auditoria)
- ✅ **Arquitetura mudar** e features se tornarem unidades de deploy separadas
- ✅ Times diferentes mantiverem features diferentes **e não puderem coordenar**
- ✅ Boundaries fortes via compilador forem críticos por requisitos não-funcionais

**Nota**: Se "deploy separado" for necessário, provavelmente significa que a feature deveria ser um **Domain Module** (package) separado, não um Feature Module interno.

#### Nota Importante

**Feature Modules são válidos!** São o padrão oficial do NestJS e usados por muitos projetos com sucesso.

Nossa decisão de **não** usá-los para Identity e Billing é:
- ✅ **Contextual** (alta coesão, mesmo team, deploy conjunto)
- ✅ **Pragmática** (simplicidade > complexidade desnecessária)
- ✅ **Reversível** (pode migrar para feature modules se contexto mudar)

Não é uma crítica ao padrão Feature Modules, é uma escolha apropriada para **este contexto específico**.

---

## Estudo de Caso: @billing

O package `@billing` foi recentemente refatorado de **package by layer** para **feature folders**, fornecendo evidência concreta dos benefícios.

### Estrutura proposta

```
billing/
├── subscription/                  # Domínio: Gestão de assinaturas
│   ├── core/service/
│   │   ├── subscription.service.ts
│   │   ├── subscription-billing.service.ts
│   │   ├── add-on-manager.service.ts
│   │   └── discount-engine.service.ts
│   ├── persistence/
│   │   ├── entity/
│   │   │   ├── subscription.entity.ts
│   │   │   ├── plan.entity.ts
│   │   │   ├── add-on.entity.ts
│   │   │   ├── subscription-add-on.entity.ts
│   │   │   ├── discount.entity.ts
│   │   │   └── subscription-discount.entity.ts
│   │   └── repository/
│   │       └── (repositories correspondentes)
│   └── http/
│       ├── controller/
│       │   ├── subscription.controller.ts
│       │   └── subscription-billing.controller.ts
│       └── dto/
│           └── (DTOs de request/response)
├── invoice/                       # Domínio: Geração de faturas
│   ├── core/service/
│   │   ├── invoice.service.ts
│   │   └── invoice-generator.service.ts
│   ├── persistence/
│   │   ├── entity/
│   │   │   ├── invoice.entity.ts
│   │   │   ├── invoice-line-item.entity.ts
│   │   │   └── charge.entity.ts
│   │   └── repository/
│   └── http/controller/
├── payment/                       # Domínio: Processamento de pagamentos
│   ├── core/service/
│   │   └── dunning-manager.service.ts
│   ├── persistence/
│   │   ├── entity/
│   │   │   ├── payment.entity.ts
│   │   │   └── dunning-attempt.entity.ts
│   │   └── repository/
│   └── http/client/
│       ├── payment-gateway-api/
│       └── accounting-api/
├── usage/                         # Domínio: Cobrança baseada em uso
│   ├── core/service/
│   ├── persistence/
│   └── http/controller/
├── credit/                        # Domínio: Gestão de créditos
│   ├── core/service/
│   ├── persistence/
│   └── http/controller/
├── tax/                           # Domínio: Cálculo de impostos
│   ├── core/service/
│   ├── persistence/
│   └── http/client/easytax-api/
├── proration/                     # Cross-cutting: Cálculos de prorratação
│   └── core/service/
├── shared/                        # Infraestrutura compartilhada
│   ├── core/                      # Enums/interfaces comuns
│   └── persistence/               # Datasource centralizado & migrations
├── public-api/                    # Facade público
│   └── facade/
└── billing.module.ts              # Módulo NestJS único
```

---

## Trade-offs e Restrições

### Trade-offs

#### 1. Estrutura de Pastas Mais Profunda

**Antes**:
```
controllers/subscription.controller.ts  (2 níveis)
```

**Depois**:
```
subscription/http/controller/subscription.controller.ts  (4 níveis)
```

**Impacto**: Paths mais longos em imports e navegação de arquivos

#### 2. Identificação de Domínio Nem Sempre Óbvia

**Desafio**: Decidir o que constitui um "domínio"

**Perguntas surgem**:
- "Add-on" é um domínio separado ou parte de "subscription"?
- "Dunning" é separado ou parte de "payment"?
- Onde vão preocupações cross-cutting?

**Mitigação**:
- Usar linguagem de negócio como guia (falar com time de produto)
- Iterar: pode refatorar domínios conforme entendimento melhora
- Billing fornece exemplos reais dessas decisões

### Quando NÃO Usar

#### 1. Packages Muito Simples

**Critério**: < 10 arquivos, domínio único, baixa complexidade

**Exemplo**: Um package com apenas autenticação de usuário (2 services, 1 controller, 1 entity)

**Raciocínio**: Overhead de pastas de domínio não justificado

**Alternativa**: Manter estrutura simples flat ou separação mínima de layer

#### 2. Protótipos / Proof of Concepts

**Critério**: Estrutura de código pode mudar drasticamente

**Raciocínio**: Organização prematura adiciona atrito à iteração rápida

**Alternativa**: Usar estrutura simples, refatorar para domínios se POC for bem-sucedido

#### 3. Packages de Domínio Único

**Critério**: Package gerencia apenas um conceito de negócio

**Exemplo**: Um package que apenas manipula notificações de email

**Raciocínio**: Sem necessidade de separar em domínios se há apenas um

**Alternativa**: Organizar por layer se verdadeiramente simples, ou usar estrutura flat

---


## Referências

### NestJS
- [Feature Modules - Documentação Oficial](https://docs.nestjs.com/modules#feature-modules)
- [Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)

### Organização por Features
- [Go Package by Feature](https://github.com/golang-standards/project-layout) - Exemplo com boundaries técnicos
- [Package by Feature, not Layer - Philipp Hauer](https://phauer.com/2020/package-by-feature/)
- [Screaming Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)

### Projeto
- [ARCHITECTURE-GUIDELINES.md](docs/ARCHITECTURE-GUIDELINES.md)

