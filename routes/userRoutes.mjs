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
    getBoadr
} from '../controllers/userController.mjs';

const router = express.Router();

router.post('/login', login);

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

router.get('/board', getBoadr);


router.get('/manifest', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ton.json'));
});

router.get('/img', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/img.png'));
});

export default router;
