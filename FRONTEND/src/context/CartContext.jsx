import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      setCartTotal(0);
      setItemCount(0);
      return;
    }
    try {
      const data = await cartService.getCart();
      setCartItems(data.items || []);
      setCartTotal(data.total || 0);
      setItemCount(data.itemCount || 0);
    } catch {
      // Silently ignore — cart will be refreshed on next user action
    }
  }, [isAuthenticated]);

  // Fetch cart on login/logout state change
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  function updateCartState(cartData) {
    setCartItems(cartData.items || []);
    setCartTotal(cartData.total || 0);
    setItemCount(cartData.itemCount || 0);
  }

  function clearCart() {
    setCartItems([]);
    setCartTotal(0);
    setItemCount(0);
  }

  return (
    <CartContext.Provider value={{ cartItems, cartTotal, itemCount, refreshCart, updateCartState, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
