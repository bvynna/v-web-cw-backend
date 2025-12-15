import express from 'express';
import { AppDataSource } from '../../index';
import { Notification } from '../../domain/entities/Notification';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Получить все уведомления текущего пользователя
router.get('/notifications', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const userId = req.user.userId;
    const notificationRepository = AppDataSource.getRepository(Notification);

    const notifications = await notificationRepository.find({
      where: { recipientId: userId },
      relations: ['sender', 'recipe', 'recipe.author'],
      order: { createdAt: 'DESC' },
    });

    const notificationsWithIds = notifications.map(n => ({
      id: n.id,
      type: n.type,
      sender: {
        id: n.sender.id,
        name: n.sender.name,
        avatarUrl: n.sender.avatarUrl,
      },
      recipe: n.recipe
        ? {
            id: n.recipe.id,
            title: n.recipe.title,
            authorId: n.recipe.author.id,
          }
        : null,
      recipeId: n.recipe?.id || null,
      commentId: n.commentId || null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return res.json(notificationsWithIds);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Количество непрочитанных
router.get(
  '/notifications/unread-count',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.userId;
      const notificationRepository = AppDataSource.getRepository(Notification);

      const count = await notificationRepository.count({
        where: { recipientId: userId, isRead: false },
      });

      return res.json({ count });
    } catch (error) {
      console.error('Failed to count notifications:', error);
      return res.status(500).json({ error: 'Failed to count notifications' });
    }
  },
);

// Пометить уведомление как прочитанное
router.patch(
  '/notifications/:id/read',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.userId;
      const notificationId = parseInt(req.params.id);
      const notificationRepository = AppDataSource.getRepository(Notification);

      const notification = await notificationRepository.findOne({
        where: { id: notificationId, recipientId: userId },
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      notification.isRead = true;
      await notificationRepository.save(notification);

      return res.json(notification);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  },
);

// Пометить все как прочитанные
router.patch(
  '/notifications/mark-all-read',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.userId;
      const notificationRepository = AppDataSource.getRepository(Notification);

      await notificationRepository.update({ recipientId: userId, isRead: false }, { isRead: true });

      return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  },
);

// Удалить все уведомления
router.delete(
  '/notifications/clear',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const userId = req.user.userId;
      const notificationRepository = AppDataSource.getRepository(Notification);

      await notificationRepository.delete({ recipientId: userId });

      return res.json({ message: 'All notifications cleared' });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      return res.status(500).json({ error: 'Failed to clear notifications' });
    }
  },
);

export default router;
