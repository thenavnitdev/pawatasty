/**
 * Extract city name from a full address string
 * Handles various Dutch address formats
 */
export function extractCityFromAddress(address: string, existingCity?: string): string {
  // If we already have a valid city and it's not a street address, use it
  if (existingCity && existingCity.length > 0) {
    // Check if it looks like a street address (contains numbers or common street indicators)
    const streetIndicators = /\d+|straat|weg|laan|plein|singel|gracht|kade/i;
    if (!streetIndicators.test(existingCity)) {
      return existingCity;
    }
  }

  if (!address) {
    return 'Unknown';
  }

  // Split by comma to get address parts
  const parts = address.split(',').map(p => p.trim());

  // If there's only one part, try to extract city from it
  if (parts.length === 1) {
    // Try to find city after postcode pattern (e.g., "1234 AB Amsterdam")
    const postcodePattern = /\d{4}\s*[A-Z]{2}\s+([A-Za-z\s]+)/;
    const match = address.match(postcodePattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return 'Unknown';
  }

  // For multi-part addresses, try different strategies
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Look for a part that contains a postcode followed by a city name
    // Dutch postcode format: 4 digits + 2 letters (e.g., "1234 AB Amsterdam")
    const postcodeWithCity = /\d{4}\s*[A-Z]{2}\s+([A-Za-z\s\-']+)/i;
    const match = part.match(postcodeWithCity);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no postcode pattern found, look for the part that's most likely the city
  // Usually the second-to-last part in format: "Street, City, Country"
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2].trim();

    // Remove any postcode prefix if present
    const cityWithoutPostcode = cityPart.replace(/^\d{4}\s*[A-Z]{2}\s+/i, '').trim();

    // Check if this part doesn't look like a street address
    const streetIndicators = /^\d+|straat$|weg$|laan$|plein$|singel$|gracht$|kade$/i;
    if (!streetIndicators.test(cityWithoutPostcode) && cityWithoutPostcode.length > 0) {
      return cityWithoutPostcode;
    }
  }

  // Last resort: take the last non-empty part that's not a country
  const commonCountries = ['netherlands', 'nederland', 'holland', 'nl', 'the netherlands'];
  const filteredParts = parts.filter(p => {
    const lower = p.toLowerCase().trim();
    return lower.length > 0 && !commonCountries.includes(lower);
  });

  if (filteredParts.length > 0) {
    const cityPart = filteredParts[filteredParts.length - 1];
    // Remove postcode if present
    return cityPart.replace(/^\d{4}\s*[A-Z]{2}\s+/i, '').trim();
  }

  return 'Unknown';
}
