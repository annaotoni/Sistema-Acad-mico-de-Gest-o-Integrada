import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ILlmProvider, LlmMessage, LlmResponse, LlmTool } from './llm-provider.interface';

@Injectable()
export class AnthropicProvider implements ILlmProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001');
  }

  async chat(messages: LlmMessage[], tools?: LlmTool[], systemPrompt?: string): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 1024,
      messages,
    };
    if (tools?.length) body['tools'] = tools;
    if (systemPrompt) body['system'] = systemPrompt;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    return res.json() as Promise<LlmResponse>;
  }
}
