"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const typeorm_1 = require("typeorm");
const User_1 = require("./domain/entities/User");
const Recipe_1 = require("./domain/entities/Recipe");
const auth_1 = __importDefault(require("./presentation/routes/auth"));
const recipes_1 = __importDefault(require("./presentation/routes/recipes"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Статическая раздача загруженных файлов
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// PostgreSQL конфигурация
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'culinary_platform',
    entities: [User_1.User, Recipe_1.Recipe],
    synchronize: true,
    logging: true,
});
// Маршруты
app.use('/api/auth', auth_1.default);
app.use('/api/recipes', recipes_1.default);
// Запуск сервера
exports.AppDataSource.initialize()
    .then(() => {
    console.log('PostgreSQL connected successfully');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
    .catch(error => {
    console.log('Database connection error:', error);
});
