const express = require("express");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

const VALID_TYPES = ["STANDARD", "QUIZ", "FLASHCARD", "TRUE_FALSE", "MULTIPLE_CHOICE", "MATCHING", "GAME"];
const VALID_SUBJECTS = ["Matemática", "Português", "Ciências", "História", "Geografia", "Inglês", "Artes", "Educação Física", "Outro"];

// ================================================
// GET /activities — list all activities
// ================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { subject, type } = req.query;

        let query = `
            SELECT a.*,
                COALESCE(ap.completed, 0) as user_completed,
                COALESCE(ap.progress, 0) as user_progress,
                COALESCE(ap.score, NULL) as user_score,
                (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count
            FROM activities a
            LEFT JOIN activity_progress ap ON ap.activity_id = a.id AND ap.user_id = ?
            WHERE a.is_published = 1
        `;
        const params = [userId];

        if (subject) { query += " AND a.subject = ?"; params.push(subject); }
        if (type) { query += " AND a.activity_type = ?"; params.push(type); }
        query += " ORDER BY a.created_at DESC";

        const [activities] = await db.query(query, params);

        return res.status(200).json(activities.map(a => ({
            ...a,
            completed: !!a.user_completed,
            progress: a.user_progress,
            score: a.user_score
        })));
    } catch (error) {
        console.error("Erro ao listar atividades:", error);
        return res.status(500).json({ message: "Erro ao buscar atividades" });
    }
});

// ================================================
// GET /activities/admin — list all for admin
// ================================================
router.get("/admin/all", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [activities] = await db.query(`
            SELECT a.*,
                u.name as created_by_name,
                (SELECT COUNT(*) FROM activity_questions WHERE activity_id = a.id) as question_count,
                (SELECT COUNT(*) FROM activity_progress WHERE activity_id = a.id AND completed = 1) as completions
            FROM activities a
            LEFT JOIN users u ON u.id = a.created_by
            ORDER BY a.created_at DESC
        `);
        return res.status(200).json(activities);
    } catch (error) {
        console.error("Erro ao listar atividades admin:", error);
        return res.status(500).json({ message: "Erro ao buscar atividades" });
    }
});

// ================================================
// GET /activities/:id — get single activity with questions
// ================================================
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || id <= 0) return res.status(400).json({ message: "ID inválido" });

        const userId = req.user.userId;

        const [rows] = await db.query(
            "SELECT * FROM activities WHERE id = ?",
            [id]
        );
        if (!rows.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const activity = rows[0];

        // Get questions with options
        const [questions] = await db.query(
            "SELECT * FROM activity_questions WHERE activity_id = ? ORDER BY `order` ASC",
            [id]
        );

        for (const q of questions) {
            const [options] = await db.query(
                "SELECT * FROM question_options WHERE question_id = ? ORDER BY `order` ASC",
                [q.id]
            );
            q.options = options;
        }

        // Get contents
        const [contents] = await db.query(
            "SELECT * FROM activity_contents WHERE activity_id = ? ORDER BY `order` ASC",
            [id]
        );

        // Get user progress
        const [progressRows] = await db.query(
            "SELECT * FROM activity_progress WHERE activity_id = ? AND user_id = ?",
            [id, userId]
        );
        const userProgress = progressRows[0] || { completed: false, progress: 0, score: null };

        return res.status(200).json({
            ...activity,
            questions,
            contents,
            completed: !!userProgress.completed,
            progress: userProgress.progress,
            score: userProgress.score,
            answers: userProgress.answers ? JSON.parse(userProgress.answers) : null
        });
    } catch (error) {
        console.error("Erro ao buscar atividade:", error);
        return res.status(500).json({ message: "Erro ao buscar atividade" });
    }
});

// ================================================
// POST /activities — create activity (admin)
// ================================================
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, description, subject, activity_type, dueDate, questions, contents } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "O título é obrigatório" });
        }

        const type = activity_type || "STANDARD";
        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({ message: "Tipo de atividade inválido" });
        }

        let parsedDate = null;
        if (dueDate) {
            parsedDate = new Date(dueDate);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: "Data inválida" });
            }
        }

        const [result] = await db.query(
            `INSERT INTO activities (title, description, subject, activity_type, due_date, created_by, is_published)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [title.trim(), description || null, subject || null, type, parsedDate, req.user.userId]
        );
        const activityId = result.insertId;

        // Insert questions
        if (Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const [qResult] = await db.query(
                    `INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`)
                     VALUES (?, ?, ?, ?, ?)`,
                    [activityId, q.question_text, q.question_type || "MULTIPLE_CHOICE", q.explanation || null, i]
                );
                const questionId = qResult.insertId;

                if (Array.isArray(q.options)) {
                    for (let j = 0; j < q.options.length; j++) {
                        const opt = q.options[j];
                        await db.query(
                            `INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?)`,
                            [questionId, opt.option_text, opt.is_correct ? 1 : 0, j]
                        );
                    }
                }
            }
        }

        // Insert contents
        if (Array.isArray(contents)) {
            for (let i = 0; i < contents.length; i++) {
                const c = contents[i];
                await db.query(
                    `INSERT INTO activity_contents (activity_id, content_type, title, content, url, duration, \`order\`)
                     VALUES (?,?,?,?,?,?,?)`,
                    [activityId, c.content_type || "TEXT", c.title || null, c.content || null, c.url || null, c.duration || null, i]
                );
            }
        }

        return res.status(201).json({ message: "Atividade criada com sucesso", id: activityId });
    } catch (error) {
        console.error("Erro ao criar atividade:", error);
        return res.status(500).json({ message: "Erro ao criar atividade" });
    }
});

// ================================================
// PUT /activities/:id — update activity (admin)
// ================================================
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || id <= 0) return res.status(400).json({ message: "ID inválido" });

        const { title, description, subject, activity_type, dueDate, is_published, questions, contents } = req.body;

        const [existing] = await db.query("SELECT id FROM activities WHERE id = ?", [id]);
        if (!existing.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const updates = {};
        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description || null;
        if (subject !== undefined) updates.subject = subject || null;
        if (activity_type !== undefined && VALID_TYPES.includes(activity_type)) updates.activity_type = activity_type;
        if (dueDate !== undefined) updates.due_date = dueDate ? new Date(dueDate) : null;
        if (is_published !== undefined) updates.is_published = is_published ? 1 : 0;

        if (Object.keys(updates).length > 0) {
            const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
            const values = Object.values(updates);
            await db.query(`UPDATE activities SET ${setClauses} WHERE id = ?`, [...values, id]);
        }

        // Update questions if provided
        if (Array.isArray(questions)) {
            await db.query("DELETE FROM activity_questions WHERE activity_id = ?", [id]);
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const [qResult] = await db.query(
                    `INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`) VALUES (?,?,?,?,?)`,
                    [id, q.question_text, q.question_type || "MULTIPLE_CHOICE", q.explanation || null, i]
                );
                if (Array.isArray(q.options)) {
                    for (let j = 0; j < q.options.length; j++) {
                        const opt = q.options[j];
                        await db.query(
                            `INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?)`,
                            [qResult.insertId, opt.option_text, opt.is_correct ? 1 : 0, j]
                        );
                    }
                }
            }
        }

        // Update contents if provided
        if (Array.isArray(contents)) {
            await db.query("DELETE FROM activity_contents WHERE activity_id = ?", [id]);
            for (let i = 0; i < contents.length; i++) {
                const c = contents[i];
                await db.query(
                    `INSERT INTO activity_contents (activity_id, content_type, title, content, url, duration, \`order\`) VALUES (?,?,?,?,?,?,?)`,
                    [id, c.content_type || "TEXT", c.title || null, c.content || null, c.url || null, c.duration || null, i]
                );
            }
        }

        return res.status(200).json({ message: "Atividade atualizada com sucesso" });
    } catch (error) {
        console.error("Erro ao editar atividade:", error);
        return res.status(500).json({ message: "Erro ao editar atividade" });
    }
});

// ================================================
// DELETE /activities/:id — delete activity (admin)
// ================================================
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || id <= 0) return res.status(400).json({ message: "ID inválido" });

        const [existing] = await db.query("SELECT id FROM activities WHERE id = ?", [id]);
        if (!existing.length) return res.status(404).json({ message: "Atividade não encontrada" });

        await db.query("DELETE FROM activities WHERE id = ?", [id]);
        return res.status(200).json({ message: "Atividade excluída com sucesso" });
    } catch (error) {
        console.error("Erro ao excluir atividade:", error);
        return res.status(500).json({ message: "Erro ao excluir atividade" });
    }
});

// ================================================
// POST /activities/:id/duplicate — duplicate (admin)
// ================================================
router.post("/:id/duplicate", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query("SELECT * FROM activities WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const orig = rows[0];
        const [result] = await db.query(
            `INSERT INTO activities (title, description, subject, activity_type, due_date, created_by, is_published)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [`${orig.title} (cópia)`, orig.description, orig.subject, orig.activity_type, orig.due_date, req.user.userId]
        );
        const newId = result.insertId;

        // Copy questions and options
        const [questions] = await db.query("SELECT * FROM activity_questions WHERE activity_id = ? ORDER BY `order`", [id]);
        for (const q of questions) {
            const [qResult] = await db.query(
                `INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`) VALUES (?,?,?,?,?)`,
                [newId, q.question_text, q.question_type, q.explanation, q.order]
            );
            const [options] = await db.query("SELECT * FROM question_options WHERE question_id = ?", [q.id]);
            for (const opt of options) {
                await db.query(
                    `INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?)`,
                    [qResult.insertId, opt.option_text, opt.is_correct, opt.order]
                );
            }
        }

        // Copy contents
        const [contents] = await db.query("SELECT * FROM activity_contents WHERE activity_id = ? ORDER BY `order`", [id]);
        for (const c of contents) {
            await db.query(
                `INSERT INTO activity_contents (activity_id, content_type, title, content, url, duration, \`order\`) VALUES (?,?,?,?,?,?,?)`,
                [newId, c.content_type, c.title, c.content, c.url, c.duration, c.order]
            );
        }

        return res.status(201).json({ message: "Atividade duplicada", id: newId });
    } catch (error) {
        console.error("Erro ao duplicar atividade:", error);
        return res.status(500).json({ message: "Erro ao duplicar atividade" });
    }
});

// ================================================
// PATCH /activities/:id/publish — toggle publish (admin)
// ================================================
router.patch("/:id/publish", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query("SELECT id, is_published FROM activities WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const newStatus = rows[0].is_published ? 0 : 1;
        await db.query("UPDATE activities SET is_published = ? WHERE id = ?", [newStatus, id]);
        return res.status(200).json({ message: newStatus ? "Atividade publicada" : "Atividade desativada", is_published: !!newStatus });
    } catch (error) {
        return res.status(500).json({ message: "Erro ao alterar status" });
    }
});

// ================================================
// POST /activities/:id/submit — submit answers
// ================================================
router.post("/:id/submit", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.userId;
        const { answers } = req.body; // { questionId: answerId or text }

        const [actRows] = await db.query("SELECT * FROM activities WHERE id = ?", [id]);
        if (!actRows.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const [questions] = await db.query(
            "SELECT aq.*, GROUP_CONCAT(qo.id, ':', qo.is_correct SEPARATOR '|') as options_map FROM activity_questions aq LEFT JOIN question_options qo ON qo.question_id = aq.id WHERE aq.activity_id = ? GROUP BY aq.id",
            [id]
        );

        let correct = 0;
        let total = questions.length;
        const feedback = {};

        for (const q of questions) {
            const userAnswer = answers ? answers[q.id] : undefined;
            if (!userAnswer) continue;

            if (q.question_type === "MULTIPLE_CHOICE" || q.question_type === "TRUE_FALSE") {
                const optId = parseInt(userAnswer);
                const [optRows] = await db.query("SELECT is_correct FROM question_options WHERE id = ? AND question_id = ?", [optId, q.id]);
                const isCorrect = optRows.length && optRows[0].is_correct;
                if (isCorrect) correct++;
                feedback[q.id] = { correct: !!isCorrect, explanation: q.explanation };
            } else if (q.question_type === "FLASHCARD") {
                // Auto-pass flashcards
                correct++;
                feedback[q.id] = { correct: true };
            } else {
                feedback[q.id] = { correct: null };
            }
        }

        const score = total > 0 ? Math.round((correct / total) * 100) : 100;

        // Upsert progress
        await db.query(`
            INSERT INTO activity_progress (activity_id, user_id, completed, progress, score, answers, completed_at)
            VALUES (?, ?, 1, 100, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE completed = 1, progress = 100, score = ?, answers = ?, completed_at = NOW()
        `, [id, userId, score, JSON.stringify(answers || {}), score, JSON.stringify(answers || {})]);

        return res.status(200).json({
            message: "Atividade enviada com sucesso!",
            score,
            correct,
            total,
            feedback
        });
    } catch (error) {
        console.error("Erro ao submeter atividade:", error);
        return res.status(500).json({ message: "Erro ao submeter atividade" });
    }
});

// ================================================
// PATCH /activities/:id/complete — toggle complete
// ================================================
router.patch("/:id/complete", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.userId;

        const [actRows] = await db.query("SELECT id FROM activities WHERE id = ?", [id]);
        if (!actRows.length) return res.status(404).json({ message: "Atividade não encontrada" });

        const [progRows] = await db.query(
            "SELECT * FROM activity_progress WHERE activity_id = ? AND user_id = ?",
            [id, userId]
        );

        const currentCompleted = progRows.length ? progRows[0].completed : false;
        const newCompleted = !currentCompleted;

        await db.query(`
            INSERT INTO activity_progress (activity_id, user_id, completed, progress, completed_at)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE completed = ?, progress = ?, completed_at = ?
        `, [id, userId, newCompleted ? 1 : 0, newCompleted ? 100 : 0, newCompleted ? new Date() : null,
            newCompleted ? 1 : 0, newCompleted ? 100 : 0, newCompleted ? new Date() : null]);

        return res.status(200).json({ completed: newCompleted, progress: newCompleted ? 100 : 0 });
    } catch (error) {
        console.error("Erro ao atualizar progresso:", error);
        return res.status(500).json({ message: "Erro ao atualizar progresso" });
    }
});

module.exports = router;
