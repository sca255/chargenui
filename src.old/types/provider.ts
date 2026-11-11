// Model Provider configuration and types

export type ProviderType = "none" | "gemini" | "openrouter" | "openai" | "anthropic" | "ollama" | "llamacpp";

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  visionModel?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessagePart[];
  /** Native OpenAI-style tool calls (assistant messages only; OpenAI-compatible providers). */
  tool_calls?: ToolCallRequest[];
  /** Correlates a `role: "tool"` message with the assistant tool_call that produced it. */
  tool_call_id?: string;
}

export interface ToolCallRequest {
  id: string;
  type?: "function";
  function: { name: string; arguments: string };
}

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImagePart {
  type: "image_url";
  image_url: {
    url: string; // http url or data:image/...;base64,...
  };
}

export type MessagePart = TextPart | ImagePart;

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}
