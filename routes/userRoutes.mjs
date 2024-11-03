import express from 'express';
import { login, getUserCoins, addCoins, checkEnergy } from '../controllers/userController.mjs';

const router = express.Router();

router.post('/login', login);
router.get('/coins/:telegramId', getUserCoins);
router.post('/add-coins/:telegramId', addCoins);
router.get('/check-energy/:telegramId', checkEnergy);

export default router;
