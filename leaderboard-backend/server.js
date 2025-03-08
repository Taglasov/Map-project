const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Запуск сервера
const PORT = 4000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/leaderboard')
    .then(() => console.log('Успешное подключение к MongoDB'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Ошибка подключения к MongoDB:'));
db.once('open', () => console.log('Успешное подключение к MongoDB'));

// Схема данных для игрока
const PlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

const Player = mongoose.model('Player', PlayerSchema);

// API для получения топ-10 игроков
app.get('/leaderboard', async (req, res) => {
    try {
        const players = await Player.find().sort({ score: -1 }).limit(10);
        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для сохранения результата
app.post('/leaderboard', async (req, res) => {
    const { name, score } = req.body;
    if (!name || score == null) {
        return res.status(400).json({ error: 'Имя и результат обязательны' });
    }

    try {
        const player = new Player({ name, score });
        await player.save();
        res.status(201).json({ message: 'Результат сохранён!' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сохранения результата' });
    }
});


app.listen(PORT, (err) => {
    if (err) {
        console.error('Ошибка запуска сервера:', err);
    } else {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
    }
});

