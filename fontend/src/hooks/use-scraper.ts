import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/app-store';
import { ScrapeResult, WebSocketInboundMessage, WebSocketOutboundMessage } from '../types/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export function useScraper() {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const { 
    setScraping, 
    setScrapeElapsed, 
    addScrape, 
    addMessage, 
    updateMessage,
    scraping
  } = useAppStore();

  // Conectar WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL + '/api/scrape/ws');

    ws.onopen = () => {
      console.log('[WebSocket] Conectado');
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketInboundMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'status':
            setScraping(true);
            break;

          case 'chunk': {
            // Criar mensagem de streaming se não existir
            const streamId = 'stream-current';
            const existingMsg = useAppStore.getState().messages.find(m => m.id === streamId);
            
            if (!existingMsg) {
              addMessage({
                id: streamId,
                role: 'agent',
                content: msg.payload as string,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              });
            } else {
              updateMessage(streamId, {
                content: existingMsg.content + (msg.payload as string),
              });
            }
            break;
          }

          case 'done': {
            const result = msg.payload as ScrapeResult;
            
            // Parar timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            // Atualizar mensagem de streaming para final
            const streamId = 'stream-current';
            updateMessage(streamId, {
              id: result.id,
              content: result.response,
            });

            // Adicionar resultado aos scrapes
            addScrape(result);
            setScraping(false);
            setScrapeElapsed(0);
            break;
          }

          case 'error':
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setScraping(false);
            setScrapeElapsed(0);
            
            addMessage({
              id: `error-${Date.now()}`,
              role: 'system',
              content: `Erro: ${msg.payload}`,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            });
            break;
        }
      } catch (error) {
        console.error('[WebSocket] Erro ao processar mensagem:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] Desconectado');
      
      // Tentar reconectar
      if (reconnectAttempts.current < maxReconnectAttempts && scraping) {
        reconnectAttempts.current += 1;
        console.log(`[WebSocket] Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        setTimeout(connectWebSocket, 2000 * reconnectAttempts.current);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Erro:', error);
    };

    wsRef.current = ws;
  }, [setScraping, setScrapeElapsed, addScrape, addMessage, updateMessage, scraping]);

  // Enviar prompt
  const sendPrompt = useCallback((prompt: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Não conectado');
      addMessage({
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Erro: Não foi possível conectar ao servidor de scrape.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
      return;
    }

    // Iniciar timer de elapsed
    let elapsed = 0;
    setScrapeElapsed(0);
    setScraping(true);
    
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setScrapeElapsed(elapsed);
    }, 1000);

    // Enviar mensagem
    const msg: WebSocketOutboundMessage = {
      type: 'prompt',
      payload: prompt,
    };

    wsRef.current.send(JSON.stringify(msg));
  }, [setScraping, setScrapeElapsed, addMessage]);

  // Conectar ao montar componente
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return { sendPrompt, isConnected };
}
