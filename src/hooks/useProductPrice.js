import { useMemo } from "react";

export const useProductPrice = (product) => {
  const priceData = useMemo(() => {
    const price = Number(product.price) || 0;
    const oldPrice = Number(product.oldPrice) || 0;
    const stock = Number(product.stock) || 0;

    const hasDiscount = oldPrice > price;
    const discountPercent = hasDiscount
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

    const formatPrice = (value) => {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(value);
    };

    return {
      price,
      oldPrice,
      stock,
      hasDiscount,
      discountPercent,
      formattedPrice: formatPrice(price),
      formattedOldPrice: formatPrice(oldPrice),
      isOutOfStock: stock <= 0,
    };
  }, [product.price, product.oldPrice, product.stock]);

  return priceData;
};
