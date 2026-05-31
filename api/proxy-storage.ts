import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const targetUrl = (req.query.url as string || '').trim();
    
    // Validação de domínios permitidos (Supabase / Tmpfiles / Firebase / Catbox)
    if (!targetUrl || (
      !targetUrl.includes('firebasestorage.googleapis.com') && 
      !targetUrl.includes('tmpfiles.org') &&
      !targetUrl.includes('supabase.co') &&
      !targetUrl.includes('catbox.moe')
    )) {
      console.error('Proxy rejected invalid URL:', targetUrl);
      return res.status(400).json({ error: "Invalid URL: " + targetUrl });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
}
