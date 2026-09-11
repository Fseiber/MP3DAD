import { Platform, PermissionsAndroid, Linking } from 'react-native';
import {
  getAndroidApiLevel,
  checkAudioPermission,
  requestAudioPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  requestInitialPermissions,
  openBatteryOptimizationSettings,
} from '../src/services/permissionService';

// Mock react-native
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'android',
      Version: 33,
    },
    PermissionsAndroid: {
      PERMISSIONS: {
        READ_MEDIA_AUDIO: 'android.permission.READ_MEDIA_AUDIO',
        POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
      check: jest.fn(),
      request: jest.fn(),
    },
    Linking: {
      sendIntent: jest.fn(),
      openSettings: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    StyleSheet: {
      create: () => ({}),
    },
  };
});

describe('PermissionService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('Android 13+ (API 33+)', () => {
    beforeEach(() => {
      Platform.Version = 33;
    });

    test('getAndroidApiLevel returns numeric 33', () => {
      expect(getAndroidApiLevel()).toBe(33);
    });

    test('checkAudioPermission checks READ_MEDIA_AUDIO on API 33+', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await checkAudioPermission();

      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      );
      expect(result).toBe(true);
    });

    test('requestAudioPermission requests READ_MEDIA_AUDIO on API 33+', async () => {
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.GRANTED,
      );

      const result = await requestAudioPermission();

      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        expect.objectContaining({
          title: expect.any(String),
          message: expect.any(String),
        }),
      );
      expect(result).toBe(true);
    });

    test('checkNotificationPermission checks POST_NOTIFICATIONS on API 33+', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await checkNotificationPermission();

      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      expect(result).toBe(true);
    });

    test('requestNotificationPermission requests POST_NOTIFICATIONS on API 33+', async () => {
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.GRANTED,
      );

      const result = await requestNotificationPermission();

      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        expect.objectContaining({
          title: expect.any(String),
          message: expect.any(String),
        }),
      );
      expect(result).toBe(true);
    });

    test('requestInitialPermissions requests both and handles notification denial non-blockingly', async () => {
      // Audio concedido
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.GRANTED,
      );
      // Notificación rechazada
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.DENIED,
      );

      const result = await requestInitialPermissions();

      expect(PermissionsAndroid.request).toHaveBeenCalledTimes(2);
      expect(PermissionsAndroid.request).toHaveBeenNthCalledWith(
        1,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        expect.any(Object),
      );
      expect(PermissionsAndroid.request).toHaveBeenNthCalledWith(
        2,
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        expect.any(Object),
      );

      expect(result).toEqual({
        hasAudioAccess: true,
        hasNotificationAccess: false,
        apiLevel: 33,
      });
    });
  });

  describe('Android 12 o inferior (API <= 32)', () => {
    beforeEach(() => {
      Platform.Version = 30; // Android 11
    });

    test('getAndroidApiLevel returns numeric 30', () => {
      expect(getAndroidApiLevel()).toBe(30);
    });

    test('checkAudioPermission checks READ_EXTERNAL_STORAGE on API <= 32', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await checkAudioPermission();

      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
      expect(result).toBe(true);
    });

    test('requestAudioPermission requests READ_EXTERNAL_STORAGE on API <= 32', async () => {
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.GRANTED,
      );

      const result = await requestAudioPermission();

      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        expect.objectContaining({
          title: expect.any(String),
          message: expect.any(String),
        }),
      );
      expect(result).toBe(true);
    });

    test('checkNotificationPermission returns true immediately on API <= 32 without runtime check', async () => {
      const result = await checkNotificationPermission();

      expect(PermissionsAndroid.check).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('requestNotificationPermission returns true immediately on API <= 32 without runtime request', async () => {
      const result = await requestNotificationPermission();

      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('requestInitialPermissions only requests audio on API <= 32', async () => {
      PermissionsAndroid.request.mockResolvedValueOnce(
        PermissionsAndroid.RESULTS.GRANTED,
      );

      const result = await requestInitialPermissions();

      expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        expect.any(Object),
      );
      expect(result).toEqual({
        hasAudioAccess: true,
        hasNotificationAccess: true,
        apiLevel: 30,
      });
    });
  });

  describe('Ajustes de Batería (Battery Optimization Intent)', () => {
    test('openBatteryOptimizationSettings tries direct REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent first', async () => {
      Linking.sendIntent.mockResolvedValueOnce(true);

      const success = await openBatteryOptimizationSettings();

      expect(Linking.sendIntent).toHaveBeenCalledWith(
        'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        [{ key: 'data', value: 'package:com.mp3dad' }],
      );
      expect(success).toBe(true);
    });

    test('openBatteryOptimizationSettings falls back to IGNORE_BATTERY_OPTIMIZATION_SETTINGS if direct intent fails', async () => {
      // Primer intento falla
      Linking.sendIntent.mockRejectedValueOnce(new Error('Intent 1 not found'));
      // Segundo intento tiene éxito
      Linking.sendIntent.mockResolvedValueOnce(true);

      const success = await openBatteryOptimizationSettings();

      expect(Linking.sendIntent).toHaveBeenCalledTimes(2);
      expect(Linking.sendIntent).toHaveBeenNthCalledWith(
        1,
        'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        [{ key: 'data', value: 'package:com.mp3dad' }],
      );
      expect(Linking.sendIntent).toHaveBeenNthCalledWith(
        2,
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
      expect(success).toBe(true);
    });

    test('openBatteryOptimizationSettings falls back to openSettings if both intents fail', async () => {
      Linking.sendIntent.mockRejectedValueOnce(new Error('Intent 1 failed'));
      Linking.sendIntent.mockRejectedValueOnce(new Error('Intent 2 failed'));
      Linking.openSettings.mockResolvedValueOnce(true);

      const success = await openBatteryOptimizationSettings();

      expect(Linking.sendIntent).toHaveBeenCalledTimes(2);
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(success).toBe(true);
    });
  });
});
