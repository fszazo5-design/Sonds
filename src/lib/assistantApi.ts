import type { LocalSyncIdentity } from './neonSync';

export type AssistantSource = { id: number; title: string; sourceType: string; sourceUrl: string | null };
export type AssistantChatResponse = {
  conversationId: string;
  reply: string;
  sources: AssistantSource[];
};

export async function sendAssistantMessage(
  apiBaseUrl: string,
  identity: LocalSyncIdentity,
  message: string,
  conversationId?: string,
): Promise<AssistantChatResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/assistant/chat`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: identity.deviceId,
      deviceSecret: identity.deviceSecret,
      conversationId,
      message,
    }),
  });
  if (!response.ok) {
    throw new Error(`assistant_http_${response.status}`);
  }
  return await response.json() as AssistantChatResponse;
}
