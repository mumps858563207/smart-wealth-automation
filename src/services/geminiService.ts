import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async analyzeNiche(topic: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `分析利基市場：${topic}。請提供市場趨勢、競爭程度、潛在收益點以及建議的內容方向。請確保建議的內容方向包含多樣化的格式，如：開箱影片、趨勢分析、投資建議等。請以繁體中文回答。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trend: { type: Type.STRING },
            competition: { type: Type.STRING },
            potentialRevenue: { type: Type.STRING },
            contentIdeas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["trend", "competition", "potentialRevenue", "contentIdeas"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  },

  async generateMonetizedContent(topic: string, type: string, affiliateId: string) {
    let prompt = `為利基市場「${topic}」生成一篇「${type}」。
    內容應包含：
    1. 吸引人的標題
    2. 結構化的正文，整合 SEO 關鍵字
    3. 在內容中自然地嵌入 2-3 個與主題相關的產品推薦，並使用以下格式作為聯盟行銷連結佔位符：[產品名稱](https://amazon.com/dp/ASIN?tag=${affiliateId})
    4. 結尾包含一個強力的行動呼籲 (CTA)
    請以繁體中文撰寫。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  },

  async generateImage(prompt: string) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });
      
      const candidates = response.candidates || [];
      if (candidates.length === 0) throw new Error('No candidates returned');
      
      for (const part of candidates[0].content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data; // base64
        }
      }
      
      // If no image but has text, it might be a safety refusal or conversational response
      const textPart = candidates[0].content?.parts?.find(p => p.text);
      if (textPart) {
        throw new Error(`Image generation refused: ${textPart.text}`);
      }
      
      throw new Error('No image part found in response');
    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  },

  async getFeaturedImagePrompt(title: string, content: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following article title and content summary, generate a high-quality AI image generation prompt for a featured image.
      
      Title: ${title}
      Summary: ${content.substring(0, 300)}...
      
      Requirements:
      1. Output ONLY the prompt text.
      2. Do NOT include any introductory or concluding remarks.
      3. Style: Professional photography or high-end digital art.
      4. Language: English.`,
    });
    return response.text?.trim() || title;
  },

  async discoverTrendingTopics(niche: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `針對利基市場「${niche}」，請列出 5 個目前最熱門且具備營利潛力的內容主題。請以繁體中文回答。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }
};
