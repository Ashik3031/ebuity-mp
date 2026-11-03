export interface ProductPricing {
  basePrice: number;
  salePrice: number;
  discount: number;
}

export interface AppliedOffer {
  _id: string;
  name: string;
  type?: string;
  value?: number;
  maxDiscount?: number;
}

export interface ProductVariant {
  _id: string;
  product: string;
  sku: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images?: string[];
  optionValues?: Record<string, string>;
  salePrice?: number;
  discount?: number;
  isActive?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  nameNormalized?: string;
  slug: string;
  description?: string;
  detailedDescription?: string;
  brand?: { _id: string; name: string; slug: string; logo?: string } | string;
  brandName?: string;
  category?: string | { _id: string; label?: string; name?: string };
  subcategory?: string | { _id: string; label?: string; name?: string };
  categoryPath?: string[] | Array<{ _id: string; label?: string; name?: string }>;
  tags?: string[];
  options?: string[];
  images?: string[];
  defaultPrice: number;
  price?: number;
  compareAtPrice?: number;
  defaultStock: number;
  stock?: number;
  sku?: string;
  size?: string;
  currency?: string;
  isActive?: boolean;
  active?: boolean;
  isFeatured?: boolean;
  avgRating?: number;
  reviewCount?: number;
  pricing?: ProductPricing;
  appliedOffer?: AppliedOffer | null;
  salePrice?: number | null;
  discount?: number;
  createdAt?: string;
}

export interface ProductListItem {
  product: Product;
  variants?: ProductVariant[];
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductDetailResponse {
  product: Product;
  variants: ProductVariant[];
}

export interface FlatCategoryItem {
  _id: string;
  value: string;
  label: string;
  pathLabel: string;
}

export interface ProductCategoryNode {
  _id: string;
  label: string;
  parent?: string | null;
  description?: string;
  image?: string | null;
  position?: number;
  children?: ProductCategoryNode[];
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  detailedDescription?: string;
  brandName?: string;
  categoryId?: string;
  category?: string;
  categoryPath?: string[];
  defaultPrice: number;
  compareAtPrice?: number;
  defaultStock: number;
  sku?: string;
  size?: string;
  tags?: string[];
  options?: string[];
  defaultImages?: string[];
  images?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  detailedDescription?: string;
  brandName?: string;
  category?: string;
  defaultPrice?: number;
  compareAtPrice?: number;
  defaultStock?: number;
  images?: string[];
  tags?: string[];
  options?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}
