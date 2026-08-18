const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /profile
router.get("/", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [req.user.userId]
        );
        if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado" });
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao buscar perfil" });
    }
});

// PUT /profile — update name/email
router.put("/", authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.userId;

        if (name !== undefined && (!name || !name.trim())) {
            return res.status(400).json({ message: "Nome inválido" });
        }

        if (email !== undefined) {
            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [email.trim().toLowerCase(), userId]
            );
            if (existing.length) return res.status(400).json({ message: "E-mail já em uso" });
        }

        const updates = {};
        if (name) updates.name = name.trim();
        if (email) updates.email = email.trim().toLowerCase();

        if (!Object.keys(updates).length) {
            return res.status(400).json({ message: "Nenhum dado para atualizar" });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        await db.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...Object.values(updates), userId]);

        const [rows] = await db.query("SELECT id, name, email, role FROM users WHERE id = ?", [userId]);
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
});

// PUT /profile/password
router.put("/password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
        }

        const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.userId]);
        if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado" });

        const valid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!valid) return res.status(400).json({ message: "Senha atual incorreta" });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.userId]);
        return res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        return res.status(500).json({ message: "Erro ao alterar senha" });
    }
});

module.exports = router;
