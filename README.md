# Takibat-Template
# Takibat – Monitör Şablonu

Bu repo, Takibat Chrome eklentisi için otomatik sayfa değişiklik kontrolü yapan GitHub Actions workflow'larını içerir.

## Kurulum

1. Bu repoyu **fork**'la veya **kendin yeni bir repo oluştur** (public olmalı).
2. Eklentinin **Ayarlar** sayfasına GitHub bilgilerini gir (repo adı, kullanıcı adı, token).
3. GitHub Actions'ın çalışması için aşağıdaki **secrets**'ları repo'na ekle (Settings → Secrets and variables → Actions):
   - `SMTP_HOST` (örn. smtp.gmail.com)
   - `SMTP_PORT` (587)
   - `SMTP_USER` (e-posta adresin)
   - `SMTP_PASS` (uygulama şifresi)
   - `NOTIFY_EMAIL` (bildirimlerin gönderileceği e-posta)
   - `DISCORD_WEBHOOK_URL` (opsiyonel)

4. Eklentiden bir monitör eklediğinde, `monitors.json` dosyası bu repoya otomatik pushlanır. Workflow her 5 dakikada bir çalışıp değişiklikleri kontrol eder.

## Manuel kurulum (fork yoksa)

`.github/workflows/check.yml` ve `.github/workflows/discord-push-notify.yml` dosyalarını kendi repo'nun aynı yollarına kopyala. `.github/scripts/check.mjs`'i de ekle.

## Not

Tüm veriler (monitör listesi, hash'ler) sadece sizin GitHub repo'nuzda saklanır. Eklenti geliştiricisinin herhangi bir sunucusuna gönderilmez.






📘 Takibat Eklenti Kurulum Rehberi
1. GitHub Token Alma
GitHub > Ayarlar > Geliştirici ayarları > Personal access tokens > Tokens (classic) > Generate new token (classic).
Scopes: repo (tüm alt seçenekler otomatik gelir). Token'ı kopyala.

2. Repo Hazırlama
Şu şablon repoyu fork'la: Takibat-Template (kendi reponu oluştur).
Veya yeni bir repo oluştur, içine .github/workflows/check.yml ve .github/scripts/check.mjs koy.

3. Eklenti Ayarları
Eklenti simgesine sağ tık > Ayarlar. GitHub bölümüne owner (kullanıcı adın), repo adı ve token'ı gir. Kaydet.

4. SMTP Ayarları (E-posta Bildirimi İçin)
Örnek Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=email@gmail.com, SMTP_PASS=uygulama şifresi (Google Hesabım > Güvenlik > 2 Adımlı Doğrulama > Uygulama şifreleri).
NOTIFY_EMAIL = alıcı adresi (kendiniz olabilir).

5. Discord Webhook (Opsiyonel)
Discord sunucunda Kanal Ayarları > Entegrasyonlar > Webhook Oluştur. URL'yi kopyala.

6. GitHub Secrets
Repo'nuzda Settings > Secrets and variables > Actions. Yukarıdaki değişkenleri ekleyin.

📱 Telegram Bot Bildirimi
1. Telegram'da BotFather'a yaz: /newbot → ad ve kullanıcı adı ver → token al.
2. @userinfobot'a yaz: /start → chat ID'ni al.
3. Repo secrets'ına TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID olarak ekle.

🔔 Pushbullet Bildirimi
1. Pushbullet'a giriş yap → Ayarlar → Access Tokens → Create Access Token.
2. Secret: PUSHBULLET_ACCESS_TOKEN.

📢 Gotify (Kendi sunucun)
1. Gotify sunucusu kur (docker: docker run -p 80:80 gotify/server).
2. Web arayüzünden bir uygulama oluştur, token al.
3. Secret: GOTIFY_URL (örn. https://gotify.ornek.com) ve GOTIFY_TOKEN.

🔒 Gizlilik
Takibat, tüm verilerinizi sadece kendi GitHub repo'nuzda ve Chrome storage'ınızda saklar. Geliştiricinin hiçbir sunucusuna bilgi gönderilmez.
