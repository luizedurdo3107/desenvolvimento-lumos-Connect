const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// GET /users — list all users (admin)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC"
        );
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar usuários" });
    }
});

// GET /users/:id
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [id]
        );
        if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado" });
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar usuário" });
    }
});

// PUT /users/:id — update role (admin)
router.put("/:id/role", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { role } = req.body;
        if (!["STUDENT", "ADMIN"].includes(role)) {
            return res.status(400).json({ message: "Role inválida" });
        }
        await db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
        return res.status(200).json({ message: "Role atualizada" });
    } catch (error) {
        return res.status(500).json({ message: "Erro ao atualizar role" });
    }
});

module.exports = router;
