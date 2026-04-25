export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

export async function webSearch(
  query: string,
  maxResults: number = 4
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === "your-tavily-key-here") {
    console.warn("TAVILY_API_KEY not set — web search unavailable");
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6_000);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "advanced",
        include_answer: false,
        include_images: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("Tavily search failed:", response.statusText);
      return [];
    }

    const data: TavilyResponse = await response.json();
    return data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("Tavily search timed out after 6 s");
    } else {
      console.error("Web search error:", error);
    }
    return [];
  }
}
