import type { Order } from './order.aggregate';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderPage {
  items: Order[];
  total: number;
}

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByShopAndId(shopId: string, id: string): Promise<Order | null>;
  findByTxRef(txRef: string): Promise<Order | null>;
  listByShop(
    shopId: string,
    opts: { status?: string; page: number; pageSize: number },
  ): Promise<OrderPage>;
}
