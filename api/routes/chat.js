const express = require('express');
const fs = require('fs');
const path = require('path');
const { redactContext, redactMessage, redactHistory, StreamRehydrator } = require('../lib/redact');

const router = express.Router();

const SYSTEM_BASE = fs.readFileSync(
  path.join(__dirname, '../prompts/finance-advisor.md'),
  'utf8'
);

/**
 * Build a delta-writer that handles SSE framing, optional stream re-hydration
 * (swap placeholders back to real PII values), and the empty-delta edge case.
 * Provider handlers call writeDelta(text) instead of res.write(...) for every
 * text chunk the model produces.
 */
function makeWriteDelta(res, rehydrator) {
  return (text) => {
    if (!text) return;
    const out = rehydrator ? rehydrator.push(text) : text;
    if (out) res.write(`data: ${JSON.stringify({ text: out })}\n\n`);
  };
}

function flushRehydrator(res, rehydrator) {
  if (!rehydrator) return;
  const tail = rehydrator.flush();
  if (tail) res.write(`data: ${JSON.stringify({ text: tail })}\n\n`);
}

// Anthropic server-side tools (only sent with Anthropic provider)
const ANTHROPIC_TOOLS = [
  { type: 'web_search_20260209', name: 'web_search' },
];

function detectProvider(bodyConfig) {
  if (bodyConfig?.provider) return bodyConfig.provider;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OLLAMA_MODEL) return 'ollama';
  return null;
}

function getProviderConfig(provider, bodyConfig) {
  switch (provider) {
    case 'anthropic':
      return {
        apiKey: bodyConfig?.apiKey || process.env.ANTHROPIC_API_KEY,
        model:  bodyConfig?.model  || process.env.ANTHROPIC_MODEL || 'claude-opus-4-6',
      };
    case 'openai':
      return {
        apiKey:  bodyConfig?.apiKey  || process.env.OPENAI_API_KEY,
        model:   bodyConfig?.model   || process.env.OPENAI_MODEL    || 'gpt-4o',
        baseUrl: bodyConfig?.baseUrl || process.env.OPENAI_BASE_URL || null,
      };
    case 'gemini':
      return {
        apiKey: bodyConfig?.apiKey || process.env.GEMINI_API_KEY,
        model:  bodyConfig?.model  || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      };
    case 'ollama':
      return {
        model:   bodyConfig?.model   || process.env.OLLAMA_MODEL   || 'llama3.2',
        baseUrl: bodyConfig?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
      };
    default:
      return {};
  }
}

function buildSystem(context, base = SYSTEM_BASE) {
  const todayStr = context.today || new Date().toISOString().slice(0, 10);
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
  return `Today's date: ${todayStr}\n\n${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
}

// Build attachment content blocks, adapted per provider
function buildAttachmentBlocks(att, provider) {
  if (!att || !att.data) return [];
  const isImage = att.type.startsWith('image/');
  const isPDF   = att.type === 'application/pdf';
  const isText  = att.type.startsWith('text/') || ['application/json', 'text/csv', 'text/plain'].includes(att.type);

  if (isImage) {
    // Anthropic-style block; each handler converts to provider format
    return [{ type: 'image', source: { type: 'base64', media_type: att.type, data: att.data } }];
  }
  if (isPDF) {
    if (provider === 'anthropic') {
      return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: att.data } }];
    }
    // Other providers cannot natively read PDFs; surface as a note
    return [{ type: 'text', text: `[PDF attached: ${att.name} — PDF rendering is only supported with the Anthropic provider]` }];
  }
  if (isText) {
    return [{ type: 'text', text: `File: ${att.name}\n\`\`\`\n${Buffer.from(att.data, 'base64').toString('utf8')}\n\`\`\`` }];
  }
  return [];
}

async function handleAnthropic(res, system, messages, config, writeDelta) {
  const anthropicModule = require('@anthropic-ai/sdk');
  const Anthropic = anthropicModule.default || anthropicModule;
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model || 'claude-opus-4-6';
  const MAX_TURNS = 6;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model,
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
          writeDelta(event.delta.text);
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
      writeDelta('\n');
      continue;
    }

    break;
  }
}

async function handleOpenAI(res, system, messages, config, writeDelta) {
  const openaiModule = require('openai');
  const OpenAI = openaiModule.default || openaiModule.OpenAI || openaiModule;
  const clientOpts = { apiKey: config.apiKey };
  if (config.baseUrl) clientOpts.baseURL = config.baseUrl;
  const client = new OpenAI(clientOpts);
  const model = config.model || 'gpt-4o';

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
    model,
    max_tokens: 4096,
    messages: openaiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) writeDelta(delta);
  }
}

async function handleGemini(res, system, messages, config, writeDelta) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model || 'gemini-2.0-flash',
    systemInstruction: system,
  });

  // Convert Anthropic-style content blocks to Gemini format
  const rawMessages = messages.map(m => {
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
    return { role, parts: parts.length > 0 ? parts : [{ text: '' }] };
  });

  // Gemini requires strict user/model alternation — merge consecutive same-role messages
  const geminiMessages = [];
  for (const msg of rawMessages) {
    if (geminiMessages.length > 0 && geminiMessages[geminiMessages.length - 1].role === msg.role) {
      geminiMessages[geminiMessages.length - 1].parts.push(...msg.parts);
    } else {
      geminiMessages.push({ role: msg.role, parts: [...msg.parts] });
    }
  }

  // Must start with 'user'
  if (geminiMessages.length > 0 && geminiMessages[0].role !== 'user') {
    geminiMessages.unshift({ role: 'user', parts: [{ text: '' }] });
  }

  try {
    const result = await model.generateContentStream({ contents: geminiMessages });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) writeDelta(text);
    }
  } catch (err) {
    throw new Error(`Gemini error: ${err.message}`);
  }
}

async function handleOllama(res, system, messages, config, writeDelta) {
  const openaiModule = require('openai');
  const OpenAI = openaiModule.default || openaiModule.OpenAI || openaiModule;
  const baseURL = `${config.baseUrl || 'http://host.docker.internal:11434'}/v1`;
  const model   = config.model || 'llama3.2';
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
    if (delta) writeDelta(delta);
  }
}

router.post('/chat', async (req, res) => {
  const { message, context, history = [], attachment, attachments, systemOverride, providerConfig } = req.body;

  const provider = detectProvider(providerConfig);
  if (!provider) {
    return res.status(500).json({
      error: 'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or OLLAMA_MODEL in your .env file.',
    });
  }

  const config = getProviderConfig(provider, providerConfig);

  // ── PII redaction ────────────────────────────────────────────────────────
  // Always on for cloud providers; skipped for Ollama because the data never
  // leaves the user's machine anyway. Not user-configurable — privacy is a
  // guarantee, not a preference.
  const providerIsLocal = provider === 'ollama';
  const redactEnabled = !providerIsLocal;

  let workingContext = context;
  let workingMessage = message;
  let workingHistory = history;
  let rehydrator = null;
  let redactMap = null;
  let redactCounter = null;

  if (redactEnabled) {
    const ctxResult = redactContext(context);
    workingContext = ctxResult.redacted;
    redactMap = ctxResult.map;
    redactCounter = ctxResult.counter;
    workingMessage = redactMessage(message, redactMap, redactCounter);
    workingHistory = redactHistory(history, redactMap, redactCounter);
    rehydrator = new StreamRehydrator(redactMap);
  }

  const system = buildSystem(workingContext, systemOverride?.trim() || SYSTEM_BASE);

  // Build user content — text + optional file attachment(s).
  // Binary attachments (images/PDFs) pass through unchanged; we can't redact
  // without OCR. Text-file attachments (CSV/JSON/TXT) go through the same
  // redaction pipeline as the user's typed message — known-profile values are
  // masked, and free-text regex patterns catch AHV/IBAN/email/phone.
  // Users are warned about the binary-file limitation in the UI.
  let userContent;
  const allAtts = attachments && Array.isArray(attachments) && attachments.length
    ? attachments
    : (attachment && attachment.data ? [attachment] : []);
  if (allAtts.length > 0) {
    const blocks = allAtts.flatMap(att => buildAttachmentBlocks(att, provider));
    if (redactEnabled && redactMap) {
      // Text-file attachments (CSV/JSON/TXT) arrive as { type: 'text', text: ... }
      // and get redacted. Image/PDF blocks are binary and pass through.
      for (const block of blocks) {
        if (block.type === 'text' && typeof block.text === 'string') {
          block.text = redactMessage(block.text, redactMap, redactCounter);
        }
      }
    }
    blocks.push({ type: 'text', text: workingMessage });
    userContent = blocks;
  } else {
    userContent = workingMessage;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const writeDelta = makeWriteDelta(res, rehydrator);

  try {
    const messages = [...workingHistory, { role: 'user', content: userContent }];

    if (provider === 'anthropic') {
      await handleAnthropic(res, system, messages, config, writeDelta);
    } else if (provider === 'openai') {
      await handleOpenAI(res, system, messages, config, writeDelta);
    } else if (provider === 'gemini') {
      await handleGemini(res, system, messages, config, writeDelta);
    } else if (provider === 'ollama') {
      await handleOllama(res, system, messages, config, writeDelta);
    }

    flushRehydrator(res, rehydrator);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI service error: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
