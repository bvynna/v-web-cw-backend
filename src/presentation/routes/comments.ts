import express from 'express';
import { AppDataSource } from '../../index';
import { Comment } from '../../domain/entities/Comment';
import { Recipe } from '../../domain/entities/Recipe';
import { User } from '../../domain/entities/User';
import { Notification } from '../../domain/entities/Notification';
import { authenticateToken } from './users';
import { IsNull } from 'typeorm';

const router = express.Router();

// Получить комментарии для рецепта (с ответами)
router.get('/recipes/:recipeId/comments', async (req: express.Request, res: express.Response) => {
  try {
    const { recipeId } = req.params;

    const commentRepository = AppDataSource.getRepository(Comment);
    const comments = await commentRepository.find({
      where: {
        recipe: { id: parseInt(recipeId) },
        parentComment: IsNull(),
      },
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'DESC' },
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Добавить комментарий (родительский или ответ)
router.post(
  '/recipes/:recipeId/comments',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const { recipeId } = req.params;
      const { content, parentCommentId } = req.body;
      const user = (req as any).user;

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: 'Comment content is required' });
        return;
      }

      const recipeRepository = AppDataSource.getRepository(Recipe);
      const recipe = await recipeRepository.findOne({
        where: { id: parseInt(recipeId) },
        relations: ['author'],
      });

      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }

      const commentRepository = AppDataSource.getRepository(Comment);
      const userRepository = AppDataSource.getRepository(User);
      const notificationRepository = AppDataSource.getRepository(Notification);

      // Если это ответ на комментарий, проверяем существование родительского комментария
      let parentComment = undefined;
      if (parentCommentId) {
        parentComment = await commentRepository.findOne({
          where: { id: parentCommentId },
          relations: ['recipe', 'author'],
        });

        if (!parentComment) {
          res.status(404).json({ error: 'Parent comment not found' });
          return;
        }

        // Увеличиваем счетчик ответов у родительского комментария
        parentComment.replyCount += 1;
        await commentRepository.save(parentComment);
      }

      // Получаем пользователя
      const currentUser = await userRepository.findOne({ where: { id: user.userId } });
      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Создаем комментарий
      const comment = new Comment();
      comment.content = content.trim();
      comment.author = currentUser;
      comment.recipe = recipe;
      if (parentComment) {
        comment.parentComment = parentComment;
      }

      await commentRepository.save(comment);

      // Создаём уведомление
      if (parentComment) {
        // Это ответ на комментарий — уведомление автору комментария
        if (parentComment.author.id !== user.userId) {
          const notification = notificationRepository.create({
            recipientId: parentComment.author.id,
            senderId: user.userId,
            type: 'reply',
            recipeId: recipe.id,
            commentId: comment.id,
          });
          await notificationRepository.save(notification);
        }
      } else {
        // Это комментарий к рецепту — уведомление автору рецепта
        if (recipe.author.id !== user.userId) {
          const notification = notificationRepository.create({
            recipientId: recipe.author.id,
            senderId: user.userId,
            type: 'comment',
            recipeId: recipe.id,
            commentId: comment.id,
          });
          await notificationRepository.save(notification);
        }
      }

      // Возвращаем комментарий с данными автора и ответами
      const savedComment = await commentRepository.findOne({
        where: { id: comment.id },
        relations: ['author', 'replies', 'replies.author', 'parentComment'],
      });

      res.status(201).json(savedComment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },
);

// Получить ответы на конкретный комментарий
router.get('/comments/:commentId/replies', async (req: express.Request, res: express.Response) => {
  try {
    const { commentId } = req.params;

    const commentRepository = AppDataSource.getRepository(Comment);
    const replies = await commentRepository.find({
      where: { parentComment: { id: parseInt(commentId) } },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    res.json(replies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch comment replies' });
  }
});

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
        relations: ['author', 'parentComment'],
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

      // Если это родительский комментарий с ответами, удаляем все ответы
      if (comment.replyCount > 0) {
        const replies = await commentRepository.find({
          where: { parentComment: { id: comment.id } },
        });
        await commentRepository.remove(replies);
      }

      // Если это ответ, уменьшаем счетчик у родительского комментария
      if (comment.parentComment) {
        const parentComment = await commentRepository.findOne({
          where: { id: comment.parentComment.id },
        });
        if (parentComment && parentComment.replyCount > 0) {
          parentComment.replyCount -= 1;
          await commentRepository.save(parentComment);
        }
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
