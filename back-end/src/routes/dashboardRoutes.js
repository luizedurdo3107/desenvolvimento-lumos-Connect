const express = require("express");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /dashboard
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [[userRow]] = await db.query("SELECT id, name, role FROM users WHERE id = ?", [userId]);

        const [[countRow]] = await db.query(
            "SELECT COUNT(*) as total FROM activities WHERE is_published = 1"
        );
        const [[completedRow]] = await db.query(
            "SELECT COUNT(*) as total FROM activity_progress WHERE user_id = ? AND completed = 1",
            [userId]
        );
        const [[sessionRow]] = await db.query(
            "SELECT COALESCE(SUM(duration), 0) as total FROM study_sessions WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            [userId]
        );

        const [progressRows] = await db.query(
            "SELECT subject, percentage FROM progress WHERE user_id = ?",
            [userId]
        );

        return res.status(200).json({
            user: userRow,
            stats: {
                totalActivities: countRow.total,
                completedActivities: completedRow.total,
                weeklyStudyMinutes: sessionRow.total
            },
            progress: progressRows
        });
    } catch (error) {
        console.error("Erro no dashboard:", error);
        return res.status(500).json({ message: "Erro ao buscar dashboard" });
    }
});

module.exports = router;
