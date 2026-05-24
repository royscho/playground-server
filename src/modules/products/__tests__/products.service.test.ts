jest.mock('../repository');

import * as repo from '../repository';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Widget',
  price: 9.99,
  category: 'widgets',
  stock: 10,
  isDeleted: false,
};

describe('getProduct', () => {
  it('returns product when found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockProduct);
    const result = await getProduct('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockProduct);
  });

  it('throws 404 when not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(getProduct('507f1f77bcf86cd799439011')).rejects.toThrow(AppError);
  });
});

describe('createProduct', () => {
  it('creates and returns product', async () => {
    (repo.create as jest.Mock).mockResolvedValue(mockProduct);
    const result = await createProduct({
      name: 'Widget',
      price: 9.99,
      category: 'widgets',
      stock: 10,
      metadata: {},
    });
    expect(result).toEqual(mockProduct);
  });
});

describe('updateProduct', () => {
  it('returns updated product', async () => {
    const updated = { ...mockProduct, price: 14.99 };
    (repo.update as jest.Mock).mockResolvedValue(updated);
    const result = await updateProduct('507f1f77bcf86cd799439011', { price: 14.99 });
    expect(result.price).toBe(14.99);
  });

  it('throws 404 if product not found', async () => {
    (repo.update as jest.Mock).mockResolvedValue(null);
    await expect(
      updateProduct('507f1f77bcf86cd799439011', { price: 14.99 }),
    ).rejects.toThrow(AppError);
  });
});

describe('deleteProduct', () => {
  it('soft deletes product', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockProduct);
    (repo.softDelete as jest.Mock).mockResolvedValue(undefined);
    await expect(deleteProduct('507f1f77bcf86cd799439011')).resolves.not.toThrow();
    expect(repo.softDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('throws 404 when product not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(deleteProduct('507f1f77bcf86cd799439011')).rejects.toThrow(AppError);
  });
});

describe('listProducts', () => {
  it('returns products and pagination metadata', async () => {
    (repo.findAll as jest.Mock).mockResolvedValue({ products: [mockProduct], total: 1 });
    const result = await listProducts({ page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.products).toHaveLength(1);
    expect(result.page).toBe(1);
  });
});
