import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'mp3dad-storage',
});

export const StorageKeys = {
  PLAYLISTS: 'mp3dad_playlists',
  BLACKLIST: 'mp3dad_blacklist',
  LAST_PLAYED: 'mp3dad_last_played',
  PLAYBACK_TIMESTAMP: 'mp3dad_playback_timestamp',
  FAVORITES: 'mp3dad_favorites',
  SONG_TIMESTAMPS: 'mp3dad_song_timestamps',
};

/**
 * Obtiene un elemento persistido en MMKV deserializado desde JSON.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
export const getStoredItem = (key, defaultValue = null) => {
  try {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.warn(`[StorageService] Error leyendo clave ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Guarda un elemento serializado como JSON en MMKV.
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
export const setStoredItem = (key, value) => {
  try {
    storage.set(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[StorageService] Error guardando clave ${key}:`, error);
    return false;
  }
};

/**
 * Elimina una clave de MMKV.
 * @param {string} key
 * @returns {boolean}
 */
export const removeStoredItem = (key) => {
  try {
    storage.delete(key);
    return true;
  } catch (error) {
    console.error(`[StorageService] Error eliminando clave ${key}:`, error);
    return false;
  }
};

/**
 * Extrae el identificador como string de un ID o de un objeto de canción.
 * @param {string|number|object} item
 * @returns {string}
 */
const extractId = (item) => {
  if (item === null || item === undefined) return '';
  if (typeof item === 'object' && item.id !== undefined) {
    return String(item.id);
  }
  return String(item);
};

// ==========================================
// GESTIÓN DE LISTA NEGRA (BLACKLIST / CANCIONES OCULTAS)
// ==========================================

/**
 * Obtiene el listado de IDs en la lista negra.
 * @returns {string[]}
 */
export const getBlacklist = () => {
  return getStoredItem(StorageKeys.BLACKLIST, []);
};

/**
 * Agrega una canción a la lista negra.
 * @param {string|number|object} songOrId
 * @returns {boolean}
 */
export const addToBlacklist = (songOrId) => {
  const id = extractId(songOrId);
  if (!id) return false;

  const currentList = getBlacklist();
  if (currentList.includes(id)) {
    return true;
  }

  const updatedList = [...currentList, id];
  return setStoredItem(StorageKeys.BLACKLIST, updatedList);
};

/**
 * Remueve una canción de la lista negra.
 * @param {string|number|object} songOrId
 * @returns {boolean}
 */
export const removeFromBlacklist = (songOrId) => {
  const id = extractId(songOrId);
  if (!id) return false;

  const currentList = getBlacklist();
  const updatedList = currentList.filter((item) => item !== id);
  return setStoredItem(StorageKeys.BLACKLIST, updatedList);
};

/**
 * Comprueba si una canción está en la lista negra.
 * @param {string|number|object} songOrId
 * @returns {boolean}
 */
export const isBlacklisted = (songOrId) => {
  const id = extractId(songOrId);
  if (!id) return false;

  const currentList = getBlacklist();
  return currentList.includes(id);
};

/**
 * Vacía la lista negra por completo.
 * @returns {boolean}
 */
export const clearBlacklist = () => {
  return setStoredItem(StorageKeys.BLACKLIST, []);
};

// ==========================================
// TIMESTAMPS DE PRIMERA DETECCIÓN (FIRST SEEN)
// ==========================================

/**
 * Obtiene el mapa de timestamps de detección de canciones { [songId]: timestamp }.
 * @returns {Record<string, number>}
 */
export const getSongTimestamps = () => {
  return getStoredItem(StorageKeys.SONG_TIMESTAMPS, {});
};

/**
 * Guarda el mapa de timestamps de detección.
 * @param {Record<string, number>} timestamps
 * @returns {boolean}
 */
export const setSongTimestamps = (timestamps) => {
  return setStoredItem(StorageKeys.SONG_TIMESTAMPS, timestamps || {});
};

/**
 * Obtiene el timestamp de primera detección de una canción.
 * @param {string|number|object} songOrId
 * @returns {number|null}
 */
export const getSongFirstSeen = (songOrId) => {
  const id = extractId(songOrId);
  if (!id) return null;

  const timestamps = getSongTimestamps();
  return timestamps[id] || null;
};

/**
 * Registra el timestamp actual para canciones nuevas que no hayan sido detectadas antes.
 * Mantiene intactas las fechas de canciones previamente descubiertas.
 * @param {Array<string|number|object>} songsOrIds
 * @param {number} [customNow]
 * @returns {Record<string, number>}
 */
export const recordSongTimestamps = (songsOrIds, customNow = Date.now()) => {
  if (!Array.isArray(songsOrIds) || songsOrIds.length === 0) {
    return getSongTimestamps();
  }

  const timestamps = { ...getSongTimestamps() };
  let hasChanges = false;

  for (const item of songsOrIds) {
    const id = extractId(item);
    if (id && !timestamps[id]) {
      timestamps[id] = customNow;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    setSongTimestamps(timestamps);
  }

  return timestamps;
};

// ==========================================
// LIMPIEZA DE DATOS HUÉRFANOS (ORPHAN DATA CLEANUP)
// ==========================================

/**
 * Limpia registros huérfanos de canciones que ya no existen en el almacenamiento físico:
 * - Timestamps de detección obsoletos
 * - Historial de reproducción reciente
 * - Canciones en favoritos
 * - Canciones dentro de listas de reproducción personalizadas
 *
 * @param {Array<string|number|object>} activeSongsOrIds Lista de canciones válidas en el escaneo actual
 * @returns {{
 *   cleanedTimestampsCount: number,
 *   cleanedHistoryCount: number,
 *   cleanedFavoritesCount: number,
 *   cleanedPlaylistsTracksCount: number
 * }}
 */
export const cleanOrphanData = (activeSongsOrIds) => {
  const activeIds = Array.isArray(activeSongsOrIds)
    ? activeSongsOrIds.map(extractId).filter(Boolean)
    : [];
  const activeIdSet = new Set(activeIds);

  const stats = {
    cleanedTimestampsCount: 0,
    cleanedHistoryCount: 0,
    cleanedFavoritesCount: 0,
    cleanedPlaylistsTracksCount: 0,
  };

  // 1. Limpiar timestamps huérfanos
  const currentTimestamps = getSongTimestamps();
  const cleanedTimestamps = {};
  let timestampsChanged = false;

  for (const [id, ts] of Object.entries(currentTimestamps)) {
    if (activeIdSet.has(id)) {
      cleanedTimestamps[id] = ts;
    } else {
      stats.cleanedTimestampsCount++;
      timestampsChanged = true;
    }
  }

  if (timestampsChanged) {
    setSongTimestamps(cleanedTimestamps);
  }

  // 2. Limpiar historial de reproducción huérfano
  const history = getStoredItem(StorageKeys.LAST_PLAYED, []);
  if (Array.isArray(history)) {
    const cleanedHistory = history.filter((track) => {
      const id = extractId(track);
      return activeIdSet.has(id);
    });

    if (cleanedHistory.length !== history.length) {
      stats.cleanedHistoryCount = history.length - cleanedHistory.length;
      setStoredItem(StorageKeys.LAST_PLAYED, cleanedHistory);
    }
  }

  // 3. Limpiar favoritos huérfanos
  const favorites = getStoredItem(StorageKeys.FAVORITES, []);
  if (Array.isArray(favorites)) {
    const cleanedFavorites = favorites.filter((item) => {
      const id = extractId(item);
      return activeIdSet.has(id);
    });

    if (cleanedFavorites.length !== favorites.length) {
      stats.cleanedFavoritesCount = favorites.length - cleanedFavorites.length;
      setStoredItem(StorageKeys.FAVORITES, cleanedFavorites);
    }
  }

  // 4. Limpiar pistas huérfanas en listas de reproducción (playlists)
  const playlists = getStoredItem(StorageKeys.PLAYLISTS, []);
  if (Array.isArray(playlists)) {
    let playlistsChanged = false;
    const cleanedPlaylists = playlists.map((playlist) => {
      if (!Array.isArray(playlist.tracks)) {
        return playlist;
      }
      const initialCount = playlist.tracks.length;
      const cleanedTracks = playlist.tracks.filter((track) => {
        const id = extractId(track);
        return activeIdSet.has(id);
      });

      const removedInThisPlaylist = initialCount - cleanedTracks.length;
      if (removedInThisPlaylist > 0) {
        stats.cleanedPlaylistsTracksCount += removedInThisPlaylist;
        playlistsChanged = true;
      }

      return {
        ...playlist,
        tracks: cleanedTracks,
      };
    });

    if (playlistsChanged) {
      setStoredItem(StorageKeys.PLAYLISTS, cleanedPlaylists);
    }
  }

  return stats;
};

export default {
  storage,
  StorageKeys,
  getStoredItem,
  setStoredItem,
  removeStoredItem,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  clearBlacklist,
  getSongTimestamps,
  setSongTimestamps,
  getSongFirstSeen,
  recordSongTimestamps,
  cleanOrphanData,
};
