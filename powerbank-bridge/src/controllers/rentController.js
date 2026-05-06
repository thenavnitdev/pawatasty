const manufacturerApi = require('../services/manufacturerApi');
const supabaseService = require('../services/supabaseService');

/**
 * POST /api/rent/start
 *
 * Body: { userId, deviceUuid, battery? }
 *
 * Flow:
 * 1. Call manufacturer StartRent — command sent to device
 * 2. Create a 'pending' order in Supabase
 * 3. RabbitMQ event 1003 will activate the order once the power bank is ejected
 *
 * IMPORTANT: The device ignores commands received more than 20 seconds after
 * the manufacturer server sends them, so we must respond quickly.
 */
async function startRent(req, res) {
  const { userId, deviceUuid, battery = 70 } = req.body;

  if (!userId || !deviceUuid) {
    return res.status(400).json({ success: false, error: 'userId and deviceUuid are required' });
  }

  try {
    const manufacturerResult = await manufacturerApi.startRent({ deviceUuid, battery });

    const order = await supabaseService.createPendingOrder({ userId, deviceUuid });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        manufacturer: manufacturerResult,
      },
    });
  } catch (err) {
    console.error('[rentController] startRent error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/rent/return
 *
 * Body: { orderNo }
 *
 * Manually closes a rental order on the manufacturer server.
 * Physical returns are handled automatically via RabbitMQ event 1004.
 * Use this endpoint only for admin/manual overrides.
 */
async function returnRent(req, res) {
  const { orderNo } = req.body;

  if (!orderNo) {
    return res.status(400).json({ success: false, error: 'orderNo is required' });
  }

  try {
    const manufacturerResult = await manufacturerApi.returnRent({ orderNo });

    await supabaseService.logEvent({
      action: 'manual_return',
      deviceUuid: null,
      powerNo: null,
      raw: { orderNo, manufacturerResult },
    });

    return res.json({
      success: true,
      data: { orderNo, manufacturer: manufacturerResult },
    });
  } catch (err) {
    console.error('[rentController] returnRent error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { startRent, returnRent };
