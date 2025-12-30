module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@react-native-firebase/auth': './src/utils/authCompat',
            '@react-native-firebase/firestore': './src/utils/firestoreCompat',
            '@react-native-google-signin/google-signin': './src/utils/googleSigninCompat',
          },
        },
      ],
      // This plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};


