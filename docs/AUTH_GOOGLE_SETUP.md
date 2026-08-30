# Google OAuth Setup

ChapMee dùng Better Auth cho đăng nhập Google trên web/PWA.

## Environment variables

Điền các biến sau:

```env
APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Có thể dùng `AUTH_SECRET` thay cho `BETTER_AUTH_SECRET` nếu hạ tầng của bạn chuẩn hóa tên đó.

## Google Cloud Console

1. Vào `APIs & Services` -> `Credentials`.
2. Tạo `OAuth client ID`.
3. Chọn `Web application`.
4. Thêm Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_DOMAIN/api/auth/callback/google`

## Behavior

- Google sign-in chỉ dùng các scope: `openid`, `email`, `profile`.
- Nếu email Google đã verified và trùng với user có sẵn, ChapMee sẽ link vào user đó thay vì tạo user mới.
- User mới sẽ được tạo profile và username theo chính sách username hiện tại của ChapMee.
- Redirect sau login chỉ chấp nhận path nội bộ hoặc origin thuộc app, không redirect ra domain ngoài.
