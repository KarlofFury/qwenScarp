import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COOKIES_PATH = process.env.COOKIES_PATH || './data/session.json';

export async function loadSession(context) {
  try {
    if (!fs.existsSync(COOKIES_PATH)) {
      return false;
    }

    const sessionData = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies = JSON.parse(sessionData);

    await context.addCookies(cookies);
    logger.info({ cookieCount: cookies.length }, 'Sessão carregada do arquivo');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Falha ao carregar sessão');
    return false;
  }
}

export async function saveSession(context) {
  try {
    const cookies = await context.cookies();
    
    if (cookies.length === 0) {
      logger.warn('Nenhum cookie para salvar');
      return false;
    }

    // Garantir que diretório existe
    const dir = path.dirname(COOKIES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    logger.info({ cookieCount: cookies.length }, 'Sessão salva com sucesso');
    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Falha ao salvar sessão');
    return false;
  }
}
