import { Role, Language } from '../constants/roles';
export interface User {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: Role;
    shopId: string | null;
    language: Language;
    createdAt: string;
    updatedAt: string;
}
export interface UserDevice {
    id: string;
    userId: string;
    token: string;
    deviceId: string;
    updatedAt: string;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
}
export interface RegisterInput {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: Role.CUSTOMER | Role.SHOP_OWNER;
}
export interface LoginInput {
    email: string;
    password: string;
}
