const axios = require('axios');

module.exports = async (req, res) => {
  // Включаем подробное логирование
  console.log('=== START PROXY REQUEST ===');
  console.log('Request Method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request Headers:', req.headers);
  console.log('Request Query:', req.query);

  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return res.status(200).end();
  }

  // Проверяем наличие URL в переменных окружения
  const gasUrl = process.env.GAS_ENDPOINT;
  console.log('GAS_ENDPOINT from env:', gasUrl ? 'EXISTS' : 'MISSING');

  if (!gasUrl) {
    const errorMsg = 'GAS_ENDPOINT environment variable is not defined';
    console.error(errorMsg);
    return res.status(500).json({
      error: 'Server configuration error',
      message: errorMsg,
      details: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
      }
    });
  }

  try {
    console.log('Making request to GAS URL:', gasUrl);
    
    const response = await axios.get(gasUrl, {
      params: req.query,  // Передаем все query-параметры
      timeout: 10000,     // 10 секунд таймаут
      headers: {
        'User-Agent': 'Vercel-Proxy-Server/1.0',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.connection.remoteAddress
      }
    });

    console.log('Received response from GAS:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    // Пересылаем заголовки и данные от GAS
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    
    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error('PROXY ERROR:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });

    const statusCode = error.response?.status || 500;
    const errorData = {
      error: 'Proxy error',
      message: error.message,
      details: {
        timestamp: new Date().toISOString(),
        targetUrl: gasUrl,
        originalError: {
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : null
        }
      }
    };

    return res.status(statusCode).json(errorData);
  } finally {
    console.log('=== END PROXY REQUEST ===');
  }
};