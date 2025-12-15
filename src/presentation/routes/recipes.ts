import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middlewares/auth';
import { AppDataSource } from '../../index';
import { Recipe } from '../../domain/entities/Recipe';
import { User } from '../../domain/entities/User';
import { Comment } from '../../domain/entities/Comment';
import { Subscription } from '../../domain/entities/Subscription';

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'recipe-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Получить все рецепты
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const recipeRepository = AppDataSource.getRepository(Recipe);
    const commentRepository = AppDataSource.getRepository(Comment);

    const user = req.user!;
    const currentUserId = user.userId || null;

    let recipes: Recipe[];

    if (currentUserId) {
      // Получаем ID пользователей, на которых подписан текущий пользователь
      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const subscriptions = await subscriptionRepository.find({
        where: { subscriberId: currentUserId },
        select: ['targetId'],
      });
      const subscribedUserIds = subscriptions.map(sub => sub.targetId);

      // Получаем все рецепты
      const allRecipes = await recipeRepository.find({
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });

      // Сортируем: сначала рецепты от подписок, потом остальные
      const subscribedRecipes = allRecipes.filter(recipe =>
        subscribedUserIds.includes(recipe.author.id),
      );
      const otherRecipes = allRecipes.filter(
        recipe => !subscribedUserIds.includes(recipe.author.id),
      );

      recipes = [...subscribedRecipes, ...otherRecipes];
    } else {
      // Для неавторизованных пользователей — обычная лента
      recipes = await recipeRepository.find({
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });
    }

    // Добавляем количество комментариев
    const recipesWithCommentCount = await Promise.all(
      recipes.map(async recipe => {
        const commentCount = await commentRepository.count({
          where: { recipe: { id: recipe.id } },
        });
        return {
          ...recipe,
          commentCount,
        };
      }),
    );

    res.json(recipesWithCommentCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Создать рецепт с изображением
router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  async (req: express.Request, res: express.Response) => {
    try {
      const { title, category, description, ingredients, instructions } = req.body;
      const imageFile = req.file;

      const user = req.user;
      if (!user || !user.userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const recipeRepository = AppDataSource.getRepository(Recipe);
      const userRepository = AppDataSource.getRepository(User);

      const author = await userRepository.findOne({
        where: { id: user.userId },
      });

      if (!author) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Создаем рецепт через new Recipe()
      const recipe = new Recipe();
      recipe.title = title;
      recipe.category = category;
      recipe.description = description;
      recipe.ingredients = ingredients;
      recipe.instructions = instructions;
      recipe.imageUrl = imageFile ? `/uploads/${imageFile.filename}` : undefined;
      recipe.author = author;

      await recipeRepository.save(recipe);

      // Возвращаем рецепт с автором
      const savedRecipe = await recipeRepository.findOne({
        where: { id: recipe.id },
        relations: ['author'],
      });

      res.status(201).json(savedRecipe);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  },
);

// Удалить рецепт
router.delete('/:id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const recipeId = parseInt(req.params.id);
    const user = req.user;

    if (!user || !user.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const recipeRepository = AppDataSource.getRepository(Recipe);
    const recipe = await recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['author'],
    });

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    // Проверяем, что пользователь является автором рецепта
    if (recipe.author.id !== user.userId) {
      res.status(403).json({ error: 'You can only delete your own recipes' });
      return;
    }

    await recipeRepository.remove(recipe);
    res.status(200).json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});
export default router;
