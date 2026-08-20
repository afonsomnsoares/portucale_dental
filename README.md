# Portucale Dental

**Next.js 16 · React 19 · PostgreSQL · Full Stack · App Router**

Plataforma SaaS multi-tenant para gestao de clinicas dentarias, concebida para o mercado portugues. Interface totalmente em portugues (pt-PT).

---

## Sumario do Projeto

O Portucale Dental e uma aplicacao web full-stack completa para gestao de clinicas dentarias. Suporta multi-tenancy (varias clinicas num unico deploy), tres roles de utilizador com controlo de acesso granular, e inclui funcionalidades clinicas avancadas como odontograma 2D/3D, dictacao por voz, planos de tratamento e conformidade RGPD.

---

## Stack Tecnologica

| Camada | Tecnologia | Versao | Funcao |
|--------|-----------|--------|--------|
| Framework | Next.js | ^16.2.3 | Full-stack (App Router) |
| UI | React | ^19.2.0 | Biblioteca de componentes |
| Linguagem | TypeScript | ^5.8.3 | Tipo estatico |
| Base de dados | PostgreSQL | 17 (Docker) | BD principal |
| ORM/Driver | pg | ^8.11.5 | Ligacao PostgreSQL |
| Estilo | Tailwind CSS | ^3.4.4 | CSS utility-first |
| Icones | Lucide React | ^1.22.0 | Biblioteca de icones |
| 3D | React Three Fiber | ^9.6.1 | Odontograma 3D |
| 3D Engine | Three.js | ^0.185.0 | Graficos 3D |
| Voz | Web Speech API | Nativo | Dictacao clinica (pt-PT) |
| Auth | JWT custom + bcrypt | HMAC-SHA256 | Autenticacao |
| Upload | Cloudflare R2 | S3-compativel | Armazenamento de ficheiros |
| Linter | Biome | ^2.5.0 | Lint + formatacao |
| Git Hooks | Husky | ^9.1.7 | Pre-commit hooks |
| Testes | node:test | Nativo | Testes unitarios |
| Container | Docker Compose | Multi-stage | Producao |

---

## Estrutura do Projeto

```
portucale_dental/
├── scripts/
│   ├── schema.sql                    ← Schema completo PostgreSQL (27+ tabelas)
│   ├── seed.ts                       ← Dados demo (clinica, utilizadores, pacientes)
│   ├── migrate.ts                    ← Runner de migracoes
│   ├── check-dburl.ts                ← Diagnostico DATABASE_URL
│   └── migrations/
│       └── 001_clinical_features.sql ← Migracao funcionalidades clinicas
│
├── lib/
│   ├── auth.ts                       ← JWT sign/verify, CSRF, helpers de auth
│   ├── audit.ts                      ← Audit log append-only + patient timeline
│   ├── constants.ts                  ← Design tokens, nav, codigos TANOMD
│   ├── customFields.ts               ← Normalizacao de campos dinamicos
│   ├── db.ts                         ← Pool PostgreSQL singleton
│   ├── http.ts                       ← Helpers de resposta HTTP
│   ├── permissions.ts                ← Sistema de permissoes por role
│   ├── rateLimit.ts                  ← Rate limiting em memoria
│   ├── r2.ts                         ← Cliente Cloudflare R2 / S3
│   └── validate.ts                   ← Validacao de inputs
│
├── components/
│   ├── ui.tsx                        ← Primitivas UI (Badge, Card, Modal, Table...)
│   ├── Sidebar.tsx                   ← Navegacao lateral por role
│   ├── DayCalendar.tsx               ← Vista diaria estilo Google Calendar
│   ├── Odontogram.tsx                ← Odontograma interativo 32 dentes (2D)
│   ├── Odontogram3D.tsx              ← Odontograma 3D (React Three Fiber)
│   ├── TreatmentTable.tsx            ← Tabela de tratamentos com edicao inline
│   ├── dentist/
│   │   └── PatientNotesTab.tsx       ← Notas clinicas com dictacao por voz
│   └── receptionist/
│       ├── AppointmentsTable.tsx     ← Tabela de consultas com status
│       └── AppointmentEditModal.tsx  ← Modal de edicao de consulta
│
├── hooks/
│   └── useSpeechRecognition.ts       ← Hook Web Speech API (dictacao pt-PT)
│
├── test/
│   ├── auth.test.ts                  ← Testes JWT + rotacao de secrets
│   ├── permissions.test.ts           ← Testes do sistema de permissoes
│   └── r2.test.ts                    ← Testes configuracao R2
│
├── app/
│   ├── globals.css                   ← Estilos globais (Tailwind + CSS variables)
│   ├── login.module.css              ← CSS module pagina de login
│   ├── layout.tsx                    ← Layout raiz (AuthProvider, fonts)
│   ├── page.tsx                      ← Pagina de login / Bootstrap primeiro admin
│   ├── providers.tsx                 ← AuthContext + api() helper + CSRF
│   │
│   ├── api/                          ← BACKEND (API Routes)
│   │   ├── auth/                     ← Autenticacao
│   │   │   ├── bootstrap/route.ts    ← Criacao primeiro admin
│   │   │   ├── csrf/route.ts         ← Geracao token CSRF
│   │   │   ├── login/route.ts        ← Login (bcrypt + JWT)
│   │   │   ├── logout/route.ts       ← Terminar sessao
│   │   │   └── me/route.ts           ← Info utilizador atual
│   │   │
│   │   ├── patients/                 ← Gestao de pacientes
│   │   │   ├── route.ts              ← GET (pesquisa) / POST
│   │   │   ├── import/route.ts       ← Importacao em massa
│   │   │   └── [id]/
│   │   │       ├── route.ts          ← GET / PUT detalhe paciente
│   │   │       ├── timeline/route.ts ← Timeline imutavel do paciente
│   │   │       ├── teeth/route.ts    ← Dentes do paciente
│   │   │       ├── teeth/[num]/route.ts ← PUT condicao do dente
│   │   │       └── medical-history/route.ts ← Historial medico
│   │   │
│   │   ├── appointments/             ← Gestao de consultas
│   │   │   ├── route.ts              ← GET (por data) / POST
│   │   │   └── [id]/
│   │   │       ├── route.ts          ← GET / PUT / DELETE
│   │   │       └── status/route.ts   ← PUT transicoes de estado
│   │   │
│   │   ├── treatments/               ← Tratamentos
│   │   │   ├── route.ts              ← GET (filtro) / POST
│   │   │   └── [id]/route.ts         ← GET / PUT / DELETE
│   │   │
│   │   ├── invoices/                 ← Faturacao
│   │   │   ├── route.ts              ← GET / POST
│   │   │   └── [id]/
│   │   │       ├── route.ts          ← GET / PUT
│   │   │       └── pay/route.ts      ← PUT processar pagamento
│   │   │
│   │   ├── notes/route.ts            ← Notas clinicas CRUD
│   │   ├── uploads/                  ← Upload de ficheiros
│   │   │   ├── route.ts
│   │   │   └── presign/route.ts      ← URLs presigned R2
│   │   ├── prescriptions/            ← Prescricoes
│   │   ├── lab-orders/               ← Encomendas de laboratorio
│   │   ├── treatment-plans/          ← Planos de tratamento
│   │   ├── recalls/                  ← Agendamentos de recall
│   │   ├── consent-forms/            ← Formularios de consentimento
│   │   ├── tenants/route.ts          ← Clinicas (multi-tenant)
│   │   ├── users/                    ← Gestao de utilizadores
│   │   ├── schema/                   ← Campos dinamicos
│   │   │   └── [id]/deploy/route.ts  ← Deploy global para tenants
│   │   ├── permissions/route.ts      ← Matriz de permissoes
│   │   ├── inventory/route.ts        ← Inventario
│   │   ├── audit/route.ts            ← Log de auditoria forense
│   │   ├── dashboard/stats/route.ts  ← KPIs
│   │   ├── finance/stats/route.ts    ← Estatisticas financeiras
│   │   ├── dentists/route.ts         ← Lista de dentistas
│   │   ├── analytics/noshows/route.ts ← Analise de risco no-show
│   │   ├── reports/summary/route.ts  ← Resumo de relatorios
│   │   ├── settings/route.ts         ← Tabelas de referencia
│   │   └── jobs/run/route.ts         ← Jobs de background
│   │
│   └── dashboard/
│       ├── layout.tsx                ← Auth guard + sidebar shell
│       │
│       ├── admin/                    ← AREA ADMIN
│       │   ├── page.tsx              ← Vista geral (KPIs, auditoria, estado clinicas)
│       │   ├── users/page.tsx        ← Gestao de utilizadores
│       │   ├── tenants/page.tsx      ← Motor de provisioning de clinicas
│       │   ├── schema/page.tsx       ← Gestao de campos dinamicos
│       │   ├── permissions/page.tsx  ← Matriz role-permissoes
│       │   ├── audit/page.tsx        ← Log de auditoria forense
│       │   ├── invoices/page.tsx     ← Faturas (vista admin)
│       │   ├── invoices/[id]/page.tsx ← Detalhe de fatura
│       │   ├── finance/page.tsx      ← Dashboard financeiro
│       │   ├── inventory/page.tsx    ← Inventario multi-clinica
│       │   └── reports/page.tsx      ← Dashboard de relatorios
│       │
│       ├── receptionist/             ← AREA RECEPCIONISTA
│       │   ├── page.tsx              ← Calendario diario + marcacao + KPIs
│       │   ├── appointments/page.tsx ← Gestao completa de consultas
│       │   ├── patients/page.tsx     ← Registo de pacientes
│       │   ├── treatments/page.tsx   ← Gestao de tratamentos
│       │   ├── invoices/page.tsx     ← Criacao de faturas e pagamentos
│       │   ├── invoices/[id]/page.tsx ← Detalhe de fatura
│       │   ├── finance/page.tsx      ← Vista financeira
│       │   ├── floor/page.tsx        ← Kanban de chao ao vivo
│       │   └── recalls/page.tsx      ← Gestao de recalls
│       │
│       └── dentist/                  ← AREA DENTISTA
│           ├── page.tsx              ← Dashboard clinico + calendario diario
│           ├── patients/page.tsx     ← Registos completos de pacientes
│           ├── treatments/page.tsx   ← Roadmap + tabela de tratamentos
│           ├── odontogram/page.tsx   ← Odontograma 32 dentes (2D + 3D)
│           ├── notes/page.tsx        ← Notas clinicas com dictacao por voz
│           ├── medical-history/page.tsx ← Historial medico (anamnese)
│           ├── imaging/page.tsx      ← Imagiologia medica
│           ├── prescriptions/page.tsx ← Gestao de prescricoes
│           ├── lab-orders/page.tsx   ← Encomendas de laboratorio
│           ├── treatment-plans/page.tsx ← Planos de tratamento
│           ├── recalls/page.tsx      ← Agendamentos de recall
│           └── consent-forms/page.tsx ← Formularios de consentimento
```

---

## Base de Dados

Schema completo com **27+ tabelas** PostgreSQL:

| Tabela | Funcao |
|--------|--------|
| `tenants` | Entidades multi-tenant (clinicas) |
| `users` | Contas de utilizador (admin, rececionista, dentista) |
| `patients` | Registos de pacientes com campos RGPD |
| `patient_alerts` | Alertas medicos de pacientes |
| `appointments` | Consultas agendadas com maquina de estados |
| `teeth` | Condicao por dente (1-32) |
| `treatments` | Registos de tratamento com codigos TANOMD |
| `invoices` | Faturacao com acompanhamento de pagamentos |
| `patient_timeline` | Log imutavel com hash SHA-256 dos eventos do paciente |
| `schema_fields` | Campos dinamicos por tenant |
| `treatment_codes` | Codigos de procedimentos dentarios TANOMD |
| `tooth_conditions` | Definicoes de condicoes do odontograma |
| `statuses` | Definicoes da maquina de estados de consultas |
| `audit_log` | Log de auditoria forense (REVOKE UPDATE/DELETE) |
| `inventory_items` | Itens mestre de inventario |
| `inventory_stock` | Quantidades por tenant |
| `role_permissions` | Permissoes granulares por tenant |
| `notifications` | Sistema de notificacoes (WhatsApp) |
| `job_runs` | Acompanhamento de jobs de background |
| `uploads` | Registos de upload de ficheiros |
| `medical_history` | Anamnese do paciente (alergias, medicacoes) |
| `prescriptions` | Prescricoes eletronicas |
| `lab_orders` | Encomendas de laboratorio |
| `treatment_plans` | Planos de tratamento multi-fase |
| `recalls` | Agendamentos de recall |
| `consent_forms` | Documentos de consentimento |
| `patient_data_consents` | Consentimentos de dados RGPD |
| `data_subject_requests` | Pedidos RGPD (acesso, apagamento...) |
| `processing_activities` | Registo de atividades de tratamento |
| `data_retention_policies` | Politicas de retencao de dados |
| `dpo_contacts` | Contactos do DPO |
| `privacy_notices` | Versionamento de politicas de privacidade |

---

## Funcionalidades Principais

### 1. Arquitectura Multi-Tenant
- Motor de provisioning de novas clinicas (nome, cidade, gabinetes)
- Isolamento por `tenant_id` em todas as tabelas principais
- Super Admin (sem tenant) com visao global de todas as clinicas
- Campos dinamicos podem ser implementados por tenant ou globalmente

### 2. Controlo de Acesso por Roles (3 Roles)

| Role | Acesso |
|------|--------|
| **Super Admin** | Gestao de clinicas, utilizadores, auditoria, esquema, permissoes, inventario, relatorios, financeiro |
| **Rececionista** | Registo de pacientes, marcacao de consultas, tratamentos, faturacao, kanban de chao, recalls |
| **Dentista** | Registos de pacientes, odontograma, historial medico, prescricoes, encomendas lab, planos de tratamento, notas clinicas, consentimentos, imagiologia, recalls |

### 3. Autenticacao e Seguranca
- **JWT custom** (HMAC-SHA256) com suporte a rotacao de multiplos secrets
- **bcrypt** para hashing de passwords
- **Protecao CSRF** via padrao double-submit cookie
- **Rate limiting** no login (10 tentativas / 10 minutos por IP+email)
- **Verificacao de origem** em todas as mutacoes
- **Guards de rota** por role no layout do dashboard

### 4. Maquina de Estados de Consultas
Transicoes validadas pelo servidor:
```
confirmed/registered → waiting → in-operatory → procedure-active → ready-dismissal → departed
                                                                                    \-> no-show
```
Transicoes invalidas retornam HTTP 400.

### 5. Sistema de Risco de No-Show
Calculado por paciente:
```sql
ROUND((no_show_count::numeric / NULLIF(visit_count, 0)) * 100)
```
Apresentado como badges coloridos: ALTO >= 60%, MEDIO >= 30%, BAIXO < 30%.

### 6. Timeline Imutavel do Paciente
Cada mutacao (mudanca de estado, atualizacao de dente, tratamento, fatura, nota) escreve uma linha imutavel com hash **SHA-256** em `patient_timeline`. Apresentada nas vistas de rececionista e dentista.

### 7. Vault de Auditoria Forense
Cada mutacao API regista em `audit_log` com: user_name, user_role, clinic, action, resource, before_val, after_val, hash. A tabela tem `REVOKE UPDATE, DELETE` -- append-only a nivel de base de dados.

### 8. Odontograma (2D + 3D)
- **Grafico interativo de 32 dentes** com arcadas superior (1-16) e inferior (17-32)
- Clique num dente para definir condicao (saudavel, caries, obturacao, coroa, ausente, impactado, canal, ponte, implante)
- Marcacao de superficies afetadas (Oclusal, Mesial, Distal, Vestibular, Lingual)
- Indicador a laranja para dentes com tratamentos ativos
- **Versao 3D** com React Three Fiber, controles orbitais, rotacao automatica e visualizacao em tempo real
- Adicionar tratamentos codificados TANOMD diretamente do odontograma

### 9. Notas Clinicas com Dictacao por Voz
- Integracao com **Web Speech API** para dictacao em portugues (pt-PT)
- Visualizacao de transicao em tempo real + transricao final
- Suporte a anexos (imagens, PDFs)
- Tags e metadados de ligacao
- Editor monospace com historico

### 10. Codigos de Tratamento TANOMD
Conjunto completo de **30+ codigos** de procedimentos dentarios portugueses:
- 01 Consulta
- 02 Medicina Dentaria Preventiva
- 03 Dentisteria Operatoria
- 04 Endodontia
- 05 Cirurgia Oral
- 06 Periodontologia
- 07 Implantologia
- 08 Protese
- 10 Radiologia

### 11. Vista de Calendario Diario
- Vista estilo **Google Calendar** (07:00 - 17:00)
- Blocos de consulta posicionados com offsets de lane
- Linha vermelha "agora"
- Clique para selecionar com badge de status e score de risco
- Botao de avanco de status com um clique

### 12. Gestao Financeira
- Criacao de faturas com linhas de item
- Processamento de pagamentos (parcial/completo)
- Metodos de pagamento (Multibanco, seguro, numerario)
- Dashboard de estatisticas financeiras
- Acompanhamento de saldos em divida

### 13. Conformidade RGPD
- Acompanhamento de consentimento de dados do paciente
- Pedidos de titulares de dados (acesso, retificacao, apagamento, portabilidade, restricao, oposicao)
- Registo de atividades de tratamento
- Politicas de retencao de dados (acoes: apagar, anonimizar, arquivar)
- Gestao de contactos DPO
- Versionamento de politicas de privacidade

### 14. Funcionalidades Clinicas
- **Historial medico** (anamnese): alergias, medicacoes, condicoes, historial familiar, tabagismo, gravidez
- **Prescricoes**: medicacao, dosagem, frequencia, via, duracao, renovacoes, instrucoes
- **Encomendas de laboratorio**: nome do lab, tipo de caso, dentes, custo, tracking
- **Planos de tratamento**: planos multi-fase com workflow de aprovacao e assinaturas digitais
- **Formularios de consentimento**: consentimento especifico por procedimento
- **Agendamentos de recall**: intervalos configuraveis (checkup, profilaxia, follow-up)
- **Imagiologia**: upload e gestao de imagens dentarias

### 15. Inventario Multi-Clinica
- Itens mestre com limiares de reabastecimento
- Quantidades por tenant
- Alertas de stock baixo / sem stock

### 16. Campos Dinamicos
- Campos definidos pelo admin (string, boolean, integer, decimal, enum, uuid_ref)
- Implementacao por tenant ou global com percentagens de rollout
- Enforco de campos obrigatorios

---

## Credenciais Demo

Criadas com `npm run db:seed -- --with-demo-users`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@portucale.dental | admin123 |
| Recepcionista | reception@nyc.io | recep123 |
| Dentista | dentist@nyc.io | dent123 |

---

## Comandos NPM

| Comando | Funcao |
|---------|--------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run start` | Servidor de producao |
| `npm run test` | Executar testes |
| `npm run lint` | Verificar lint (Biome) |
| `npm run lint:fix` | Corrigir lint automaticamente |
| `npm run format` | Formatar codigo |
| `npm run typecheck` | Verificacao de tipos TypeScript |
| `npm run db:seed` | Semear base de dados com dados demo |
| `npm run db:reset` | Resetar e semear novamente |
| `npm run db:migrate` | Executar migracoes |

---

## Variaveis de Ambiente

| Variavel | Funcao | Default |
|----------|--------|---------|
| `DATABASE_URL` | URL de ligacao PostgreSQL | `postgresql://postgres:password@localhost:5432/portucale_dental` |
| `JWT_SECRET` | Chave de assinatura JWT | -- |
| `JWT_TTL_SECONDS` | Validade do token | `604800` (7 dias) |
| `R2_ENDPOINT` | Endpoint Cloudflare R2 | Opcional |
| `R2_BUCKET` | Bucket R2 | Opcional |
| `R2_ACCESS_KEY_ID` | Credenciais R2 | Opcional |
| `R2_SECRET_ACCESS_KEY` | Credenciais R2 | Opcional |
| `R2_PUBLIC_BASE_URL` | URL publica de uploads | Opcional |
| `WHATSAPP_ACCESS_TOKEN` | Token WhatsApp Business API | Opcional |
| `WHATSAPP_PHONE_NUMBER_ID` | Telefone WhatsApp | Opcional |
| `UPLOAD_RETENTION_DAYS` | Politica de retencao de ficheiros | 90 |

---

## Docker

Servicos disponiveis via `docker-compose.yml`:

| Servico | Imagem | Porta | Funcao |
|---------|--------|-------|--------|
| `postgres` | postgres:17-alpine | 5432 | Base de dados |
| `pgadmin` | dpage/pgadmin4:latest | 5050 | Interface de gestao da BD |
| `app` | Build customizado | 3000 | Aplicacao Next.js |

---

## Padroes Arquitectonicos

1. **Validacao server-side**: Todas as rotas API validam inputs com `lib/validate.ts` e verificam permissoes com `lib/permissions.ts`
2. **Audit trail**: Cada mutacao passa por `appendAudit()` e `appendTimeline()` com hash SHA-256
3. **CSRF double-submit**: Cookie + token header em todas as mutacoes nao-GET
4. **Maquina de estados**: Transicoes de consulta validadas contra estados permitidos na BD
5. **Estado cliente**: React Context (`AuthProvider`) gere estado de auth e fornece helper `api()` centralizado com CSRF automatico
6. **Cache de configuracao**: Tabelas de referencia (codigos TANOMD, condicoes de dentes, estados) sao buscadas uma vez e cacheadas no contexto de auth
7. **Multi-tenancy**: Isolamento via `tenant_id` foreign keys, com bypass de admin para super admins

---

## Melhorias Futuras

| Area | Atual | Caminho de upgrade |
|------|-------|-------------------|
| Auth | JWT custom | NextAuth.js ou Clerk |
| Passwords | bcrypt | Manter (ja seguro) |
| Tempo real | Refetch apos acao | Pusher / Ably WebSockets |
| Notas clinicas | Texto plano | AES-256 com KMS por clinica |
| Deploy | localhost | Vercel (Edge) ou VPC privada |

---

## Licenca

Projecto privado -- Portucale Dental
