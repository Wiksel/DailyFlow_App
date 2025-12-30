// Compat wrapper for Google Signin
import { GoogleSignin, statusCodes as nativeStatusCodes } from '@react-native-google-signin/google-signin';

// Export GoogleSignin directly
export { GoogleSignin };

// Export statusCodes, falling back to basic object if for some reason the import is missing functionality (unlikely)
export const statusCodes = nativeStatusCodes || {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};
