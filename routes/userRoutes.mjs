import express from 'express';
import path from 'path';

import { 
    login, 
    getUserCoins, 
    addCoins, 
    checkEnergy, 
    generateReferralLink, 
    verifyReferralLink, 
    getFriendList,
    getMineItems,
    DailyItems,
    getTask,
    buyCard,
    getBoard,
    wallet,
    checkDaily,
    boost,
} from '../controllers/userController.mjs';

import {prepareTransaction, sendTransaction, checkTransaction, airdrop} from '../controllers/transaction.mjs'
import { verifyTelegramWebAppData } from '../middleware/telegramAuth.mjs';
import { validateTelegramData } from '../meddleware/verificationTG.mjs';

const router = express.Router();

// Добавляем middleware для верификации данных перед login
router.post('/login', validateTelegramData, login);

router.get('/coins/:id', getUserCoins);
router.post('/add-coins/:id', addCoins);
router.get('/check-energy/:id', checkEnergy);

// Генерация реферальной ссылки
router.get('/generateReferralLink/:id', generateReferralLink);

// Проверка реферальной ссылки
router.post('/verifyReferralLink', verifyReferralLink);

router.get('/getFriendList/:id', getFriendList );
router.get('/getMineItems/:id', getMineItems );

//покупка карточек
router.post('/buyCard/:id', buyCard);

//получение дейли комбо и награды за неё
router.get('/getDailyItems/', DailyItems );

router.post('/getTask', getTask);

router.get('/board/:id', getBoard);

router.post('/check-daily/', checkDaily);

router.post('/wallet/:id', wallet);


router.post('/boost/:id', boost);


router.get('/manifest', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ton.json'));
});

router.get('/img', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/img.png'));
});

router.get('./airdrop', airdrop);

// Транзакции
router.post('/prepare-transaction', prepareTransaction);
router.post('/send-transaction', sendTransaction);
router.post('/check-transaction', checkTransaction);

export default router;
