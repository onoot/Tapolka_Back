import express from 'express';
import path from 'path';

import { login, getUserCoins, addCoins, checkEnergy } from '../controllers/userController.mjs';

const router = express.Router();

router.post('/login', login);
router.get('/coins/:id', getUserCoins);
router.post('/add-coins/:id', addCoins);
router.get('/check-energy/:id', checkEnergy);

router.get('/manifest', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/ton.json'));
});

router.get('/img', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/img.png'));
});

export default router;
