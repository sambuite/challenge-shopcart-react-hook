import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const CART_KEY = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productToChange = cart.find((product) => product.id === productId);

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if ((productToChange?.amount || 0) + 1 > stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productToChange) {
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: product.amount + 1,
            };
          }

          return product;
        });

        setCart(newCart);
        localStorage.setItem(CART_KEY, JSON.stringify(newCart));

        return;
      }

      const { data: productsData } = await api.get(`/products/${productId}`);

      const newCart = [...cart, { ...productsData, amount: 1 }];

      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isInCart = cart.some((product) => product.id === productId);

      if (!isInCart) throw "";

      const newCart = cart.filter((product) => product.id !== productId);

      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;

    try {
      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (amount + 1 > stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          };
        }

        return product;
      });

      setCart(newCart);
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));

      return;
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
