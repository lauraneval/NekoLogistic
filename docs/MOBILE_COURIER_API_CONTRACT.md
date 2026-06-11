# Courier Mobile API Contract

This document describes the backend contract used by the Flutter courier app for bag-based delivery.

Base URL: `https://nekologistic.lauraneval.dev`

---

## Authentication

All requests (except login) require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

The `access_token` is obtained from `POST /api/mobile/auth/login` and refreshed via `POST /api/mobile/auth/refresh`. **Do not use Supabase SDK for auth** — use these API endpoints instead.

---

## Auth Endpoints

### Login
`POST /api/mobile/auth/login`

Request:
```json
{ "email": "kurir@nekologistic.id", "password": "secret123" }
```

Response `200`:
```json
{
  "data": {
    "user": { "id": "uuid", "name": "Budi Kurir", "email": "kurir@example.com", "phone": "+62812xxx", "role": "kurir" },
    "access_token": "<jwt>",
    "refresh_token": "<token>",
    "expires_in": 3600
  }
}
```

Error `401`: `{ "message": "Invalid email or password" }`
Error `403`: `{ "message": "Access denied. This app is for courier accounts only." }`

---

### Logout
`POST /api/mobile/auth/logout`

Header: `Authorization: Bearer <access_token>`

Response `200`: `{ "message": "Logged out successfully" }`

---

### Refresh Token
`POST /api/mobile/auth/refresh`

Request:
```json
{ "refresh_token": "<token>" }
```

Response `200`:
```json
{
  "data": {
    "access_token": "<new_jwt>",
    "refresh_token": "<new_token>",
    "expires_in": 3600
  }
}
```

Error `401`: `{ "message": "Session expired. Please log in again." }`

---

## Profile

### Get Profile
`GET /api/mobile/profile`

Response `200`:
```json
{
  "data": {
    "id": "uuid", "name": "Budi Kurir", "email": "kurir@example.com", "phone": "+62812xxx",
    "role": "kurir", "created_at": "...", "efficiency_score": 95,
    "active_tasks": 2, "total_packages": 100, "delivered_packages": 90
  }
}
```

### Update Profile
`PATCH /api/mobile/profile`

Request (all fields optional):
```json
{ "name": "New Name", "phone": "+62812345", "email": "new@example.com" }
```

Response: `{ "ok": true, "message": "Profile updated" }`

---

## 1. Task List

`GET /api/courier/tasks?status=OUT_FOR_DELIVERY`

Returns bags assigned to the logged-in courier.

Response shape:

```json
{
  "data": [
    {
      "id": "uuid",
      "bag_code": "BAG-2026-1A2B",
      "destination_city": "Semarang",
      "package_count": 2,
      "status": "OUT_FOR_DELIVERY",
      "assigned_courier_id": "uuid",
      "receiver_name": "Receiver Name",
      "receiver_address": "Street, City",
      "latitude": -6.9,
      "longitude": 110.4,
      "packages": [
        {
          "id": "uuid",
          "resi": "NEKO-2026-ABCD",
          "receiver_name": "Receiver Name",
          "receiver_address": "Street, City",
          "status": "OUT_FOR_DELIVERY",
          "latitude": -6.9,
          "longitude": 110.4
        }
      ]
    }
  ]
}
```

## 2. Task Detail

`GET /api/courier/tasks/:id`

Returns one bag with its package list.

Use this endpoint for a detail page that shows:

- bag code
- destination city
- assigned courier id
- package list inside the bag
- coordinates for the representative package

## 3. Bag Timeline

`GET /api/courier/tasks/:id/timeline`

Returns the bag plus a timeline per package.

Response shape:

```json
{
  "data": {
    "bag": {
      "id": "uuid",
      "bag_code": "BAG-2026-1A2B",
      "destination_city": "Semarang",
      "status": "OUT_FOR_DELIVERY",
      "assigned_courier_id": "uuid"
    },
    "packages": [
      {
        "id": "uuid",
        "resi": "NEKO-2026-ABCD",
        "receiver_name": "Receiver Name",
        "receiver_address": "Street, City",
        "status": "OUT_FOR_DELIVERY",
        "latitude": -6.9,
        "longitude": 110.4,
        "timeline": [
          {
            "event_code": "IN_WAREHOUSE",
            "event_label": "Di bagging",
            "location": "Semarang",
            "description": "Masuk ke bagging BAG-2026-1A2B",
            "created_at": "2026-05-07T00:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

## 4. Deliver Update

`PUT /api/courier/tasks/:id/deliver`

Body:

```json
{
  "status": "DELIVERED",
  "pod_image_url": "https://...",
  "courier_latitude": -6.9,
  "courier_longitude": 110.4,
  "target_latitude": -6.9,
  "target_longitude": 110.4,
  "delivered_at": "2026-05-07T00:00:00.000Z"
}
```

Behavior:

- Updates the package to `DELIVERED`.
- Inserts a POD tracking history row.
- Marks the parent bag `DELIVERED` when all packages in the bag are delivered.

## 5. Important Integration Notes

- Courier task list is bag-based, not package-list-based.
- The Flutter UI should render one bag card with nested package rows.
- A bag can contain multiple package timelines, so detail pages should group by bag first.
- The backend rejects delivery for a bag assigned to a different courier.