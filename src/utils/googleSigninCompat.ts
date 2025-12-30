export const GoogleSignin = {
    configure: (params?: any) => {
        console.log('Mock GoogleSignin configured', params);
    },
    hasPlayServices: (params?: any) => Promise.resolve(true),
    signIn: async () => {
        console.log('Mock GoogleSignin signIn called');
        return {
            user: {
                id: 'mock-google-id',
                email: 'mock@gmail.com',
                name: 'Mock Google User',
                photo: null,
                familyName: 'User',
                givenName: 'Mock',
            },
            idToken: 'mock-id-token',
        };
    },
    signOut: async () => {
        console.log('Mock GoogleSignin signOut called');
        return Promise.resolve();
    },
    isSignedIn: async () => {
        return Promise.resolve(false);
    },
    getCurrentUser: async () => {
        return Promise.resolve(null);
    },
    getTokens: async () => {
        return Promise.resolve({ idToken: 'mock-id-token', accessToken: 'mock-access-token' });
    }
};

export const statusCodes = {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};
