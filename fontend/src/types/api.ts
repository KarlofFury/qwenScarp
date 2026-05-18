export interface ScrapeRequest {
  prompt: string;
  conversationId?: string;
}

export interface ScrapeResponse {
  id: string;
  response: string;
  duration: number;
  model: string;
  conversationId: string;
  timestamp: string;
}

export interface ScrapeError {
  error: string;
  details?: Array<{ path: string; message: string }>;
}

export interface WebSocketInboundMessage {
  type: 'status' | 'chunk' | 'done' | 'error';
  payload: string | ScrapeResponse | Record<string, unknown>;
}

export interface WebSocketOutboundMessage {
  type: 'prompt';
  payload: string;
  conversationId?: string;
}
