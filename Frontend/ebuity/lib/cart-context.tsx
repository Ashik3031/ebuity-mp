"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  CartLineItem,
  CartTotals,
  AddToCartPayload,
  UpdateCartQuantityPayload,
  RemoveCartItemPayload,
} from "../types/cart";
import { cartApi } from "./api-client";
import { useAuth } from "./auth-context";

interface CartContextType {
  items: CartLineItem[];
  totals: CartTotals;
  loading: boolean;
  error: string | null;
  addToCart: (payload: AddToCartPayload) => Promise<{ success: boolean; message?: string }>;
  updateQuantity: (payload: UpdateCartQuantityPayload) => Promise<void>;
  removeFromCart: (payload: RemoveCartItemPayload) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const GUEST_CART_STORAGE_KEY = "rose_essence_guest_cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateTotals(items: CartLineItem[]): CartTotals {
  return items.reduce(
    (acc, item) => {
      if (!item.unavailable) {
        acc.subtotal += item.lineTotal;
        acc.count += item.quantity;
      } else {
        acc.unavailableCount += 1;
      }
      return acc;
    },
    { subtotal: 0, count: 0, unavailableCount: 0 }
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    count: 0,
    unavailableCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasMergedGuestCart = useRef(false);

  // Load guest cart from localStorage
  const loadGuestCart = useCallback((): CartLineItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore JSON parse error
    }
    return [];
  }, []);

  // Save guest cart to localStorage
  const saveGuestCart = useCallback((newItems: CartLineItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // ignore quota error
    }
  }, []);

  // Refresh cart from backend or local storage
  const refreshCart = useCallback(async () => {
    if (authLoading) return;

    if (isAuthenticated) {
      try {
        setLoading(true);
        setError(null);

        // If there were guest items before login, merge them first
        if (!hasMergedGuestCart.current) {
          const guestItems = loadGuestCart();
          if (guestItems.length > 0) {
            try {
              await cartApi.merge({
                items: guestItems.map((g) => ({
                  productId: g.productId,
                  variantId: g.variantId || null,
                  quantity: g.quantity,
                })),
              });
              localStorage.removeItem(GUEST_CART_STORAGE_KEY);
            } catch {
              // merge failure shouldn't crash app
            }
          }
          hasMergedGuestCart.current = true;
        }

        const res = await cartApi.get();
        const cartItems = res.items || [];
        const calculated = res.totals || calculateTotals(cartItems);
        setItems(cartItems);
        setTotals(calculated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load cart";
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest mode
      hasMergedGuestCart.current = false;
      const guestItems = loadGuestCart();
      setItems(guestItems);
      setTotals(calculateTotals(guestItems));
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, loadGuestCart]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add to cart
  const addToCart = async (
    payload: AddToCartPayload
  ): Promise<{ success: boolean; message?: string }> => {
    const qtyToAdd = payload.quantity || 1;

    if (isAuthenticated) {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.add({
          productId: payload.productId,
          variantId: payload.variantId,
          quantity: qtyToAdd,
        });
        const cartItems = res.items || [];
        setItems(cartItems);
        setTotals(res.totals || calculateTotals(cartItems));
        return { success: true, message: "Added to cart" };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not add to cart";
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setLoading(false);
      }
    } else {
      // Guest local cart
      const current = loadGuestCart();
      const existingIdx = current.findIndex(
        (i) =>
          i.productId === payload.productId &&
          (i.variantId || "") === (payload.variantId || "")
      );

      const price =
        payload.variantSnapshot?.price ??
        payload.productSnapshot?.defaultPrice ??
        0;

      let updated: CartLineItem[];
      if (existingIdx > -1) {
        updated = [...current];
        const newQty = updated[existingIdx].quantity + qtyToAdd;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          lineTotal: price * newQty,
        };
      } else {
        const newItem: CartLineItem = {
          lineId: `guest-${Date.now()}-${Math.random()}`,
          productId: payload.productId,
          variantId: payload.variantId || null,
          quantity: qtyToAdd,
          product: payload.productSnapshot,
          variant: payload.variantSnapshot,
          unitPrice: price,
          lineTotal: price * qtyToAdd,
          unavailable: false,
        };
        updated = [...current, newItem];
      }

      saveGuestCart(updated);
      setItems(updated);
      setTotals(calculateTotals(updated));
      return { success: true, message: "Added to cart" };
    }
  };

  // Update line quantity
  const updateQuantity = async (payload: UpdateCartQuantityPayload) => {
    if (isAuthenticated) {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.update(payload);
        const cartItems = res.items || [];
        setItems(cartItems);
        setTotals(res.totals || calculateTotals(cartItems));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update quantity";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      const current = loadGuestCart();
      let updated: CartLineItem[];

      if (payload.quantity <= 0) {
        updated = current.filter(
          (i) =>
            !(
              i.productId === payload.productId &&
              (i.variantId || "") === (payload.variantId || "")
            )
        );
      } else {
        updated = current.map((i) => {
          if (
            i.productId === payload.productId &&
            (i.variantId || "") === (payload.variantId || "")
          ) {
            return {
              ...i,
              quantity: payload.quantity,
              lineTotal: i.unitPrice * payload.quantity,
            };
          }
          return i;
        });
      }

      saveGuestCart(updated);
      setItems(updated);
      setTotals(calculateTotals(updated));
    }
  };

  // Remove from cart
  const removeFromCart = async (payload: RemoveCartItemPayload) => {
    if (isAuthenticated) {
      try {
        setLoading(true);
        setError(null);
        const res = await cartApi.remove(payload);
        const cartItems = res.items || [];
        setItems(cartItems);
        setTotals(res.totals || calculateTotals(cartItems));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to remove item";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      const current = loadGuestCart();
      const updated = current.filter((i) => {
        if (payload.lineId && i.lineId === payload.lineId) return false;
        if (
          payload.productId &&
          i.productId === payload.productId &&
          (i.variantId || "") === (payload.variantId || "")
        ) {
          return false;
        }
        return true;
      });

      saveGuestCart(updated);
      setItems(updated);
      setTotals(calculateTotals(updated));
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        setLoading(true);
        setError(null);
        await cartApi.clear();
        setItems([]);
        setTotals({ subtotal: 0, count: 0, unavailableCount: 0 });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to clear cart";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      saveGuestCart([]);
      setItems([]);
      setTotals({ subtotal: 0, count: 0, unavailableCount: 0 });
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totals,
        loading,
        error,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
