"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../../index");
const Recipe_1 = require("../../domain/entities/Recipe");
const User_1 = require("../../domain/entities/User");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Настройка multer для загрузки файлов
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'recipe-' + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});
// Middleware для проверки аутентификации
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.status(403).json({ error: 'Invalid token' });
            return;
        }
        req.user = user;
        next();
    });
};
// Получить все рецепты
router.get('/', async (req, res) => {
    try {
        const recipeRepository = index_1.AppDataSource.getRepository(Recipe_1.Recipe);
        const recipes = await recipeRepository.find({
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });
        res.json(recipes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
});
// Создать рецепт с изображением
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, ingredients, instructions } = req.body;
        const imageFile = req.file;
        const user = req.user;
        if (!user || !user.userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const recipeRepository = index_1.AppDataSource.getRepository(Recipe_1.Recipe);
        const userRepository = index_1.AppDataSource.getRepository(User_1.User);
        const author = await userRepository.findOne({
            where: { id: user.userId },
        });
        if (!author) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Создаем рецепт через new Recipe()
        const recipe = new Recipe_1.Recipe();
        recipe.title = title;
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create recipe' });
    }
});
// Удалить рецепт
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const recipeId = parseInt(req.params.id);
        const user = req.user;
        if (!user || !user.userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const recipeRepository = index_1.AppDataSource.getRepository(Recipe_1.Recipe);
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});
exports.default = router;
