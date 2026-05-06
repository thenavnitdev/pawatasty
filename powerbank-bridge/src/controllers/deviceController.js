const manufacturerApi = require('../services/manufacturerApi');
const supabaseService = require('../services/supabaseService');

/**
 * GET /api/device/:uuid
 *
 * Returns device info and cabinet slot status directly from the manufacturer server.
 */
async function getDevice(req, res) {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ success: false, error: 'Device UUID is required' });
  }

  try {
    const deviceInfo = await manufacturerApi.getDeviceInfo({ deviceUuid: uuid });

    return res.json({ success: true, data: deviceInfo });
  } catch (err) {
    console.error('[deviceController] getDevice error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/device/add
 *
 * Body: { deviceUuid, deviceNo, instanceId? }
 *
 * Registers a new cabinet device using its IMEI and QR code on the manufacturer
 * server, then creates a corresponding record in the Supabase devices table.
 */
async function addDevice(req, res) {
  const { deviceUuid, deviceNo, instanceId = null } = req.body;

  if (!deviceUuid || !deviceNo) {
    return res.status(400).json({ success: false, error: 'deviceUuid and deviceNo are required' });
  }

  try {
    const manufacturerResult = await manufacturerApi.addDevice({ deviceUuid, deviceNo, instanceId });

    const device = await supabaseService.insertDevice({ uuid: deviceUuid });

    return res.json({
      success: true,
      data: { device, manufacturer: manufacturerResult },
    });
  } catch (err) {
    console.error('[deviceController] addDevice error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getDevice, addDevice };
