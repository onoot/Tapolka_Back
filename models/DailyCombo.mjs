// models/DailyCombo.mjs
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';
import Daily from './Daily.mjs';

const DailyCombo = sequelize.define('DailyCombo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    reward: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    levels: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    Data: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    dailyId: {
        type: DataTypes.INTEGER,
        references: {
            model: Daily,
            key: 'id',
        },
        allowNull: true,
    },
}, {
    tableName: 'combo',
});

export default DailyCombo;
