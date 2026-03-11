// 前端 geminiService.ts - 調用後端代理而不是直接調用 Google API

const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : process.env.REACT_APP_API_URL || 'http://localhost:8080';

const BACKEND_API_KEY = process.env.REACT_APP_BACKEND_API_KEY || 'mumps2605';

export const geminiService = {
  async analyzeNiche(topic: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/analyze-niche`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('analyzeNiche error:', error);
      throw error;
    }
  },

  async generateContent(topic: string, type: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ topic, type }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.content || data;
    } catch (error) {
      console.error('generateContent error:', error);
      throw error;
    }
  },

  async generateMonetizedContent(topic: string, type: string, affiliateId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/generate-monetized-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ topic, type, affiliateId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.content || data;
    } catch (error) {
      console.error('generateMonetizedContent error:', error);
      throw error;
    }
  },

  async generateImage(prompt: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.imageData || data;
    } catch (error) {
      console.error('generateImage error:', error);
      throw error;
    }
  },

  async getFeaturedImagePrompt(title: string, content: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/featured-image-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ title, content }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.prompt || data;
    } catch (error) {
      console.error('getFeaturedImagePrompt error:', error);
      throw error;
    }
  },

  async discoverTrendingTopics(niche: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/trending-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BACKEND_API_KEY,
        },
        body: JSON.stringify({ niche }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('discoverTrendingTopics error:', error);
      throw error;
    }
  }
};
