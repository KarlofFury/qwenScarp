# QwenScraper Agent 🤖

Agente que usa Playwright para automatizar o [chat.qwen.ai](https://chat.qwen.ai) e capturar respostas do modelo Qwen em uma interface própria.

> ⚠️ **Uso educacional/pesquisa apenas.** Scraping de interfaces de chat pode violar os termos de serviço das plataformas.

---

## Pré-requisitos

- **Node.js 20+** → [nodejs.org](https://nodejs.org)
- **Windows 10/11** (ou WSL2)
- Conta no [chat.qwen.ai](https://chat.qwen.ai)

---

## Setup rápido (Windows)

```powershell
# 1. Entre na pasta do projeto
cd qwenscraper

# 2. Instale as dependências
npm install

# 3. Instale o browser Chromium do Playwright
npm run install:browser

# 4. Copie o arquivo de configuração
copy .env.example .env

# 5. (Opcional) Edite o .env para ajustar configurações
notepad .env
```

---

## Primeiro uso — Login manual

Na primeira execução, o scraper **abre uma janela do browser** para você fazer login no Qwen. Após o login:

1. Volte ao terminal
2. Pressione **ENTER**
3. A sessão é salva em `data/session.json` — logins futuros são automáticos

```powershell
# Rodar o teste rápido
npm run test:scraper

# Ou passar um prompt customizado
node src/scraper/test.js "Explique o que é recursão em uma frase"
```

---

## Estrutura do projeto

```
qwenscraper/
├── src/
│   ├── index.js              # Entrypoint
│   ├── scraper/
│   │   ├── qwen.js           # ⭐ Core do scraper (Playwright)
│   │   ├── session.js        # Gerenciamento de cookies/sessão
│   │   └── test.js           # Script de teste rápido
│   └── utils/
│       └── logger.js         # Logger (pino)
├── data/                     # Criado automaticamente (gitignore)
│   └── session.json          # Cookies da sessão salva
├── .env.example
├── .env                      # Sua configuração local (não commitar)
└── package.json
```

---

## Como funciona o scraper

```
Usuário digita prompt
        ↓
Playwright abre chat.qwen.ai
        ↓
Digita o prompt no textarea (com delay simulando humano)
        ↓
Pressiona Enter
        ↓
Aguarda botão "Copiar" aparecer na resposta
(ele só aparece quando a geração termina)
        ↓
Clica no botão → lê o clipboard
        ↓
Retorna a resposta como string
```

---

## Ajustando seletores

Se o Qwen atualizar a interface e o scraper parar de funcionar, inspecione o DOM:

1. Abra `https://chat.qwen.ai` no Chrome
2. Envie uma mensagem
3. Clique com botão direito no botão de copiar → **Inspecionar**
4. Copie o seletor CSS e atualize `copyBtnSelector` em `src/scraper/qwen.js`

---

## Próximos passos (roadmap)

- [ ] Backend: Fastify + WebSocket (`src/server/`)
- [ ] Frontend: React + interface de chat
- [ ] Banco de dados: SQLite (histórico de conversas)
- [ ] Docker: containerização com Xvfb para headless no Linux
