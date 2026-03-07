export interface WordPressConfig {
  url: string;
  username: string;
  applicationPassword: string;
}

class WordPressService {
  private config: WordPressConfig | null = null;

  constructor() {
    const saved = localStorage.getItem('wordpress_config');
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse WordPress config', e);
      }
    }
  }

  saveConfig(config: WordPressConfig) {
    this.config = config;
    localStorage.setItem('wordpress_config', JSON.stringify(config));
  }

  getConfig(): WordPressConfig | null {
    return this.config;
  }

  async postToWordPress(title: string, content: string, status: 'draft' | 'publish' = 'draft') {
    if (!this.config) {
      throw new Error('WordPress not configured');
    }

    const { url, username, applicationPassword } = this.config;
    const cleanUrl = url.replace(/\/$/, '');
    const apiUrl = `${cleanUrl}/wp-json/wp/v2/posts`;

    const auth = btoa(`${username}:${applicationPassword}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        title,
        content,
        status,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to post to WordPress');
    }

    return await response.json();
  }

  async getCategories() {
    if (!this.config) throw new Error('WordPress not configured');
    const { url, username, applicationPassword } = this.config;
    const auth = btoa(`${username}:${applicationPassword}`);
    const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/categories`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  }

  async uploadMedia(base64Data: string, fileName: string) {
    if (!this.config) throw new Error('WordPress not configured');
    const { url, username, applicationPassword } = this.config;
    const auth = btoa(`${username}:${applicationPassword}`);
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', blob, fileName);

    const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Disposition': `attachment; filename="${fileName}"`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to upload media');
    }
    return await response.json();
  }

  async updatePost(postId: number, data: any) {
    if (!this.config) throw new Error('WordPress not configured');
    const { url, username, applicationPassword } = this.config;
    const auth = btoa(`${username}:${applicationPassword}`);
    const response = await fetch(`${url.replace(/\/$/, '')}/wp-json/wp/v2/posts/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update post');
    return await response.json();
  }
}

export const wordpressService = new WordPressService();
