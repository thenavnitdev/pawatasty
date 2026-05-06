const axios = require('axios');

function client() {
  return axios.create({
    baseURL: process.env.MANUFACTURER_API_URL || 'http://localhost:6888',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Eject a power bank from the station.
 * battery: minimum charge level required (0–100).
 * NOTE: Device ignores commands received more than 20 seconds after sending.
 */
async function startRent({ deviceUuid, battery = 70 }) {
  const { data } = await client().post('/device/startRent', { deviceUuid, battery });
  return data;
}

/**
 * Manually close a rental order on the manufacturer server.
 */
async function returnRent({ orderNo }) {
  const { data } = await client().post('/rent/return', { orderNo });
  return data;
}

/**
 * Open a specific cabinet slot (test only — no device/position validation).
 */
async function openWarehouse({ deviceUuid, machineId, positionId }) {
  const { data } = await client().post('/device/openWarehouse', {
    deviceUuid,
    machineId,
    positionId,
  });
  return data;
}

/**
 * Fetch full device info and cabinet slot status by IMEI.
 */
async function getDeviceInfo({ deviceUuid }) {
  const { data } = await client().post('/device/getDeviceInfoByUuid', { deviceUuid });
  return data;
}

/**
 * Register (or update) a cabinet device using its IMEI and QR code.
 */
async function addDevice({ deviceUuid, deviceNo, instanceId = null }) {
  const { data } = await client().post('/machine/save', {
    deviceUuid,
    deviceNo,
    instanceId,
  });
  return data;
}

module.exports = { startRent, returnRent, openWarehouse, getDeviceInfo, addDevice };
