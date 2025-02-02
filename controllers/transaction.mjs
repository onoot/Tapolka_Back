import TonWeb from 'tonweb';
import { v4 as uuidv4 } from "uuid";
import { VerifJWT } from "./userController.mjs";
import Payment from "../models/Payment.mjs";
import User from "../models/User.mjs";
import sequelize from "../config/database.mjs";
import History from "../models/History.mjs";
 
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY 
}));
export const prepareTransaction = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token || !VerifJWT(token)) {
            return res.status(401).json({ message: "Unauthorized" });
        }

       // Логируем тело запроса для анализа структуры
       console.log('Request body:', JSON.stringify(req.body, null, 2));

       // Извлекаем userId из тела запроса
       const { senderAddress, recipientAddress, amount, userId: rawUserId } = req.body;

       // 1. Проверка наличия userId
       if (!rawUserId) {
           return res.status(400).json({ error: "Missing userId" });
       }

       // 2. Обработка случая, когда userId - объект
       let userIdValue;
       if (typeof rawUserId === 'object' && rawUserId.id) {
           userIdValue = rawUserId.id;
       } else {
           userIdValue = rawUserId;
       }

       // 3. Преобразование к строке
       const userIdString = String(userIdValue);
       console.log('Processed userId:', userIdString);

       // 4. Поиск пользователя
       const user = await User.findOne({ 
           where: { 
               telegramId: userIdString 
           } 
       });

       if (!user) {
           return res.status(400).json({ 
               error: "User not found. Complete registration first." 
           });
       }

       // 3. Проверка типа данных
       if (typeof user.id !== 'number') {
           return res.status(400).json({
               error: "Invalid user ID format"
           });
       }
        // 3. Создание платежа в транзакции
        const transaction = await sequelize.transaction();
        
        try {
            const payment = await Payment.create({
                transactionId: uuidv4(),
                senderAddress,
                recipientAddress,
                amount,
                status: "pending",
                userId: user.id // Используем ID из найденного пользователя
            }, { transaction });

            await transaction.commit();
            
            res.json({
                transactionId: payment.transactionId,
                senderAddress,
                recipientAddress,
                amount
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Ошибка при подготовке транзакции:", error);
        return res.status(500).json({ 
            error: error.message || "Ошибка при подготовке транзакции" 
        });
    }
}
export const sendTransaction = async (req, res) => {
    const { transactionId, signedTransaction } = req.body;

    if (!transactionId || !signedTransaction) {
        return res.status(400).json({ error: "Invalid input" });
    }

    // Проверяем, существует ли транзакция в базе данных
    const payment = await Payment.findOne({ 
        where: { transactionId },
        include: [{ model: User }]
    });

    if (!payment) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    try {
        // Отправка транзакции в сеть TON
        const result = await tonweb.sendRawTransaction(signedTransaction);

        // Обновляем информацию о транзакции
        payment.txHash = result;
        payment.status = "completed";
        await payment.save();

        // Обновляем статистику транзакций пользователя
        const user = payment.User;
        const transactions = user.transactions || {
            daily: { count: 0, lastDate: new Date().toISOString() },
            tasks: { count: 0, lastDate: new Date().toISOString() },
            totalTokens: 0
        };

        // Определяем тип транзакции и обновляем соответствующий счетчик
        const transactionType = payment.type || 'tasks';
        transactions[transactionType] = {
            count: (transactions[transactionType]?.count || 0) + 1,
            lastDate: new Date().toISOString()
        };
        transactions.totalTokens += Number(payment.amount);

        // Сохраняем обновленную статистику
        user.transactions = transactions;
        await user.save();

        res.json({ success: true, txHash: result });
    } catch (error) {
        console.error("Error submitting transaction:", error);
        return res.status(500).json({ error: "Transaction failed" });
    }
}

export const checkTransaction = async (req, res) => {
    try {
      const { txHash } = req.body;
      const txInfo = await tonweb.provider.getTransaction(txHash);
  
      if (txInfo && txInfo.status === "confirmed") {
        const payment = await Payment.findOne({ 
          where: { txHash },
          include: [User]
        });
  
        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }
  
        // Обновление статуса платежа
        payment.status = "confirmed";
        await payment.save();
  
        // Создание записи в истории
        await History.create({
          type: 'transfer', // или другой тип из ENUM
          amount: payment.amount,
          currency: 'TON',
          from_address: payment.senderAddress,
          to_address: payment.recipientAddress,
          tx_hash: txHash,
          status: 'completed',
          userId: payment.userId
        });
  
        // Начисление бонусов
        await BonusService.addBonus(payment.userId, payment.amount);
  
        console.log("Transaction confirmed and history updated");
        return res.json({ status: 'confirmed' });
      }
    } catch (error) {
      console.error("Error checking transaction status:", error);
      return res.status(500).json({ error: "Transaction check failed" });
    }
  }

  export const airdrop = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token || !VerifJWT(token)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        //формируем ответ на запрос в виде JSON
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await User.findOne({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        //получаем из History последние 100 тразакций
        const transactions = await History.findAll({
            where: { status: 'completed' },
            limit: 100,
            order: [['createdAt', 'DESC']],
        });

        const userTransactions = user?.transactions || {};
        const dailyCount = userTransactions.daily?.count || 0;
        const tasksCount = userTransactions.tasks?.count || 0;
        const combo = user?.count_win_combo||0

        // Складываем общее количество транзакций
        const totalTransactions = dailyCount + tasksCount;
        const totalTask = dailyCount + tasksCount+combo;

        res.status(200).json({
            total:totalTransactions,
            task:totalTask,
            history:transactions,
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}