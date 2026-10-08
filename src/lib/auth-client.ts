// عميل Better Auth (يتكلم مع /api/auth/* في السيرفر): تسجيل، دخول، خروج، الجلسة
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ baseURL: window.location.origin });
