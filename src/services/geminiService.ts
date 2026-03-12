import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export const openaiService = {
  async analyzeNiche(topic: string) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `分析利基市場：${topic}。請提供市場趨勢、競爭程度、潛在收益點以及建議的內容方向。請確保建議的內容方向包含多樣化的格式，如：開箱影片、趨勢分析、投資建議等。請以繁體中文回答。請以 JSON 格式回答，包含以下字段：trend, competition, potentialRevenue, contentIdeas (陣列)。`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    try {
      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch {
      return {
        trend: "未知",
        competition: "未知",
        potentialRevenue: "未知",
        contentIdeas: []
      };
    }
  },

  async generateContent(topic: string, type: string) {
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
      1. 開場鉤子 (前 3 秒)
      2. 主要內容 (中間 45 秒)
      3. 結尾與行動呼籲 (最後 12 秒)
      4. 建議的視覺效果或轉場
      5. 配音或字幕建議
      請以繁體中文撰寫，語氣應輕鬆且吸引人。`;
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
    });

    return response.choices[0].message.content || "";
  },

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await client.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });
      return response.data[0].url || "";
    } catch (error) {
      console.error("圖片生成失敗:", error);
      throw new Error("圖片生成失敗");
    }
  }
};
