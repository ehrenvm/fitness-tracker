export const ANALYTICS_EVENTS = {
  // User Events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // Activity Events
  ACTIVITY_CREATED: 'activity_created',
  ACTIVITY_DATA_ADDED: 'activity_data_added',
  ACTIVITY_DELETED: 'activity_deleted',
  
  // Admin Events
  ADMIN_ACTION: 'admin_action',
  
  // Performance Events
  PERFORMANCE_MILESTONE: 'performance_milestone'
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]; 