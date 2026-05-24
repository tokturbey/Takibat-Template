/**
 * Takibat – GitHub Actions Kontrol Scripti
 * .github/scripts/check.mjs
 */

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
  const to = process.env.NOTIFY_EMAIL || monitor.email;
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

async function sendTelegramNotification(monitor) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const trTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const text = `🔔 *Takibat - Değişiklik Tespit Edildi* 🔔\n\n📌 *URL:* ${monitor.url}\n🎯 *Seçici:* ${monitor.cssselector || ':root'}\n🕒 *Zaman:* ${trTime}\n\n[Sayfayı aç](${monitor.url})`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });
    console.log(`Telegram bildirimi gönderildi: ${monitor.url}`);
  } catch (e) {
    console.warn('Telegram hatası:', e.message);
  }
}

async function sendPushbulletNotification(monitor) {
  const accessToken = process.env.PUSHBULLET_ACCESS_TOKEN;
  if (!accessToken) return;

  const trTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const title = `Takibat - Değişiklik: ${monitor.url}`;
  const body = `Seçici: ${monitor.cssselector || ':root'}\nZaman: ${trTime}`;

  try {
    await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'link',
        title: title,
        body: body,
        url: monitor.url
      })
    });
    console.log(`Pushbullet bildirimi gönderildi: ${monitor.url}`);
  } catch (e) {
    console.warn('Pushbullet hatası:', e.message);
  }
}

async function sendGotifyNotification(monitor) {
  const gotifyUrl = process.env.GOTIFY_URL;    // örn: https://gotify.example.com
  const gotifyToken = process.env.GOTIFY_TOKEN;
  if (!gotifyUrl || !gotifyToken) return;

  const trTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const title = `Takibat: ${monitor.url}`;
  const message = `Seçici: ${monitor.cssselector || ':root'}\nZaman: ${trTime}\n[Bağlantı](${monitor.url})`;

  try {
    await fetch(`${gotifyUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': gotifyToken
      },
      body: JSON.stringify({
        title: title,
        message: message,
        priority: 5,
        extras: {
          'client::display': {
            contentType: 'text/markdown'
          }
        }
      })
    });
    console.log(`Gotify bildirimi gönderildi: ${monitor.url}`);
  } catch (e) {
    console.warn('Gotify hatası:', e.message);
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
    await sendTelegramNotification(monitor);      // YENİ
    await sendPushbulletNotification(monitor);    // YENİ
    await sendGotifyNotification(monitor);        // YENİ
    await callWebhook(monitor);

    if (monitor.callbackurl) {
      try {
        await fetch(monitor.callbackurl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: monitor.url, cssSelector: monitor.cssselector, detectedAt: new Date().toISOString() })
        });
        console.log(`  → Webhook çağrıldı: ${monitor.callbackurl}`);
      } catch (e) { console.warn(`  → Webhook hatası: ${e.message}`); }
    }

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
  console.log('hashes.json güncellendi (sadece değişiklik veya ilk kontrol durumunda).');
} else {
  console.log('Hiçbir değişiklik yok, hashes.json güncellenmedi.');
}

console.log('Kontrol tamamlandı.');
