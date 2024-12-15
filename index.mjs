import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveServerAddress } from './utils/saveServer.mjs';
import apiRouter from './routes/userRoutes.mjs';
import {processReferral} from './meddleware/checkRef.mjs';
import Check from './controllers/checkHel.mjs';
const router = express.Router();

dotenv.config();

// const token = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(express.json());
app.use(cors());

// Определяем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Укажите путь к папке build
// const buildPath = path.join(__dirname, 'build');
// app.use(express.static(buildPath));

app.use((err, req, res, next) => {
    if (err instanceof URIError) {
        console.error("URIError detected: ", err.message);
        res.status(400).send("Bad Request");
    } else {
        next(err);
    }
});

// // SSL-конфигурация
// const sslOptions = {
//   key: fs.readFileSync('/home/kaseev/conf/web/tongaroo.fun/ssl/tongaroo.fun.key'),
//   cert: fs.readFileSync('/home/kaseev/conf/web/tongaroo.fun/ssl/tongaroo.fun.crt'),
// };

// API маршруты
app.use('/api', apiRouter);

// Маршрут для проверки связи с базой данных
router.get('/check-database', Check.checkDatabase);

// // // Настройка HTTPS-сервера
// const HTTPS_PORT = process.env.HTTPS_PORT || 443;
// https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
//     console.log(`HTTPS Server started on port ${HTTPS_PORT}`);
// });

// // // Настройка HTTP-сервера для перенаправления на HTTPS
// const HTTP_PORT = process.env.HTTP_PORT || 80;
// http.createServer((req, res) => {
//     res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
//     res.end();
// }).listen(HTTP_PORT, () => {
//     console.log(`HTTP Server started on port ${HTTP_PORT} and redirecting to HTTPS`);
// });


const HTTP_PORT = process.env.HTTP_PORT || 80;
http.createServer(app).listen(HTTP_PORT, async () => {
  console.log(`HTTP Server started on port ${HTTP_PORT}`);

  // Сохраняем информацию о сервере после его запуска
  await saveServerAddress(HTTP_PORT);
});