module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-track-player|react-native-mmkv|react-native-safe-area-context)/)',
  ],
};
