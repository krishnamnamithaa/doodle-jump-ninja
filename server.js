const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doodle-jump', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    // Use in-memory leaderboard if MongoDB is not available
    global.inMemoryScores = [];
});

// Score Schema
const scoreSchema = new mongoose.Schema({
    score: Number,
    playerName: String,
    date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints
app.post('/api/scores', async (req, res) => {
    try {
        const { score, playerName } = req.body;
        if (global.inMemoryScores) {
            global.inMemoryScores.push({ score, playerName, date: new Date() });
            global.inMemoryScores.sort((a, b) => b.score - a.score);
            if (global.inMemoryScores.length > 10) {
                global.inMemoryScores.length = 10;
            }
            res.status(201).json({ score, playerName });
        } else {
            const newScore = new Score({ score, playerName });
            await newScore.save();
            res.status(201).json(newScore);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error saving score' });
    }
});

app.get('/api/scores', async (req, res) => {
    try {
        if (global.inMemoryScores) {
            res.json(global.inMemoryScores);
        } else {
            const scores = await Score.find()
                .sort({ score: -1 })
                .limit(10);
            res.json(scores);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching scores' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
