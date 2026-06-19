# 文档 AI · React Native (Expo)

Expo SDK 52 + expo-router，对接现有 `apps/backend` API。

## 功能（MVP）

- 登录 / 退出（SecureStore 存 access + refresh token）
- 对话：会话列表、新建、SSE 流式聊天
- 知识库：列表、创建、文档浏览（上传请在 Web 端完成）

## 环境

在 `apps/mobile` 下创建 `.env`（可参考 `.env.example`）：

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3001
```

- **iOS 模拟器**：可用 `http://localhost:3001`
- **Android 模拟器**：常用 `http://10.0.2.2:3001`
- **真机**：填电脑局域网 IP 或 ECS 公网地址（需后端 CORS 允许）

## 启动

```bash
# 仓库根目录
pnpm install
pnpm dev:backend   # 另开终端

# 移动端
pnpm dev:mobile
# 或
pnpm -C apps/mobile android
pnpm -C apps/mobile ios
```

## 鉴权说明

Web 端 refresh token 走 httpOnly Cookie；RN 无法可靠读取 `Set-Cookie`。  
移动端请求带 `X-D2C-Client: mobile`，后端在 JSON 中额外返回 `refreshToken`，存入 SecureStore，刷新时通过 `Cookie` 头提交。

## 目录

```
apps/mobile/
  app/           # expo-router 路由
  src/api/       # fetch + SSE
  src/auth/      # AuthContext
  src/storage/   # SecureStore
```
