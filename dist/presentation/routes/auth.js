"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../../index");
const User_1 = require("../../domain/entities/User");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }
        const userRepository = index_1.AppDataSource.getRepository(User_1.User);
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = userRepository.create({
            email,
            password: hashedPassword,
            name,
        });
        await userRepository.save(user);
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET);
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Логин
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const userRepository = index_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET);
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
exports.default = router;
