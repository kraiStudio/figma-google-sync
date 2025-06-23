const axios = require('axios');

module.exports = async (req, res) => {
  try {
    // Добавляем CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обрабатываем OPTIONS запрос для CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const targetUrl = process.env.GAS_ENDPOINT;

    if (!targetUrl) {
      console.error('GAS_ENDPOINT is not defined');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Making request to:', targetUrl);
    const response = await axios.get(targetUrl, {
      params: req.query, // Передаем все query-параметры дальше к GAS
      timeout: 10000 // 10 секунд таймаут
    });

    console.log('Received response with status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Proxy error',
      message: error.message,
      details: error.response?.data 
    });
  }
};