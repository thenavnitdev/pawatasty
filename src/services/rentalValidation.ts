import { supabase } from '../lib/supabase';

export interface RentalValidationResult {
  isValid: boolean;
  error?: 'STATION_NOT_FOUND' | 'NO_POWERBANKS' | 'ACTIVE_RENTAL' | 'DAILY_LIMIT_EXCEEDED';
  stationId?: string;
  availablePowerbanks?: number;
  canProceedWithCharge?: boolean;
  hasActiveSubscription?: boolean;
  dailyLimitUsed?: boolean;
}

export async function validateStationCode(
  stationCode: string,
  userId: string
): Promise<RentalValidationResult> {
  try {
    const { data: stations, error: stationError } = await supabase
      .from('station_items')
      .select('station_id, pb_available')
      .like('station_id', `%${stationCode}`);

    if (stationError || !stations || stations.length === 0) {
      return {
        isValid: false,
        error: 'STATION_NOT_FOUND',
      };
    }

    const station = stations[0];
    const availablePowerbanks = station.pb_available || 0;

    if (availablePowerbanks === 0) {
      return {
        isValid: false,
        error: 'NO_POWERBANKS',
        stationId: station.station_id,
        availablePowerbanks: 0,
      };
    }

    const { data: activeRental } = await supabase
      .from('rentals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (activeRental) {
      return {
        isValid: false,
        error: 'ACTIVE_RENTAL',
        stationId: station.station_id,
        availablePowerbanks,
      };
    }

    const { data: membership } = await supabase
      .from('user_memberships')
      .select('id, membership_tier, subscription_status, free_rental_used_today')
      .eq('user_id', userId)
      .maybeSingle();

    if (membership && membership.subscription_status === 'active' &&
        (membership.membership_tier === 'silver' || membership.membership_tier === 'gold')) {
      const dailyLimitUsed = membership.free_rental_used_today;

      if (dailyLimitUsed) {
        return {
          isValid: true,
          error: 'DAILY_LIMIT_EXCEEDED',
          stationId: station.station_id,
          availablePowerbanks,
          hasActiveSubscription: true,
          dailyLimitUsed: true,
          canProceedWithCharge: true,
        };
      }

      return {
        isValid: true,
        stationId: station.station_id,
        availablePowerbanks,
        hasActiveSubscription: true,
        dailyLimitUsed: false,
      };
    }

    return {
      isValid: true,
      stationId: station.station_id,
      availablePowerbanks,
      hasActiveSubscription: false,
    };
  } catch (error) {
    console.error('Station validation error:', error);
    return {
      isValid: false,
      error: 'STATION_NOT_FOUND',
    };
  }
}

export async function markDailyRentalUsed(userId: string): Promise<void> {
  try {
    await supabase
      .from('user_memberships')
      .update({ free_rental_used_today: true })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error marking daily rental as used:', error);
  }
}
