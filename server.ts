import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 8080;
  app.use(express.json());

  // Initialize OpenAI Compatible API
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.MUMPSAI_API_KEY || "mumps2605",
    baseURL: process.env.OPENAI_BASE_URL || "https://mumpsapi.zeabur.app/v1"
  });

  // API Key middleware
  const apiKeyMiddleware = (req: any, res: any, next: any) => {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.BACKEND_API_KEY || "mumps2605";
    
    if (apiKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // In-memory storage for demo purposes
  const db = {
    niches: [
      { id: 1, name: "AI 工具評測", trend: "上升", competition: "中" },
      { id: 2, name: "永續生活指南", trend: "穩定", competition: "低" },
      { id: 3, name: "加密貨幣策略", trend: "劇烈", competition: "高" }
    ],
    contents: [],
    campaigns: []
  };

  // ============ OpenAI Compatible API Routes ============

  // Analyze Niche
  app.post("/api/gemini/analyze-niche", apiKeyMiddleware, async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `分析利基市場：${topic}。請提供市場趨勢、競爭程度、潛在收益點以及建議的內容方向。請確保建議的內容方向包含多樣化的格式，如：開箱影片、趨勢分析、投資建議等。請以繁體中文回答。請以 JSON 格式回答，包含以下欄位：trend, competition, potentialRevenue, contentIdeas (陣列)`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || "{}";
      const result = JSON.parse(content);
      res.json(result);
    } catch (error: any) {
      console.error("Analyze niche error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Content
  app.post("/api/gemini/generate-content", apiKeyMiddleware, async (req, res) => {
    try {
      const { topic, type } = req.body;
      if (!topic || !type) {
        return res.status(400).json({ error: "Topic and type are required" });
      }

      let prompt = `為利基市場「${topic}」生成一篇「${type}」。內容應包含吸引人的標題、結構化的正文，並整合 SEO 關鍵字。請以繁體中文撰寫。`;

      if (type === '社群媒體貼文') {
        prompt = `為利基市場「${topic}」生成一份「${type}」。
        內容應包含：
        1. 吸引眼球的第一句話
        2. 簡短有力的正文 (適合 Facebook/Instagram/X)
        3. 適當的表情符號 (Emoji) 增加互動感
        4. 3-5 個熱門標籤 (Hashtags)
        5. 明確的行動呼籲 (CTA)
        請以繁體中文撰寫。`;
      } else if (type === '產品評測報告') {
        prompt = `為利基市場「${topic}」生成一份專業的「${type}」。
        內容應包含：
        1. 產品概覽與第一印象
        2. 核心功能深度分析
        3. 優點與缺點清單 (Pros & Cons)
        4. 性能評分 (1-10 分)
        5. 最終購買建議與適合人群
        請以繁體中文撰寫，語氣應客觀且具備權威性。`;
      } else if (type === '電子報內容') {
        prompt = `為利基市場「${topic}」生成一份「${type}」。
        內容應包含：
        1. 3 個吸引點擊的郵件主旨 (Subject Lines)
        2. 親切且具備個人風格的開場白
        3. 價值分享 (提供 1-2 個實用技巧或資訊)
        4. 推薦的產品或服務連結佔位符
        5. 結尾與簽名
        請以繁體中文撰寫，語氣應像是在跟老朋友聊天。`;
      } else if (type === '短影片腳本') {
        prompt = `為利基市場「${topic}」生成一份 60 秒內的「${type}」(適合 TikTok/Reels/Shorts)。
        腳本應包含：
        1. 前 3 秒的黃金鉤子 (Hook)
        2. 視覺畫面指示 (Visual cues)
        3. 旁白配音稿 (Voiceover)
        4. 背景音樂建議 (Music suggestion)
        5. 結尾快速 CTA
        請以繁體中文撰寫，節奏感要強。`;
      } else if (type === '產品開箱影片腳本') {
        prompt = `為利基市場「${topic}」生成一份「${type}」。
        腳本應包含：
        1. 影片開場 (Hook)
        2. 產品外觀展示 (B-roll 指示)
        3. 核心功能測試與評價
        4. 優缺點總結
        5. 結尾呼籲 (CTA)
        請以繁體中文撰寫，並使用易於閱讀的腳本格式。`;
      } else if (type === '市場趨勢分析圖表數據') {
        prompt = `為利基市場「${topic}」生成一份「${type}」。
        請提供：
        1. 過去 12 個月的市場需求趨勢數據 (以 Markdown 表格呈現)
        2. 關鍵增長驅動因素分析
        3. 未來 6 個月的預測
        請以繁體中文撰寫，並確保數據具有邏輯性。`;
      } else if (type === '投資組合建議') {
        prompt = `為利基市場「${topic}」生成一份「${type}」。
        建議應包含：
        1. 風險等級評估
        2. 資產配置建議 (例如：核心持倉、衛星持倉)
        3. 具體的投資標的或策略建議
        4. 長期持有與退場機制
        請以繁體中文撰寫，並加入免責聲明。`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      res.json({ content: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Generate content error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Monetized Content
  app.post("/api/gemini/generate-monetized-content", apiKeyMiddleware, async (req, res) => {
    try {
      const { topic, type, affiliateId } = req.body;
      if (!topic || !type || !affiliateId) {
        return res.status(400).json({ error: "Topic, type, and affiliateId are required" });
      }

      const prompt = `為利基市場「${topic}」生成一篇「${type}」。
      內容應包含：
      1. 吸引人的標題
      2. 結構化的正文，整合 SEO 關鍵字
      3. 在內容中自然地嵌入 2-3 個與主題相關的產品推薦，並使用以下格式作為聯盟行銷連結佔位符：[產品名稱](https://amazon.com/dp/ASIN?tag=${affiliateId})
      4. 結尾包含一個強力的行動呼籲 (CTA)
      請以繁體中文撰寫。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      res.json({ content: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Generate monetized content error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Image
  app.post("/api/gemini/generate-image", apiKeyMiddleware, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      });

      if (response.data && response.data.length > 0) {
        return res.json({ imageUrl: response.data[0].url });
      }
      
      throw new Error('No image generated');
    } catch (error: any) {
      console.error("Generate image error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Featured Image Prompt
  app.post("/api/gemini/featured-image-prompt", apiKeyMiddleware, async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `根據以下文章標題和內容，生成一個適合用於 WordPress 文章精選圖片的 AI 繪圖提示詞 (Prompt)。
            標題：${title}
            內容摘要：${content.substring(0, 300)}...
            請以英文回答，並確保提示詞是高品質、具備專業攝影或數位藝術風格的。`
          }
        ],
        temperature: 0.7
      });

      res.json({ prompt: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Featured image prompt error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Discover Trending Topics
  app.post("/api/gemini/trending-topics", apiKeyMiddleware, async (req, res) => {
    try {
      const { niche } = req.body;
      if (!niche) {
        return res.status(400).json({ error: "Niche is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `針對利基市場「${niche}」，請列出 5 個目前最熱門且具備營利潛力的內容主題。請以繁體中文回答，並以 JSON 陣列格式回答。`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || "[]";
      const result = JSON.parse(content);
      res.json(result);
    } catch (error: any) {
      console.error("Trending topics error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Original Routes ============

  app.get("/api/niches", (req, res) => {
    res.json(db.niches);
  });

  app.get("/api/contents", (req, res) => {
    res.json(db.contents);
  });

  app.post("/api/contents", (req, res) => {
    const newContent = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
      status: "draft"
    };
    db.contents.push(newContent);
    res.status(201).json(newContent);
  });

  app.get("/api/analytics", (req, res) => {
    const data = [
      { name: "Mon", views: 400, clicks: 240, revenue: 120 },
      { name: "Tue", views: 300, clicks: 139, revenue: 98 },
      { name: "Wed", views: 200, clicks: 980, revenue: 390 },
      { name: "Thu", views: 278, clicks: 390, revenue: 190 },
      { name: "Fri", views: 189, clicks: 480, revenue: 210 },
      { name: "Sat", views: 239, clicks: 380, revenue: 250 },
      { name: "Sun", views: 349, clicks: 430, revenue: 210 },
    ];
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
