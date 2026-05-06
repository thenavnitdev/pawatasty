import { apiClient } from './client';

// --- Request types ---

export interface OpenWarehouseRequest {
  deviceUuid: string;
  machineId: string;
  positionId: string;
}

export interface StartRentRequest {
  deviceUuid: string;
  battery: number; // 0–100
}

export interface GetDeviceInfoByUuidRequest {
  deviceUuid: string;
}

export interface MachineSaveRequest {
  deviceUuid: string;
  deviceNo: string; // QRCode
  instanceId: string | null; // iot instance id
}

// --- Response types (adjust when backend contract is known) ---

export type OpenWarehouseResponse = unknown;
export type StartRentResponse = unknown;
export type GetDeviceInfoByUuidResponse = unknown;
export type MachineSaveResponse = unknown;

/**
 * Device & Machine API
 *
 * - openWarehouse: Test only. Does not check device/position state. Success = command sent; actual pop-up via callback.
 * - startRent: Checks device state, pops a power bank meeting the battery level. Success = command sent; pop-up via callback.
 * - getDeviceInfoByUuid: Fetch device info by IMEI.
 * - machineSave: Register/update machine (device + QR + IoT instance).
 */
export const deviceAPI = {
  /**
   * Open position (test). No device/position validation. Success = instruction sent; pop-up status from callback.
   */
  openWarehouse: (data: OpenWarehouseRequest) =>
    apiClient.post<OpenWarehouseResponse>('/device/openWarehouse', data),

  /**
   * Start rent. Validates device and pops a power bank with at least the given battery %. Success = instruction sent; pop-up status from callback.
   */
  startRent: (data: StartRentRequest) =>
    apiClient.post<StartRentResponse>('/device/startRent', data),

  /**
   * Get device info by IMEI (deviceUuid).
   */
  getDeviceInfoByUuid: (data: GetDeviceInfoByUuidRequest) =>
    apiClient.post<GetDeviceInfoByUuidResponse>('/device/getDeviceInfoByUuid', data),

  /**
   * Save/register machine (deviceUuid, deviceNo/QRCode, instanceId).
   */
  machineSave: (data: MachineSaveRequest) =>
    apiClient.post<MachineSaveResponse>('/machine/save', data),
};
