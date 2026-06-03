import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let targetUrl = (req.query.url as string || '').trim();
    
    // Remove any wrapping quotes that might have gotten through
    targetUrl = targetUrl.replace(/^['"]|['"]$/g, '').trim();

    // Validação de domínios permitidos (Supabase / Firebase)
    if (!targetUrl || (
      !targetUrl.includes('firebasestorage.googleapis.com') && 
      !targetUrl.includes('supabase.co')
    )) {
      console.error('Proxy rejected invalid URL:', targetUrl);
      return res.status(400).json({ error: "Apenas downloads do Supabase ou Firebase Storage são permitidos." });
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };

    const isSupabase = targetUrl.includes('supabase.co');
    const supabaseKey = (
      process.env.VITE_SUPABASE_ANON_KEY || 
      process.env.SUPABASE_ANON_KEY || 
      ''
    ).trim().replace(/^['"]|['"]$/g, '').trim();

    if (isSupabase) {
      console.log("Supabase anon key present in environment:", !!supabaseKey);
      if (supabaseKey) {
        headers['apikey'] = supabaseKey;
        headers['Authorization'] = `Bearer ${supabaseKey}`;
      }
    }

    console.log("Proxy fetching URL:", targetUrl);
    let response = await fetch(targetUrl, { headers });

    // Se falhar e for Supabase, vamos tentar a rota autenticada caso a pasta seja privada
    if (!response.ok && isSupabase && response.status === 404 && targetUrl.includes('/storage/v1/object/public/')) {
      const authUrl = targetUrl.replace('/storage/v1/object/public/', '/storage/v1/object/authenticated/');
      console.log("Supabase public returned 404. Retrying with authenticated endpoint:", authUrl);
      const authResponse = await fetch(authUrl, { headers });
      if (authResponse.ok) {
        response = authResponse;
      }
    }

    // Se ainda assim falhar, vamos tentar sem cabeçalhos de autorização como fallback
    if (!response.ok && isSupabase) {
      console.log("Proxy authenticated fetch failed. Retrying without auth headers:", targetUrl);
      const guestResponse = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (guestResponse.ok) {
        response = guestResponse;
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request', details: error?.message || String(error) });
  }
}
