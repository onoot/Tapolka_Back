import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, // Отключаем логирование SQL запросов
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Проверка подключения
try {
    await sequelize.authenticate();
    console.log('Connection to database has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

export default sequelize;
