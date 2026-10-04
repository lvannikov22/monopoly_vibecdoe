# Монополия онлайн
Node.js 18+. Запуск: `npm install && npm start` → http://localhost:3000

## Выложить в интернет (Render.com, бесплатно)
1. Залей папку в GitHub-репозиторий.
2. Render → New → Web Service → репозиторий. Build: `npm install`, Start: `npm start`.
3. Для сохранения аккаунтов добавь Disk (путь `/data`) и переменную `DATA_DIR=/data`.
Подойдёт и Railway / Fly.io / любой VPS (за nginx включи проксирование WebSocket на /ws; HTTPS даёт wss автоматически).

Архитектура: игровую логику исполняет браузер хоста комнаты, сервер хранит аккаунты, комнаты и пересылает сообщения.
