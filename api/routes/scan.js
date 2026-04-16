const express = require('express');
const { scanAttachment } = require('../lib/scan-attachment');

const router = express.Router();

router.post('/scan-attachment', async (req, res) => {
  const { attachment, profile } = req.body || {};
  if (!attachment || !attachment.data) {
    return res.status(400).json({ error: 'attachment with data is required' });
  }
  try {
    const result = await scanAttachment(attachment, profile);
    res.json(result);
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
