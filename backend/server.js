require('dotenv').config(); // добавляем поддержку .env

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());

app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = process.env.GAS_ENDPOINT; // берём из .env

    if (!targetUrl) {
      return res.status(500).send('GAS_ENDPOINT is not defined in environment');
    }

    const response = await axios.get(targetUrl);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка при обращении к внешнему API');
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
