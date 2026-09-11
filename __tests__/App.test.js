import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Mock dependencies
jest.mock('../src/services/permissionService', () => ({
  __esModule: true,
  default: {
    requestInitialPermissions: jest.fn().mockResolvedValue({
      hasAudioAccess: true,
      hasNotificationAccess: true,
      apiLevel: 34,
    }),
    openBatteryOptimizationSettings: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../src/utils/musicScanner', () => ({
  __esModule: true,
  scanMusicFiles: jest.fn().mockResolvedValue([
    {
      id: '1',
      title: 'Canción de Prueba',
      artist: 'Artista Test',
      duration: 200,
      path: '/storage/emulated/0/Music/Song.mp3',
    },
  ]),
}));

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn().mockResolvedValue(true),
    getActiveTrackIndex: jest.fn().mockResolvedValue(0),
    updateOptions: jest.fn().mockResolvedValue(true),
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    play: jest.fn(),
    pause: jest.fn(),
    skipToNext: jest.fn(),
    skipToPrevious: jest.fn(),
    reset: jest.fn(),
    add: jest.fn(),
    skip: jest.fn(),
    seekTo: jest.fn(),
    getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 200 }),
    getActiveTrack: jest.fn().mockResolvedValue({ id: '1', title: 'Canción de Prueba' }),
    getPlaybackState: jest.fn().mockResolvedValue({ state: 'paused' }),
  },
  State: {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Buffering: 'buffering',
    Connecting: 'connecting',
  },
  AppKilledPlaybackBehavior: {
    StopPlaybackAndRemoveNotification: 'StopPlaybackAndRemoveNotification',
  },
  Capability: {
    Play: 0,
    Pause: 1,
    SkipToNext: 2,
    SkipToPrevious: 3,
    Stop: 4,
    SeekTo: 5,
  },
  Event: {
    PlaybackState: 'playback-state',
    PlaybackActiveTrackChanged: 'playback-active-track-changed',
    PlaybackProgressUpdated: 'playback-progress-updated',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteStop: 'remote-stop',
    RemoteSeek: 'remote-seek',
    RemoteDuck: 'remote-duck',
  },
}));

const mockStorageMap = new Map();
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn((k) => mockStorageMap.get(k) || null),
    set: jest.fn((k, v) => mockStorageMap.set(k, v)),
    delete: jest.fn((k) => mockStorageMap.delete(k)),
    clearAll: jest.fn(() => mockStorageMap.clear()),
  })),
}));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react');
  return {
    SafeAreaView: ({ children, style }) => mockReact.createElement('View', { style }, children),
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

describe('App Component Tests', () => {
  beforeEach(() => {
    jest.setTimeout(15000);
    mockStorageMap.clear();
    jest.clearAllMocks();
  });

  test('App se renderiza correctamente e inicializa la biblioteca de música', async () => {
    let tree;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<App />);
    });
    expect(tree).toBeDefined();
  });
});
