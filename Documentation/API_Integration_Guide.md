# API 与集成指南 (多租户版)

## 1. 引言
随着 POS 系统升级为多租户架构，API 的调用方式发生了关键变化。所有客户端（Web 前端、移动端 App、第三方集成系统）必须在请求中明确指定租户上下文，否则将收到 `401 Unauthorized` 或 `400 Bad Request` 错误。

---

## 2. 租户上下文传递

系统支持三种方式传递租户上下文，按优先级排序：

### 2.1 方式一：JWT Token (推荐)
对于**已登录用户**的请求，无需额外操作。
*   **机制**: 用户登录成功后，服务器签发的 JWT Access Token 中已包含 `TenantId` Claim。
*   **后端行为**: 自动从 Token 解析租户，并应用数据隔离。

### 2.2 方式二：HTTP Header
对于**登录接口** (`/api/authentication`) 或**公开接口** (如租户配置查询)。
*   **Header Name**: `X-Tenant-ID`
*   **Value**: Tenant GUID (e.g., `11111111-1111-1111-1111-111111111111`)
*   **适用场景**: 
    *   用户输入账号密码登录时，前端需知道用户属于哪个租户（通常通过域名或用户手动选择）。
    *   第三方系统同步数据时。

### 2.3 方式三：子域名 (Subdomain)
如果启用了域名绑定功能。
*   **URL**: `https://tenant-a.pos-system.com/api/...`
*   **后端行为**: 中间件会自动解析 `tenant-a` 并查找对应的 `TenantId`。

---

## 3. 认证流程变更

### 3.1 登录 (POST /api/authentication)
**旧版**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**新版**:
必须在 Header 中指定租户，或者在 Payload 中包含（取决于具体实现，推荐 Header 以保持 Payload 简洁）。

**Request:**
```http
POST /api/authentication HTTP/1.1
Host: api.pos.com
X-Tenant-ID: <Tenant-GUID>
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response (Token Payload 示例):**
```json
{
  "sub": "user-guid",
  "email": "admin@tenant-a.com",
  "TenantId": "<Tenant-GUID>",
  "roles": ["Admin"]
}
```

---

## 4. 对第三方集成的建议

### 4.1 现有集成迁移
如果您是现有的 ERP 或电商平台集成商：
1.  请联系管理员获取您的 `Tenant ID`。
2.  更新您的 API Client 代码，在所有 HTTP 请求头中添加 `X-Tenant-ID`。
3.  如果您的集成账号是跨租户的（超级管理员），请注意 API 可能会限制您只能访问 Header 中指定的租户数据。

### 4.2 Webhook 变更
系统发出的 Webhook 通知现在会包含租户信息：
```json
{
  "event": "order.created",
  "tenantId": "...",
  "data": { ... }
}
```
接收方应根据 `tenantId` 区分处理。

---

## 5. 错误代码参考

| HTTP Code | Error Message | 原因 | 解决方案 |
| :--- | :--- | :--- | :--- |
| 400 | Tenant context is missing | 请求未包含 `X-Tenant-ID` 且用户未登录 | 在 Header 中添加租户 ID |
| 404 | Tenant not found | 提供的 Tenant ID 不存在或已禁用 | 检查 ID 是否正确 |
| 401 | Invalid tenant for user | 用户存在，但不属于该 Header 指定的租户 | 检查用户名与租户是否匹配 |

