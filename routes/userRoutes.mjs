import express from 'express';
import { login, getUserCoins, addCoins, checkEnergy } from '../controllers/userController.mjs';

const router = express.Router();

router.post('/login', login);
router.get('/coins/:id', getUserCoins);
router.post('/add-coins/:id', addCoins);
router.get('/check-energy/:id', checkEnergy);

export default router;
