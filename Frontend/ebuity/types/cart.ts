export interface CartProductSnapshot {
  _id: string;
  name: string;
  images?: string[];
  defaultPrice?: number;
  slug?: string;
}

export interface CartVariantSnapshot {
  _id: string;
  price: number;
  optionValues?: Record<string, string>;
}

export interface CartLineItem {
  lineId?: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product?: CartProductSnapshot | null;
  variant?: CartVariantSnapshot | null;
  unitPrice: number;
  lineTotal: number;
  unavailable?: boolean;
  reason?: "PRODUCT_DELETED" | "VARIANT_DELETED" | "PRODUCT_INACTIVE" | "VARIANT_INACTIVE" | string | null;
}

export interface CartTotals {
  subtotal: number;
  count: number;
  unavailableCount: number;
}

export interface CartResponse {
  _id?: string;
  items: CartLineItem[];
  totals?: CartTotals;
}

export interface AddToCartPayload {
  productId: string;
  variantId?: string;
  quantity?: number;
  productSnapshot?: CartProductSnapshot;
  variantSnapshot?: CartVariantSnapshot;
}

export interface UpdateCartQuantityPayload {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface RemoveCartItemPayload {
  lineId?: string;
  productId?: string;
  variantId?: string | null;
}

export interface MergeCartPayload {
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
  }[];
}
