'use client';

import { useCallback, useState } from 'react';
import { useAppStore } from '@/hooks/use-scraper';
import { Message } from '@/stores/app-store';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const { messages, scrapes, scraping, scrapeElapsed, viewMode, addMessage, setViewMode } = useAppStore();
  const { sendPrompt, isConnected } = useScraper();

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    addMessage(userMsg);
    setInputValue('');
    setViewMode('chat-active');

    sendPrompt(inputValue.trim());
  }, [inputValue, addMessage, setInputValue, setViewMode, sendPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">QwenScraper</h1>
          <p className="text-gray-400 text-center">
            {isConnected ? '● Conectado' : '○ Desconectado'}
            {scraping && ` | Tempo: ${scrapeElapsed}s`}
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Panel */}
          <div className="bg-gray-800 rounded-lg p-6 min-h-[500px]">
            <h2 className="text-xl font-semibold mb-4">Chat</h2>
            
            {viewMode === 'chat-empty' ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <p>Digite um prompt para começar</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 ml-auto max-w-[80%]'
                        : msg.role === 'system'
                        ? 'bg-red-600'
                        : 'bg-gray-700 mr-auto max-w-[80%]'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs text-gray-400 mt-2 block">{msg.timestamp}</span>
                  </div>
                ))}
                {scraping && (
                  <div className="bg-gray-700 p-4 rounded-lg mr-auto max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-gray-400">Scraping em andamento...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu prompt..."
                disabled={scraping}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || scraping}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados</h2>
            
            {scrapes.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <p>Nenhum scrape realizado ainda</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {scrapes.map((scrape) => (
                  <div key={scrape.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-blue-400">{scrape.model}</h3>
                      <span className="text-xs text-gray-400">{scrape.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3 line-clamp-3">{scrape.response}</p>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Duração: {scrape.duration.toFixed(1)}s</span>
                      <span>ID: {scrape.id.slice(0, 12)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
