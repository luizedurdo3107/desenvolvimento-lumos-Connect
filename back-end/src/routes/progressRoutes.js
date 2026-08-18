const express = require("express");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /progress
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.query(
            "SELECT * FROM progress WHERE user_id = ? ORDER BY subject",
            [userId]
        );
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar progresso" });
    }
});

// PUT /progress/:subject
router.put("/:subject", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const subject = req.params.subject;
        const { percentage } = req.body;

        if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
            return res.status(400).json({ message: "Percentual inválido (0-100)" });
        }

        await db.query(`
            INSERT INTO progress (user_id, subject, percentage)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE percentage = ?
        `, [userId, subject, percentage, percentage]);

        return res.status(200).json({ subject, percentage });
    } catch (error) {
        return res.status(500).json({ message: "Erro ao atualizar progresso" });
    }
});

module.exports = router;
