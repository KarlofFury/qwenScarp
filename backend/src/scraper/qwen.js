import { chromium } from 'playwright';
import { loadSession, saveSession } from './session.js';
import { logger } from '../utils/logger.js';

const QWEN_URL = process.env.QWEN_URL || 'https://chat.qwen.ai';
const RESPONSE_TIMEOUT = parseInt(process.env.RESPONSE_TIMEOUT) || 60000;

// Seletores CSS atualizados para o Qwen Chat
const selectors = {
  textarea: 'textarea[placeholder*="digitar"]',
  sendBtn: 'button[class*="send"]',
  copyBtn: 'button[class*="copy"]',
  responseContainer: 'div[class*="response"]',
  loadingIndicator: 'div[class*="loading"]'
};

let browser = null;
let context = null;
let page = null;

export async function initBrowser() {
  if (browser) return;

  const headless = process.env.HEADLESS === 'true';
  logger.info({ headless }, 'Iniciando browser Playwright');

  browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  page = await context.newPage();

  // Carregar sessão se existir
  const sessionLoaded = await loadSession(context);
  if (sessionLoaded) {
    logger.info('Sessão carregada com sucesso');
  } else {
    logger.warn('Nenhuma sessão encontrada - login manual necessário');
  }

  await page.goto(QWEN_URL, { waitUntil: 'networkidle', timeout: 30000 });
  logger.info(`Navegado para ${QWEN_URL}`);
}

export async function askQwen(prompt, conversationId = null) {
  if (!page) {
    await initBrowser();
  }

  const startTime = Date.now();
  logger.info({ prompt: prompt.substring(0, 50) }, 'Iniciando scrape');

  try {
    // Esperar textarea estar visível e habilitada
    await page.waitForSelector(selectors.textarea, { state: 'visible', timeout: 10000 });
    
    // Limpar textarea e digitar prompt com delay humano
    const textarea = await page.$(selectors.textarea);
    await textarea.click();
    await textarea.fill('');
    
    // Digitação simulada (anti-bot)
    const chars = prompt.split('');
    for (const char of chars) {
      await textarea.type(char, { delay: 50 + Math.random() * 50 });
    }

    // Clicar botão de enviar
    const sendBtn = await page.$(selectors.sendBtn);
    if (sendBtn) {
      await sendBtn.click();
    } else {
      // Fallback: Enter
      await textarea.press('Enter');
    }

    logger.info('Prompt enviado, aguardando resposta...');

    // Aguardar indicador de loading desaparecer
    try {
      await page.waitForSelector(selectors.loadingIndicator, { state: 'detached', timeout: RESPONSE_TIMEOUT });
    } catch (e) {
      logger.warn('Loading indicator não desapareceu, tentando continuar');
    }

    // Aguardar resposta aparecer
    await page.waitForSelector(selectors.responseContainer, { state: 'visible', timeout: RESPONSE_TIMEOUT });

    // Extrair resposta
    const responseElement = await page.$(selectors.responseContainer);
    const response = await responseElement.textContent();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info({ duration, responseLength: response.length }, 'Resposta obtida com sucesso');

    return {
      response: response.trim(),
      duration: parseFloat(duration),
      model: 'Qwen-Turbo-Latest',
      conversationId: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Erro ao fazer scrape');
    
    // Salvar screenshot para debug
    await page.screenshot({ path: `./data/error-${Date.now()}.png` });
    
    throw new Error(`Falha ao obter resposta: ${error.message}`);
  }
}

export async function closeBrowser() {
  if (context) {
    await saveSession(context);
    logger.info('Sessão salva');
  }
  
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
    logger.info('Browser fechado');
  }
}

// Export para graceful shutdown
export { browser, context, page };
