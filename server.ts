import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy endpoint para leitura (Firebase, Tmpfiles e Catbox)
  app.get("/api/proxy-storage", async (req, res) => {
    try {
      const targetUrl = (req.query.url as string || '').trim();
      
      // Validação de domínios permitidos (Catbox / Tmpfiles / Firebase)
      if (!targetUrl || (
        !targetUrl.includes('firebasestorage.googleapis.com') && 
        !targetUrl.includes('tmpfiles.org') &&
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
  });

  // Rota de Upload para o Catbox
  app.post("/api/upload-anexo", express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
    try {
      const fileName = req.headers['x-file-name'] || 'arquivo';
      
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      const blob = new Blob([req.body]);
      formData.append('fileToUpload', blob, fileName as string);

      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData
      });

      const fileUrl = await response.text();
      res.send(fileUrl.trim());
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).send("Erro no upload");
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