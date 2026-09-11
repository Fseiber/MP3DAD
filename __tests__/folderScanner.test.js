import {
  groupTracksByFolder,
  scanMusicFolders,
  getFolderByPath,
} from '../src/utils/folderScanner';

// Mock storage
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

describe('folderScanner Unit Tests', () => {
  const sampleTracks = [
    {
      id: '1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      duration: 354,
      path: '/storage/emulated/0/Music/Rock/Queen - Bohemian Rhapsody.mp3',
      folder: 'Rock',
      folderPath: '/storage/emulated/0/Music/Rock',
      artwork: 'content://artwork/1',
    },
    {
      id: '2',
      title: 'We Will Rock You',
      artist: 'Queen',
      duration: 122,
      path: '/storage/emulated/0/Music/Rock/Queen - We Will Rock You.mp3',
      folder: 'Rock',
      folderPath: '/storage/emulated/0/Music/Rock',
      artwork: 'content://artwork/2',
    },
    {
      id: '3',
      title: 'Hey Jude',
      artist: 'The Beatles',
      duration: 431,
      path: '/storage/emulated/0/Music/Beatles/Hey Jude.mp3',
      folder: 'Beatles',
      folderPath: '/storage/emulated/0/Music/Beatles',
      artwork: null,
    },
    {
      id: '4',
      title: 'Let It Be',
      artist: 'The Beatles',
      duration: 243,
      path: '/storage/emulated/0/Music/Beatles/Let It Be.mp3',
      folder: 'Beatles',
      folderPath: '/storage/emulated/0/Music/Beatles',
      artwork: 'content://artwork/4',
    },
    {
      id: '5',
      title: 'Balada para un loco',
      artist: 'Astor Piazzolla',
      duration: 250,
      path: '/storage/emulated/0/Music/Tango/Balada para un loco.mp3',
      folder: 'Tango',
      folderPath: '/storage/emulated/0/Music/Tango',
      artwork: null,
    },
  ];

  describe('groupTracksByFolder', () => {
    test('agrupa canciones por carpeta física y calcula recuentos y duraciones', () => {
      const folders = groupTracksByFolder(sampleTracks);

      // Esperamos 3 carpetas: Beatles, Rock, Tango ordenadas alfabéticamente
      expect(folders).toHaveLength(3);
      expect(folders.map((f) => f.name)).toEqual(['Beatles', 'Rock', 'Tango']);

      // Validar carpeta Beatles
      const beatlesFolder = folders.find((f) => f.name === 'Beatles');
      expect(beatlesFolder.songCount).toBe(2);
      expect(beatlesFolder.totalDuration).toBe(674); // 431 + 243
      expect(beatlesFolder.artwork).toBe('content://artwork/4'); // De la segunda canción con artwork
      expect(beatlesFolder.songs).toHaveLength(2);

      // Validar carpeta Rock
      const rockFolder = folders.find((f) => f.name === 'Rock');
      expect(rockFolder.songCount).toBe(2);
      expect(rockFolder.totalDuration).toBe(476); // 354 + 122
      expect(rockFolder.artwork).toBe('content://artwork/1'); // De la primera canción
      expect(rockFolder.songs).toHaveLength(2);

      // Validar carpeta Tango
      const tangoFolder = folders.find((f) => f.name === 'Tango');
      expect(tangoFolder.songCount).toBe(1);
      expect(tangoFolder.totalDuration).toBe(250);
      expect(tangoFolder.artwork).toBeNull();
    });

    test('retorna arreglo vacío si la lista de canciones está vacía', () => {
      expect(groupTracksByFolder([])).toEqual([]);
      expect(groupTracksByFolder(null)).toEqual([]);
    });

    test('extrae información de carpeta automáticamente si el objeto no tiene folder/folderPath', () => {
      const rawTracks = [
        {
          id: '10',
          title: 'Direct Track',
          duration: 200,
          path: '/storage/emulated/0/Music/Clásica/Mozart.mp3',
        },
      ];

      const folders = groupTracksByFolder(rawTracks);
      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe('Clásica');
      expect(folders[0].path).toBe('/storage/emulated/0/Music/Clásica');
    });
  });

  describe('scanMusicFolders y getFolderByPath', () => {
    test('scanMusicFolders agrupa las canciones pasadas por parámetro', async () => {
      const folders = await scanMusicFolders({ tracks: sampleTracks });
      expect(folders).toHaveLength(3);
    });

    test('getFolderByPath busca y devuelve la carpeta exacta correspondiente', async () => {
      const folder = await getFolderByPath('/storage/emulated/0/Music/Rock', sampleTracks);
      expect(folder).not.toBeNull();
      expect(folder.name).toBe('Rock');
      expect(folder.songCount).toBe(2);
    });

    test('getFolderByPath retorna null si la carpeta no existe', async () => {
      const folder = await getFolderByPath('/storage/emulated/0/Music/Inexistente', sampleTracks);
      expect(folder).toBeNull();
    });
  });
});
