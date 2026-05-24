import {
  ProductModel,
  IProductDoc,
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from './schemas';

export async function findAll(
  filter: ProductQuery,
): Promise<{ products: IProductDoc[]; total: number }> {
  const q = filter.category
    ? { isDeleted: false, category: filter.category }
    : { isDeleted: false };
  const skip = (filter.page - 1) * filter.limit;
  const [products, total] = await Promise.all([
    ProductModel.find(q).skip(skip).limit(filter.limit).lean(),
    ProductModel.countDocuments(q),
  ]);
  return { products: products as unknown as IProductDoc[], total };
}

export async function findById(id: string): Promise<IProductDoc | null> {
  return ProductModel.findOne({ _id: id, isDeleted: false }).lean() as Promise<IProductDoc | null>;
}

export async function create(data: CreateProductInput): Promise<IProductDoc> {
  return ProductModel.create(data);
}

export async function update(
  id: string,
  data: UpdateProductInput,
): Promise<IProductDoc | null> {
  return ProductModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: data },
    { new: true },
  ).lean() as Promise<IProductDoc | null>;
}

export async function softDelete(id: string): Promise<void> {
  await ProductModel.findByIdAndUpdate(id, { isDeleted: true });
}

export async function updateImageUrl(
  id: string,
  imageUrl: string,
): Promise<IProductDoc | null> {
  return ProductModel.findByIdAndUpdate(
    id,
    { imageUrl },
    { new: true },
  ).lean() as Promise<IProductDoc | null>;
}
