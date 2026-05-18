import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { askQwen, closeBrowser } from './scraper/qwen.js';
import { logger } from './utils/logger.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = parseInt(process.env.PORT) || 3001;

// Criar instância Fastify
const fastify = Fastify({
  logger: false // Usamos nosso próprio logger (pino)
});

// Registrar plugins
await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'OPTIONS']
});

await fastify.register(websocket);

// Armazenar conexões WebSocket ativas
const wsConnections = new Map();

// Rota de saúde
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota REST POST /api/scrape
fastify.post('/api/scrape', async (request, reply) => {
  const { prompt, conversationId } = request.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return reply.status(400).send({ 
      error: 'Prompt é obrigatório e deve ser uma string não vazia' 
    });
  }

  try {
    logger.info({ prompt: prompt.substring(0, 50) }, 'Recebida requisição de scrape');

    const result = await askQwen(prompt.trim(), conversationId);

    logger.info({ duration: result.duration }, 'Scrape completado com sucesso');

    reply.send(result);
  } catch (error) {
    logger.error({ error: error.message }, 'Erro ao processar scrape');
    reply.status(500).send({ 
      error: 'Falha ao obter resposta do Qwen. Tente novamente.' 
    });
  }
});

// Rota WebSocket /api/scrape/ws
fastify.get('/api/scrape/ws', { websocket: true }, async (connection, req) => {
  const wsId = `ws-${Date.now()}`;
  logger.info({ wsId }, 'Nova conexão WebSocket estabelecida');

  wsConnections.set(wsId, connection.socket);

  connection.socket.on('message', async (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'prompt') {
        const { payload: prompt, conversationId } = msg;

        if (!prompt || typeof prompt !== 'string') {
          connection.socket.send(JSON.stringify({
            type: 'error',
            payload: 'Prompt inválido'
          }));
          return;
        }

        logger.info({ wsId, prompt: prompt.substring(0, 50) }, 'Recebido prompt via WebSocket');

        // Enviar status inicial
        connection.socket.send(JSON.stringify({
          type: 'status',
          payload: 'scraping'
        }));

        const startTime = Date.now();

        // Executar scrape
        const result = await askQwen(prompt.trim(), conversationId);

        // Simular streaming dividindo a resposta em chunks
        const responseText = result.response;
        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < responseText.length; i += chunkSize) {
          chunks.push(responseText.slice(i, i + chunkSize));
        }

        // Enviar chunks com delay de 30ms entre cada
        for (const chunk of chunks) {
          await new Promise(resolve => setTimeout(resolve, 30));
          connection.socket.send(JSON.stringify({
            type: 'chunk',
            payload: chunk
          }));
        }

        // Calcular duração final
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // Enviar evento done com metadados completos
        connection.socket.send(JSON.stringify({
          type: 'done',
          payload: {
            id: `scrape-${Date.now()}`,
            response: responseText,
            duration: parseFloat(duration),
            model: result.model || 'Qwen-Turbo-Latest',
            conversationId: result.conversationId || `conv_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        }));

        logger.info({ wsId, duration }, 'WebSocket scrape completado');
      }
    } catch (error) {
      logger.error({ wsId, error: error.message }, 'Erro ao processar mensagem WebSocket');
      
      connection.socket.send(JSON.stringify({
        type: 'error',
        payload: `Erro interno: ${error.message}`
      }));
    }
  });

  connection.socket.on('close', () => {
    logger.info({ wsId }, 'Conexão WebSocket fechada');
    wsConnections.delete(wsId);
  });

  connection.socket.on('error', (error) => {
    logger.error({ wsId, error: error.message }, 'Erro na conexão WebSocket');
    wsConnections.delete(wsId);
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Iniciando shutdown gracioso');

  // Fechar todas as conexões WebSocket
  for (const [wsId, socket] of wsConnections.entries()) {
    try {
      socket.close(1000, 'Server shutting down');
    } catch (e) {
      logger.warn({ wsId }, 'Erro ao fechar WebSocket');
    }
  }
  wsConnections.clear();

  // Fechar browser Playwright
  try {
    await closeBrowser();
  } catch (e) {
    logger.warn('Erro ao fechar browser');
  }

  // Fechar servidor Fastify
  await fastify.close();

  logger.info('Servidor encerrado');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Iniciar servidor
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  logger.info(`Server running on port ${PORT}`);
} catch (error) {
  logger.error({ error: error.message }, 'Falha ao iniciar servidor');
  process.exit(1);
}
