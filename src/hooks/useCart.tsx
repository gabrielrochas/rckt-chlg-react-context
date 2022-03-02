import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const storagedList = [...cart];
      const productExist = cart.find((product) => product.id === productId);

      const productStock: number = await checkProductStock(productId);

      const currentAmount = productExist?.amount ?? 0;
      const productAmount = currentAmount + 1;

      if (productAmount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExist) {
        productExist.amount = productAmount;
      } else {
        const product = await api
          .get(`/products/${productId}`)
          .then((res) => res.data);
        const newProduct = { ...product, amount: 1 };

        storagedList.push(newProduct);
      }

      setCart(storagedList);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(storagedList));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find((product) => product.id === productId);
      if(!productExist) {
        throw Error();
      }
      const newListProducts = cart.filter(
        (product) => product.id !== productId
      );

      localStorage.setItem('@RocketShoes:cart',JSON.stringify(newListProducts));
      setCart(newListProducts);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock: number = await checkProductStock(productId);

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newAmount = cart.map((product) => (product.id === productId ? {...product, amount: amount} : product));

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newAmount));
      setCart(newAmount);

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const checkProductStock = async (productId: number) => {
    const productAmount = await api
      .get(`/stock/${productId}`)
      .then((product) => product.data.amount);

    return productAmount;
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
