export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  isActive: boolean;
  active?: boolean;
  displayOrder: number;
  sortOrder?: number;
  serviceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceIncludedStep {
  title: string;
  description: string;
}

export interface Service {
  _id: string;
  name: string;
  slug: string;
  category: ServiceCategory | string;
  categoryName?: string;
  categorySlug?: string;
  description?: string;
  shortDescription?: string;
  fullDescription?: string;
  images: string[];
  price: number;
  duration: number; // in minutes
  durationMinutes?: number;
  currency?: string;
  serviceType?: string;
  womenOnly?: boolean;
  preparationInstructions?: string;
  isActive: boolean;
  active?: boolean;
  isFeatured?: boolean;
  isExclusiveDeal?: boolean;
  dealPrice?: number | null;
  dealDiscountPercentage?: number | null;
  dealBadge?: string;
  dealDescription?: string;
  dealEndsAt?: string | null;
  displayOrder: number;
  benefits?: string[];
  includedSteps?: ServiceIncludedStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceZone {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  emirate?: string;
  description?: string;
  supportedAreas: string[];
  postalIdentifiers?: string[];
  boundaryCoordinates?: { lat: number; lng: number; label?: string }[];
  bookingCount?: number;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceListResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  services: Service[];
}

export interface ServiceCategoryListResponse {
  success: boolean;
  count: number;
  categories: ServiceCategory[];
}

export interface ServiceDetailResponse {
  success: boolean;
  service: Service;
  relatedServices?: Service[];
}

export interface ServiceZoneListResponse {
  success: boolean;
  count: number;
  zones: ServiceZone[];
}
