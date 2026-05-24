import { Router } from 'express';
import { authenticate } from '../../infra/middleware/auth';
import { createHandler, listHandler, getHandler } from './controller';

const router = Router();

router.use(authenticate);
router.post('/', createHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);

export default router;
