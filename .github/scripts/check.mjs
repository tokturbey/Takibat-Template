import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { createTransport } from 'nodemailer';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const monitorsPath = 'monitors.json';
const hashesPath   = 'hashes.json';
const changesLogPath = 'changed_urls.txt';

if (existsSync(changesLogPath)) unlinkSync(changesLogPath);
if (!existsSync(monitorsPath)) {
  console.log('monitors.json bulunamadı, çıkılıyor.');
  process.exit(0);
}

const monitors = JSON.parse(readFileSync(monitorsPath, 'utf8'));
const hashes   = existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, 'utf8')) : {};

if (!monitors.length) {
  console.log('İzlenecek monitör yok.');
  process.exit(0);
}

const transporter = createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Takibat-Monitor/1.0' },
      redirect: 'follow',
      timeout: 15000,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.warn(`Fetch hatası (${url}):`, e.message);
    return null;
  }
}

function extractContent(html, cssSelector) {
  try {
    const dom = new JSDOM(html);
    const sel = (!cssSelector || cssSelector.trim() === ':root') ? 'body' : cssSelector;
    const el  = dom.window.document.querySelector(sel);
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  } catch {
    return '';
  }
}

async function sendEmail(monitor) {
  const to = monitor.email || process.env.NOTIFY_EMAIL;
  if (!to) return;
  const subject = `Takibat: Değişiklik Tespit Edildi – ${monitor.url}`;
  const trTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const html = `
    <h2>🔔 Takibat – Sayfa Değişti!</h2>
    <table>
      <tr><td><strong>URL</strong></td><td><a href="${monitor.url}">${monitor.url}</a></td></tr>
      <tr><td><strong>CSS Seçici</strong></td><td><code>${monitor.cssselector || ':root'}</code></td></tr>
      <tr><td><strong>Tespit Zamanı</strong></td><td>${trTime}</td></tr>
    </table>
    <p><a href="${monitor.url}" style="background:#2f73ba;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none">Sayfayı Aç</a></p>
    <hr><small>Takibat</small>
  `;
  try {
    await transporter.sendMail({ from: `"Takibat" <${process.env.SMTP_USER}>`, to, subject, html });
    console.log(`✉️ E-posta gönderildi → ${to}`);
  } catch (e) {
    console.error('E-posta hatası:', e.message);
  }
}

async function sendDiscordNotification(monitor) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  const trTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: "🔔 Takibat - Değişiklik Tespit Edildi",
          url: monitor.url,
          fields: [
            { name: "URL", value: monitor.url, inline: false },
            { name: "CSS Seçici", value: monitor.cssselector || ':root', inline: true },
            { name: "Zaman", value: trTime, inline: true }
          ],
          color: 0xff7b2c
        }]
      })
    });
    console.log(`Discord embed bildirimi gönderildi: ${monitor.url}`);
  } catch (e) {
    console.warn('Discord hatası:', e.message);
  }
}

async function callWebhook(monitor) {
  if (!monitor.callbackurl) return;
  try {
    await fetch(monitor.callbackurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: monitor.url, cssSelector: monitor.cssselector, detectedAt: new Date().toISOString() })
    });
    console.log(`Webhook çağrıldı: ${monitor.callbackurl}`);
  } catch (e) {
    console.warn(`Webhook hatası: ${e.message}`);
  }
}

let changed = false;

for (const monitor of monitors) {
  console.log(`Kontrol ediliyor: ${monitor.url}`);
  const html = await fetchPage(monitor.url);
  if (!html) continue;

  const content = extractContent(html, monitor.cssselector);
  const newHash = sha256(content);
  const prevHash = hashes[monitor.id]?.hash;

  if (!prevHash) {
    console.log(`  → İlk kontrol, hash kaydedildi.`);
    hashes[monitor.id] = { hash: newHash, checkedAt: new Date().toISOString() };
    changed = true;
    continue;
  }

  if (prevHash !== newHash) {
    console.log(`  → ⚠️ Değişiklik tespit edildi!`);
    await sendEmail(monitor);
    await sendDiscordNotification(monitor);
    await callWebhook(monitor);

    const logLine = `📌 ${monitor.url}\n   Seçici: ${monitor.cssselector || ':root'}\n   Zaman: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n\n`;
    appendFileSync(changesLogPath, logLine);

    hashes[monitor.id] = { hash: newHash, checkedAt: new Date().toISOString(), changed: true };
    changed = true;
  } else {
    console.log(`  → Değişiklik yok.`);
    hashes[monitor.id].checkedAt = new Date().toISOString();
  }
}

if (changed) {
  writeFileSync(hashesPath, JSON.stringify(hashes, null, 2), 'utf8');
  console.log('hashes.json güncellendi.');
} else {
  console.log('Hiçbir değişiklik yok, hashes.json güncellenmedi.');
}

console.log('Kontrol tamamlandı.');
