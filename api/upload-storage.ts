import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fileName = (req.headers['x-file-name'] as string) || 'arquivo.json';
    const contentType = (req.headers['content-type'] as string) || 'application/octet-stream';

    // Accumulate the raw body buffer
    const chunks: any[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    let supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase credentials are not configured on the server.' });
    }

    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = 'https://' + supabaseUrl;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Ensure attachments bucket exists
    try {
      await supabase.storage.createBucket('attachments', { public: true });
    } catch (e) {
      // Bucket exists or ignore
    }

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `emails/${Date.now()}_${sanitizedName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage.from('attachments').upload(filePath, buffer, {
      contentType,
      duplex: 'half'
    });

    if (uploadError) {
      console.error("Supabase serverless upload error:", uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return res.status(500).json({ error: 'Failed to retrieve public URL from Supabase.' });
    }

    return res.status(200).json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error('Serverless upload proxy error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
