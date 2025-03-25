import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../lib/authMiddleware'

const router = Router();

router.get('/', authenticateJWT, (req: Request, res: Response) => {
    res.status(200).json({
        message: 'This is a protected route',
        user: req.user
    });
});

export default router;