# Auth API

Base path: `/auth`

All responses are JSON. Successful responses wrap their payload in `{ "data": ... }`. Error responses use `{ "error": "<CODE>", "message": "<human-readable>" }`.

---

## POST /auth/register

Create a new user account and receive tokens.

### Request body

| Field      | Type                      | Required | Notes                          |
|------------|---------------------------|----------|--------------------------------|
| `email`    | string                    | ✓        | Must be a valid email address  |
| `password` | string                    | ✓        | Minimum 8 characters           |
| `role`     | `"trainer"` \| `"trainee"` | ✓        |                                |

```json
{
  "email": "coach@example.com",
  "password": "MySecurePass1",
  "role": "trainer"
}
```

### Success — 201 Created

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "coach@example.com",
      "role": "trainer",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "<JWT>",
    "refreshToken": "<JWT>"
  }
}
```

### Error responses

| Status | `error`            | Cause                              |
|--------|--------------------|------------------------------------|
| 400    | `VALIDATION_ERROR` | Missing/invalid field              |
| 409    | `CONFLICT`         | Email already registered           |

---

## POST /auth/login

Authenticate with email and password.

### Request body

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | ✓        |
| `password` | string | ✓        |

```json
{
  "email": "coach@example.com",
  "password": "MySecurePass1"
}
```

### Success — 200 OK

Same shape as `/auth/register` 201 response (user + accessToken + refreshToken).

### Error responses

| Status | `error`            | Cause                                       |
|--------|--------------------|---------------------------------------------|
| 400    | `VALIDATION_ERROR` | Missing/invalid field                       |
| 401    | `UNAUTHORIZED`     | Email not found or password is incorrect    |

> **Security note:** both "email not found" and "wrong password" return the same 401 body (`"Invalid credentials"`) to prevent user enumeration.

---

## POST /auth/refresh

Exchange a valid refresh token for a new access + refresh token pair. The old refresh token is revoked (rotation).

### Request body

| Field          | Type   | Required |
|----------------|--------|----------|
| `refreshToken` | string | ✓        |

```json
{
  "refreshToken": "<JWT>"
}
```

### Success — 200 OK

```json
{
  "data": {
    "accessToken": "<new JWT>",
    "refreshToken": "<new JWT>"
  }
}
```

### Error responses

| Status | `error`            | Cause                                             |
|--------|--------------------|---------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `refreshToken` field missing                      |
| 401    | `UNAUTHORIZED`     | Token expired, tampered, revoked, or user deleted |

> **Token rotation:** each successful refresh invalidates the old refresh token and issues a fresh pair. Reusing an already-rotated token is rejected.

---

## POST /auth/logout

Revoke a refresh token so it can no longer be used to obtain new access tokens.

### Request body

| Field          | Type   | Required |
|----------------|--------|----------|
| `refreshToken` | string | ✓        |

```json
{
  "refreshToken": "<JWT>"
}
```

### Success — 204 No Content

Empty body.

> **Idempotent:** sending an already-revoked or expired token still returns 204. The client should discard both tokens on logout regardless of the response.

### Error responses

| Status | `error`            | Cause                       |
|--------|--------------------|-----------------------------|
| 400    | `VALIDATION_ERROR` | `refreshToken` field missing |

---

## POST /auth/forgot-password

Request a password-reset link sent to an email address.

### Request body

| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | ✓        |

```json
{
  "email": "coach@example.com"
}
```

### Success — 200 OK

```json
{
  "data": {
    "message": "If that email is registered, a reset link has been sent"
  }
}
```

> **Security note:** the response is identical whether the email exists or not. This prevents attackers from discovering which emails are registered.

The reset link is delivered as a deep link:
```
boost://reset-password?token=<64-char hex token>
```

The token expires after **1 hour**.

### Error responses

| Status | `error`            | Cause                  |
|--------|--------------------|------------------------|
| 400    | `VALIDATION_ERROR` | Missing or invalid email |

---

## POST /auth/reset-password

Set a new password using the token from the reset email.

### Request body

| Field      | Type   | Required | Notes                |
|------------|--------|----------|----------------------|
| `token`    | string | ✓        | From the reset email |
| `password` | string | ✓        | Minimum 8 characters |

```json
{
  "token": "a1b2c3...",
  "password": "NewSecurePass1"
}
```

### Success — 200 OK

```json
{
  "data": {
    "message": "Password reset successfully"
  }
}
```

### Error responses

| Status | `error`            | Cause                                    |
|--------|--------------------|------------------------------------------|
| 400    | `VALIDATION_ERROR` | Missing field or password too short      |
| 400    | `INVALID_TOKEN`    | Token not found, expired, or already used |

> **Single-use:** a reset token is deleted immediately on first use. Replaying the same token returns 400.

---

## Protected routes — Authorization header

Endpoints outside `/auth` that require authentication expect an `Authorization` header:

```
Authorization: Bearer <accessToken>
```

**Access token TTL:** 15 minutes.  
**Refresh token TTL:** 30 days.

### 401 errors from protected routes

| `error`        | Meaning                                       |
|----------------|-----------------------------------------------|
| `UNAUTHORIZED` | Header missing, not `Bearer` prefixed         |
| `UNAUTHORIZED` | Token signature invalid or signed with wrong key |
| `UNAUTHORIZED` | Token expired — call `/auth/refresh` first    |

---

## Token lifecycle summary

```
Register / Login
      │
      ▼
 accessToken (15 min)  ←──┐
 refreshToken (30 days)    │  POST /auth/refresh (rotates both)
      │                    │
      ▼                 consumed + new pair issued
 Use accessToken on
 protected endpoints
      │
      ▼ (expired)
 POST /auth/refresh ──────┘

 POST /auth/logout → refreshToken revoked, both tokens discarded
```
