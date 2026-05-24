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
