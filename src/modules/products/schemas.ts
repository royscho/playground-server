import { z } from 'zod';
import mongoose, { Document, Schema } from 'mongoose';

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().min(1),
  stock: z.number().int().min(0).optional().default(0),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export interface IProduct {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string | null;
  isDeleted: boolean;
  metadata: Record<string, unknown>;
}

export interface IProductDoc extends IProduct, Document {}

const productSchema = new Schema<IProductDoc>(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    imageUrl: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const ProductModel = mongoose.model<IProductDoc>('Product', productSchema);
