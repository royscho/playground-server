import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
} from './schemas';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from './service';
import { AppError } from '../../infra/middleware/errorHandler';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ProductQuerySchema.parse(req.query);
    const result = await listProducts(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = CreateProductSchema.parse(req.body);
    const product = await createProduct(data);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = UpdateProductSchema.parse(req.body);
    const product = await updateProduct(req.params.id, data);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function uploadImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');
    const result = await uploadProductImage(
      req.params.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
