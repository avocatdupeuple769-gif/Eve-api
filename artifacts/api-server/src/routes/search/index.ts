import { Router, type IRouter } from "express";
import { WebSearchQueryParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const params = WebSearchQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { q, lang } = params.data;

  try {
    const langHint = lang ? ` Respond in ${lang}.` : "";
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a web search assistant. When given a search query, return a JSON array of 5 search results with realistic, helpful information. Each result must have: title (string), url (string, realistic domain), snippet (2-3 sentence description). Return ONLY valid JSON array, no markdown.${langHint}`,
        },
        {
          role: "user",
          content: `Search query: ${q}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";

    let results: Array<{ title: string; url: string; snippet: string }> = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        results = parsed.slice(0, 5);
      }
    } catch {
      results = [];
    }

    res.json({ query: q, results });
  } catch (err) {
    req.log.error({ err }, "Search error");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
