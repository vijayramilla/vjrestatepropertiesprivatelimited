import type { AiProperty } from './dataConnector';
import type { QueryIntent } from './ragEngine';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  properties?: AiProperty[];
  intent?: QueryIntent;
  sources?: string[];
  calculations?: Record<string, unknown>;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  isLoading?: boolean;
  timestamp: number;
}

const MAX_MESSAGES = 60;

/**
 * In-memory, per-session conversation store. Kept intentionally simple:
 * no persistence, no PII — just enough history for the RAG engine to stay
 * context-aware across turns.
 */
class ConversationStore {
  private history: AiMessage[] = [];

  getHistory(): AiMessage[] {
    return this.history;
  }

  addMessage(message: Omit<AiMessage, 'id' | 'timestamp'>): AiMessage {
    const entry: AiMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    this.history = [...this.history, entry].slice(-MAX_MESSAGES);
    return entry;
  }

  /** Replace a placeholder (e.g. the typing indicator) with a real message. */
  replaceMessage(id: string, message: Partial<Omit<AiMessage, 'id'>>): void {
    this.history = this.history.map((m) => (m.id === id ? { ...m, ...message, isLoading: false } : m));
  }

  removeMessage(id: string): void {
    this.history = this.history.filter((m) => m.id !== id);
  }

  clear(): void {
    this.history = [];
  }
}

export const conversationStore = new ConversationStore();
