import { StorageKeys, getStoredItem, setStoredItem } from './storageService';

/**
 * Cantidad máxima de canciones en el historial de reproducción.
 */
export const MAX_HISTORY_ITEMS = 50;

/**
 * Umbral en segundos para considerar un audio como "largo" o enganchado (15 minutos = 900 segundos).
 */
export const LONG_AUDIO_THRESHOLD_SEC = 900;

/**
 * Extrae el identificador como string de un ID o de un objeto de pista.
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
// PERSISTENCIA DE POSICIÓN PARA ENGANCHADOS LARGOS (>15 MIN)
// ==========================================

/**
 * Determina si la duración de un audio califica como enganchado / audio largo (>= 15 minutos).
 * Acepta duración en segundos o milisegundos.
 * @param {number} duration Duración en segundos o milisegundos
 * @returns {boolean}
 */
export const isLongAudio = (duration) => {
  if (!duration || typeof duration !== 'number' || duration <= 0) {
    return false;
  }
  // Si es >= 100,000, asumimos milisegundos (15 min = 900,000 ms)
  if (duration >= 100000) {
    return duration >= LONG_AUDIO_THRESHOLD_SEC * 1000;
  }
  // Si es < 100,000, asumimos segundos (15 min = 900 s)
  return duration >= LONG_AUDIO_THRESHOLD_SEC;
};

/**
 * Obtiene el mapa completo de posiciones de reproducción guardadas { [trackId]: { position, updatedAt, duration } }.
 * @returns {Record<string, { position: number, updatedAt: number, duration: number }>}
 */
export const getAllSavedPositions = () => {
  return getStoredItem(StorageKeys.PLAYBACK_TIMESTAMP, {});
};

/**
 * Obtiene la última posición de reproducción guardada (en segundos) para una pista.
 * Retorna 0 si no existe registro o si el audio ya había finalizado.
 * @param {string|number|object} trackOrId
 * @returns {number} Posición en segundos
 */
export const getPlaybackPosition = (trackOrId) => {
  const id = extractId(trackOrId);
  if (!id) return 0;

  const positions = getAllSavedPositions();
  const entry = positions[id];

  if (entry && typeof entry.position === 'number' && entry.position > 0) {
    return entry.position;
  }
  return 0;
};

/**
 * Guarda la posición de reproducción actual para audios largos (>= 15 minutos).
 * Si el usuario llegó al final del audio (> 98% o faltan menos de 10 segundos),
 * la posición se resetea para que la próxima vez comience desde el principio.
 *
 * @param {string|number|object} trackOrId Identificador o pista
 * @param {number} positionSeconds Posición actual en segundos
 * @param {number} durationSeconds Duración total en segundos
 * @returns {boolean} true si se persistió la posición
 */
export const savePlaybackPosition = (trackOrId, positionSeconds, durationSeconds) => {
  const id = extractId(trackOrId);
  if (!id || typeof positionSeconds !== 'number' || positionSeconds < 0) {
    return false;
  }

  // Verificar si es un audio largo
  if (!isLongAudio(durationSeconds)) {
    return false;
  }

  const positions = { ...getAllSavedPositions() };

  // Si está casi al final (últimos 10s o más del 98%), reseteamos la posición
  const isNearEnd =
    durationSeconds > 0 &&
    (positionSeconds >= durationSeconds - 10 || positionSeconds / durationSeconds >= 0.98);

  if (isNearEnd) {
    delete positions[id];
    setStoredItem(StorageKeys.PLAYBACK_TIMESTAMP, positions);
    return true;
  }

  // Guardar posición actual
  positions[id] = {
    position: Math.floor(positionSeconds),
    updatedAt: Date.now(),
    duration: durationSeconds,
  };

  return setStoredItem(StorageKeys.PLAYBACK_TIMESTAMP, positions);
};

/**
 * Elimina la posición guardada de una pista específica.
 * @param {string|number|object} trackOrId
 * @returns {boolean}
 */
export const clearPlaybackPosition = (trackOrId) => {
  const id = extractId(trackOrId);
  if (!id) return false;

  const positions = { ...getAllSavedPositions() };
  if (positions[id]) {
    delete positions[id];
    return setStoredItem(StorageKeys.PLAYBACK_TIMESTAMP, positions);
  }
  return true;
};

// ==========================================
// HISTORIAL DE REPRODUCCIÓN (PLAYBACK HISTORY)
// ==========================================

/**
 * Obtiene la lista cronológica de canciones reproducidas recientemente.
 * @returns {Array<object>}
 */
export const getPlaybackHistory = () => {
  return getStoredItem(StorageKeys.LAST_PLAYED, []);
};

/**
 * Agrega una canción al historial de reproducción.
 * Si la canción ya estaba en el historial, la mueve al primer lugar con la marca de tiempo actual.
 * El historial se limita a un máximo de MAX_HISTORY_ITEMS (50 elementos).
 *
 * @param {object} track Objeto de canción
 * @returns {boolean}
 */
export const addToPlaybackHistory = (track) => {
  if (!track || !track.id) return false;

  const history = getPlaybackHistory();
  const trackId = String(track.id);

  // Filtrar duplicados existentes
  const filtered = history.filter((item) => String(item.id) !== trackId);

  // Colocar en primera posición con timestamp de reproducción
  const updatedHistory = [{ ...track, playedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_HISTORY_ITEMS,
  );

  return setStoredItem(StorageKeys.LAST_PLAYED, updatedHistory);
};

/**
 * Elimina una canción específica del historial de reproducción.
 * @param {string|number|object} trackOrId
 * @returns {boolean}
 */
export const removeFromPlaybackHistory = (trackOrId) => {
  const id = extractId(trackOrId);
  if (!id) return false;

  const history = getPlaybackHistory();
  const updatedHistory = history.filter((item) => String(item.id) !== id);
  return setStoredItem(StorageKeys.LAST_PLAYED, updatedHistory);
};

/**
 * Limpia el historial de reproducción por completo.
 * @returns {boolean}
 */
export const clearPlaybackHistory = () => {
  return setStoredItem(StorageKeys.LAST_PLAYED, []);
};

export default {
  MAX_HISTORY_ITEMS,
  LONG_AUDIO_THRESHOLD_SEC,
  isLongAudio,
  getAllSavedPositions,
  getPlaybackPosition,
  savePlaybackPosition,
  clearPlaybackPosition,
  getPlaybackHistory,
  addToPlaybackHistory,
  removeFromPlaybackHistory,
  clearPlaybackHistory,
};
