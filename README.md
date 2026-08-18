# Lumos Connect 🌟

Plataforma educacional com foco em tecnologia assistiva e acessibilidade, inspirada na Geekie One.

## ✨ Funcionalidades

### Para estudantes
- Visualizar e realizar atividades (Quiz, Flashcard, Verdadeiro/Falso, Múltipla Escolha, Associação, Texto)
- Acompanhar progresso por matéria
- Agenda com calendário e eventos
- Configurações de acessibilidade (tamanho de fonte, alto contraste, redução de animações, fonte para dislexia, etc.)
- Modo Foco para concentração

### Para administradores
- Criar, editar, duplicar e excluir atividades
- Definir tipo, matéria, questões e alternativas
- Publicar ou desativar atividades
- Gerenciar usuários e roles
- Dashboard com estatísticas

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) |
| Backend | Node.js + Express |
| Banco de dados | **MySQL** (migrado do Prisma/PostgreSQL) |
| Autenticação | JWT + bcrypt |
| Ícones | Lucide |

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+
- MySQL 8.0+

### 1. Clone o projeto
```bash
git clone <seu-repo>
cd lumos-connect
```

### 2. Configure o banco de dados

Crie o arquivo `.env` no diretório `back-end/` (use `.env.example` como base):

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=lumos_connect
JWT_SECRET=sua_chave_secreta
```

### 3. Instale as dependências do backend
```bash
cd back-end
npm install
```

### 4. Inicialize o banco de dados
```bash
# Cria o banco e todas as tabelas
npm run db:init

# Insere dados de exemplo (admin + estudante + atividades)
npm run db:seed
```

### 5. Inicie o servidor
```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

O backend ficará disponível em `http://localhost:3000`

### 6. Abra o frontend

Abra o arquivo `front-end/index.html` diretamente no navegador, ou sirva com um servidor estático:

```bash
# Usando npx serve (instala globalmente se necessário)
npx serve front-end

# Ou com Python
cd front-end
python3 -m http.server 8080
```

> **Importante:** O frontend acessa a API em `http://localhost:3000`. Se mudar a porta do backend, edite a variável `API_URL` em `front-end/js/api.js`.

---

## 👥 Usuários padrão (após seed)

| Tipo | E-mail | Senha |
|------|--------|-------|
| Admin | `admin@lumos.com` | `Admin@123` |
| Estudante | `estudante@lumos.com` | `Student@123` |

---

## 📁 Estrutura do projeto

```
lumos-connect/
├── back-end/
│   ├── src/
│   │   ├── db/
│   │   │   ├── init.js        # Cria tabelas MySQL
│   │   │   └── seed.js        # Dados iniciais
│   │   ├── lib/
│   │   │   └── db.js          # Pool de conexão MySQL
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js
│   │   │   └── adminMiddleware.js
│   │   ├── routes/
│   │   │   ├── activityRoutes.js   # CRUD + submit + duplicar + publicar
│   │   │   ├── authRoutes.js
│   │   │   ├── agendaRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── profileRoutes.js
│   │   │   ├── progressRoutes.js
│   │   │   ├── studySessionRoutes.js
│   │   │   └── userRoutes.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── front-end/
    ├── assets/
    │   ├── images/
    │   └── logo/
    ├── css/
    │   ├── variables.css
    │   ├── global.css
    │   └── accessibility.css
    ├── js/
    │   ├── api.js             # Helper de requisições HTTP
    │   ├── auth.js            # Login/logout/register
    │   ├── authGuard.js       # Redireciona se não autenticado
    │   └── accessibility.js   # Aplica configurações de acessibilidade
    ├── pages/
    │   ├── login/
    │   ├── cadastro/
    │   ├── inicio/
    │   ├── atividades/        # Motor de atividades interativas
    │   ├── progresso/
    │   ├── agenda/
    │   ├── configuracoes/     # Acessibilidade + perfil
    │   └── admin/             # Painel administrativo
    └── index.html
```

---

## 🎯 Tipos de atividades suportados

| Tipo | Descrição |
|------|-----------|
| `STANDARD` | Texto/leitura com questões opcionais |
| `QUIZ` | Questões mistas com pontuação |
| `FLASHCARD` | Cards com frente/verso (virar para ver resposta) |
| `TRUE_FALSE` | Verdadeiro ou Falso |
| `MULTIPLE_CHOICE` | Múltipla escolha com alternativas |
| `MATCHING` | Associação de conceitos (termos ↔ definições) |
| `GAME` | Jogo educativo (extensível) |

---

## ♿ Acessibilidade

As configurações de acessibilidade são salvas no `localStorage` e aplicadas automaticamente em todas as páginas via `js/accessibility.js`:

- **Tamanho de fonte:** Normal, Grande, Muito grande
- **Alto contraste**
- **Reduzir animações**
- **Indicadores de foco visíveis**
- **Maior espaçamento de texto**
- **Fonte para dislexia**
- **Modo Foco** (reduz distrações na sidebar)

---

## 🔌 API Endpoints

### Autenticação
- `POST /auth/register` — Criar conta
- `POST /auth/login` — Login
- `GET /auth/me` — Dados do usuário logado

### Atividades
- `GET /activities` — Listar (com progresso do usuário)
- `GET /activities/admin/all` — Listar para admin
- `GET /activities/:id` — Detalhe com questões
- `POST /activities` — Criar (admin)
- `PUT /activities/:id` — Editar (admin)
- `DELETE /activities/:id` — Excluir (admin)
- `POST /activities/:id/duplicate` — Duplicar (admin)
- `PATCH /activities/:id/publish` — Publicar/desativar (admin)
- `POST /activities/:id/submit` — Enviar respostas

### Outros
- `GET/PUT /profile` — Perfil do usuário
- `GET/POST/PUT/DELETE /agenda` — Agenda
- `GET/PUT /progress` — Progresso por matéria
- `GET /dashboard` — Dados do dashboard

---

## 📦 Deploy

Para deploy em produção:

1. Configure variáveis de ambiente no servidor
2. Execute `npm run db:init` para criar as tabelas
3. Execute `npm start` no backend
4. Sirva o diretório `front-end/` com nginx ou qualquer servidor estático
5. Configure CORS e `API_URL` no frontend para apontar ao domínio do backend

---

## 📝 Licença

MIT — desenvolvido para fins educacionais.
