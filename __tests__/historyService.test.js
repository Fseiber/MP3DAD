import {
  LONG_AUDIO_THRESHOLD_SEC,
  MAX_HISTORY_ITEMS,
  isLongAudio,
  savePlaybackPosition,
  getPlaybackPosition,
  clearPlaybackPosition,
  getAllSavedPositions,
  getPlaybackHistory,
  addToPlaybackHistory,
  removeFromPlaybackHistory,
  clearPlaybackHistory,
} from '../src/services/historyService';

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

describe('historyService Unit Tests', () => {
  beforeEach(() => {
    mockStorageMap.clear();
    jest.clearAllMocks();
  });

  describe('isLongAudio (Umbral de 15 minutos / 900s)', () => {
    test('identifica audios de 15 minutos o más en segundos', () => {
      expect(isLongAudio(LONG_AUDIO_THRESHOLD_SEC)).toBe(true); // 900s = 15 min
      expect(isLongAudio(1200)).toBe(true); // 20 min
      expect(isLongAudio(899)).toBe(false); // 14 min 59 s
      expect(isLongAudio(180)).toBe(false); // 3 min
    });

    test('identifica audios de 15 minutos o más en milisegundos', () => {
      expect(isLongAudio(900000)).toBe(true); // 900,000 ms
      expect(isLongAudio(1800000)).toBe(true); // 30 min en ms
      expect(isLongAudio(899000)).toBe(false);
    });

    test('retorna false para valores inválidos o cero', () => {
      expect(isLongAudio(0)).toBe(false);
      expect(isLongAudio(-100)).toBe(false);
      expect(isLongAudio(null)).toBe(false);
      expect(isLongAudio(undefined)).toBe(false);
    });
  });

  describe('Persistencia de Posición en Enganchados Largos', () => {
    test('guarda y recupera la posición de reproducción para audios >= 15 min', () => {
      const trackId = 'enganchado-cumbia-1';
      const duration = 1800; // 30 minutos
      const position = 650; // minuto 10:50

      const saved = savePlaybackPosition(trackId, position, duration);
      expect(saved).toBe(true);

      const retrieved = getPlaybackPosition(trackId);
      expect(retrieved).toBe(650);

      const all = getAllSavedPositions();
      expect(all[trackId]).toEqual(
        expect.objectContaining({
          position: 650,
          duration: 1800,
          updatedAt: expect.any(Number),
        }),
      );
    });

    test('no guarda la posición para canciones cortas (< 15 min)', () => {
      const trackId = 'cancion-corta';
      const duration = 210; // 3.5 minutos
      const position = 100;

      const saved = savePlaybackPosition(trackId, position, duration);
      expect(saved).toBe(false);
      expect(getPlaybackPosition(trackId)).toBe(0);
    });

    test('resetea la posición guardada si el audio está en los últimos 10 segundos o superó el 98%', () => {
      const trackId = 'enganchado-rock';
      const duration = 1000; // 1000 segundos

      // Guardar posición intermedia
      savePlaybackPosition(trackId, 500, duration);
      expect(getPlaybackPosition(trackId)).toBe(500);

      // Ahora el usuario llega casi al final (segundo 995 de 1000)
      savePlaybackPosition(trackId, 995, duration);
      expect(getPlaybackPosition(trackId)).toBe(0); // Reseteado
    });

    test('clearPlaybackPosition elimina la posición guardada', () => {
      const trackId = 'enganchado-folclore';
      savePlaybackPosition(trackId, 400, 1200);
      expect(getPlaybackPosition(trackId)).toBe(400);

      clearPlaybackPosition(trackId);
      expect(getPlaybackPosition(trackId)).toBe(0);
    });
  });

  describe('Historial de Reproducción (Playback History)', () => {
    test('agrega canciones al historial deduplicando y priorizando la más reciente', () => {
      const trackA = { id: 'track-A', title: 'Canción A', artist: 'Artista A' };
      const trackB = { id: 'track-B', title: 'Canción B', artist: 'Artista B' };

      addToPlaybackHistory(trackA);
      addToPlaybackHistory(trackB);

      let history = getPlaybackHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('track-B');
      expect(history[1].id).toBe('track-A');

      // Re-reproducir Canción A
      addToPlaybackHistory(trackA);
      history = getPlaybackHistory();

      expect(history).toHaveLength(2); // Sin duplicados
      expect(history[0].id).toBe('track-A'); // Pasó al primer puesto
      expect(history[1].id).toBe('track-B');
      expect(history[0].playedAt).toBeDefined();
    });

    test('limita el historial a MAX_HISTORY_ITEMS (50 temas)', () => {
      for (let i = 1; i <= 60; i++) {
        addToPlaybackHistory({ id: `song-${i}`, title: `Canción ${i}` });
      }

      const history = getPlaybackHistory();
      expect(history).toHaveLength(MAX_HISTORY_ITEMS);
      expect(history[0].id).toBe('song-60');
      expect(history[49].id).toBe('song-11');
    });

    test('removeFromPlaybackHistory elimina una canción del historial', () => {
      addToPlaybackHistory({ id: 'song-1', title: '1' });
      addToPlaybackHistory({ id: 'song-2', title: '2' });

      removeFromPlaybackHistory('song-1');
      const history = getPlaybackHistory();

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('song-2');
    });

    test('clearPlaybackHistory vacía el historial por completo', () => {
      addToPlaybackHistory({ id: 'song-1', title: '1' });
      addToPlaybackHistory({ id: 'song-2', title: '2' });

      clearPlaybackHistory();
      expect(getPlaybackHistory()).toEqual([]);
    });
  });
});
