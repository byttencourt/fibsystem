import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy endpoint para leitura (Firebase e Supabase)
  app.get("/api/proxy-storage", async (req, res) => {
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
        console.log("Server Supabase key present in environment:", !!supabaseKey);
        if (supabaseKey) {
          headers['apikey'] = supabaseKey;
          headers['Authorization'] = `Bearer ${supabaseKey}`;
        }
      }

      console.log("Server Proxy fetching URL:", targetUrl);
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
  });

  // Proxy endpoint para upload no Supabase
  app.post("/api/upload-storage", express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
    try {
      const fileName = (req.headers['x-file-name'] as string) || 'arquivo.json';
      const contentType = (req.headers['content-type'] as string) || 'application/octet-stream';

      let supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
      const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase credentials missing on server.");
        return res.status(500).json({ error: "Supabase credentials are not configured on the server." });
      }

      if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
        supabaseUrl = 'https://' + supabaseUrl;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Certificar-se de que o bucket 'attachments' existe
      try {
        await supabase.storage.createBucket('attachments', { public: true });
      } catch (err) {
        // Ignorar se já existe ou falhar tolerável
      }

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `emails/${Date.now()}_${sanitizedName}`;

      console.log(`Server: Uploading file ${fileName} to Supabase path: ${filePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage.from('attachments').upload(filePath, req.body, {
        contentType,
        duplex: 'half'
      });

      if (uploadError) {
        console.error("Supabase server upload error:", uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to retrieve public URL from Supabase.');
      }

      console.log("Server: File uploaded successfully, public URL retrieved:", publicUrlData.publicUrl);
      return res.status(200).json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
      console.error('Server upload proxy error:', error);
      return res.status(500).json({ error: error?.message || String(error) });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();