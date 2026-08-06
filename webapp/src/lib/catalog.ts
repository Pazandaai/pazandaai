import { useEffect, useState } from "react";
import { tgHeaders } from "./api";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  type Product,
  type ProductCategory,
} from "./products";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

export function useProductCatalog() {
  const [categories, setCategories] = useState<ProductCategory[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);

  useEffect(() => {
    fetch(`${API_BASE}/api/product-catalog`, { cache: "no-store", headers: tgHeaders() })
      .then((r) => r.json())
      .then((j) => {
        const v = j?.value;
        if (v && Array.isArray(v.categories) && Array.isArray(v.products) && v.products.length > 0) {
          setCategories(v.categories);
          setProducts(v.products);
        }
      })
      .catch(() => {});
  }, []);

  return { categories, products };
}
