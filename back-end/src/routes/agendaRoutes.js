const express = require("express");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /agenda
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year } = req.query;

        let query = "SELECT * FROM agenda WHERE user_id = ?";
        const params = [userId];

        if (month && year) {
            query += " AND MONTH(event_date) = ? AND YEAR(event_date) = ?";
            params.push(parseInt(month), parseInt(year));
        }

        query += " ORDER BY event_date ASC";
        const [rows] = await db.query(query, params);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar agenda" });
    }
});

// POST /agenda
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { title, description, date, type } = req.body;
        const userId = req.user.userId;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Título é obrigatório" });
        }
        if (!date) {
            return res.status(400).json({ message: "Data é obrigatória" });
        }

        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({ message: "Data inválida" });
        }

        const [result] = await db.query(
            "INSERT INTO agenda (user_id, title, description, event_date, event_type) VALUES (?,?,?,?,?)",
            [userId, title.trim(), description || null, eventDate, type || null]
        );

        const [rows] = await db.query("SELECT * FROM agenda WHERE id = ?", [result.insertId]);
        return res.status(201).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao criar evento" });
    }
});

// PUT /agenda/:id
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.userId;
        const { title, description, date, type } = req.body;

        const [existing] = await db.query("SELECT id FROM agenda WHERE id = ? AND user_id = ?", [id, userId]);
        if (!existing.length) return res.status(404).json({ message: "Evento não encontrado" });

        const updates = {};
        if (title) updates.title = title.trim();
        if (description !== undefined) updates.description = description || null;
        if (date) updates.event_date = new Date(date);
        if (type !== undefined) updates.event_type = type || null;

        if (!Object.keys(updates).length) return res.status(400).json({ message: "Nada para atualizar" });

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        await db.query(`UPDATE agenda SET ${setClauses} WHERE id = ?`, [...Object.values(updates), id]);

        const [rows] = await db.query("SELECT * FROM agenda WHERE id = ?", [id]);
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao atualizar evento" });
    }
});

// DELETE /agenda/:id
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.userId;

        const [existing] = await db.query("SELECT id FROM agenda WHERE id = ? AND user_id = ?", [id, userId]);
        if (!existing.length) return res.status(404).json({ message: "Evento não encontrado" });

        await db.query("DELETE FROM agenda WHERE id = ?", [id]);
        return res.status(200).json({ message: "Evento excluído" });
    } catch (error) {
        return res.status(500).json({ message: "Erro ao excluir evento" });
    }
});

module.exports = router;
