declare module 'react-firebase-hooks/auth' {
  import { Auth, User } from 'firebase/auth';
  
  export function useAuthState(auth: Auth): [User | null, boolean, Error | undefined];
} 