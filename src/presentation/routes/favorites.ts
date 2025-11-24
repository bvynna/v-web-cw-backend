import express from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../index';
import { Favorite } from '../../domain/entities/Favorite';
import { Recipe } from '../../domain/entities/Recipe';
import { User } from '../../domain/entities/User';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для проверки аутентификации
const authenticateToken = (
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

// Добавить рецепт в избранное
router.post(
  '/:recipeId',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const user = (req as any).user;

      const favoriteRepository = AppDataSource.getRepository(Favorite);
      const recipeRepository = AppDataSource.getRepository(Recipe);
      const userRepository = AppDataSource.getRepository(User);

      // Проверяем существование рецепта
      const recipe = await recipeRepository.findOne({ where: { id: recipeId } });
      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      // Проверяем не добавлен ли уже рецепт в избранное
      const existingFavorite = await favoriteRepository.findOne({
        where: {
          user: { id: user.userId },
          recipe: { id: recipeId },
        },
        relations: ['user', 'recipe'],
      });

      if (existingFavorite) {
        res.status(400).json({ error: 'Recipe already in favorites' });
        return;
      }

      // Получаем пользователя
      const currentUser = await userRepository.findOne({ where: { id: user.userId } });
      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Создаем запись в избранном
      const favorite = favoriteRepository.create({
        user: currentUser,
        recipe: recipe,
      });

      await favoriteRepository.save(favorite);

      // Обновляем счетчик лайков
      recipe.likes += 1;
      await recipeRepository.save(recipe);

      res.status(201).json({ message: 'Recipe added to favorites', likes: recipe.likes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add recipe to favorites' });
    }
  },
);

// Удалить рецепт из избранного
router.delete(
  '/:recipeId',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const user = (req as any).user;

      const favoriteRepository = AppDataSource.getRepository(Favorite);
      const recipeRepository = AppDataSource.getRepository(Recipe);

      // Находим запись в избранном
      const favorite = await favoriteRepository.findOne({
        where: {
          user: { id: user.userId },
          recipe: { id: recipeId },
        },
        relations: ['recipe'],
      });

      if (!favorite) {
        res.status(404).json({ error: 'Recipe not found in favorites' });
        return;
      }

      // Удаляем из избранного
      await favoriteRepository.remove(favorite);

      // Обновляем счетчик лайков
      const recipe = await recipeRepository.findOne({ where: { id: recipeId } });
      if (recipe && recipe.likes > 0) {
        recipe.likes -= 1;
        await recipeRepository.save(recipe);
      }

      res.json({ message: 'Recipe removed from favorites', likes: recipe?.likes || 0 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to remove recipe from favorites' });
    }
  },
);

// Получить избранные рецепты пользователя
router.get('/', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;

    const favoriteRepository = AppDataSource.getRepository(Favorite);

    const favorites = await favoriteRepository.find({
      where: { user: { id: user.userId } },
      relations: ['recipe', 'recipe.author'],
      order: { createdAt: 'DESC' },
    });

    const favoriteRecipes = favorites.map(fav => fav.recipe);

    res.json(favoriteRecipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch favorite recipes' });
  }
});

// Проверить добавлен ли рецепт в избранное
router.get(
  '/:recipeId/status',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const user = (req as any).user;

      const favoriteRepository = AppDataSource.getRepository(Favorite);

      const favorite = await favoriteRepository.findOne({
        where: {
          user: { id: user.userId },
          recipe: { id: recipeId },
        },
      });

      res.json({ isFavorite: !!favorite });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to check favorite status' });
    }
  },
);

export default router;
