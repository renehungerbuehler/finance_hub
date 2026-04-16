const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const chatRouter = require('./routes/chat');
const marketRouter = require('./routes/market');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.API_PORT || 3001;

const VALID_KEYS = [
  'accounts', 'scenarios', 'tracker',
  'subscriptions_personal', 'subscriptions_business',
  'yearly', 'taxes', 'insurance', 'settings', 'profile', 'ai_analysis',
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/provider', (_req, res) => {
  if (process.env.ANTHROPIC_API_KEY) return res.json({ provider: 'anthropic', label: 'Claude Opus 4.6',    description: 'Personalised strategy · multi-turn · web-researched · powered by Claude' });
  if (process.env.OPENAI_API_KEY)    return res.json({ provider: 'openai',    label: 'GPT-4o',             description: 'Personalised strategy · multi-turn · powered by OpenAI' });
  if (process.env.GEMINI_API_KEY)    return res.json({ provider: 'gemini',    label: 'Gemini 2.0 Flash',   description: 'Personalised strategy · multi-turn · powered by Google Gemini' });
  if (process.env.OLLAMA_MODEL)      return res.json({ provider: 'ollama',    label: process.env.OLLAMA_MODEL, description: `100% local · no data leaves your machine · powered by Ollama` });
  return res.json({ provider: null, label: 'No AI configured', description: 'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or OLLAMA_MODEL in your .env file' });
});
app.use('/api', chatRouter);
app.use('/api/market', marketRouter);

// Provider connection test — makes a minimal real API call
app.post('/api/provider/test', async (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body || {};
  if (!provider) return res.status(400).json({ ok: false, error: 'provider is required' });

  try {
    if (provider === 'anthropic') {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) return res.json({ ok: false, error: 'No API key provided' });
      const anthropicModule = require('@anthropic-ai/sdk');
      const Anthropic = anthropicModule.default || anthropicModule;
      const client = new Anthropic({ apiKey: key });
      const msg = await client.messages.create({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return res.json({ ok: true, model: msg.model });
    }

    if (provider === 'openai') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) return res.json({ ok: false, error: 'No API key provided' });
      const openaiModule = require('openai');
      const OpenAI = openaiModule.default || openaiModule.OpenAI || openaiModule;
      const opts = { apiKey: key };
      if (baseUrl) opts.baseURL = baseUrl;
      const client = new OpenAI(opts);
      const resp = await client.chat.completions.create({
        model: model || 'gpt-4o-mini',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return res.json({ ok: true, model: resp.model });
    }

    if (provider === 'gemini') {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.json({ ok: false, error: 'No API key provided' });
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const m = genAI.getGenerativeModel({ model: model || 'gemini-2.0-flash' });
      const result = await m.generateContent('hi');
      const text = result.response.text();
      return res.json({ ok: true, model: model || 'gemini-2.0-flash', preview: text.slice(0, 40) });
    }

    if (provider === 'ollama') {
      const base = baseUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
      const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.2';
      // Check if model exists via Ollama tags API
      const tagsRes = await fetch(`${base}/api/tags`);
      if (!tagsRes.ok) return res.json({ ok: false, error: `Ollama not reachable at ${base}` });
      const tags = await tagsRes.json();
      const available = (tags.models || []).map(m => m.name);
      const found = available.some(n => n === ollamaModel || n.startsWith(ollamaModel + ':'));
      if (!found) return res.json({ ok: false, error: `Model "${ollamaModel}" not found. Available: ${available.slice(0, 5).join(', ')}` });
      return res.json({ ok: true, model: ollamaModel, available });
    }

    return res.status(400).json({ ok: false, error: `Unknown provider: ${provider}` });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

app.get('/api/prompt', (_req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const content = fs.readFileSync(path.join(__dirname, 'prompts/finance-advisor.md'), 'utf8');
    res.json({ content });
  } catch {
    res.json({ content: '' });
  }
});

app.get('/api/:key', async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  try {
    const record = await prisma.dataStore.findUnique({ where: { key } });
    if (!record) return res.status(404).json(null);
    res.json(record.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/:key', async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
  try {
    const record = await prisma.dataStore.upsert({
      where: { key },
      update: { value: req.body },
      create: { key, value: req.body },
    });
    res.json(record.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

async function main() {
  await prisma.$connect();
  app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
