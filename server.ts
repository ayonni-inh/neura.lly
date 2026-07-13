
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  detectIntent,
  enhanceImagePrompt,
  generateImage,
  upscaleImage,
  editImage,
  generateVideo,
  generateSpeech,
  extractDirectives,
  streamResponse as streamResponseService
} from './services/geminiServerService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Route to fetch URL content
  app.get('/api/fetch-url', async (req: express.Request, res: express.Response) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      console.log(`[Server] Fetching URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, footer, header').remove();

      // Extract text content
      const title = $('title').text() || $('h1').first().text() || 'Untitled Page';
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000); // Limit text size for Gemini

      res.json({
        title,
        content: text,
        url
      });
    } catch (error: any) {
      console.error(`[Server] Error fetching URL: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch URL content' });
    }
  });

  // API Proxy Routes for Gemini to secure process.env.GEMINI_API_KEY
  app.post('/api/gemini/detect-intent', async (req, res) => {
    try {
      const { text, attachments } = req.body;
      const intent = await detectIntent(text, attachments);
      res.json({ intent });
    } catch (error: any) {
      console.error('[Server] detectIntent failed:', error);
      res.status(500).json({ error: error.message || 'Intent detection failed' });
    }
  });

  app.post('/api/gemini/enhance-prompt', async (req, res) => {
    try {
      const { prompt, style } = req.body;
      const enhanced = await enhanceImagePrompt(prompt, style);
      res.json({ prompt: enhanced });
    } catch (error: any) {
      console.error('[Server] enhancePrompt failed:', error);
      res.status(500).json({ error: error.message || 'Prompt enhancement failed' });
    }
  });

  app.post('/api/gemini/generate-image', async (req, res) => {
    try {
      const { prompt, config, contextAttachments } = req.body;
      const images = await generateImage(prompt, config, contextAttachments);
      res.json({ images });
    } catch (error: any) {
      console.error('[Server] generateImage failed:', error);
      res.status(500).json({ error: error.message || 'Image generation failed' });
    }
  });

  app.post('/api/gemini/upscale-image', async (req, res) => {
    try {
      const { imageUrl, prompt } = req.body;
      const upscaled = await upscaleImage(imageUrl, prompt);
      res.json({ imageUrl: upscaled });
    } catch (error: any) {
      console.error('[Server] upscaleImage failed:', error);
      res.status(500).json({ error: error.message || 'Image upscaling failed' });
    }
  });

  app.post('/api/gemini/edit-image', async (req, res) => {
    try {
      const { prompt, images } = req.body;
      const edited = await editImage(prompt, images);
      res.json({ imageUrl: edited });
    } catch (error: any) {
      console.error('[Server] editImage failed:', error);
      res.status(500).json({ error: error.message || 'Image editing failed' });
    }
  });

  app.post('/api/gemini/generate-video', async (req, res) => {
    try {
      const { prompt, images, aspectRatio } = req.body;
      const videoUrl = await generateVideo(prompt, images, aspectRatio);
      res.json({ videoUrl });
    } catch (error: any) {
      console.error('[Server] generateVideo failed:', error);
      res.status(500).json({ error: error.message || 'Video generation failed' });
    }
  });

  app.post('/api/gemini/generate-speech', async (req, res) => {
    try {
      const { text, voiceName, style, pitch, speed } = req.body;
      const speechUrl = await generateSpeech(text, voiceName, style, pitch, speed);
      res.json({ speechUrl });
    } catch (error: any) {
      console.error('[Server] generateSpeech failed:', error);
      res.status(500).json({ error: error.message || 'Speech generation failed' });
    }
  });

  app.post('/api/gemini/extract-directives', async (req, res) => {
    try {
      const { conversationText } = req.body;
      const directives = await extractDirectives(conversationText);
      res.json({ directives });
    } catch (error: any) {
      console.error('[Server] extractDirectives failed:', error);
      res.status(500).json({ error: error.message || 'Directives extraction failed' });
    }
  });

  app.post('/api/gemini/stream', async (req, res) => {
    const { history, newMessage, attachments, useFastModel, userProfile, projectContext, intent } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const signalState = { aborted: false };
    req.on('close', () => {
      console.log('[Server] Client closed streaming connection');
      signalState.aborted = true;
    });

    try {
      const result = await streamResponseService(
        history || [],
        newMessage || '',
        attachments || null,
        (text, sources) => {
          if (signalState.aborted) return;
          res.write(`data: ${JSON.stringify({ text, sources })}\n\n`);
        },
        signalState,
        !!useFastModel,
        userProfile || null,
        projectContext || null,
        intent
      );
      
      if (!signalState.aborted) {
        res.write(`data: ${JSON.stringify({ text: result.text, functionCall: result.functionCall, requiresProcessing: result.requiresProcessing, done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (error: any) {
      if (signalState.aborted || error.message === 'AbortError' || error.name === 'AbortError' || req.destroyed) {
        console.log('[Server] Streaming request gracefully aborted or client disconnected.');
        if (!res.writableEnded) {
          try {
            res.end();
          } catch (e) {
            // connection already closed
          }
        }
        return;
      }
      console.error('[Server] Streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Stream failed' });
      } else {
        try {
          res.write(`data: ${JSON.stringify({ error: error.message || 'Stream failed' })}\n\n`);
          res.end();
        } catch (e) {
          console.error('[Server] Error writing stream end failure chunk:', e);
        }
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
