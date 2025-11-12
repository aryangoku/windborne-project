const express = require('express');
const axios = require('axios');
const pRetry = require('p-retry').default;

const app = express();
const PORT = process.env.PORT || 3000;


async function fetchTreasure(hourCode) {
  const url = `https://a.windbornesystems.com/treasure/${hourCode}.json`;
  try {
    const res = await pRetry(() => axios.get(url, { timeout: 7000 }), { retries: 2 });
    
    const data = res.data;
    
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch (err) { return null; }
    }
    return data;
  } catch (err) {
    console.warn(`Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}


async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  try {
    const res = await axios.get(url, { timeout: 7000 });
    return res.data.current_weather || null;
  } catch (err) {
    console.warn(`OpenMeteo failed for ${lat},${lon}: ${err.message}`);
    return null;
  }
}


async function buildCombined() {
  const results = [];
  for (let i = 0; i < 24; i++) {
    const code = String(i).padStart(2, '0');
    const payload = await fetchTreasure(code);
    if (!payload) continue;
    const extracted = extractPositions(payload);
    if (extracted.length) {
      results.push({ hour: code, raw: payload, positions: extracted });
    }
  }
  return results;
}

function extractPositions(obj) {
  const found = [];
  function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (('lat' in o || 'latitude' in o) && ('lon' in o || 'lng' in o || 'longitude' in o)) {
      const lat = o.lat ?? o.latitude;
      const lon = o.lon ?? o.lng ?? o.longitude;
      const alt = o.alt ?? o.altitude ?? null;
      const id = o.id ?? o.uuid ?? null;
      found.push({ id, lat: Number(lat), lon: Number(lon), alt });
      return;
    }
    for (const k of Object.keys(o)) {
      walk(o[k]);
    }
  }
  walk(obj);
  return found;
}

app.get('/api/combined', async (req, res) => {
  try {
    const combined = await buildCombined();

    const allPositions = [];
    for (const entry of combined) {
      for (const pos of entry.positions) {
        allPositions.push({ hour: entry.hour, ...pos });
      }
    }

    const concurrency = 8;
    const enriched = [];
    for (let i = 0; i < allPositions.length; i += concurrency) {
      const batch = allPositions.slice(i, i + concurrency);
      const promises = batch.map(async (p) => {
        const weather = (isFinite(p.lat) && isFinite(p.lon)) ? await fetchWeather(p.lat, p.lon) : null;
        return { ...p, weather };
      });
      const done = await Promise.all(promises);
      enriched.push(...done);
    }

    res.json({ timestamp: Date.now(), count: enriched.length, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});
