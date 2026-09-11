import {
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
} from '../src/services/storageService';

// Mock react-native-mmkv
const mockStorageMap = new Map();

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn((key) => mockStorageMap.get(key) || null),
      set: jest.fn((key, value) => {
        mockStorageMap.set(key, value);
      }),
      delete: jest.fn((key) => {
        mockStorageMap.delete(key);
      }),
      clearAll: jest.fn(() => {
        mockStorageMap.clear();
      }),
    })),
  };
});

describe('storageService Unit Tests', () => {
  beforeEach(() => {
    mockStorageMap.clear();
    jest.clearAllMocks();
  });

  describe('Operaciones Básicas get / set / remove', () => {
    test('guarda y recupera datos serializados en JSON correctamente', () => {
      const data = { name: 'Mi Playlist', id: 1 };
      const success = setStoredItem('test_key', data);

      expect(success).toBe(true);
      expect(getStoredItem('test_key')).toEqual(data);
    });

    test('retorna defaultValue si la clave no existe o hay error', () => {
      expect(getStoredItem('non_existent', 'default_val')).toBe('default_val');
    });

    test('removeStoredItem elimina la clave', () => {
      setStoredItem('temp_key', { temp: true });
      expect(getStoredItem('temp_key')).toEqual({ temp: true });

      removeStoredItem('temp_key');
      expect(getStoredItem('temp_key')).toBeNull();
    });
  });

  describe('Gestión de Blacklist (Canciones Ocultas)', () => {
    test('agrega IDs a la blacklist sin duplicados', () => {
      addToBlacklist('song-1');
      addToBlacklist({ id: 'song-2', title: 'Song 2' });
      addToBlacklist('song-1'); // duplicado

      const blacklist = getBlacklist();
      expect(blacklist).toEqual(['song-1', 'song-2']);
      expect(isBlacklisted('song-1')).toBe(true);
      expect(isBlacklisted('song-2')).toBe(true);
      expect(isBlacklisted('song-3')).toBe(false);
    });

    test('remueve una canción de la blacklist', () => {
      addToBlacklist('song-1');
      addToBlacklist('song-2');

      removeFromBlacklist({ id: 'song-1' });
      expect(getBlacklist()).toEqual(['song-2']);
      expect(isBlacklisted('song-1')).toBe(false);
      expect(isBlacklisted('song-2')).toBe(true);
    });

    test('clearBlacklist vacía la lista negra por completo', () => {
      addToBlacklist('song-1');
      addToBlacklist('song-2');

      clearBlacklist();
      expect(getBlacklist()).toEqual([]);
    });
  });

  describe('Timestamps de Detección (First Seen)', () => {
    test('registra timestamps para nuevas canciones y preserva canciones existentes', () => {
      const t1 = 1600000000000;
      const t2 = 1700000000000;

      // Primer escaneo con song-1
      recordSongTimestamps(['song-1'], t1);
      expect(getSongFirstSeen('song-1')).toBe(t1);

      // Segundo escaneo con song-1 y song-2 en fecha posterior
      recordSongTimestamps([{ id: 'song-1' }, { id: 'song-2' }], t2);

      expect(getSongFirstSeen('song-1')).toBe(t1); // No cambia
      expect(getSongFirstSeen('song-2')).toBe(t2); // Nueva fecha
    });

    test('getSongFirstSeen retorna null si la canción no ha sido registrada', () => {
      expect(getSongFirstSeen('untracked-song')).toBeNull();
    });
  });

  describe('Limpieza de Datos Huérfanos (cleanOrphanData)', () => {
    test('elimina timestamps, historial, favoritos y pistas en playlists de canciones que ya no existen', () => {
      // Configurar estado previo
      setSongTimestamps({
        'song-1': 1000,
        'song-2': 2000,
        'deleted-song-3': 3000,
      });

      setStoredItem(StorageKeys.LAST_PLAYED, [
        { id: 'song-1', title: 'Canción 1' },
        { id: 'deleted-song-3', title: 'Canción Borrada' },
      ]);

      setStoredItem(StorageKeys.FAVORITES, [
        { id: 'song-2', title: 'Canción 2' },
        { id: 'deleted-song-3', title: 'Canción Borrada' },
      ]);

      setStoredItem(StorageKeys.PLAYLISTS, [
        {
          id: 'pl-1',
          name: 'Favoritas',
          tracks: [
            { id: 'song-1' },
            { id: 'deleted-song-3' },
          ],
        },
      ]);

      // Solo 'song-1' y 'song-2' siguen existiendo en el disco
      const activeSongs = [{ id: 'song-1' }, { id: 'song-2' }];
      const result = cleanOrphanData(activeSongs);

      expect(result).toEqual({
        cleanedTimestampsCount: 1,
        cleanedHistoryCount: 1,
        cleanedFavoritesCount: 1,
        cleanedPlaylistsTracksCount: 1,
      });

      // Validar persistencia limpia
      expect(getSongTimestamps()).toEqual({
        'song-1': 1000,
        'song-2': 2000,
      });

      expect(getStoredItem(StorageKeys.LAST_PLAYED)).toEqual([
        { id: 'song-1', title: 'Canción 1' },
      ]);

      expect(getStoredItem(StorageKeys.FAVORITES)).toEqual([
        { id: 'song-2', title: 'Canción 2' },
      ]);

      const updatedPlaylists = getStoredItem(StorageKeys.PLAYLISTS);
      expect(updatedPlaylists[0].tracks).toEqual([{ id: 'song-1' }]);
    });
  });
});
