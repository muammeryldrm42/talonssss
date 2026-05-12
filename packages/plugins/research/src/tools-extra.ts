// ============================================================
// 🛸 Terminal of UFO — Web Research Tool
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";
import { ToolResult, WebSearchResult } from "@open-talons/plugin-sdk";

const UA = "Mozilla/5.0 (compatible; TerminalOfUFO/2.0; +https://github.com/talons-protocol/terminal-of-ufo)";

// ── Search ────────────────────────────────────────────────────────────────────

export async function webSearch(query: string, numResults = 6): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    const serperKey = process.env.SERPER_API_KEY;

    if (serperKey) {
      const r = await axios.post(
        "https://google.serper.dev/search",
        { q: query, num: numResults },
        { headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" }, timeout: 10000 }
      );

      const results: WebSearchResult[] = (r.data.organic || []).slice(0, numResults).map(
        (x: { title: string; link: string; snippet: string }) => ({
          title: x.title,
          url: x.link,
          snippet: x.snippet,
          source: new URL(x.link).hostname.replace("www.", ""),
        })
      );

      // Also extract People Also Ask
      const paa: string[] = (r.data.peopleAlsoAsk || []).slice(0, 3).map(
        (p: { question: string }) => p.question
      );

      return { success: true, data: { results, relatedQuestions: paa }, latencyMs: Date.now() - t0 };
    }

    // Fallback: DuckDuckGo HTML
    const ddg = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": UA }, timeout: 10000 }
    );

    const $ = cheerio.load(ddg.data);
    const results: WebSearchResult[] = [];

    $(".result").each((i, el) => {
      if (i >= numResults) return false;
      const title = $(el).find(".result__title").text().trim();
      const url = $(el).find(".result__url").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      if (title && url) {
        results.push({
          title,
          url: url.startsWith("http") ? url : `https://${url}`,
          snippet,
          source: url.split("/")[0].replace("www.", ""),
        });
      }
    });

    return { success: true, data: { results, relatedQuestions: [] }, latencyMs: Date.now() - t0 };
  } catch (err: unknown) {
    return { success: false, error: `Web search failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Page Fetch ────────────────────────────────────────────────────────────────

export async function fetchPageContent(url: string): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    const r = await axios.get(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(r.data);
    $("script,style,nav,footer,header,aside,.ad,.advertisement,.cookie-banner,#cookie-banner,[class*='cookie'],[id*='cookie']").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
    const publishDate = $('meta[property="article:published_time"]').attr("content") || $('time[datetime]').attr("datetime") || "";
    const author = $('meta[name="author"]').attr("content") || $('[rel="author"]').first().text().trim() || "";

    // Smart content extraction
    let content = "";
    for (const sel of ["article", "main", '[role="main"]', ".post-content", ".article-body", ".entry-content", ".content", "#content", "body"]) {
      const el = $(sel);
      if (el.length) {
        content = el.text().replace(/\s+/g, " ").trim();
        if (content.length > 200) break;
      }
    }

    const wordCount = content.split(" ").length;
    const truncated = content.length > 6000 ? content.slice(0, 6000) + "\n\n[...content truncated...]" : content;

    // Extract all headings for structure
    const headings: string[] = [];
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 200) headings.push(text);
    });

    return {
      success: true,
      data: { url, title, description: metaDesc, author, publishDate, content: truncated, wordCount, headings: headings.slice(0, 10) },
      latencyMs: Date.now() - t0,
    };
  } catch (err: unknown) {
    return { success: false, error: `Page fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── News Search ───────────────────────────────────────────────────────────────

export async function searchNews(topic: string, daysBack = 7): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    const newsKey = process.env.NEWS_API_KEY;

    if (newsKey) {
      const from = new Date();
      from.setDate(from.getDate() - daysBack);

      const r = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: topic,
          from: from.toISOString().split("T")[0],
          sortBy: "relevancy",
          pageSize: 12,
          language: "en",
          apiKey: newsKey,
        },
        timeout: 10000,
      });

      const articles = r.data.articles
        .filter((a: { title: string; url: string }) => a.title !== "[Removed]" && a.url)
        .slice(0, 10)
        .map((a: { title: string; url: string; description: string; source: { name: string }; publishedAt: string; author: string }) => ({
          title: a.title,
          url: a.url,
          snippet: a.description,
          source: a.source.name,
          publishedAt: a.publishedAt,
          author: a.author,
        }));

      return { success: true, data: articles, latencyMs: Date.now() - t0 };
    }

    // Fallback: search with news context
    return webSearch(`${topic} news ${new Date().getFullYear()}`, 8);
  } catch (err: unknown) {
    return { success: false, error: `News search failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Multi-Search (parallel) ───────────────────────────────────────────────────

export async function multiSearch(queries: string[]): Promise<ToolResult> {
  try {
    const results = await Promise.allSettled(queries.map((q) => webSearch(q, 4)));
    const combined: WebSearchResult[] = [];

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        const d = r.value.data as { results: WebSearchResult[] };
        combined.push(...(d.results || []));
      }
    });

    // Deduplicate by URL
    const seen = new Set<string>();
    const deduped = combined.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    return { success: true, data: { results: deduped } };
  } catch (err: unknown) {
    return { success: false, error: `Multi-search failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
