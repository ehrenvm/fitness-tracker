/**
 * Shared types for activity tracking across the application.
 */

export interface ActivityResult {
  id: string;
  userName: string;
  activity: string;
  value: number;
  date: string;
}

export interface ActivityValue {
  value1: string;
  value2: string;
}
