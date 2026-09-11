import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

/**
 * PACKAGE_NAME de la aplicación para intents de configuración y batería.
 */
const PACKAGE_NAME = 'com.mp3dad';

/**
 * Obtiene el nivel de API de Android como número entero.
 * @returns {number} API level (ej. 33 para Android 13, 34 para Android 14, etc.)
 */
export const getAndroidApiLevel = () => {
  if (Platform.OS !== 'android') return 0;
  return typeof Platform.Version === 'string'
    ? parseInt(Platform.Version, 10)
    : Platform.Version;
};

/**
 * Verifica si se cuenta con el permiso para leer archivos de audio del almacenamiento.
 * @returns {Promise<boolean>}
 */
export const checkAudioPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = getAndroidApiLevel();

  try {
    if (apiLevel >= 33) {
      // Android 13+ (Tiramisu y superiores)
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      );
    } else {
      // Android 12 o inferior (API <= 32)
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }
  } catch (error) {
    console.warn('[PermissionService] Error al verificar permiso de audio:', error);
    return false;
  }
};

/**
 * Solicita el permiso para acceder a los archivos de música.
 * Muestra mensajes con lenguaje claro y accesible para adultos mayores.
 * @returns {Promise<boolean>} true si el permiso fue concedido
 */
export const requestAudioPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = getAndroidApiLevel();

  try {
    if (apiLevel >= 33) {
      // Android 13+
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        {
          title: 'Permiso para tu Música',
          message:
            'MP3DAD necesita permiso para encontrar y reproducir tus canciones guardadas en el teléfono.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 12 o inferior
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Permiso de Almacenamiento',
          message:
            'MP3DAD necesita acceso a tus archivos para reproducir tus canciones favoritas.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('[PermissionService] Error al solicitar permiso de audio:', error);
    return false;
  }
};

/**
 * Verifica si se cuenta con permiso de notificaciones (Android 13+).
 * @returns {Promise<boolean>}
 */
export const checkNotificationPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = getAndroidApiLevel();
  if (apiLevel < 33) {
    // En Android 12 o inferior el permiso de notificación no es runtime
    return true;
  }

  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } catch (error) {
    console.warn('[PermissionService] Error al verificar permiso de notificaciones:', error);
    return false;
  }
};

/**
 * Solicita permiso para mostrar la notificación de control del reproductor en la barra de estado.
 * NOTA: Esta solicitud es NO BLOQUEANTE. Si el usuario la rechaza, el reproductor
 * sigue funcionando con total normalidad.
 * @returns {Promise<boolean>} true si fue concedido, false si fue denegado
 */
export const requestNotificationPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = getAndroidApiLevel();
  if (apiLevel < 33) {
    return true;
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Control en Pantalla de Bloqueo',
        message:
          'Permite mostrar los botones de pausar y cambiar de canción en la barra de notificaciones.',
        buttonPositive: 'Aceptar',
        buttonNegative: 'Ahora no',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('[PermissionService] Error no crítico al solicitar notificaciones:', error);
    return false;
  }
};

/**
 * Flujo inicial unificado: Solicita permisos de audio y notificaciones en secuencia controlada.
 * - El permiso de audio es esencial para escanear y reproducir la música.
 * - El permiso de notificaciones es opcional y no bloquea el uso si se deniega.
 * @returns {Promise<{ hasAudioAccess: boolean, hasNotificationAccess: boolean, apiLevel: number }>}
 */
export const requestInitialPermissions = async () => {
  const apiLevel = getAndroidApiLevel();

  // 1. Permiso indispensable de lectura de música
  const hasAudioAccess = await requestAudioPermission();

  // 2. Permiso opcional de notificaciones (solo Android 13+)
  let hasNotificationAccess = true;
  if (apiLevel >= 33) {
    hasNotificationAccess = await requestNotificationPermission();
  }

  return {
    hasAudioAccess,
    hasNotificationAccess,
    apiLevel,
  };
};

/**
 * Abre la pantalla nativa de optimización de batería del sistema (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
 * en un solo clic para evitar que el sistema suspenda el reproductor en segundo plano.
 * Cuenta con fallbacks en cascada si el fabricante bloquea el intent directo.
 * @returns {Promise<boolean>}
 */
export const openBatteryOptimizationSettings = async () => {
  if (Platform.OS !== 'android') return false;

  try {
    // Intento 1: Intent directo para solicitar ignorar optimizaciones con el paquete de la app
    const intentUri = `package:${PACKAGE_NAME}`;
    await Linking.sendIntent(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      [{ key: 'data', value: intentUri }],
    );
    return true;
  } catch (errorIntent1) {
    console.warn(
      '[PermissionService] Intento 1 (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) no disponible:',
      errorIntent1.message,
    );

    try {
      // Intento 2: Pantalla general de optimización de batería del sistema
      await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      return true;
    } catch (errorIntent2) {
      console.warn(
        '[PermissionService] Intento 2 (IGNORE_BATTERY_OPTIMIZATION_SETTINGS) no disponible:',
        errorIntent2.message,
      );

      try {
        // Intento 3: Configuración de la aplicación como fallback seguro
        await Linking.openSettings();
        return true;
      } catch (errorIntent3) {
        console.error('[PermissionService] Error abriendo configuración de batería/app:', errorIntent3);
        Alert.alert(
          'Ajuste de Batería',
          'Por favor, ve a Ajustes > Aplicaciones > MP3DAD > Batería y selecciona "Sin restricciones" para que la música no se detenga con la pantalla apagada.',
        );
        return false;
      }
    }
  }
};

/**
 * Exportación por defecto del servicio de permisos
 */
export default {
  getAndroidApiLevel,
  checkAudioPermission,
  requestAudioPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  requestInitialPermissions,
  openBatteryOptimizationSettings,
};
