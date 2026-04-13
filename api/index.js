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
