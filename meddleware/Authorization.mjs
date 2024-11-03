import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware для проверки JWT токена
export const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(403).json({ message: 'Token is required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.user = user;
        next();
    });
};