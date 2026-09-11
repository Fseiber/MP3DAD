import { scanMusicFiles, extractFolderInfo } from './musicScanner';

/**
 * Agrupa una lista de canciones en objetos de carpetas reales del dispositivo.
 * @param {Array<object>} tracks Lista de canciones normalizadas
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   path: string,
 *   songCount: number,
 *   songs: Array<object>,
 *   artwork: string|null,
 *   totalDuration: number
 * }>}
 */
export const groupTracksByFolder = (tracks = []) => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }

  const folderMap = new Map();

  for (const track of tracks) {
    if (!track) continue;

    let folderPath = track.folderPath;
    let folderName = track.folder;

    // Si falta información de carpeta, derivarla de la ruta del archivo
    if (!folderPath || !folderName || folderName === 'Desconocida') {
      const info = extractFolderInfo(track.path || track.url);
      folderPath = folderPath || info.folderPath || 'root';
      folderName = folderName && folderName !== 'Desconocida' ? folderName : info.folder;
    }

    const folderKey = folderPath || folderName || 'Desconocida';

    if (!folderMap.has(folderKey)) {
      folderMap.set(folderKey, {
        id: folderKey,
        name: folderName || 'Desconocida',
        path: folderPath || '',
        songCount: 0,
        songs: [],
        artwork: null,
        totalDuration: 0,
      });
    }

    const folderItem = folderMap.get(folderKey);
    folderItem.songs.push(track);
    folderItem.songCount += 1;
    folderItem.totalDuration += typeof track.duration === 'number' ? track.duration : 0;

    // Asignar primera carátula disponible como arte de la carpeta
    if (!folderItem.artwork && track.artwork) {
      folderItem.artwork = track.artwork;
    }
  }

  // Convertir a lista y ordenar alfabéticamente por nombre de carpeta
  return Array.from(folderMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
};

/**
 * Escanea la biblioteca de música y devuelve la lista de carpetas organizadas.
 * @param {{ tracks?: Array<object>, includeBlacklisted?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export const scanMusicFolders = async (options = {}) => {
  const { tracks = null, ...scannerOptions } = options;

  let songList = tracks;
  if (!songList) {
    songList = await scanMusicFiles(scannerOptions);
  }

  return groupTracksByFolder(songList);
};

/**
 * Busca una carpeta específica por su ruta absoluta.
 * @param {string} folderPath
 * @param {Array<object>} [tracks]
 * @returns {Promise<object|null>}
 */
export const getFolderByPath = async (folderPath, tracks = null) => {
  if (!folderPath) return null;
  const folders = await scanMusicFolders({ tracks });
  return folders.find((f) => f.path === folderPath || f.id === folderPath) || null;
};

export default {
  groupTracksByFolder,
  scanMusicFolders,
  getFolderByPath,
};
