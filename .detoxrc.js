module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  configurations: {
    'android.emu.debug': {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
    'android.emu.release': {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
    'ios.sim.debug': {
      type: 'ios.simulator',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/DailyFlow.app',
      build: 'xcodebuild -workspace ios/DailyFlow.xcworkspace -scheme DailyFlow -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
      device: {
        type: 'iPhone 12',
        os: '14.5',
      },
    },
  },
};
