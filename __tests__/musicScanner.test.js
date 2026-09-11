import { NativeModules, Platform } from 'react-native';
import {
  isShortAudio,
  isWhatsAppOrNoiseFile,
  extractFilenameWithoutExtension,
  extractFolderInfo,
  normalizeTrack,
  filterMusicTracks,
  scanMusicFiles,
} from '../src/utils/musicScanner';
import { addToBlacklist, clearBlacklist } from '../src/services/storageService';

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

describe('musicScanner Unit Tests', () => {
  beforeEach(() => {
    mockStorageMap.clear();
    clearBlacklist();
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('isShortAudio (< 30s)', () => {
    test('detecta audios menores a 30 segundos (en ms y en s)', () => {
      expect(isShortAudio(15000)).toBe(true); // 15s en ms
      expect(isShortAudio(29999)).toBe(true); // 29.99s en ms
      expect(isShortAudio(25)).toBe(true); // 25s
      expect(isShortAudio(0)).toBe(true);
      expect(isShortAudio(-100)).toBe(true);
      expect(isShortAudio(null)).toBe(true);
    });

    test('acepta audios de 30 segundos o más', () => {
      expect(isShortAudio(30000)).toBe(false); // 30s exactos
      expect(isShortAudio(180000)).toBe(false); // 3 minutos
      expect(isShortAudio(45)).toBe(false); // 45s
    });
  });

  describe('isWhatsAppOrNoiseFile Heuristics', () => {
    test('identifica notas de voz y audios de WhatsApp por patrón de nombre', () => {
      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Download/AUD-20231015-WA0001.mp3',
          title: 'AUD-20231015-WA0001',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Download/PTT-20240101-WA0005.opus',
          title: 'PTT-20240101-WA0005',
        }),
      ).toBe(true);
    });

    test('identifica carpetas de WhatsApp, Telegram, notificaciones, grabaciones y tonos', () => {
      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio/audio.mp3',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Telegram/Audio/voice_message.ogg',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Notifications/beep.mp3',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Ringtones/marimba.mp3',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Alarms/alarm_clock.mp3',
        }),
      ).toBe(true);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Recordings/Voice_001.m4a',
        }),
      ).toBe(true);
    });

    test('no clasifica como ruido a canciones legítimas', () => {
      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Music/The Beatles/Hey Jude.mp3',
          title: 'Hey Jude',
          folder: 'The Beatles',
        }),
      ).toBe(false);

      expect(
        isWhatsAppOrNoiseFile({
          path: '/storage/emulated/0/Download/Queen - Bohemian Rhapsody.mp3',
          title: 'Bohemian Rhapsody',
          folder: 'Download',
        }),
      ).toBe(false);
    });
  });

  describe('Extracción de nombres y carpetas', () => {
    test('extractFilenameWithoutExtension obtiene el nombre sin extensión', () => {
      expect(
        extractFilenameWithoutExtension('/storage/emulated/0/Music/Track 01.mp3'),
      ).toBe('Track 01');
      expect(
        extractFilenameWithoutExtension('C:\\Music\\Folder\\Song.flac'),
      ).toBe('Song');
    });

    test('extractFolderInfo extrae nombre de carpeta y ruta', () => {
      const result = extractFolderInfo('/storage/emulated/0/Music/Rock/Song.mp3');
      expect(result).toEqual({
        folder: 'Rock',
        folderPath: '/storage/emulated/0/Music/Rock',
      });
    });
  });

  describe('normalizeTrack y filterMusicTracks', () => {
    const rawSampleData = [
      {
        id: '1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera',
        duration: 354000,
        path: '/storage/emulated/0/Music/Rock/Queen - Bohemian Rhapsody.mp3',
      },
      {
        id: '2',
        title: 'Short Sound',
        artist: 'Unknown',
        duration: 5000, // 5 segundos -> debe filtrarse
        path: '/storage/emulated/0/Music/Effects/sound.mp3',
      },
      {
        id: '3',
        title: 'AUD-20231015-WA0001',
        artist: '<unknown>',
        duration: 45000, // 45s pero nombre WhatsApp -> debe filtrarse
        path: '/storage/emulated/0/WhatsApp/Media/AUD-20231015-WA0001.mp3',
      },
      {
        id: '4',
        title: 'Hey Jude',
        artist: 'The Beatles',
        album: 'Past Masters',
        duration: 431000,
        path: '/storage/emulated/0/Music/The Beatles/Hey Jude.mp3',
      },
      {
        id: '5',
        title: 'Canción Oculta',
        artist: 'Artista',
        duration: 120000,
        path: '/storage/emulated/0/Music/Canción Oculta.mp3',
      },
    ];

    test('filtra ruidos, audios cortos y canciones en blacklist', () => {
      addToBlacklist('5'); // Ocultar id 5

      const result = filterMusicTracks(rawSampleData);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['1', '4']);
      expect(result[0].title).toBe('Bohemian Rhapsody');
      expect(result[0].duration).toBe(354); // Convertido a segundos
      expect(result[0].firstSeen).toBeDefined();
      expect(result[0].folder).toBe('Rock');
    });

    test('normalizeTrack asigna fallbacks de metadatos cuando están vacíos o son <unknown>', () => {
      const raw = {
        id: '99',
        title: '<unknown>',
        artist: '<unknown>',
        album: '',
        duration: 180000,
        path: '/storage/emulated/0/Music/Pop/SingleTrack.mp3',
      };

      const normalized = normalizeTrack(raw, { '99': 1500000000000 });
      expect(normalized.id).toBe('99');
      expect(normalized.title).toBe('SingleTrack');
      expect(normalized.artist).toBe('Artista Desconocido');
      expect(normalized.album).toBe('Álbum Desconocido');
      expect(normalized.duration).toBe(180);
      expect(normalized.firstSeen).toBe(1500000000000);
      expect(normalized.folder).toBe('Pop');
    });

    test('permite incluir blacklist si includeBlacklisted es true', () => {
      addToBlacklist('5');

      const result = filterMusicTracks(rawSampleData, { includeBlacklisted: true });
      expect(result.map((t) => t.id)).toEqual(['1', '4', '5']);
    });
  });

  describe('scanMusicFiles con NativeModules y Fallback', () => {
    test('consulta NativeModules.MusicScanner si está disponible en Android', async () => {
      NativeModules.MusicScanner = {
        scanAudioFiles: jest.fn().mockResolvedValue([
          {
            id: '10',
            title: 'Hotel California',
            artist: 'Eagles',
            duration: 390000,
            path: '/storage/emulated/0/Music/Eagles/Hotel California.mp3',
          },
        ]),
      };

      const result = await scanMusicFiles();

      expect(NativeModules.MusicScanner.scanAudioFiles).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Hotel California');
    });

    test('utiliza fallbackData si se proporciona', async () => {
      const fallback = [
        {
          id: '20',
          title: 'Imagine',
          artist: 'John Lennon',
          duration: 183000,
          path: '/storage/emulated/0/Music/John Lennon/Imagine.mp3',
        },
      ];

      const result = await scanMusicFiles({ fallbackData: fallback });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Imagine');
    });
  });
});
