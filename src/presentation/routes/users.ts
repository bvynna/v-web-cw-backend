import express from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../index';
import { User } from '../../domain/entities/User';
import { Recipe } from '../../domain/entities/Recipe';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: unknown, user: unknown) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    (req as any).user = user;
    next();
  });
};

// Получить профиль текущего пользователя
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;

    const userRepository = AppDataSource.getRepository(User);
    const userProfile = await userRepository.findOne({
      where: { id: user.userId },
      select: ['id', 'email', 'name', 'createdAt'],
    });

    if (!userProfile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Получить рецепты текущего пользователя
router.get(
  '/my-recipes',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = (req as any).user;

      const recipeRepository = AppDataSource.getRepository(Recipe);
      const recipes = await recipeRepository.find({
        where: { author: { id: user.userId } },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });

      res.json(recipes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user recipes' });
    }
  },
);

// Обновить профиль пользователя
router.put('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { name, email } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({
      where: { id: user.userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Проверяем, что email не занят другим пользователем
    if (email && email !== existingUser.email) {
      const emailExists = await userRepository.findOne({ where: { email } });
      if (emailExists) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }

    // Обновляем данные
    if (name) existingUser.name = name;
    if (email) existingUser.email = email;

    await userRepository.save(existingUser);

    // Возвращаем обновленный профиль без пароля
    const updatedProfile = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      createdAt: existingUser.createdAt,
    };

    res.json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
