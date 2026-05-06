# Device & Machine API Guide

This guide covers the Device and Machine APIs used for power-bank kiosks: opening positions (test), starting a rent by battery level, fetching device info, and saving machine registration.

---

## Base URL & Auth

- **Base URL**: Same as main app API (`VITE_API_BASE_URL` or `https://api.pawatasty.com` in production; empty in dev if using Vite proxy).
- **Auth**: Uses the same `apiClient` (API Key/Secret or Bearer token) as other mobile APIs. Ensure `apiClient.setAuthToken(...)` is set when calling on behalf of a user if required by the backend.

---

## API Reference

### 1. POST `/device/openWarehouse`

**Purpose**: Test-only. Opens a specific position. Does **not** check device status or whether the position has a power bank.

**Important**: A successful response only means the **command was sent**. Whether the power bank actually pops out must be determined from **callbacks**, not this response.

| Param        | Type   | Required | Description      |
|-------------|--------|----------|------------------|
| deviceUuid  | string | Yes      | Device IMEI      |
| machineId   | string | Yes      | Machine id       |
| positionId  | string | Yes      | Position id      |

**Example request body**:
```json
{
  "deviceUuid": "962506044737396",
  "machineId": "01",
  "positionId": "1"
}
```

**Usage in code**:
```ts
import { deviceAPI } from '../services/mobile';

const result = await deviceAPI.openWarehouse({
  deviceUuid: '962506044737396',
  machineId: '01',
  positionId: '1',
});
// result = success payload; actual pop-up status comes from callback
```

---

### 2. POST `/device/startRent`

**Purpose**: Starts a rent. The backend checks device status and pops a power bank that meets the requested battery level.

**Important**: Success only means the **command was sent**. Whether a power bank was actually popped must be determined from **callbacks**.

| Param       | Type    | Required | Description   |
|------------|---------|----------|---------------|
| deviceUuid | string  | Yes      | Device IMEI   |
| battery    | integer | Yes      | 0–100         |

**Example request body**:
```json
{
  "deviceUuid": "962506044737396",
  "battery": 70
}
```

**Usage in code**:
```ts
import { deviceAPI } from '../services/mobile';

const result = await deviceAPI.startRent({
  deviceUuid: '962506044737396',
  battery: 70,
});
// result = success payload; pop-up status from callback
```

---

### 3. POST `/device/getDeviceInfoByUuid`

**Purpose**: Get device information by IMEI (deviceUuid).

| Param       | Type   | Required | Description |
|------------|--------|----------|-------------|
| deviceUuid | string | Yes      | Device IMEI  |

**Example request body**:
```json
{
  "deviceUuid": "962506044737396"
}
```

**Usage in code**:
```ts
import { deviceAPI } from '../services/mobile';

const deviceInfo = await deviceAPI.getDeviceInfoByUuid({
  deviceUuid: '962506044737396',
});
```

---

### 4. POST `/machine/save`

**Purpose**: Register or update a machine (device + QR code + IoT instance).

| Param       | Type           | Required | Description     |
|------------|----------------|----------|-----------------|
| deviceUuid | string         | Yes      | Device IMEI     |
| deviceNo   | string         | Yes      | QRCode          |
| instanceId | string \| null | Yes      | IoT instance id |

**Example request body**:
```json
{
  "deviceUuid": "123456789",
  "deviceNo": "DEV1234",
  "instanceId": ""
}
```

**Usage in code**:
```ts
import { deviceAPI } from '../services/mobile';

await deviceAPI.machineSave({
  deviceUuid: '123456789',
  deviceNo: 'DEV1234',
  instanceId: '',
});
```

---

## Callbacks (pop-up status)

For **openWarehouse** and **startRent**:

- **API success** = instruction sent to the device.
- **Actual pop-up result** (success/failure, which slot, etc.) is delivered via your **callback** mechanism (e.g. webhooks or real-time events). Integrate with that system to show the real status to the user and update UI/orders accordingly.

---

## Implementation checklist

- [x] `deviceAPI` in `src/services/mobile/device.ts` with all four endpoints
- [x] Exported from `src/services/mobile/index.ts`
- [ ] Wire UI to call `deviceAPI.openWarehouse` / `deviceAPI.startRent` where needed (e.g. station detail or rent flow)
- [ ] Integrate with your callback/webhook handler to reflect real pop-up status
- [ ] Add error handling and loading states in the UI
- [ ] (Optional) Add TypeScript types for response payloads when backend contracts are fixed

---

## Estimated timeline to get running

| Task                                      | Estimate   |
|-------------------------------------------|------------|
| API service (done)                        | Done       |
| Connect UI to openWarehouse/startRent    | 2–4 hours  |
| Callback integration (if not yet in app)  | 4–8 hours  |
| Device info + machine save in settings   | 1–2 hours  |
| Testing & error handling                 | 2–4 hours  |

**Rough total**: **1–2 days** for a minimal flow (send commands from UI + basic callback handling). More if you need full rental flow, payments, and edge cases.

---

## Quick reference

| Action              | Method | Endpoint                     | Service method                |
|---------------------|--------|------------------------------|-------------------------------|
| Open position (test)| POST   | `/device/openWarehouse`       | `deviceAPI.openWarehouse()`   |
| Start rent          | POST   | `/device/startRent`          | `deviceAPI.startRent()`       |
| Get device info     | POST   | `/device/getDeviceInfoByUuid`| `deviceAPI.getDeviceInfoByUuid()` |
| Save machine        | POST   | `/machine/save`              | `deviceAPI.machineSave()`     |

All request bodies are `application/json`. Use the same base URL and auth as the rest of the app.
