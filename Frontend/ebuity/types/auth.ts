export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: 'user' | 'admin';
  isAccountVerified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  userData?: User;
}

export interface UserDataResponse {
  success: boolean;
  isAuthenticated: boolean;
  userData: User | null;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface CategoryItem {
  _id: string;
  label: string;
  name?: string;
  description?: string;
  image?: string | null;
  children?: CategoryItem[];
}
