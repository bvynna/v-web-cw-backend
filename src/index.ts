import express from 'express';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { User } from './domain/entities/User';
import { Recipe } from './domain/entities/Recipe';
import authRoutes from './presentation/routes/auth';
import recipeRoutes from './presentation/routes/recipes';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Статическая раздача загруженных файлов
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// PostgreSQL конфигурация
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'culinary_platform',
  entities: [User, Recipe],
  synchronize: true,
  logging: true,
});

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);

// Запуск сервера
AppDataSource.initialize()
  .then(() => {
    console.log('PostgreSQL connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.log('Database connection error:', error);
  });
