const supabase = require('../config/supabase');

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * Create a new rent order in 'pending' status immediately after calling
 * the manufacturer StartRent API. Returns the created row.
 */
async function createPendingOrder({ userId, deviceUuid }) {
  const { data, error } = await supabase
    .from('rent_orders')
    .insert({
      user_id: userId,
      device_uuid: deviceUuid,
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] createPendingOrder: ${error.message}`);
  return data;
}

/**
 * Mark an order as 'active' once the device confirms the power bank was ejected
 * (RabbitMQ event 1003). Also records which power bank was dispensed.
 */
async function activateOrder(orderId, powerNo) {
  const { data, error } = await supabase
    .from('rent_orders')
    .update({ status: 'active', power_no: powerNo })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] activateOrder: ${error.message}`);
  return data;
}

/**
 * Close an order as 'returned' once the device reports the power bank back
 * (RabbitMQ event 1004). Optionally stores battery level on return.
 */
async function closeOrder(orderId, { batteryOnReturn } = {}) {
  const update = {
    status: 'returned',
    returned_at: new Date().toISOString(),
  };

  if (batteryOnReturn !== undefined && batteryOnReturn !== null) {
    update.battery_on_return = batteryOnReturn;
  }

  const { data, error } = await supabase
    .from('rent_orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] closeOrder: ${error.message}`);
  return data;
}

/**
 * Mark an order as 'failed' (used when the device does not respond in time).
 */
async function failOrder(orderId) {
  const { data, error } = await supabase
    .from('rent_orders')
    .update({ status: 'failed' })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] failOrder: ${error.message}`);
  return data;
}

/**
 * Find the most recent 'pending' order for a given device.
 * Used by event 1003 to identify which order the ejection belongs to.
 */
async function getOrderByDevice(deviceUuid) {
  const { data, error } = await supabase
    .from('rent_orders')
    .select('*')
    .eq('device_uuid', deviceUuid)
    .eq('status', 'pending')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`[supabaseService] getOrderByDevice: ${error.message}`);
  return data;
}

/**
 * Find the active order that matches a specific power bank number.
 * Used by event 1004 to identify which order the return belongs to.
 */
async function getOrderByPowerNo(powerNo) {
  const { data, error } = await supabase
    .from('rent_orders')
    .select('*')
    .eq('power_no', powerNo)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`[supabaseService] getOrderByPowerNo: ${error.message}`);
  return data;
}

// ─── Devices ─────────────────────────────────────────────────────────────────

/**
 * Insert or update a device record. Used by event 1001 (online/offline)
 * and event 1002 (cabinet status report).
 */
async function upsertDevice({ uuid, online, cabinetStatus }) {
  const update = {
    uuid,
    online,
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (cabinetStatus !== null) {
    update.cabinet_status = cabinetStatus;
  }

  const { data, error } = await supabase
    .from('devices')
    .upsert(update, { onConflict: 'uuid' })
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] upsertDevice: ${error.message}`);
  return data;
}

/**
 * Insert a new device row when registering via addDevice.
 */
async function insertDevice({ uuid }) {
  const { data, error } = await supabase
    .from('devices')
    .upsert(
      { uuid, online: false, updated_at: new Date().toISOString() },
      { onConflict: 'uuid' }
    )
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] insertDevice: ${error.message}`);
  return data;
}

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Append a raw RabbitMQ event to the device_events audit log.
 */
async function logEvent({ action, deviceUuid, powerNo, raw }) {
  const { data, error } = await supabase
    .from('device_events')
    .insert({
      action,
      device_uuid: deviceUuid,
      power_no: powerNo || null,
      raw,
      received_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`[supabaseService] logEvent: ${error.message}`);
  return data;
}

module.exports = {
  createPendingOrder,
  activateOrder,
  closeOrder,
  failOrder,
  getOrderByDevice,
  getOrderByPowerNo,
  upsertDevice,
  insertDevice,
  logEvent,
};
