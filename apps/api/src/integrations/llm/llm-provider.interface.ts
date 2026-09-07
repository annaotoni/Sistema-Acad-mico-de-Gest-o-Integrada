export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
}

export interface LlmContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  text?: string;
}

export interface LlmTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface LlmResponse {
  content: LlmContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | (string & {});
}

export const LLM_PROVIDER = 'LLM_PROVIDER';

export interface ILlmProvider {
  chat(
    messages: LlmMessage[],
    tools?: LlmTool[],
    systemPrompt?: string,
  ): Promise<LlmResponse>;
}
