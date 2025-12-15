import express from 'express';
import { AppDataSource } from '../../index';
import { Subscription } from '../../domain/entities/Subscription';
import { User } from '../../domain/entities/User';
import { Notification } from '../../domain/entities/Notification';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Подписаться на пользователя
router.post(
  '/users/:userId/subscribe',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const subscriberId = req.user.userId;

      if (targetUserId === subscriberId) {
        return res.status(400).json({ error: 'Cannot subscribe to yourself' });
      }

      const subscriptionRepository = AppDataSource.getRepository(Subscription);
      const userRepository = AppDataSource.getRepository(User);

      // Проверяем существование целевого пользователя
      const targetUser = await userRepository.findOne({ where: { id: targetUserId } });
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Проверяем не подписан ли уже
      const existingSubscription = await subscriptionRepository.findOne({
        where: {
          subscriberId,
          targetId: targetUserId,
        },
      });

      if (existingSubscription) {
        return res.status(400).json({ error: 'Already subscribed' });
      }

      // Создаём подписку
      const subscription = subscriptionRepository.create({
        subscriberId,
        targetId: targetUserId,
      });
      await subscriptionRepository.save(subscription);

      // Создаём уведомление
      const notificationRepository = AppDataSource.getRepository(Notification);
      const notification = notificationRepository.create({
        recipientId: targetUserId,
        senderId: subscriberId,
        type: 'subscription',
      });
      await notificationRepository.save(notification);

      return res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }
  },
);

// Отписаться от пользователя
router.delete(
  '/users/:userId/subscribe',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const subscriberId = req.user.userId;

      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const subscription = await subscriptionRepository.findOne({
        where: {
          subscriberId,
          targetId: targetUserId,
        },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      await subscriptionRepository.remove(subscription);

      return res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  },
);

// Проверить статус подписки
router.get(
  '/users/:userId/subscribe/status',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const subscriberId = req.user.userId;

      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const subscription = await subscriptionRepository.findOne({
        where: {
          subscriberId,
          targetId: targetUserId,
        },
      });

      return res.json({ isSubscribed: !!subscription });
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return res.status(500).json({ error: 'Failed to check subscription' });
    }
  },
);

// Получить количество подписчиков пользователя
router.get(
  '/users/:userId/subscribers/count',
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = parseInt(req.params.userId);

      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const count = await subscriptionRepository.count({
        where: { targetId: userId },
      });

      return res.json({ count });
    } catch (error) {
      console.error('Failed to count subscribers:', error);
      return res.status(500).json({ error: 'Failed to count subscribers' });
    }
  },
);

// Получить список подписчиков
router.get('/users/:userId/subscribers', async (req: express.Request, res: express.Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const subscriptionRepository = AppDataSource.getRepository(Subscription);

    const subscriptions = await subscriptionRepository.find({
      where: { targetId: userId },
      relations: ['subscriber'],
      order: { createdAt: 'DESC' },
    });

    const subscribers = subscriptions.map(sub => ({
      id: sub.subscriber.id,
      name: sub.subscriber.name,
      avatarUrl: sub.subscriber.avatarUrl,
      subscribedAt: sub.createdAt,
    }));

    return res.json(subscribers);
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    return res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// Получить список подписок
router.get('/users/:userId/subscriptions', async (req: express.Request, res: express.Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const subscriptionRepository = AppDataSource.getRepository(Subscription);

    const subscriptions = await subscriptionRepository.find({
      where: { subscriberId: userId },
      relations: ['target'],
      order: { createdAt: 'DESC' },
    });

    const targets = subscriptions.map(sub => ({
      id: sub.target.id,
      name: sub.target.name,
      avatarUrl: sub.target.avatarUrl,
      subscribedAt: sub.createdAt,
    }));

    return res.json(targets);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Проверить подписан ли конкретный пользователь на меня
router.get(
  '/users/:userId/subscribers/check/:subscriberId',
  authenticateToken,
  async (req: any, res: express.Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscriberId = parseInt(req.params.subscriberId);

      const subscriptionRepository = AppDataSource.getRepository(Subscription);

      const subscription = await subscriptionRepository.findOne({
        where: {
          subscriberId: subscriberId,
          targetId: userId,
        },
      });

      return res.json({ isSubscribed: !!subscription });
    } catch (error) {
      console.error('Failed to check subscriber:', error);
      return res.status(500).json({ error: 'Failed to check subscriber' });
    }
  },
);

export default router;
