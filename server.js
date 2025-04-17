const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/zemexx', (req, res) => {
  const { settlement, plot } = req.body;
  console.log('📥 Запрос:', { settlement, plot });

  if (!settlement || !plot) {
    return res.status(400).json({ error: 'Не указано название поселка или номер участка' });
  }

  const scriptPath = path.join(__dirname, 'zemexx-plot-parser.js');

  exec(`node "${scriptPath}" "${settlement}" "${plot}"`, (error, stdout) => {
    if (error) {
      console.error('❌ Ошибка скрипта:', error);
      return res.status(500).json({ error: 'Ошибка при выполнении скрипта' });
    }

    const match = stdout.match(/Статус: (.+)\n\s+Площадь: (.+)\n\s+Цена: (.+)\n\s+Бронь: (.+)/);

    if (!match) {
      return res.status(404).json({ error: 'Не удалось извлечь данные из вывода скрипта' });
    }

    const status = match[1];
    const area = parseFloat(match[2].replace(',', '.'));
    const price = parseInt(match[3].replace(/\s/g, '')) || 0;
    const pricePer100 = area > 0 ? Math.round(price / area) : 0;

    res.json({
      status,
      area: area.toFixed(2).replace('.', ','),
      pricePer100: pricePer100.toLocaleString('ru-RU'),
      price: price.toLocaleString('ru-RU')
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});

