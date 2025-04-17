const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://zemexx.ru/zemelnye-uchastki/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000, // 60 секунд
  });

  const mapPoints = await page.evaluate(() => {
    try {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
      const target = scripts.find(s => s.includes('var mapPoints = ['));
      if (!target) return [];

      const json = target.match(/var mapPoints\s*=\s*(\[.*?\]);/s);
      if (!json) return [];

      return eval(json[1]);
    } catch (err) {
      return [];
    }
  });

  if (!mapPoints.length) {
    console.error('mapPoints не найден');
    await browser.close();
    return;
  }

  const villages = mapPoints.map(point => {
    const html = point.ballun?.balloonContent || '';
    const match = html.match(/<div class="catalog-list__item-name"><a href="([^"]+)">([^<]+)<\/a><\/div>/);
    if (!match) return null;
    const [, url, name] = match;
    return { name: name.trim(), url: url.trim() };
  }).filter(Boolean);

  console.table(villages);
  fs.writeFileSync('villages.json', JSON.stringify(villages, null, 2), 'utf-8');
  console.log(`Сохранено ${villages.length} поселков в villages.json`);

  await browser.close();
})();
