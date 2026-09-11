import { NativeModules, Platform } from 'react-native';
import {
  isBlacklisted,
  recordSongTimestamps,
  cleanOrphanData,
} from '../services/storageService';

/**
 * Duración mínima en milisegundos para considerar un archivo como canción (30 segundos).
 */
export const MIN_SONG_DURATION_MS = 30000;

/**
 * Patrones de carpetas y rutas que corresponden a audios del sistema o aplicaciones de mensajería.
 */
export const NOISE_PATH_PATTERNS = [
  /whatsapp/i,
  /telegram/i,
  /voice\s?notes?/i,
  /voice\s?recorder/i,
  /recordings?/i,
  /call_rec/i,
  /call\s?recordings?/i,
  /notifications?/i,
  /ringtones?/i,
  /alarms?/i,
  /audios?\s?de\s?whatsapp/i,
  /notas?\s?de\s?voz/i,
  /grabaciones?/i,
];

/**
 * Patrones en nombres de archivo o títulos característicos de notas de voz de WhatsApp o grabaciones.
 */
export const NOISE_FILENAME_PATTERNS = [
  /^AUD-\d{8}-WA\d+/i, // Patrón clásico de audio de WhatsApp: AUD-20231015-WA0001
  /^PTT-\d{8}-WA\d+/i, // Patrón de notas de voz Push-To-Talk: PTT-20231015-WA0002
  /^Voice-\d+/i,
  /^REC_\d+/i,
  /^Recording_\d+/i,
  /^Call_\d+/i,
];

/**
 * Extrae el nombre de archivo limpio sin extensión de una ruta.
 * @param {string} filePath
 * @returns {string}
 */
export const extractFilenameWithoutExtension = (filePath) => {
  if (!filePath) return '';
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const filenameWithExt = lastSlashIndex >= 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
  const lastDotIndex = filenameWithExt.lastIndexOf('.');
  return lastDotIndex > 0 ? filenameWithExt.substring(0, lastDotIndex) : filenameWithExt;
};

/**
 * Extrae el nombre de la carpeta contenedora y su ruta a partir de la ruta del archivo.
 * @param {string} filePath
 * @returns {{ folder: string, folderPath: string }}
 */
export const extractFolderInfo = (filePath) => {
  if (!filePath) {
    return { folder: 'Desconocida', folderPath: '' };
  }

  const normalized = filePath.replace(/\\/g, '/');
  const lastSlashIndex = normalized.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    return { folder: 'Desconocida', folderPath: '' };
  }

  const folderPath = normalized.substring(0, lastSlashIndex);
  const secondLastSlashIndex = folderPath.lastIndexOf('/');
  const folder =
    secondLastSlashIndex >= 0
      ? folderPath.substring(secondLastSlashIndex + 1)
      : folderPath;

  return { folder: folder || 'Desconocida', folderPath };
};

/**
 * Determina si la duración de un archivo es inferior a 30 segundos.
 * @param {number} duration Duración en milisegundos o segundos
 * @returns {boolean}
 */
export const isShortAudio = (duration) => {
  if (!duration || typeof duration !== 'number' || duration <= 0) {
    return true;
  }
  // Si la duración es mayor a 1000, asumimos milisegundos
  if (duration >= 1000) {
    return duration < MIN_SONG_DURATION_MS;
  }
  // Si es menor a 1000, asumimos segundos
  return duration < 30;
};

/**
 * Determina si un archivo corresponde a WhatsApp, grabadora, tonos o notas de voz.
 * @param {object} track
 * @returns {boolean}
 */
export const isWhatsAppOrNoiseFile = (track) => {
  if (!track) return true;

  const path = (track.path || track.url || '').toLowerCase();
  const title = (track.title || '').trim();
  const folder = (track.folder || '').toLowerCase();
  const filename = extractFilenameWithoutExtension(path);

  // 1. Comprobar patrones de carpetas / rutas
  for (const pattern of NOISE_PATH_PATTERNS) {
    if (pattern.test(path) || pattern.test(folder)) {
      return true;
    }
  }

  // 2. Comprobar nombres de archivo y títulos de notas de voz
  for (const pattern of NOISE_FILENAME_PATTERNS) {
    if (pattern.test(filename) || pattern.test(title)) {
      return true;
    }
  }

  return false;
};

/**
 * Normaliza y enriquece un objeto de canción según el estándar de MP3DAD y react-native-track-player.
 * @param {object} raw
 * @param {Record<string, number>} [timestampsMap]
 * @returns {object}
 */
export const normalizeTrack = (raw, timestampsMap = {}) => {
  const id = String(raw.id || raw.url || Math.random().toString());
  const path = raw.path || raw.url || '';
  const fallbackTitle = extractFilenameWithoutExtension(path);

  const cleanTitle =
    raw.title && raw.title.trim() && raw.title !== '<unknown>'
      ? raw.title.trim()
      : fallbackTitle || 'Canción sin título';

  const cleanArtist =
    raw.artist && raw.artist.trim() && raw.artist !== '<unknown>'
      ? raw.artist.trim()
      : 'Artista Desconocido';

  const cleanAlbum =
    raw.album && raw.album.trim() && raw.album !== '<unknown>'
      ? raw.album.trim()
      : 'Álbum Desconocido';

  // Duración en milisegundos y en segundos para TrackPlayer
  let durationMs = typeof raw.duration === 'number' ? raw.duration : 0;
  if (durationMs > 0 && durationMs < 1000) {
    durationMs = durationMs * 1000;
  }
  const durationSec = Math.max(0, Math.round(durationMs / 1000));

  const folderInfo = extractFolderInfo(path);
  const folder = raw.folder && raw.folder !== 'Desconocida' ? raw.folder : folderInfo.folder;
  const folderPath = raw.folderPath || folderInfo.folderPath;

  const firstSeen = timestampsMap[id] || Date.now();

  return {
    id,
    title: cleanTitle,
    artist: cleanArtist,
    album: cleanAlbum,
    duration: durationSec,
    durationMs,
    url: raw.url || (path ? `file://${path}` : ''),
    path,
    folder,
    folderPath,
    artwork: raw.artwork || null,
    size: typeof raw.size === 'number' ? raw.size : 0,
    dateAdded: typeof raw.dateAdded === 'number' ? raw.dateAdded : Date.now(),
    dateModified: typeof raw.dateModified === 'number' ? raw.dateModified : Date.now(),
    firstSeen,
  };
};

/**
 * Aplica los filtros de duración, ruido/WhatsApp y lista negra a un conjunto de canciones.
 * @param {Array<object>} rawTracks
 * @param {{ includeBlacklisted?: boolean, autoCleanOrphans?: boolean }} [options]
 * @returns {Array<object>}
 */
export const filterMusicTracks = (rawTracks = [], options = {}) => {
  if (!Array.isArray(rawTracks)) return [];

  const { includeBlacklisted = false } = options;

  // 1. Filtrar audios cortos y ruido de WhatsApp / grabaciones
  const validTracks = rawTracks.filter((track) => {
    if (!track) return false;

    // Filtro de duración mínima (< 30s)
    if (isShortAudio(track.duration)) {
      return false;
    }

    // Filtro heurístico de WhatsApp y audios del sistema
    if (isWhatsAppOrNoiseFile(track)) {
      return false;
    }

    // Filtro de lista negra (canciones ocultadas por el usuario)
    if (!includeBlacklisted && isBlacklisted(track.id)) {
      return false;
    }

    return true;
  });

  // 2. Registrar timestamps de primera detección
  const timestamps = recordSongTimestamps(validTracks);

  // 3. Normalizar objetos de canción con metadatos limpios y firstSeen
  return validTracks.map((t) => normalizeTrack(t, timestamps));
};

/**
 * Escanea la biblioteca de música del dispositivo Android vía MediaStore y aplica los filtros de MP3DAD.
 * @param {{ includeBlacklisted?: boolean, autoCleanOrphans?: boolean, fallbackData?: Array<object> }} [options]
 * @returns {Promise<Array<object>>}
 */
export const scanMusicFiles = async (options = {}) => {
  const { autoCleanOrphans = true, fallbackData = null } = options;

  let rawList = [];

  try {
    if (fallbackData && Array.isArray(fallbackData)) {
      rawList = fallbackData;
    } else if (
      Platform.OS === 'android' &&
      NativeModules.MusicScanner &&
      typeof NativeModules.MusicScanner.scanAudioFiles === 'function'
    ) {
      rawList = await NativeModules.MusicScanner.scanAudioFiles();
    } else {
      console.warn('[MusicScanner] Módulo nativo MusicScanner no disponible en esta plataforma.');
      rawList = [];
    }
  } catch (error) {
    console.error('[MusicScanner] Error al consultar MediaStore:', error);
    rawList = [];
  }

  // Filtrar, normalizar y asignar timestamps
  const filteredList = filterMusicTracks(rawList, options);

  // Limpieza automática de datos huérfanos con los IDs detectados activos
  if (autoCleanOrphans && filteredList.length > 0) {
    cleanOrphanData(filteredList);
  }

  return filteredList;
};

export default {
  MIN_SONG_DURATION_MS,
  NOISE_PATH_PATTERNS,
  NOISE_FILENAME_PATTERNS,
  extractFilenameWithoutExtension,
  extractFolderInfo,
  isShortAudio,
  isWhatsAppOrNoiseFile,
  normalizeTrack,
  filterMusicTracks,
  scanMusicFiles,
};
