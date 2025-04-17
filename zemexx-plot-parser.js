const puppeteer = require('puppeteer');

async function main(settlementName, plotId) {
  console.log(`🔎 Ищем поселок: ${settlementName}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: puppeteer.executablePath() // 🛠️ Это важно для Render
  });

  const page = await browser.newPage();
  await page.goto('https://zemexx.ru', { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('a[href*="/zemelnye-uchastki/"]');
  const settlements = await page.$$eval('a[href*="/zemelnye-uchastki/"]', (links) =>
    links.map((link) => ({
      name: link.textContent.trim(),
      url: link.href,
    }))
  );

  const settlement = settlements.find((s) =>
    s.name.toLowerCase().includes(settlementName.toLowerCase())
  );

  if (!settlement) {
    console.log('❌ Поселок не найден');
    await browser.close();
    return;
  }

  console.log(`✅ Найден: ${settlement.name}`);
  await page.goto(settlement.url, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('a.btn_prod--plan');
  const planDataSrc = await page.$eval('a.btn_prod--plan', (el) => el.getAttribute('data-src'));
  const fullPlanUrl = planDataSrc.startsWith('http') ? planDataSrc : `https://zemexx.ru${planDataSrc}`;
  console.log(`🗺️ Переход к планировке: ${fullPlanUrl}`);

  await page.goto(fullPlanUrl, { waitUntil: 'domcontentloaded' });

  const svgUrl = await page.$eval('object#plan', (el) => el.getAttribute('data'));
  if (!svgUrl) {
    console.log('❌ SVG не найден');
    await browser.close();
    return;
  }

  const fullSvgUrl = svgUrl.startsWith('http') ? svgUrl : `https://zemexx.ru${svgUrl}`;
  console.log(`📄 Загружаем SVG: ${fullSvgUrl}`);

  const svgPage = await browser.newPage();
  await svgPage.goto(fullSvgUrl, { waitUntil: 'domcontentloaded' });

  const plots = await svgPage.evaluate(() => {
    const elements = document.querySelectorAll('[data-id]');
    const result = [];

    elements.forEach((el) => {
      result.push({
        id: el.getAttribute('data-id'),
        status: el.getAttribute('data-status'),
        area: el.getAttribute('data-area'),
        price: el.getAttribute('data-price'),
        booking: el.getAttribute('data-price-booking'),
      });
    });

    return result;
  });

  if (!plots.length) {
    console.log('❌ Участки не найдены');
    await browser.close();
    return;
  }

  const targetPlot = plots.find((p) => p.id === String(plotId));

  if (!targetPlot) {
    console.log(`❌ Участок с ID ${plotId} не найден`);
  } else {
    console.log(`✅ Участок #${plotId}`);
    console.log(`   Статус: ${targetPlot.status}`);
    console.log(`   Площадь: ${targetPlot.area}`);
    console.log(`   Цена: ${targetPlot.price}`);
    console.log(`   Бронь: ${targetPlot.booking}`);
  }

  await browser.close();
}

const [settlementName, plotId] = process.argv.slice(2);
if (!settlementName || !plotId) {
  console.log('❗ Использование: node zemexx-plot-parser.js "<Название>" <ID>');
  process.exit(1);
}

main(settlementName, plotId);

