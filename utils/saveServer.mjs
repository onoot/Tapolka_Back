import Server from '../models/Server.mjs';
import os from 'os';
const Port=process.env.HTTP_PORT || 5000

// Функция для получения IP-адреса машины
function getServerIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    for (const alias of interfaces[iface]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost'; // Если не удалось найти IP, возвращаем localhost
}

export async function saveServerAddress(port) {
  try {
    const serverAddress = getServerIpAddress();  
    
    // Проверяем, есть ли уже запись с этим адресом
    const existingServer = await Server.findOne({ where: { address: serverAddress+`:${Port}` } });
    
    if (!existingServer) {
      // Если нет, создаем новый сервер
      await Server.create({
        address: serverAddress+`:${Port}`,
        active: true, // Отметим сервер как активный
      });

      // console.log(`Server address saved: ${serverAddress}:${port}`);
    } else {
      console.log(`Server address already exists: ${serverAddress}:${port}`);
    }
    
    return serverAddress;
  } catch (error) {
    console.error('Error saving server address:', error);
    throw error; // Выбрасываем ошибку дальше
  }
}
