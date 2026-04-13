const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const SYSTEM_BASE = fs.readFileSync(
  path.join(__dirname, '../prompts/finance-advisor.md'),
  'utf8'
);

const ANTHROPIC_TOOLS = [
  { type: 'web_search_20260209', name: 'web_search' },
];

function detectProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OLLAMA_MODEL) return 'ollama';
  return null;
}

function buildSystem(context, base = SYSTEM_BASE) {
  const profile = context._profile || null;
  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate.split('.').reverse().join('-'))) / (365.25 * 24 * 3600 * 1000))
    : null;
  const profileSection = profile ? [
    '\n\n## About the User',
    `- **Full name:** ${profile.firstName} ${profile.lastName}${age ? `, age ${age}` : ''}`,
    profile.gender ? `- **Gender:** ${profile.gender}` : '',
    (profile.city || profile.canton) ? `- **Location:** ${[profile.postalCode, profile.city, profile.canton].filter(Boolean).join(', ')} — canton tax rates apply` : (profile.address ? `- **Address:** ${profile.address}` : ''),
    profile.canton ? `- **Canton:** ${profile.canton} (use canton-specific income tax, wealth tax, and church tax rates)` : '',
    profile.maritalStatus ? `- **Marital status:** ${profile.maritalStatus} (affects tax tariff — Grundtarif vs Verheiratetentarif)` : '',
    profile.religion && profile.religion !== 'None' ? `- **Religion:** ${profile.religion} (church tax applies in this canton)` : '- **Church tax:** none',
    profile.children !== undefined && profile.children !== '' ? `- **Children:** ${profile.children} (affects tax deductions and tariff)` : '',
    profile.ahvNumber ? `- **AHV/AVS number:** ${profile.ahvNumber}` : '',
    `- **Job:** ${profile.jobTitle} at ${profile.company}`,
    profile.businessName ? `\n## Side Business\n- **Name:** ${profile.businessName} (${profile.businessType || 'Einzelfirma'})\n- **Active projects:** ${profile.businessProjects || '—'}` : '',
    profile.notes ? `\n## Personal Notes\n${profile.notes}` : '',
  ].filter(Boolean).join('\n') : '';
  return `${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
}

async function handleAnthropic(res, system, messages) {
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const MAX_TURNS = 6;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system,
      messages,
      tools: ANTHROPIC_TOOLS,
    });

    let currentBlock = null;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        currentBlock = { ...event.content_block, text: '' };
        if (event.content_block.type === 'server_tool_use' || event.content_block.type === 'tool_use') {
          res.write(`data: ${JSON.stringify({ status: '🔍 Searching the web…' })}\n\n`);
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta' && currentBlock) {
          currentBlock.text += event.delta.text;
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        } else if (event.delta.type === 'input_json_delta' && currentBlock) {
          currentBlock.partial_json = (currentBlock.partial_json || '') + event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentBlock) {
          if (currentBlock.type === 'tool_use' && currentBlock.partial_json) {
            try { currentBlock.input = JSON.parse(currentBlock.partial_json); } catch {}
          }
          currentBlock = null;
        }
      } else if (event.type === 'message_delta' && event.delta?.stop_reason === 'tool_use') {
        res.write(`data: ${JSON.stringify({ status: '✍️ Writing response…' })}\n\n`);
      }
    }

    const finalMsg = await stream.finalMessage();
    if (finalMsg.stop_reason === 'end_turn') break;

    if (finalMsg.stop_reason === 'tool_use' || finalMsg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: finalMsg.content });
      res.write(`data: ${JSON.stringify({ text: '\n' })}\n\n`);
      continue;
    }

    break;
  }
}

async function handleOpenAI(res, system, messages) {
  const { OpenAI } = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Convert Anthropic-style content blocks to OpenAI format
  const openaiMessages = [
    { role: 'system', content: system },
    ...messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      const parts = (Array.isArray(m.content) ? m.content : []).map(block => {
        if (block.type === 'text') return { type: 'text', text: block.text };
        if (block.type === 'image' && block.source?.type === 'base64') {
          return { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } };
        }
        return null;
      }).filter(Boolean);
      return { role: m.role, content: parts.length > 0 ? parts : String(m.content) };
    }),
  ];

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: openaiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    }
  }
}

async function handleGemini(res, system, messages) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: system,
  });

  // Convert Anthropic-style content blocks to Gemini format
  const geminiMessages = messages.map(m => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (typeof m.content === 'string') {
      return { role, parts: [{ text: m.content }] };
    }
    const parts = (Array.isArray(m.content) ? m.content : []).map(block => {
      if (block.type === 'text') return { text: block.text };
      if (block.type === 'image' && block.source?.type === 'base64') {
        return { inlineData: { data: block.source.data, mimeType: block.source.media_type } };
      }
      return null;
    }).filter(Boolean);
    return { role, parts };
  });

  const result = await model.generateContentStream({ contents: geminiMessages });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
}

async function handleOllama(res, system, messages) {
  const { OpenAI } = require('openai');
  const baseURL = `${(process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434')}/v1`;
  const model   = process.env.OLLAMA_MODEL || 'llama3.2';
  const client  = new OpenAI({ apiKey: 'ollama', baseURL });

  const ollamaMessages = [
    { role: 'system', content: system },
    ...messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : (Array.isArray(m.content) ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n') : String(m.content)),
    })),
  ];

  const stream = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: ollamaMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
  }
}

function buildAttachmentBlocks(att) {
  if (!att || !att.data) return [];
  const isImage = att.type.startsWith('image/');
  const isPDF   = att.type === 'application/pdf';
  const isText  = att.type.startsWith('text/') || ['application/json', 'text/csv', 'text/plain'].includes(att.type);
  if (isImage)     return [{ type: 'image', source: { type: 'base64', media_type: att.type, data: att.data } }];
  if (isPDF)       return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } }];
  if (isText)      return [{ type: 'text', text: `File: ${att.name}\n\`\`\`\n${Buffer.from(att.data, 'base64').toString('utf8')}\n\`\`\`` }];
  return [];
}

router.post('/chat', async (req, res) => {
  const { message, context, history = [], attachment, attachments, systemOverride } = req.body;

  const provider = detectProvider();
  if (!provider) {
    return res.status(500).json({
      error: 'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or OLLAMA_MODEL in your .env file.',
    });
  }

  const system = buildSystem(context, systemOverride?.trim() || SYSTEM_BASE);

  // Build user content — text + optional file attachment(s) (Anthropic block format; converted per provider)
  // Supports both single `attachment` and `attachments: []` array for multi-file import
  let userContent;
  const allAtts = attachments && Array.isArray(attachments) && attachments.length
    ? attachments
    : (attachment && attachment.data ? [attachment] : []);
  if (allAtts.length > 0) {
    const blocks = allAtts.flatMap(att => buildAttachmentBlocks(att));
    blocks.push({ type: 'text', text: message });
    userContent = blocks;
  } else {
    userContent = message;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const messages = [...history, { role: 'user', content: userContent }];

    if (provider === 'anthropic') {
      await handleAnthropic(res, system, messages);
    } else if (provider === 'openai') {
      await handleOpenAI(res, system, messages);
    } else if (provider === 'gemini') {
      await handleGemini(res, system, messages);
    } else if (provider === 'ollama') {
      await handleOllama(res, system, messages);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI service error: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
