import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { callProviderWithJsonRepair } from "../llm/provider-router";

export interface SemanticSearchResult {
  cardId: string;
  name: string;
  similarity: number;
  matchSnippet?: string;
  tags: string[];
}

/**
 * Generates a unified character persona text string for DNA embedding calculation.
 */
export function buildCharacterDnaText(char: RoleplayCharacter): string {
  const parts: string[] = [];
  if (char.name) parts.push(`Name: ${char.name}`);
  if (char.tags?.length) parts.push(`Tags: ${char.tags.join(", ")}`);
  if (char.description) parts.push(`Description: ${char.description.slice(0, 1000)}`);
  if (char.personality) parts.push(`Personality: ${char.personality.slice(0, 800)}`);
  if (char.scenario) parts.push(`Scenario: ${char.scenario.slice(0, 600)}`);
  if (char.first_mes) parts.push(`Opening: ${char.first_mes.slice(0, 500)}`);
  return parts.join("\n\n");
}

/**
 * Standard cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple, zero-dependency token hashing vectorizer (384-dim bag-of-words projection)
 * Used as high-speed local fallback when no external/local neural embedding model is connected.
 */
export function computeLexicalVector(text: string, dimensions: number = 384): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return vec;

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  }

  // Normalize
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) sumSq += vec[i] * vec[i];
  const mag = Math.sqrt(sumSq);
  if (mag > 0) {
    for (let i = 0; i < dimensions; i++) vec[i] /= mag;
  }

  return vec;
}

/**
 * Attempts to retrieve neural embeddings from provider if supported (OpenAI embeddings endpoint or llama-server),
 * otherwise transparently falls back to local lexical vector.
 */
export async function getEmbedding(text: string, provider?: ProviderConfig): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) return computeLexicalVector("");

  if (provider && (provider.type === "openai" || provider.type === "openrouter" || provider.type === "llamacpp")) {
    try {
      const baseUrl = (provider.baseUrl || (provider.type === "llamacpp" ? "http://127.0.0.1:8080" : "https://api.openai.com")).replace(/\/+$/, "");
      const embedUrl = `${baseUrl}/v1/embeddings`;
      const model = provider.type === "openai" ? "text-embedding-3-small" : (provider.model || "default");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;

      const res = await fetch(embedUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          input: cleanText.slice(0, 4000),
          model,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.data && Array.isArray(data.data) && data.data[0]?.embedding) {
          return data.data[0].embedding;
        }
      }
    } catch {
      // Fall through to lexical vector
    }
  }

  return computeLexicalVector(cleanText);
}
