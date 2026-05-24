import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as repo from './repository';
import { uploadFile, getPresignedUrl } from '../../infra/aws/s3';
import { CreateProductInput, UpdateProductInput, ProductQuery, IProductDoc } from './schemas';
import { AppError } from '../../infra/middleware/errorHandler';

export async function listProducts(
  query: ProductQuery,
): Promise<{ products: IProductDoc[]; total: number; page: number; limit: number }> {
  const { products, total } = await repo.findAll(query);
  return { products, total, page: query.page, limit: query.limit };
}

export async function getProduct(id: string): Promise<IProductDoc> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

export async function createProduct(data: CreateProductInput): Promise<IProductDoc> {
  return repo.create(data);
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput,
): Promise<IProductDoc> {
  const updated = await repo.update(id, data);
  if (!updated) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  await repo.softDelete(id);
}

export async function uploadProductImage(
  id: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<{ imageUrl: string; presignedUrl: string }> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const ext = path.extname(originalName) || '.jpg';
  const key = `products/${id}/${uuidv4()}${ext}`;

  await uploadFile(key, buffer, mimeType);
  await repo.updateImageUrl(id, key);

  const presignedUrl = await getPresignedUrl(key);
  return { imageUrl: key, presignedUrl };
}
