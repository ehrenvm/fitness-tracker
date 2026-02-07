/**
 * Format a stored activity value for display.
 * Values stored in inches (e.g. Broad Jump ft/in) are shown as "X ft Y in".
 */

export function isFeetInchesActivity(activity: string): boolean {
  return /ft\/in/i.test(activity);
}

/**
 * Returns a display string for an activity value.
 * For ft/in activities (value stored in inches), returns e.g. "5 ft 6 in".
 * Otherwise returns the number formatted to 2 decimal places.
 */
export function formatActivityValueDisplay(activity: string, value: number): string {
  if (isFeetInchesActivity(activity)) {
    const totalInches = Math.round(value);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (feet === 0) {
      return `${inches} in`;
    }
    if (inches === 0) {
      return `${feet} ft`;
    }
    return `${feet} ft ${inches} in`;
  }
  return typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(2) : String(value);
}
