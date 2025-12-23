import { VenueCategory } from '../types';

function getCategoryIcon(category: VenueCategory, iconColor: string): string {
  const icons: Record<VenueCategory, string> = {
    restaurant: `<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    cafe: `<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2M10 2v2M14 2v2" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    bar: `<path d="M8 2h8M9 2v6.5c0 1 .5 2 1.5 3L15 16v6M9 16v6M15 11l-6 6" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    shop: `<circle cx="9" cy="21" r="1" fill="${iconColor}"/><circle cx="20" cy="21" r="1" fill="${iconColor}"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    train_station: `<path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z" fill="${iconColor}"/>`,
    charging_station: `<path d="M7 2h10M7 22h10M12 2v4m0 10v6M9 6h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm1.5 4l-1 2h3l-1 2" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  };
  return icons[category] || icons.restaurant;
}

export function createCustomMarkerIcon(
  category: VenueCategory,
  isOpen: boolean
): string {
  const statusColor = isOpen ? '#FFA374' : '#828EA1';
  const icon = getCategoryIcon(category, statusColor);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 384 512">
      <defs/>
      <path fill="${statusColor}" d="M384 192c0 87.4-117 243-168.3 307.2c-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192C0 86 86 0 192 0s192 86 192 192"/>
      <circle cx="192" cy="192" r="140" fill="white"/>
      <svg x="96" y="96" width="192" height="192" viewBox="0 0 24 24">
        ${icon}
      </svg>
    </svg>
  `;

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/**
 * Parses opening hours string and checks if business is currently open
 * @param openingHours - Format: "HH:MM-HH:MM" or "openDays openTime" e.g., "11:00-23:00"
 * @param openDays - Comma-separated days e.g., "monday,tuesday,wednesday"
 * @returns true if business is currently open
 */
export function isBusinessOpen(openingHours?: string, openDays?: string): boolean {
  if (!openingHours) {
    // Default fallback: assume open 8am-10pm
    const hour = new Date().getHours();
    return hour >= 8 && hour < 22;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Check if open today
  if (openDays) {
    const daysOpen = openDays.toLowerCase().split(',').map(d => d.trim());
    if (!daysOpen.includes(currentDay)) {
      return false;
    }
  }

  // Parse time range: "11:00-23:00" or "11:00-01:00" (crosses midnight)
  const timeMatch = openingHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    // Fallback if format is unexpected
    const hour = new Date().getHours();
    return hour >= 8 && hour < 22;
  }

  const openHour = parseInt(timeMatch[1], 10);
  const openMinute = parseInt(timeMatch[2], 10);
  const closeHour = parseInt(timeMatch[3], 10);
  const closeMinute = parseInt(timeMatch[4], 10);

  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const openTimeInMinutes = openHour * 60 + openMinute;
  let closeTimeInMinutes = closeHour * 60 + closeMinute;

  // Handle closing time that crosses midnight (e.g., 11:00-01:00)
  if (closeHour < openHour) {
    closeTimeInMinutes += 24 * 60;
    // If we're past midnight but before closing
    if (currentHour < 12) {
      return currentTimeInMinutes <= closeTimeInMinutes;
    }
  }

  return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
}
