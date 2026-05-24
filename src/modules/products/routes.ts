import { Router } from 'express';
import { authenticate, requireAdmin } from '../../infra/middleware/auth';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  upload,
  uploadImageHandler,
} from './controller';

const router = Router();

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', authenticate, requireAdmin, createHandler);
router.put('/:id', authenticate, requireAdmin, updateHandler);
router.delete('/:id', authenticate, requireAdmin, deleteHandler);
router.post('/:id/image', authenticate, upload.single('image'), uploadImageHandler);

export default router;
