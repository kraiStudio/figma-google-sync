const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const targetUrl = process.env.GAS_ENDPOINT;

    if (!targetUrl) {
      return res.status(500).send('GAS_ENDPOINT is not defined in environment');
    }

    const response = await axios.get(targetUrl);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка при обращении к внешнему API');
  }
};
