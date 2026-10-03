import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product } from '@shared/types';

interface CartState {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customer: any | null;
  paymentMethod: number | string;
  notes: string;
  taxRate: number;
  isTaxInclusive: boolean;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  customer: null,
  paymentMethod: 2, // Default to Cash (ID: 2)
  notes: '',
  taxRate: 0, // Default to 0, will be set from settings
  isTaxInclusive: false,
};

const calculateTotals = (state: CartState, globalTaxRate: number = 0, isTaxInclusive: boolean = false) => {
  let subtotal = 0;
  let tax = 0;
  
  const rawTotal = state.items.reduce((sum, item) => sum + item.total, 0);
  // Calculate order-level discount ratio to apply proportionally to items
  const discountRatio = rawTotal > 0 ? Math.max(0, rawTotal - state.discount) / rawTotal : 1;

  state.items.forEach(item => {
    // Use product's VAT if it's greater than 0, otherwise fallback to global tax rate
    const itemTaxRate = (item.product.vat_percentage && item.product.vat_percentage > 0) 
      ? item.product.vat_percentage / 100 
      : globalTaxRate;
    
    const itemTotalAfterOrderDiscount = item.total * discountRatio;

    if (isTaxInclusive && itemTaxRate > 0) {
      // Subtotal = Total / (1 + Rate)
      const itemSubtotal = itemTotalAfterOrderDiscount / (1 + itemTaxRate);
      subtotal += itemSubtotal;
      // VAT Amount = Total - Subtotal
      tax += (itemTotalAfterOrderDiscount - itemSubtotal);
    } else {
      // Forward calculation
      subtotal += itemTotalAfterOrderDiscount;
      tax += itemTotalAfterOrderDiscount * itemTaxRate;
    }
  });

  state.subtotal = Number(subtotal.toFixed(2));
  state.tax = Number(tax.toFixed(2));
  state.total = Number((subtotal + tax).toFixed(2));
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<{ product: Product; quantity?: number }>) => {
      const { product, quantity = 1 } = action.payload;
      
      const existingItem = state.items.find(
        (item) => item.product_id === product.product_id && item.sku_code === product.sku_code
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * existingItem.unit_price - existingItem.discount;
      } else {
        const price = product.final_sale_price || product.unit_price;
        state.items.push({
          product_id: product.product_id,
          product_name: product.product_name,
          sku_code: product.sku_code,
          variant_attributes: product.variant_attributes,
          quantity,
          unit_price: price,
          discount: 0,
          tax: 0,
          total: price * quantity,
          product,
        });
      }

      calculateTotals(state, state.taxRate, state.isTaxInclusive);
    },

    removeItem: (state, action: PayloadAction<string>) => {
      const skuCode = action.payload;
      state.items = state.items.filter((item) => item.sku_code !== skuCode);
      calculateTotals(state, state.taxRate, state.isTaxInclusive);
    },

    updateItemQuantity: (
      state,
      action: PayloadAction<{ sku_code: string; quantity: number }>
    ) => {
      const { sku_code, quantity } = action.payload;
      const item = state.items.find((item) => item.sku_code === sku_code);
      
      if (item) {
        item.quantity = Math.max(1, quantity);
        item.total = item.quantity * item.unit_price - item.discount;
        calculateTotals(state, state.taxRate, state.isTaxInclusive);
      }
    },

    updateItemDiscount: (
      state,
      action: PayloadAction<{ sku_code: string; discount: number }>
    ) => {
      const { sku_code, discount } = action.payload;
      const item = state.items.find((item) => item.sku_code === sku_code);
      
      if (item) {
        item.discount = Math.max(0, discount);
        item.total = item.quantity * item.unit_price - item.discount;
        calculateTotals(state, state.taxRate, state.isTaxInclusive);
      }
    },

    setCartDiscount: (state, action: PayloadAction<number>) => {
      state.discount = Math.max(0, action.payload);
      calculateTotals(state, state.taxRate, state.isTaxInclusive);
    },

    setVATRate: (state, action: PayloadAction<number>) => {
      state.taxRate = action.payload;
      calculateTotals(state, state.taxRate, state.isTaxInclusive);
    },

    setIsTaxInclusive: (state, action: PayloadAction<boolean>) => {
      state.isTaxInclusive = action.payload;
      calculateTotals(state, state.taxRate, state.isTaxInclusive);
    },

    setCustomer: (state, action: PayloadAction<any | null>) => {
      state.customer = action.payload;
    },

    setPaymentMethod: (state, action: PayloadAction<number | string>) => {
      state.paymentMethod = action.payload;
    },

    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },

    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.discount = 0;
      state.tax = 0;
      state.total = 0;
      state.customer = null;
      state.paymentMethod = 2; // Reset to Cash (ID: 2)
      state.notes = '';
    },
  },
});

export const {
  addItem,
  removeItem,
  updateItemQuantity,
  updateItemDiscount,
  setCartDiscount,
  setVATRate,
  setIsTaxInclusive,
  setCustomer,
  setPaymentMethod,
  setNotes,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
