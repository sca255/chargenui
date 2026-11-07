// Web Search & Lore Retrieval Service
// Supports free DuckDuckGo search, Tavily, Brave, and SearXNG
// Enhanced with Dual-Pass Fan Headcanons & High Token Budget Lore Retrieval

import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface LoreRetrievalResult {
  query: string;
  source: string;
  results: SearchResultItem[];
  canonLore: string;
  fanHeadcanons: string;
  condensedLore: string;
}

/**
 * Free DuckDuckGo HTML search scraper (No API key needed!)
 * Enhanced to fetch up to 12 results with high-token density.
 */
export async function searchDuckDuckGo(query: string): Promise<SearchResultItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`DuckDuckGo returned HTTP ${res.status}`);
    const html = await res.text();

    const results: SearchResultItem[] = [];
    const resultBlocks = html.split('<div class="result results_links');

    for (let i = 1; i < Math.min(resultBlocks.length, 14); i++) {
      const block = resultBlocks[i];

      const titleMatch = block.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

      if (titleMatch) {
        let link = titleMatch[1];
        const uddgMatch = link.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          link = decodeURIComponent(uddgMatch[1]);
        }

        const rawTitle = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const rawSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        if (rawTitle && link) {
          results.push({
            title: rawTitle,
            url: link,
            snippet: rawSnippet,
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.warn("DuckDuckGo search fallback:", err);
    return [];
  }
}

/**
 * Searches Tavily API if configured (up to 10 results)
 */
export async function searchTavily(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 10,
    }),
  });

  if (!res.ok) throw new Error(`Tavily search error HTTP ${res.status}`);
  const data = (await res.json()) as any;

  const results: SearchResultItem[] = [];
  if (data.answer) {
    results.push({
      title: "Direct Answer & Overview",
      url: "https://tavily.com",
      snippet: data.answer,
    });
  }

  if (Array.isArray(data.results)) {
    for (const r of data.results) {
      results.push({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
      });
    }
  }

  return results;
}

/**
 * Searches Brave Search API if configured (up to 10 results)
 */
export async function searchBrave(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) throw new Error(`Brave search error HTTP ${res.status}`);
  const data = (await res.json()) as any;

  const results: SearchResultItem[] = [];
  if (Array.isArray(data.web?.results)) {
    for (const r of data.web.results) {
      results.push({
        title: r.title || "",
        url: r.url || "",
        snippet: r.description || "",
      });
    }
  }

  return results;
}

/**
 * Searches SearXNG instance if configured (up to 10 results)
 */
export async function searchSearXNG(query: string, instanceUrl: string): Promise<SearchResultItem[]> {
  const cleanUrl = instanceUrl.replace(/\/+$/, "");
  const url = `${cleanUrl}/search?q=${encodeURIComponent(query)}&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SearXNG error HTTP ${res.status}`);
  const data = (await res.json()) as any;

  const results: SearchResultItem[] = [];
  if (Array.isArray(data.results)) {
    for (const r of data.results.slice(0, 10)) {
      results.push({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
      });
    }
  }

  return results;
}

/**
 * Uses LLM to synthesize targeted search queries:
 * 1. Canon background & wiki facts
 * 2. Community fan headcanons, mindcanons, romantic dynamics & creative tropes
 */
export async function synthesizeFandomSearchQueries(
  concept: string,
  provider?: ProviderConfig
): Promise<{ canonQuery: string; headcanonQuery: string }> {
  // If provider is configured, use it to generate razor-sharp queries
  if (provider && provider.type !== "none") {
    try {
      const prompt = `Given this character concept: "${concept}", output two optimized search engine queries:
1. "canonQuery": To find official wiki lore, background, abilities, voice lines, and canon facts.
2. "headcanonQuery": To find creative fan headcanons, mindcanons, relationship dynamics, romantic tropes, fan theories, and personality analyses.

Output strictly JSON:
{
  "canonQuery": "...",
  "headcanonQuery": "..."
}`;
      const res = await routeLLMJson<{ canonQuery: string; headcanonQuery: string }>(
        provider,
        [{ role: "user", content: prompt }]
      );
      if (res?.canonQuery && res?.headcanonQuery) {
        return res;
      }
    } catch {
      // Fall through to heuristic queries
    }
  }

  // Heuristic query formulation
  const cleanConcept = concept.replace(/[^\w\s-]/g, "").slice(0, 60).trim();
  return {
    canonQuery: `${cleanConcept} wiki lore background abilities`,
    headcanonQuery: `${cleanConcept} headcanons personality tropes dynamic fan theory`,
  };
}

/**
 * Master lore search orchestrator with dual-pass Fan Headcanons & High Token Density
 */
export async function retrieveCharacterLore(options: {
  query: string;
  providerType?: "duckduckgo" | "tavily" | "brave" | "searxng";
  apiKey?: string;
  searxngUrl?: string;
  includeHeadcanons?: boolean;
  provider?: ProviderConfig;
}): Promise<LoreRetrievalResult> {
  const baseQuery = options.query.trim();
  const providerType = options.providerType || (options.apiKey ? "tavily" : "duckduckgo");
  const includeHeadcanons = options.includeHeadcanons !== false; // Default true!

  // Formulate queries
  let canonQuery = `${baseQuery} wiki lore background`;
  let headcanonQuery = `${baseQuery} headcanons dynamic tropes fan theories discussion`;

  if (options.provider && options.provider.type !== "none") {
    const syn = await synthesizeFandomSearchQueries(baseQuery, options.provider);
    canonQuery = syn.canonQuery;
    headcanonQuery = syn.headcanonQuery;
  }

  const runSearch = async (q: string): Promise<SearchResultItem[]> => {
    try {
      if (providerType === "tavily" && options.apiKey) {
        return await searchTavily(q, options.apiKey);
      } else if (providerType === "brave" && options.apiKey) {
        return await searchBrave(q, options.apiKey);
      } else if (providerType === "searxng" && options.searxngUrl) {
        return await searchSearXNG(q, options.searxngUrl);
      } else {
        return await searchDuckDuckGo(q);
      }
    } catch (err: any) {
      console.warn(`Search failed for "${q}" with ${providerType}:`, err.message);
      return await searchDuckDuckGo(q);
    }
  };

  // Run searches in parallel
  const searchPromises = [runSearch(canonQuery)];
  if (includeHeadcanons) {
    searchPromises.push(runSearch(headcanonQuery));
  }

  const [canonResults, headcanonResults = []] = await Promise.all(searchPromises);

  // Deduplicate results
  const seenUrls = new Set<string>();
  const filterUnique = (items: SearchResultItem[]) => {
    return items.filter((item) => {
      if (!item.url || seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });
  };

  const uniqueCanon = filterUnique(canonResults);
  const uniqueHeadcanons = filterUnique(headcanonResults);

  // Format Canon Lore (high token density)
  const canonLines = uniqueCanon
    .filter((i) => i.snippet)
    .map((i) => `• [${i.title}] (${i.url}):\n  ${i.snippet}`);

  // Format Fan Headcanons & Mindcanons (high token density)
  const headcanonLines = uniqueHeadcanons
    .filter((i) => i.snippet)
    .map((i) => `• [${i.title}] (${i.url}):\n  ${i.snippet}`);

  const canonLoreText = canonLines.join("\n\n");
  const fanHeadcanonsText = headcanonLines.join("\n\n");

  let combined = "";
  if (canonLoreText) {
    combined += `=== CANON LORE & OFFICIAL BACKGROUND ===\n${canonLoreText}\n\n`;
  }
  if (fanHeadcanonsText) {
    combined += `=== FAN HEADCANONS, MIND CANONS & COMMUNITY DYNAMICS ===\n${fanHeadcanonsText}\n(Incorporate these fan theories, hidden vulnerabilities, and creative relationship dynamics into the character's desires, contradictions, and habits.)`;
  }

  return {
    query: baseQuery,
    source: providerType,
    results: [...uniqueCanon, ...uniqueHeadcanons],
    canonLore: canonLoreText,
    fanHeadcanons: fanHeadcanonsText,
    condensedLore: combined.trim(),
  };
}
