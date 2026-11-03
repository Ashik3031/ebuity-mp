import { Service } from "./service";

export type PackageCategory =
  | "Bridal & Events"
  | "Spa & Wellness"
  | "Grooming & Nails"
  | "Seasonal Offers"
  | "General";

export interface Package {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  services: (Service | string)[];
  inclusions: string[];
  originalPrice: number;
  price: number;
  currency: string;
  discountPercentage: number;
  durationMinutes: number;
  badge?: string;
  category: PackageCategory | string;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  validUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageFormData {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  services: string[];
  inclusions: string[];
  originalPrice: number;
  price: number;
  currency?: string;
  discountPercentage?: number;
  durationMinutes: number;
  badge?: string;
  category: PackageCategory | string;
  images: string[];
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  validUntil?: string | null;
}

