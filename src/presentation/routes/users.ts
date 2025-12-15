import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticateToken } from '../middlewares/auth';
import { AppDataSource } from '../../index';
import { User } from '../../domain/entities/User';
import { Recipe } from '../../domain/entities/Recipe';
import { Comment } from '../../domain/entities/Comment';

const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 МБ
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый формат файла'));
    }
  },
});

const router = express.Router();

// Получить профиль текущего пользователя
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const user = req.user!;

    const userRepository = AppDataSource.getRepository(User);
    const userProfile = await userRepository.findOne({
      where: { id: user.userId },
      select: ['id', 'email', 'name', 'createdAt', 'avatarUrl'],
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
      const user = req.user!;

      const recipeRepository = AppDataSource.getRepository(Recipe);
      const recipes = await recipeRepository.find({
        where: { author: { id: user.userId } },
        relations: ['author'],
        order: { createdAt: 'DESC' },
      });

      const commentRepository = AppDataSource.getRepository(Comment);
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
      res.status(500).json({ error: 'Failed to fetch user recipes' });
    }
  },
);

// Обновить профиль пользователя
router.put('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const user = req.user!;

    const { name, email, avatarUrl } = req.body;

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({
      where: { id: user.userId },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (email && email !== existingUser.email) {
      const emailExists = await userRepository.findOne({ where: { email } });
      if (emailExists) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }

    if (name) existingUser.name = name;
    if (email) existingUser.email = email;
    if (typeof avatarUrl !== 'undefined') {
      existingUser.avatarUrl = avatarUrl;
    }

    await userRepository.save(existingUser);

    const updatedProfile = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      avatarUrl: existingUser.avatarUrl,
      createdAt: existingUser.createdAt,
    };
    res.json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Загрузка аватара
router.post(
  '/profile/avatar',
  authenticateToken,
  upload.single('avatar'),
  async (req: express.Request, res: express.Response) => {
    try {
      const user = req.user!;
      const userId = user.userId;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOne({ where: { id: userId } });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // относительный путь, откуда фронт сможет картинку забрать
      const relativePath = `/uploads/${req.file.filename}`;
      existingUser.avatarUrl = relativePath;

      await userRepository.save(existingUser);

      return res.json({
        avatarUrl: relativePath,
      });
    } catch (error) {
      console.error('Failed to upload avatar', error);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  },
);

router.get('/:userId', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;

    const userRepository = AppDataSource.getRepository(User);
    const userProfile = await userRepository.findOne({
      where: { id: parseInt(userId) },
      select: ['id', 'email', 'name', 'createdAt', 'avatarUrl'],
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

router.get('/:userId/recipes', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;

    const recipeRepository = AppDataSource.getRepository(Recipe);
    const recipes = await recipeRepository.find({
      where: { author: { id: parseInt(userId) } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    const commentRepository = AppDataSource.getRepository(Comment);
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
    res.status(500).json({ error: 'Failed to fetch user recipes' });
  }
});

export default router;
