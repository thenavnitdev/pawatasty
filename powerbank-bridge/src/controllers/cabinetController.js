const manufacturerApi = require('../services/manufacturerApi');
const supabaseService = require('../services/supabaseService');

/**
 * POST /api/cabinet/open
 *
 * Body: { deviceUuid, machineId, positionId }
 *
 * Opens a specific cabinet slot for testing — no device/position validation is
 * performed by the manufacturer server. Actual pop-up status is delivered via
 * RabbitMQ callback. This action is logged to device_events for auditing.
 */
async function openSlot(req, res) {
  const { deviceUuid, machineId, positionId } = req.body;

  if (!deviceUuid || !machineId || !positionId) {
    return res.status(400).json({
      success: false,
      error: 'deviceUuid, machineId and positionId are required',
    });
  }

  try {
    const manufacturerResult = await manufacturerApi.openWarehouse({
      deviceUuid,
      machineId,
      positionId,
    });

    await supabaseService.logEvent({
      action: 'open_warehouse',
      deviceUuid,
      powerNo: null,
      raw: { machineId, positionId, manufacturerResult },
    });

    return res.json({
      success: true,
      data: { manufacturer: manufacturerResult },
    });
  } catch (err) {
    console.error('[cabinetController] openSlot error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { openSlot };
