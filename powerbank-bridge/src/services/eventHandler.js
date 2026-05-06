const supabaseService = require('./supabaseService');

/**
 * Route an inbound RabbitMQ message to the correct handler based on action code.
 *
 * action 1001 — device online / offline
 * action 1002 — full cabinet status report
 * action 1003 — power bank popped out (rent confirmed)
 * action 1004 — power bank returned
 */
async function handleEvent(event) {
  console.log('[eventHandler] Received event:', JSON.stringify(event));

  const { action, deviceUuid } = event;

  await supabaseService.logEvent({
    action,
    deviceUuid: deviceUuid || event.machineUuid || null,
    powerNo: event.powerNo || null,
    raw: event,
  });

  switch (String(action)) {
    case '1001':
      await handleDeviceStatus(event);
      break;
    case '1002':
      await handleCabinetStatus(event);
      break;
    case '1003':
      await handlePowerBankOut(event);
      break;
    case '1004':
      await handlePowerBankReturn(event);
      break;
    default:
      console.log(`[eventHandler] Unhandled action: ${action}`);
  }
}

async function handleDeviceStatus(event) {
  // state 0 = online, 1 = offline
  const online = String(event.state) === '0';
  await supabaseService.upsertDevice({
    uuid: event.deviceUuid,
    online,
    cabinetStatus: null,
  });
  console.log(`[eventHandler] Device ${event.deviceUuid} is now ${online ? 'ONLINE' : 'OFFLINE'}`);
}

async function handleCabinetStatus(event) {
  await supabaseService.upsertDevice({
    uuid: event.deviceUuid,
    online: true,
    cabinetStatus: event,
  });
  console.log(`[eventHandler] Cabinet status updated for device ${event.deviceUuid}`);
}

async function handlePowerBankOut(event) {
  // Power bank ejected — find the pending order for this device and activate it
  const order = await supabaseService.getOrderByDevice(event.deviceUuid);
  if (!order) {
    console.warn(`[eventHandler] 1003: No pending order found for device ${event.deviceUuid}`);
    return;
  }
  await supabaseService.activateOrder(order.id, event.powerNo);
  console.log(`[eventHandler] Order ${order.id} activated — powerNo: ${event.powerNo}`);
}

async function handlePowerBankReturn(event) {
  // Power bank returned — close the active order that matches this power bank
  const order = await supabaseService.getOrderByPowerNo(event.powerNo);
  if (!order) {
    console.warn(`[eventHandler] 1004: No active order found for powerNo ${event.powerNo}`);
    return;
  }
  await supabaseService.closeOrder(order.id, {
    batteryOnReturn: event.powerAd || null,
  });
  console.log(`[eventHandler] Order ${order.id} closed — powerNo: ${event.powerNo}, battery: ${event.powerAd}%`);
}

module.exports = { handleEvent };
