"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../lib/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateJWT, (req, res) => {
    res.status(200).json({
        message: 'This is a protected route',
        user: req.user
    });
});
exports.default = router;
