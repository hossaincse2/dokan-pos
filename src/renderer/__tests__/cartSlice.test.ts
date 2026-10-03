import cartReducer, {
  addItem,
  removeItem,
  updateItemQuantity,
  clearCart,
} from '../store/slices/cartSlice';
import { Product } from '@shared/types';

describe('cartSlice', () => {
  const mockProduct: Product = {
    id: 1,
    product_id: 14,
    sku_code: '738267',
    product_name: 'Test Product',
    unit_price: 100,
    sale_price: 0,
    final_sale_price: 0,
    variant_id: null,
    variant_sku: null,
    variant_attributes: null,
    additional_price: null,
    available_stock: 10,
    preview_image: null,
    image_preview_style: 'portrait',
  };

  const initialState = {
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    customer: null,
    paymentMethod: 'cash' as const,
    notes: '',
  };

  it('should handle initial state', () => {
    expect(cartReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle addItem', () => {
    const actual = cartReducer(initialState, addItem({ product: mockProduct, quantity: 2 }));
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0].quantity).toBe(2);
    expect(actual.items[0].product_name).toBe('Test Product');
  });

  it('should handle removeItem', () => {
    const stateWithItem = cartReducer(initialState, addItem({ product: mockProduct }));
    const actual = cartReducer(stateWithItem, removeItem('738267'));
    expect(actual.items).toHaveLength(0);
  });

  it('should handle updateItemQuantity', () => {
    const stateWithItem = cartReducer(initialState, addItem({ product: mockProduct }));
    const actual = cartReducer(
      stateWithItem,
      updateItemQuantity({ sku_code: '738267', quantity: 5 })
    );
    expect(actual.items[0].quantity).toBe(5);
  });

  it('should handle clearCart', () => {
    const stateWithItem = cartReducer(initialState, addItem({ product: mockProduct }));
    const actual = cartReducer(stateWithItem, clearCart());
    expect(actual.items).toHaveLength(0);
    expect(actual.total).toBe(0);
  });

  it('should calculate totals correctly', () => {
    const state = cartReducer(initialState, addItem({ product: mockProduct, quantity: 2 }));
    expect(state.subtotal).toBe(200);
    expect(state.tax).toBeCloseTo(30, 1); // 15% tax
    expect(state.total).toBeCloseTo(230, 1);
  });
});
