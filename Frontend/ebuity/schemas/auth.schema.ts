export interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
  general?: string;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return "Email address is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string, minLength = 6): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long.`;
  }
  return null;
}

export function validateName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Full name is required.";
  }
  if (name.trim().length < 2) {
    return "Full name must be at least 2 characters.";
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function validateOtp(otp: string): string | null {
  if (!otp || !otp.trim()) {
    return "Verification code is required.";
  }
  if (!/^\d{6}$/.test(otp.trim())) {
    return "Verification code must be 6 digits.";
  }
  return null;
}
