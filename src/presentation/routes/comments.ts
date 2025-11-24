// routes/comments.ts
import express from 'express';
import { AppDataSource } from '../../index';
import { Comment } from '../../domain/entities/Comment';
import { Recipe } from '../../domain/entities/Recipe';
import { authenticateToken } from './users';

const router = express.Router();

// Получить комментарии для рецепта
router.get('/recipes/:recipeId/comments', async (req: express.Request, res: express.Response) => {
  try {
    const { recipeId } = req.params;

    const commentRepository = AppDataSource.getRepository(Comment);
    const comments = await commentRepository.find({
      where: { recipe: { id: parseInt(recipeId) } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Добавить комментарий
router.post(
  '/recipes/:recipeId/comments',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const { recipeId } = req.params;
      const { content } = req.body;
      const user = (req as any).user;

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: 'Comment content is required' });
        return;
      }

      const recipeRepository = AppDataSource.getRepository(Recipe);
      const recipe = await recipeRepository.findOne({ where: { id: parseInt(recipeId) } });

      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      const commentRepository = AppDataSource.getRepository(Comment);
      const comment = commentRepository.create({
        content: content.trim(),
        author: { id: user.userId },
        recipe: { id: parseInt(recipeId) },
      });

      await commentRepository.save(comment);

      // Возвращаем комментарий с данными автора
      const savedComment = await commentRepository.findOne({
        where: { id: comment.id },
        relations: ['author'],
      });

      res.status(201).json(savedComment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },
);

// Удалить комментарий
router.delete(
  '/comments/:commentId',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const { commentId } = req.params;
      const user = (req as any).user;

      const commentRepository = AppDataSource.getRepository(Comment);
      const comment = await commentRepository.findOne({
        where: { id: parseInt(commentId) },
        relations: ['author'],
      });

      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // Проверяем, что пользователь является автором комментария
      if (comment.author.id !== user.userId) {
        res.status(403).json({ error: 'You can only delete your own comments' });
        return;
      }

      await commentRepository.remove(comment);
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  },
);

export default router;
