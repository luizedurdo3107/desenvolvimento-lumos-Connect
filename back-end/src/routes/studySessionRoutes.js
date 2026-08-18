const express = require("express");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /study-sessions
router.get("/", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 50",
            [req.user.userId]
        );
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar sessões" });
    }
});

// POST /study-sessions
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { subject, duration, startedAt } = req.body;
        if (!subject || !duration) {
            return res.status(400).json({ message: "Matéria e duração são obrigatórias" });
        }
        const [result] = await db.query(
            "INSERT INTO study_sessions (user_id, subject, duration, started_at) VALUES (?,?,?,?)",
            [req.user.userId, subject, parseInt(duration), startedAt ? new Date(startedAt) : new Date()]
        );
        const [rows] = await db.query("SELECT * FROM study_sessions WHERE id = ?", [result.insertId]);
        return res.status(201).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao registrar sessão" });
    }
});

module.exports = router;
