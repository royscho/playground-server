import { Router } from 'express';
import { authenticate } from '../../infra/middleware/auth';
import { registerHandler, loginHandler, getMeHandler } from './controller';

const router = Router();

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);
router.get('/users/me', authenticate, getMeHandler);

export default router;
