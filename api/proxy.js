const axios = require('axios');

module.exports = async (req, res) => {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const gasUrl = process.env.GAS_ENDPOINT;
    if (!gasUrl) {
      throw new Error('GAS_ENDPOINT environment variable is missing');
    }

    console.log(`Proxying to: ${gasUrl}`);
    const response = await axios.get(gasUrl, {
      params: req.query,
      timeout: 10000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      url: gasUrl
    });
  }
};