import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../index';
import { User } from '../../domain/entities/User';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Регистрация
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Все поля обязательны для заполнения' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      res.status(400).json({ error: 'Пользователь уже существует' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({
      email,
      password: hashedPassword,
      name,
    });
    await userRepository.save(user);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Не удалось выполнить регистрацию' });
  }
});

// Логин
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Требуется указать адрес электронной почты и пароль' });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      res.status(400).json({ error: 'Неверные учетные данные' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ error: 'Неверные учетные данные' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Ошибка входа в систему:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

export default router;
