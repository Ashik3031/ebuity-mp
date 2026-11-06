import {
  AuthResponse,
  UserDataResponse,
  LoginPayload,
  RegisterPayload,
  SendOtpPayload,
  ResetPasswordPayload,
  CategoryItem,
} from "../types/auth";
import {
  ProductListResponse,
  ProductDetailResponse,
  Product,
  FlatCategoryItem,
  ProductCategoryNode,
  CreateProductPayload,
  UpdateProductPayload,
} from "../types/product";
import {
  CartResponse,
  AddToCartPayload,
  UpdateCartQuantityPayload,
  RemoveCartItemPayload,
  MergeCartPayload,
} from "../types/cart";
import {
  ServiceCategory,
  Service,
  ServiceZone,
  ServiceListResponse,
  ServiceCategoryListResponse,
  ServiceDetailResponse,
  ServiceZoneListResponse,
} from "../types/service";
import { Package, PackageFormData, PackageCategory } from "../types/package";

export type {
  ServiceCategory,
  Service,
  ServiceZone,
  ServiceListResponse,
  ServiceCategoryListResponse,
  ServiceDetailResponse,
  ServiceZoneListResponse,
  Package,
  PackageFormData,
  PackageCategory,
};
import {
  Booking,
  TimeSlot,
  AvailabilityResponse,
  ZoneValidationResponse,
  CreateBookingPayload,
  SavedAddress,
  AvailabilityConfig,
  AvailabilityBreak,
  NotificationLogItem,
} from "../types/booking";

export type {
  Booking,
  TimeSlot,
  AvailabilityResponse,
  ZoneValidationResponse,
  CreateBookingPayload,
  SavedAddress,
  AvailabilityConfig,
  AvailabilityBreak,
  NotificationLogItem,
};
import {
  StaffProfile,
  StaffLeave,
  StaffAttendance,
  StaffDashboardSummary,
  StaffScheduleItem,
} from "../types/staff";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Essential for HttpOnly cookie persistence
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        (data && (data.message || data.error)) ||
        `Request failed with status ${res.status}`;
      throw new ApiError(errorMessage, res.status);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Network error, please try again.";
    throw new ApiError(message, 0);
  }
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/logout", {
      method: "POST",
    });
  },

  async checkAuth(): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/is-auth", {
      method: "GET",
    });
  },

  async getUserData(): Promise<UserDataResponse> {
    return request<UserDataResponse>("/user/data", {
      method: "GET",
    });
  },

  async sendResetOtp(payload: SendOtpPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/send-reset-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const categoryApi = {
  async getCategories(): Promise<CategoryItem[]> {
    return request<CategoryItem[]>("/category", {
      method: "GET",
    });
  },

  async getFlat(): Promise<{ items: FlatCategoryItem[] }> {
    return request<{ items: FlatCategoryItem[] }>("/category/flat", {
      method: "GET",
    });
  },

  async create(formData: FormData): Promise<ProductCategoryNode> {
    return request<ProductCategoryNode>("/category", {
      method: "POST",
      body: formData,
    });
  },

  async update(id: string, formData: FormData): Promise<ProductCategoryNode> {
    return request<ProductCategoryNode>(`/category/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: formData,
    });
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/category/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

export const productApi = {
  async getAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    category?: string;
    isActive?: boolean;
  } = {}): Promise<ProductListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.category) query.set("category", params.category);
    if (typeof params.isActive !== "undefined") query.set("isActive", String(params.isActive));

    const queryString = query.toString();
    const endpoint = `/products/all${queryString ? `?${queryString}` : ""}`;
    return request<ProductListResponse>(endpoint, { method: "GET" });
  },

  async getById(idOrSlug: string): Promise<ProductDetailResponse> {
    return request<ProductDetailResponse>(`/products/${encodeURIComponent(idOrSlug)}`, {
      method: "GET",
    });
  },

  async search(q: string): Promise<{ success: boolean; results: Product[] }> {
    return request<{ success: boolean; results: Product[] }>(
      `/products/search?q=${encodeURIComponent(q)}`,
      { method: "GET" }
    );
  },
};

export const adminProductApi = {
  async getAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    category?: string;
    isActive?: boolean;
  } = {}): Promise<ProductListResponse> {
    return productApi.getAll(params);
  },

  async getById(id: string): Promise<ProductDetailResponse> {
    return productApi.getById(id);
  },

  async create(payload: CreateProductPayload): Promise<{ product: Product }> {
    return request<{ product: Product }>("/products/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    return request<Product>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async uploadImages(files: File[]): Promise<{ urls: string[] }> {
    return uploadApi.uploadImages(files);
  },
};

export const uploadApi = {
  async uploadImages(files: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    return request<{ urls: string[] }>("/upload/images", {
      method: "POST",
      body: formData,
    });
  },

  async uploadImage(file: File): Promise<{ url: string; urls: string[] }> {
    const formData = new FormData();
    formData.append("images", file);
    const res = await request<{ urls: string[]; url?: string }>("/upload/images", {
      method: "POST",
      body: formData,
    });
    const url = res.url || (res.urls && res.urls[0]) || "";
    return {
      url,
      urls: res.urls || (url ? [url] : []),
    };
  },
};

export const adminCategoryApi = categoryApi;

export const cartApi = {
  async get(): Promise<CartResponse> {
    return request<CartResponse>("/cart", {
      method: "GET",
    });
  },

  async add(payload: AddToCartPayload): Promise<CartResponse> {
    return request<CartResponse>("/cart/add", {
      method: "POST",
      body: JSON.stringify({
        productId: payload.productId,
        variantId: payload.variantId,
        quantity: payload.quantity || 1,
      }),
    });
  },

  async update(payload: UpdateCartQuantityPayload): Promise<CartResponse> {
    return request<CartResponse>("/cart/update", {
      method: "PATCH",
      body: JSON.stringify({
        productId: payload.productId,
        variantId: payload.variantId,
        quantity: payload.quantity,
      }),
    });
  },

  async remove(payload: RemoveCartItemPayload): Promise<CartResponse> {
    return request<CartResponse>("/cart/remove", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async clear(): Promise<CartResponse> {
    return request<CartResponse>("/cart/clear", {
      method: "DELETE",
    });
  },

  async merge(payload: MergeCartPayload): Promise<{ success: boolean }> {
    return request<{ success: boolean }>("/cart/merge", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const serviceCategoryApi = {
  async getAll(): Promise<ServiceCategoryListResponse> {
    return request<ServiceCategoryListResponse>("/v1/service-categories");
  },
  async getBySlug(slug: string): Promise<{ success: boolean; category: ServiceCategory }> {
    return request<{ success: boolean; category: ServiceCategory }>(
      `/v1/service-categories/${encodeURIComponent(slug)}`
    );
  },
};

export const serviceApi = {
  async getAll(
    params: {
      category?: string;
      search?: string;
      featured?: boolean | string;
      exclusiveDeals?: boolean | string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ): Promise<ServiceListResponse> {
    const query = new URLSearchParams();
    if (params.category && params.category !== "All")
      query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.featured) query.set("featured", String(params.featured));
    if (params.exclusiveDeals) query.set("exclusiveDeals", String(params.exclusiveDeals));
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);

    const qs = query.toString();
    return request<ServiceListResponse>(`/v1/services${qs ? `?${qs}` : ""}`);
  },

  async getExclusiveDeals(): Promise<{ success: boolean; count: number; services: Service[] }> {
    return request<{ success: boolean; count: number; services: Service[] }>("/v1/services/deals");
  },

  async getBySlug(slug: string): Promise<ServiceDetailResponse> {
    return request<ServiceDetailResponse>(`/v1/services/${encodeURIComponent(slug)}`);
  },
};

export const serviceZoneApi = {
  async getAll(): Promise<ServiceZoneListResponse> {
    return request<ServiceZoneListResponse>("/v1/service-zones");
  },
};

export const packageApi = {
  async getAll(params?: { category?: string; featured?: boolean | string }): Promise<{
    success: boolean;
    count: number;
    packages: Package[];
  }> {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== "All") qs.set("category", params.category);
    if (params?.featured) qs.set("featured", String(params.featured));
    const q = qs.toString();
    return request<{ success: boolean; count: number; packages: Package[] }>(
      `/v1/packages${q ? `?${q}` : ""}`
    );
  },

  async getBySlug(slug: string): Promise<{ success: boolean; package: Package }> {
    return request<{ success: boolean; package: Package }>(
      `/v1/packages/${encodeURIComponent(slug)}`
    );
  },
};

export const addressApi = {
  async getAll(): Promise<{ success: boolean; addresses: SavedAddress[] }> {
    return request<{ success: boolean; addresses: SavedAddress[] }>("/user/addresses", {
      method: "GET",
    });
  },

  async add(payload: Partial<SavedAddress>): Promise<{ success: boolean; addresses: SavedAddress[] }> {
    return request<{ success: boolean; addresses: SavedAddress[] }>("/user/address", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(addressId: string, payload: Partial<SavedAddress>): Promise<{ success: boolean; addresses: SavedAddress[] }> {
    return request<{ success: boolean; addresses: SavedAddress[] }>(`/user/address/${encodeURIComponent(addressId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async delete(addressId: string): Promise<{ success: boolean; addresses: SavedAddress[] }> {
    return request<{ success: boolean; addresses: SavedAddress[] }>(`/user/delete/${encodeURIComponent(addressId)}`, {
      method: "DELETE",
    });
  },

  async setDefault(addressId: string): Promise<{ success: boolean; addresses: SavedAddress[] }> {
    return request<{ success: boolean; addresses: SavedAddress[] }>(`/user/address/default/${encodeURIComponent(addressId)}`, {
      method: "PUT",
    });
  },
};

export const bookingApi = {
  async getAvailability(params: {
    date: string;
    duration?: number;
    serviceIds?: string[];
  }): Promise<AvailabilityResponse> {
    const query = new URLSearchParams({ date: params.date });
    if (params.duration) query.set("duration", String(params.duration));
    if (params.serviceIds && params.serviceIds.length > 0) {
      query.set("serviceIds", params.serviceIds.join(","));
    }
    return request<AvailabilityResponse>(`/v1/bookings/availability?${query.toString()}`);
  },

  async validateZone(payload: { area?: string; city?: string; emirate?: string; addressId?: string }): Promise<ZoneValidationResponse> {
    return request<ZoneValidationResponse>("/v1/bookings/validate-zone", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async create(payload: CreateBookingPayload): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
  }> {
    return request<{ success: boolean; message: string; booking: Booking }>("/v1/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMyBookings(status?: string): Promise<{
    success: boolean;
    count: number;
    bookings: Booking[];
  }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ success: boolean; count: number; bookings: Booking[] }>(
      `/v1/bookings/my-bookings${qs}`
    );
  },

  async getById(id: string): Promise<{ success: boolean; booking: Booking }> {
    return request<{ success: boolean; booking: Booking }>(
      `/v1/bookings/${encodeURIComponent(id)}`
    );
  },

  async cancel(id: string, reason?: string): Promise<{ success: boolean; booking: Booking }> {
    return request<{ success: boolean; booking: Booking }>(
      `/v1/bookings/${encodeURIComponent(id)}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }
    );
  },

  async requestReschedule(
    id: string,
    payload: { requestedDate: string; requestedTime: string; reason?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/v1/bookings/${encodeURIComponent(id)}/request-reschedule`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async requestCancel(
    id: string,
    payload?: { reason?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking; immediateCancel?: boolean }> {
    return request<{ success: boolean; message: string; booking: Booking; immediateCancel?: boolean }>(
      `/v1/bookings/${encodeURIComponent(id)}/request-cancel`,
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }
    );
  },
};

export const staffApi = {
  async login(payload: { email: string; password: string }): Promise<{
    success: boolean;
    token: string;
    staff: StaffProfile;
    message: string;
  }> {
    return request<{
      success: boolean;
      token: string;
      staff: StaffProfile;
      message: string;
    }>("/v1/staff/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/v1/staff/auth/logout", {
      method: "POST",
    });
  },

  async setupPassword(payload: {
    token: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message: string;
    token: string;
    staff: StaffProfile;
  }> {
    return request<{
      success: boolean;
      message: string;
      token: string;
      staff: StaffProfile;
    }>("/v1/staff/auth/setup-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getProfile(): Promise<{ success: boolean; staff: StaffProfile }> {
    return request<{ success: boolean; staff: StaffProfile }>("/v1/staff/profile");
  },

  async getDashboardSummary(): Promise<{
    success: boolean;
    summary: StaffDashboardSummary;
  }> {
    return request<{ success: boolean; summary: StaffDashboardSummary }>(
      "/v1/staff/dashboard/summary"
    );
  },

  async getBookings(params?: {
    filter?: "today" | "upcoming" | "completed" | "all";
    status?: string;
  }): Promise<{ success: boolean; count: number; bookings: Booking[] }> {
    const qs = new URLSearchParams();
    if (params?.filter) qs.set("filter", params.filter);
    if (params?.status) qs.set("status", params.status);
    return request<{ success: boolean; count: number; bookings: Booking[] }>(
      `/v1/staff/bookings?${qs.toString()}`
    );
  },

  async getBookingDetail(id: string): Promise<{
    success: boolean;
    booking: Booking;
  }> {
    return request<{ success: boolean; booking: Booking }>(
      `/v1/staff/bookings/${encodeURIComponent(id)}`
    );
  },

  async acceptAssignment(id: string): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
  }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/v1/staff/bookings/${encodeURIComponent(id)}/accept`,
      { method: "POST" }
    );
  },

  async rejectAssignment(
    id: string,
    reason: string
  ): Promise<{ success: boolean; message: string; result: any }> {
    return request<{ success: boolean; message: string; result: any }>(
      `/v1/staff/bookings/${encodeURIComponent(id)}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  async updateJobStatus(
    id: string,
    status: "on_the_way" | "arrived" | "in_progress" | "completed"
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/v1/staff/bookings/${encodeURIComponent(id)}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status }),
      }
    );
  },

  async checkIn(): Promise<{
    success: boolean;
    message: string;
    attendance: StaffAttendance;
  }> {
    return request<{
      success: boolean;
      message: string;
      attendance: StaffAttendance;
    }>("/v1/staff/attendance/check-in", { method: "POST" });
  },

  async checkOut(): Promise<{
    success: boolean;
    message: string;
    attendance: StaffAttendance;
  }> {
    return request<{
      success: boolean;
      message: string;
      attendance: StaffAttendance;
    }>("/v1/staff/attendance/check-out", { method: "POST" });
  },

  async getAttendanceToday(): Promise<{
    success: boolean;
    attendance: StaffAttendance | null;
  }> {
    return request<{ success: boolean; attendance: StaffAttendance | null }>(
      "/v1/staff/attendance/today"
    );
  },

  async getAttendanceHistory(limit = 30): Promise<{
    success: boolean;
    records: StaffAttendance[];
  }> {
    return request<{ success: boolean; records: StaffAttendance[] }>(
      `/v1/staff/attendance/history?limit=${limit}`
    );
  },

  async submitLeave(payload: {
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ success: boolean; message: string; leaves: StaffLeave[] }> {
    return request<{ success: boolean; message: string; leaves: StaffLeave[] }>(
      "/v1/staff/leaves",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async getLeaves(): Promise<{ success: boolean; leaves: StaffLeave[] }> {
    return request<{ success: boolean; leaves: StaffLeave[] }>("/v1/staff/leaves");
  },

  async updateBreaks(breaks: { start: string; end: string; label?: string }[]): Promise<{
    success: boolean;
    message: string;
    breaks: { start: string; end: string; label?: string }[];
  }> {
    return request<{
      success: boolean;
      message: string;
      breaks: { start: string; end: string; label?: string }[];
    }>("/v1/staff/breaks", {
      method: "PUT",
      body: JSON.stringify({ breaks }),
    });
  },
};

export const adminStaffApi = {
  async getAllStaff(params?: {
    search?: string;
    status?: string;
    employmentStatus?: string;
    categoryId?: string;
    serviceId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    count: number;
    total?: number;
    totalPages?: number;
    currentPage?: number;
    staff: StaffProfile[];
  }> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.employmentStatus) qs.set("employmentStatus", params.employmentStatus);
    if (params?.categoryId) qs.set("categoryId", params.categoryId);
    if (params?.serviceId) qs.set("serviceId", params.serviceId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{
      success: boolean;
      count: number;
      total?: number;
      totalPages?: number;
      currentPage?: number;
      staff: StaffProfile[];
    }>(`/v1/admin/staff-management?${qs.toString()}`);
  },

  async getStaffById(id: string): Promise<{
    success: boolean;
    staff: StaffProfile;
    stats?: { totalAssigned: number; completed: number };
  }> {
    return request<{
      success: boolean;
      staff: StaffProfile;
      stats?: { totalAssigned: number; completed: number };
    }>(`/v1/admin/staff-management/${encodeURIComponent(id)}`);
  },

  async createStaff(
    payload: Partial<StaffProfile> & { password?: string; sendInvitation?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    staff: StaffProfile;
    invitationUrl?: string;
    invitationToken?: string;
  }> {
    return request<{
      success: boolean;
      message: string;
      staff: StaffProfile;
      invitationUrl?: string;
      invitationToken?: string;
    }>("/v1/admin/staff-management", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStaff(
    id: string,
    payload: Partial<StaffProfile> & { password?: string }
  ): Promise<{ success: boolean; message: string; staff: StaffProfile }> {
    return request<{ success: boolean; message: string; staff: StaffProfile }>(
      `/v1/admin/staff-management/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async toggleStatus(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; staff: any }> {
    return request<{ success: boolean; message: string; staff: any }>(
      `/v1/admin/staff-management/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }
    );
  },

  async inviteStaff(id: string): Promise<{
    success: boolean;
    message: string;
    invitationUrl: string;
    invitationToken: string;
    expiresAt?: string;
  }> {
    return request<{
      success: boolean;
      message: string;
      invitationUrl: string;
      invitationToken: string;
      expiresAt?: string;
    }>(`/v1/admin/staff-management/${encodeURIComponent(id)}/invite`, {
      method: "POST",
    });
  },

  async updateSchedule(
    id: string,
    payload: {
      workingHours?: { start: string; end: string };
      breaks?: any[];
      weeklyOffDays?: number[];
      holidays?: string[];
      scheduleExceptions?: any[];
    }
  ): Promise<{ success: boolean; message: string; schedule: any }> {
    return request<{ success: boolean; message: string; schedule: any }>(
      `/v1/admin/staff-management/${encodeURIComponent(id)}/schedule`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async getLeaves(status?: string): Promise<{
    success: boolean;
    count: number;
    leaves: StaffLeave[];
  }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ success: boolean; count: number; leaves: StaffLeave[] }>(
      `/v1/admin/staff-management/leaves${qs}`
    );
  },

  async reviewLeave(
    leaveId: string,
    payload: { status: "approved" | "rejected"; reviewNotes?: string }
  ): Promise<{ success: boolean; message: string; leave: StaffLeave }> {
    return request<{ success: boolean; message: string; leave: StaffLeave }>(
      `/v1/admin/staff-management/leaves/${encodeURIComponent(leaveId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  async getSchedules(date?: string): Promise<{
    success: boolean;
    date: string;
    schedules: StaffScheduleItem[];
  }> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return request<{
      success: boolean;
      date: string;
      schedules: StaffScheduleItem[];
    }>(`/v1/admin/staff-management/schedules${qs}`);
  },

  async getAssignments(params?: {
    status?: string;
    flagged?: boolean;
    date?: string;
  }): Promise<{ success: boolean; count: number; bookings: Booking[] }> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.flagged !== undefined) qs.set("flagged", String(params.flagged));
    if (params?.date) qs.set("date", params.date);
    return request<{ success: boolean; count: number; bookings: Booking[] }>(
      `/v1/admin/staff-management/assignments?${qs.toString()}`
    );
  },

  async reassign(
    bookingId: string,
    payload?: { staffId?: string; reason?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/v1/admin/staff-management/assignments/${encodeURIComponent(bookingId)}/reassign`,
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }
    );
  },

  async getAttendance(params?: {
    date?: string;
    staffId?: string;
  }): Promise<{ success: boolean; count: number; records: StaffAttendance[] }> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.staffId) qs.set("staffId", params.staffId);
    return request<{
      success: boolean;
      count: number;
      records: StaffAttendance[];
    }>(`/v1/admin/staff-management/attendance?${qs.toString()}`);
  },

  async correctAttendance(
    id: string,
    payload: {
      checkIn?: string | null;
      checkOut?: string | null;
      status?: string;
      notes?: string;
      reason: string;
    }
  ): Promise<{ success: boolean; message: string; record: StaffAttendance }> {
    return request<{ success: boolean; message: string; record: StaffAttendance }>(
      `/v1/admin/staff-management/attendance/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async manualAttendance(payload: {
    staffId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    notes?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; record: StaffAttendance }> {
    return request<{ success: boolean; message: string; record: StaffAttendance }>(
      "/v1/admin/staff-management/attendance",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async getEligibleStaff(params: {
    date: string;
    startTime?: string;
    duration?: number;
    serviceIds?: string;
  }): Promise<{
    success: boolean;
    date: string;
    startTime: string;
    durationMinutes: number;
    eligibleStaffCount: number;
    eligibleStaff: StaffProfile[];
    excludedStaffCount: number;
    excludedStaff: Array<{ staff: StaffProfile; reason: string }>;
  }> {
    const qs = new URLSearchParams();
    qs.set("date", params.date);
    if (params.startTime) qs.set("startTime", params.startTime);
    if (params.duration) qs.set("duration", String(params.duration));
    if (params.serviceIds) qs.set("serviceIds", params.serviceIds);
    return request<{
      success: boolean;
      date: string;
      startTime: string;
      durationMinutes: number;
      eligibleStaffCount: number;
      eligibleStaff: StaffProfile[];
      excludedStaffCount: number;
      excludedStaff: Array<{ staff: StaffProfile; reason: string }>;
    }>(`/v1/admin/staff-management/eligible-staff?${qs.toString()}`);
  },
};

// ==========================================
// ADMIN DASHBOARD & AUTH APIS
// ==========================================

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isAdmin?: boolean;
}

export interface DashboardMetricStats {
  todayBookings: number;
  upcomingBookings?: number;
  totalBookings: number;
  totalCustomers?: number;
  activeStaff: number;
  activeServices: number;
  activeProducts: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  unassignedBookingsCount?: number;
  pendingApprovals: number;
  totalRevenue: number;
  currency: string;
  revenueGrowth?: number;
}

export interface DashboardBookingTrend {
  month: string;
  completed: number;
  other: number;
  total: number;
  date?: string;
}

export interface DashboardCategoryDistribution {
  category: string;
  count: number;
}

export interface DashboardStatusDistribution {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardActivity {
  id: string;
  reference: string;
  type: "booking" | "order" | "registration" | "inventory" | string;
  customer: string;
  customerEmail?: string;
  itemTitle: string;
  dateTime: string;
  rawDate: string;
  assignedStaff: string;
  status: string;
  price: string;
}

export interface UpcomingAppointment {
  id: string;
  bookingNumber: string;
  clientName: string;
  serviceName: string;
  time: string;
  date: string;
  location: string;
  staff: string;
  status: string;
  staffAssignmentStatus?: string;
}

export interface StaffAvailabilitySummary {
  totalStaff: number;
  activeStaff: number;
  onDutyToday: number;
  onLeaveToday: number;
}

export interface LowStockProductItem {
  id: string;
  name: string;
  stock: number;
  price: number;
  currency: string;
  image?: string;
}

export interface DashboardStatsData {
  metrics: DashboardMetricStats;
  charts: {
    bookingTrends: DashboardBookingTrend[];
    categoryDistribution: DashboardCategoryDistribution[];
    revenueTrends: { period: string; revenue: number }[];
    bookingsByStatus?: DashboardStatusDistribution[];
  };
  recentActivities: DashboardActivity[];
  upcomingAppointments: UpcomingAppointment[];
  staffAvailability: StaffAvailabilitySummary;
  lowStockProducts: LowStockProductItem[];
  outOfStockProducts?: LowStockProductItem[];
  pendingRequests: {
    cancellations: number;
    reschedules: number;
    flaggedAssignments: number;
    unassignedBookings?: number;
    failedNotifications?: number;
    pendingOrders?: number;
    pendingLeaves?: number;
    lowStockCount?: number;
    outOfStockCount?: number;
  };
  isLiveDb: boolean;
}

export const adminAuthApi = {
  async login(payload: { email: string; password: string }): Promise<{
    success: boolean;
    message: string;
    admin: AdminUser;
  }> {
    return request<{ success: boolean; message: string; admin: AdminUser }>(
      "/admin/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/admin/logout", {
      method: "POST",
    });
  },

  async checkAuth(): Promise<{
    success: boolean;
    message: string;
    adminId: string;
    admin: AdminUser;
  }> {
    return request<{
      success: boolean;
      message: string;
      adminId: string;
      admin: AdminUser;
    }>("/admin/is-auth");
  },

  async getAdminData(): Promise<{ success: boolean; admin: AdminUser }> {
    return request<{ success: boolean; admin: AdminUser }>("/admin/data");
  },
};

export const adminDashboardApi = {
  async getStats(params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: DashboardStatsData;
  }> {
    const qs = new URLSearchParams();
    if (params?.range) qs.set("range", params.range);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{
      success: boolean;
      data: DashboardStatsData;
    }>(`/admin/dashboard/stats${query}`);
  },
};

export const adminServiceCategoryApi = {
  async getAll(): Promise<{
    success: boolean;
    count: number;
    categories: ServiceCategory[];
  }> {
    return request<{
      success: boolean;
      count: number;
      categories: ServiceCategory[];
    }>("/v1/admin/service-categories");
  },

  async create(payload: Partial<ServiceCategory>): Promise<{
    success: boolean;
    message: string;
    category: ServiceCategory;
  }> {
    return request<{ success: boolean; message: string; category: ServiceCategory }>(
      "/v1/admin/service-categories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async update(
    id: string,
    payload: Partial<ServiceCategory>
  ): Promise<{ success: boolean; message: string; category: ServiceCategory }> {
    return request<{ success: boolean; message: string; category: ServiceCategory }>(
      `/v1/admin/service-categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async delete(
    id: string
  ): Promise<{ success: boolean; message: string; serviceCount?: number }> {
    return request<{ success: boolean; message: string; serviceCount?: number }>(
      `/v1/admin/service-categories/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  async toggleStatus(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; category: ServiceCategory }> {
    return request<{ success: boolean; message: string; category: ServiceCategory }>(
      `/v1/admin/service-categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }
    );
  },
};

export const adminServiceApi = {
  async getAll(params?: {
    category?: string;
    search?: string;
    exclusiveDeals?: boolean | string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    services: Service[];
  }> {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== "all") qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.exclusiveDeals) qs.set("exclusiveDeals", String(params.exclusiveDeals));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const q = qs.toString();
    return request<{
      success: boolean;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      services: Service[];
    }>(`/v1/admin/services${q ? `?${q}` : ""}`);
  },

  async create(payload: Partial<Service>): Promise<{
    success: boolean;
    message: string;
    service: Service;
  }> {
    return request<{ success: boolean; message: string; service: Service }>(
      "/v1/admin/services",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async update(
    id: string,
    payload: Partial<Service>
  ): Promise<{ success: boolean; message: string; service: Service }> {
    return request<{ success: boolean; message: string; service: Service }>(
      `/v1/admin/services/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async toggleDeal(
    id: string,
    payload: {
      isExclusiveDeal: boolean;
      dealPrice?: number | null;
      dealDiscountPercentage?: number | null;
      dealBadge?: string;
      dealDescription?: string;
      dealEndsAt?: string | null;
    }
  ): Promise<{ success: boolean; message: string; service: Service }> {
    return request<{ success: boolean; message: string; service: Service }>(
      `/v1/admin/services/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async delete(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/v1/admin/services/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  async toggleStatus(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; service: Service }> {
    return request<{ success: boolean; message: string; service: Service }>(
      `/v1/admin/services/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }
    );
  },

  async uploadImage(file: File): Promise<{ url: string; urls: string[] }> {
    return uploadApi.uploadImage(file);
  },

  async uploadImages(files: File[]): Promise<{ urls: string[] }> {
    return uploadApi.uploadImages(files);
  },
};

export const adminPackageApi = {
  async getAll(params?: {
    category?: string;
    search?: string;
    isActive?: boolean | string;
  }): Promise<{
    success: boolean;
    count: number;
    packages: Package[];
  }> {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== "all") qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.isActive !== undefined) qs.set("isActive", String(params.isActive));
    const q = qs.toString();
    return request<{
      success: boolean;
      count: number;
      packages: Package[];
    }>(`/v1/admin/packages${q ? `?${q}` : ""}`);
  },

  async create(payload: PackageFormData): Promise<{
    success: boolean;
    message: string;
    package: Package;
  }> {
    return request<{ success: boolean; message: string; package: Package }>(
      "/v1/admin/packages",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async update(
    id: string,
    payload: Partial<PackageFormData>
  ): Promise<{ success: boolean; message: string; package: Package }> {
    return request<{ success: boolean; message: string; package: Package }>(
      `/v1/admin/packages/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/v1/admin/packages/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  async toggleStatus(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; package: Package }> {
    return request<{ success: boolean; message: string; package: Package }>(
      `/v1/admin/packages/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }
    );
  },
};

export const adminZoneApi = {
  async getAll(): Promise<{
    success: boolean;
    count: number;
    zones: ServiceZone[];
  }> {
    return request<{
      success: boolean;
      count: number;
      zones: ServiceZone[];
    }>("/v1/admin/service-zones");
  },

  async create(payload: Partial<ServiceZone>): Promise<{
    success: boolean;
    message: string;
    zone: ServiceZone;
  }> {
    return request<{ success: boolean; message: string; zone: ServiceZone }>(
      "/v1/admin/service-zones",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async update(
    id: string,
    payload: Partial<ServiceZone>
  ): Promise<{ success: boolean; message: string; zone: ServiceZone }> {
    return request<{ success: boolean; message: string; zone: ServiceZone }>(
      `/v1/admin/service-zones/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  async delete(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/v1/admin/service-zones/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  async toggleStatus(
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; message: string; zone: ServiceZone }> {
    return request<{ success: boolean; message: string; zone: ServiceZone }>(
      `/v1/admin/service-zones/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }
    );
  },
};

export const adminAvailabilityApi = {
  async getConfig(): Promise<{
    success: boolean;
    config: AvailabilityConfig;
  }> {
    return request<{
      success: boolean;
      config: AvailabilityConfig;
    }>("/v1/bookings/admin/config");
  },

  async updateConfig(
    payload: Partial<AvailabilityConfig>
  ): Promise<{
    success: boolean;
    message: string;
    config: AvailabilityConfig;
  }> {
    return request<{
      success: boolean;
      message: string;
      config: AvailabilityConfig;
    }>("/v1/bookings/admin/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async simulateSlots(params: {
    date: string;
    duration?: number;
    serviceIds?: string[];
  }): Promise<AvailabilityResponse> {
    const query = new URLSearchParams({ date: params.date });
    if (params.duration) query.set("duration", String(params.duration));
    if (params.serviceIds && params.serviceIds.length > 0) {
      query.set("serviceIds", params.serviceIds.join(","));
    }
    return request<AvailabilityResponse>(`/v1/bookings/availability?${query.toString()}`);
  },
};

export const adminBookingApi = {
  async getAll(params?: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    total: number;
    page: number;
    totalPages: number;
    bookings: Booking[];
  }> {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.date) qs.set("date", params.date);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{
      success: boolean;
      total: number;
      page: number;
      totalPages: number;
      bookings: Booking[];
    }>(`/bookings/admin/all?${qs.toString()}`);
  },

  async updateStatus(
    id: string,
    payload: {
      status: "pending" | "confirmed" | "cancelled" | "completed";
      cancellationReason?: string;
    }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/bookings/admin/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  async reassign(
    bookingId: string,
    payload?: { staffId?: string; reason?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return adminStaffApi.reassign(bookingId, payload);
  },

  async getEligibleStaff(params: {
    date: string;
    startTime?: string;
    duration?: number;
    serviceIds?: string;
  }) {
    return adminStaffApi.getEligibleStaff(params);
  },

  async getAssignments(params?: {
    status?: string;
    flagged?: boolean;
    date?: string;
  }): Promise<{ success: boolean; count: number; bookings: Booking[] }> {
    return adminStaffApi.getAssignments(params);
  },

  async reviewCancellation(
    id: string,
    payload: { action: "approve" | "reject"; adminNote?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/bookings/admin/${encodeURIComponent(id)}/review-cancellation`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async reviewReschedule(
    id: string,
    payload: { action: "approve" | "reject"; adminNote?: string; staffId?: string }
  ): Promise<{ success: boolean; message: string; booking: Booking }> {
    return request<{ success: boolean; message: string; booking: Booking }>(
      `/bookings/admin/${encodeURIComponent(id)}/review-reschedule`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async validateRescheduleSlot(
    id: string,
    payload: { requestedDate: string; requestedTime: string }
  ): Promise<{
    success: boolean;
    isAvailable: boolean;
    candidateCount?: number;
    message?: string;
  }> {
    return request<{
      success: boolean;
      isAvailable: boolean;
      candidateCount?: number;
      message?: string;
    }>(`/bookings/admin/${encodeURIComponent(id)}/validate-reschedule-slot`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getNotifications(params?: {
    bookingId?: string;
    status?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    total: number;
    logs: NotificationLogItem[];
  }> {
    const qs = new URLSearchParams();
    if (params?.bookingId) qs.set("bookingId", params.bookingId);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{
      success: boolean;
      total: number;
      logs: NotificationLogItem[];
    }>(`/bookings/admin/notifications?${qs.toString()}`);
  },

  async retryNotifications(bookingId?: string): Promise<{
    success: boolean;
    retriedCount: number;
    message: string;
  }> {
    return request<{
      success: boolean;
      retriedCount: number;
      message: string;
    }>("/bookings/admin/notifications/retry", {
      method: "POST",
      body: JSON.stringify({ bookingId }),
    });
  },
};

export interface CustomerAddress {
  _id?: string;
  label?: string;
  fullName: string;
  email?: string;
  phone: string;
  addressType?: "apartment" | "villa" | "office";
  unitNumber: string;
  buildingName: string;
  area: string;
  city: string;
  state?: string;
  street?: string;
  landmark?: string;
  poBox?: string;
  postalCode?: string;
  coordinates?: {
    lat: number | null;
    lng: number | null;
  };
  accessInstructions?: string;
  formatted?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isBlocked: boolean;
  isAccountVerified?: boolean;
  addresses?: CustomerAddress[];
  createdAt?: string;
  totalBookings?: number;
  totalOrders?: number;
}

export interface ProductOrder {
  _id: string;
  orderId?: string;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  guestToken?: string;
  products: Array<{
    productId?: any;
    variantId?: any;
    quantity: number;
    price?: number;
    size?: string;
    color?: string;
  }>;
  totalAmount: number;
  paymentMethod: "COD" | "STRIPE" | "RAZORPAY" | string;
  paymentStatus: "Pending" | "Authorized" | "Paid" | "Failed" | "Refunded" | "Cancelled" | string;
  status: "Pending" | "Pending_Confirmation" | "Shipped" | "Delivered" | "Cancelled" | string;
  cod?: {
    confirmed: boolean;
    confirmedAt?: string;
  };
  pricing?: {
    subtotal?: number;
    shippingFee?: number;
    taxAmount?: number;
    taxRate?: number;
    grandTotal?: number;
    deliveryEta?: string;
  };
  address?: CustomerAddress;
  tracking?: {
    carrier?: string;
    trackingNumber?: string;
    eta?: string;
  };
  statusHistory?: Array<{
    status: string;
    note?: string;
    at: string;
  }>;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export const adminCustomerApi = {
  async getAll(): Promise<{
    success: boolean;
    users: Customer[];
  }> {
    return request<{
      success: boolean;
      users: Customer[];
    }>("/user/users");
  },

  async getById(id: string): Promise<{
    success: boolean;
    user: Customer;
  }> {
    return request<{
      success: boolean;
      user: Customer;
    }>(`/user/users/${encodeURIComponent(id)}`);
  },

  async toggleBlockStatus(
    userId: string,
    block: boolean
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return request<{
      success: boolean;
      message: string;
    }>("/user/block", {
      method: "POST",
      body: JSON.stringify({ userId, block }),
    });
  },

  async initiatePasswordReset(
    email: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return request<{
      success: boolean;
      message: string;
    }>("/auth/send-reset-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

export const adminOrderApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    q?: string;
  }): Promise<{
    page: number;
    limit: number;
    total: number;
    orders: ProductOrder[];
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
    if (params?.q) qs.set("q", params.q);
    return request<{
      page: number;
      limit: number;
      total: number;
      orders: ProductOrder[];
    }>(`/admin/orders?${qs.toString()}`);
  },

  async getById(id: string): Promise<ProductOrder> {
    return request<ProductOrder>(`/admin/orders/${encodeURIComponent(id)}`);
  },

  async updateStatus(
    orderId: string,
    status: string,
    note?: string
  ): Promise<{ message: string; order: ProductOrder }> {
    return request<{ message: string; order: ProductOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }
    );
  },

  async updateTracking(
    orderId: string,
    trackingData: { carrier?: string; trackingNumber?: string; eta?: string }
  ): Promise<{ message: string; order: ProductOrder }> {
    return request<{ message: string; order: ProductOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/tracking`,
      {
        method: "PATCH",
        body: JSON.stringify(trackingData),
      }
    );
  },

  async updatePayment(
    orderId: string,
    paymentStatus: string
  ): Promise<{ message: string; order: ProductOrder }> {
    return request<{ message: string; order: ProductOrder }>(
      `/admin/orders/${encodeURIComponent(orderId)}/payment`,
      {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus }),
      }
    );
  },
};

export interface PlaceOrderPayload {
  products: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price?: number;
    size?: string;
    color?: string;
  }>;
  address: any;
  paymentMethod: "COD" | "STRIPE" | "RAZORPAY" | string;
  codConfirmed?: boolean;
  paymentIntentId?: string;
  paymentData?: any;
}

export const orderApi = {
  async placeOrder(payload: PlaceOrderPayload): Promise<ProductOrder> {
    return request<ProductOrder>("/order/place", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getUserOrders(): Promise<ProductOrder[]> {
    return request<ProductOrder[]>("/order");
  },

  async getOrderById(orderId: string, guestToken?: string): Promise<ProductOrder> {
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers["X-Guest-Token"] = guestToken;
    }
    return request<ProductOrder>(`/order/${encodeURIComponent(orderId)}`, {
      headers,
    });
  },

  async cancelOrder(orderId: string): Promise<{ message: string; order: ProductOrder }> {
    return request<{ message: string; order: ProductOrder }>(
      `/order/cancel/${encodeURIComponent(orderId)}`,
      {
        method: "PUT",
      }
    );
  },
};

export const customerAddressApi = {
  async getAddresses(): Promise<{ success: boolean; addresses: CustomerAddress[] }> {
    return request<{ success: boolean; addresses: CustomerAddress[] }>("/user/addresses", {
      method: "GET",
    });
  },

  async addAddress(address: Partial<CustomerAddress>): Promise<{ success: boolean; addresses: CustomerAddress[] }> {
    return request<{ success: boolean; addresses: CustomerAddress[] }>("/user/address", {
      method: "POST",
      body: JSON.stringify(address),
    });
  },

  async updateAddress(
    addressId: string,
    address: Partial<CustomerAddress>
  ): Promise<{ success: boolean; addresses: CustomerAddress[] }> {
    return request<{ success: boolean; addresses: CustomerAddress[] }>(
      `/user/address/${encodeURIComponent(addressId)}`,
      {
        method: "PUT",
        body: JSON.stringify(address),
      }
    );
  },

  async deleteAddress(addressId: string): Promise<{ success: boolean; addresses: CustomerAddress[] }> {
    return request<{ success: boolean; addresses: CustomerAddress[] }>(
      `/user/delete/${encodeURIComponent(addressId)}`,
      {
        method: "DELETE",
      }
    );
  },

  async setDefault(addressId: string): Promise<{ success: boolean; addresses: CustomerAddress[] }> {
    return request<{ success: boolean; addresses: CustomerAddress[] }>(
      `/user/address/default/${encodeURIComponent(addressId)}`,
      {
        method: "PUT",
      }
    );
  },
};

export const settingsApi = {
  async getPublic(): Promise<{
    shipping: {
      freeOver: number;
      methods: Array<{
        code: string;
        label: string;
        amount: number;
        etaDaysMin: number;
        etaDaysMax: number;
        active: boolean;
      }>;
      defaultMethodCode: string;
    };
    tax: {
      rate: number;
      displayMode: string;
    };
  }> {
    return request("/settings/public");
  },
};

export interface InventorySummary {
  totalProducts: number;
  totalVariants: number;
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  lowStockThreshold: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  waitlistSubscribersCount: number;
}

export interface InventoryMovementItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images?: string[];
    defaultPrice?: number;
    sku?: string;
  };
  variant?: {
    _id: string;
    sku?: string;
    price?: number;
  };
  type: "inbound_receive" | "manual_adjustment" | "order_sale" | "order_cancel" | "damaged_loss";
  previousStock: number;
  change: number;
  newStock: number;
  reason?: string;
  referenceId?: string;
  performedBy?: {
    name?: string;
    email?: string;
    role?: string;
  };
  createdAt: string;
}

export interface InventoryProductItem {
  _id: string;
  name: string;
  slug: string;
  images?: string[];
  sku?: string;
  defaultPrice?: number;
  price?: number;
  stock: number;
  defaultStock?: number;
  hasVariants: boolean;
  variants?: Array<{
    _id: string;
    sku: string;
    stock: number;
    price: number;
    optionValues?: Record<string, string>;
  }>;
  category?: {
    _id: string;
    name: string;
  };
  brand?: {
    _id: string;
    name: string;
  };
  stockStatus: "in_stock" | "low_stock" | "out_stock";
  waitlistCount: number;
  isActive?: boolean;
}

export interface BackInStockWaitlistItem {
  _id: string;
  email: string;
  product?: {
    _id: string;
    name: string;
    images?: string[];
    slug?: string;
    defaultStock?: number;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  active: boolean;
  lastNotifiedAt?: string;
  createdAt: string;
}

export const adminInventoryApi = {
  async getSummary(): Promise<{
    success: boolean;
    summary: InventorySummary;
    recentMovements: InventoryMovementItem[];
  }> {
    return request("/admin/inventory/summary");
  },

  async getProducts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    q?: string;
    sort?: string;
  }): Promise<{
    success: boolean;
    items: InventoryProductItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    if (params?.sort) qs.set("sort", params.sort);
    return request(`/admin/inventory/products?${qs.toString()}`);
  },

  async adjustStock(payload: {
    productId: string;
    variantId?: string;
    mode: "add" | "subtract" | "set";
    quantity: number;
    type?: string;
    reason?: string;
    referenceId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    previousStock: number;
    newStock: number;
  }> {
    return request("/admin/inventory/adjust", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async receiveBatch(payload: {
    batchNumber?: string;
    supplier?: string;
    note?: string;
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
  }): Promise<{
    success: boolean;
    message: string;
    results: any[];
  }> {
    return request("/admin/inventory/receive-batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMovements(params?: {
    page?: number;
    limit?: number;
    type?: string;
    productId?: string;
  }): Promise<{
    success: boolean;
    movements: InventoryMovementItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.type) qs.set("type", params.type);
    if (params?.productId) qs.set("productId", params.productId);
    return request(`/admin/inventory/movements?${qs.toString()}`);
  },

  async getWaitlist(params?: {
    page?: number;
    limit?: number;
    productId?: string;
    active?: boolean;
  }): Promise<{
    success: boolean;
    subscribers: BackInStockWaitlistItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.productId) qs.set("productId", params.productId);
    if (typeof params?.active !== "undefined") qs.set("active", String(params.active));
    return request(`/admin/inventory/waitlist?${qs.toString()}`);
  },

  async notifyWaitlist(productId: string): Promise<{
    success: boolean;
    message: string;
    result: any;
  }> {
    return request(`/admin/inventory/waitlist/notify/${encodeURIComponent(productId)}`, {
      method: "POST",
    });
  },
};

export interface UserProfileData {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isAccountVerified?: boolean;
}

export const userProfileApi = {
  async getProfile(): Promise<{ success: boolean; user: UserProfileData }> {
    return request<{ success: boolean; user: UserProfileData }>("/user/profile");
  },

  async updateProfile(payload: {
    name?: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string; user: UserProfileData }> {
    return request<{ success: boolean; message: string; user: UserProfileData }>("/user/update-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async sendVerifyOtp(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/send-otp", {
      method: "POST",
    });
  },

  async verifyOtp(otp: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
  },
};









