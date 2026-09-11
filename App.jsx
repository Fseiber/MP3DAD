import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import permissionService from './src/services/permissionService';
import {
  addToBlacklist,
  StorageKeys,
  getStoredItem,
  setStoredItem,
} from './src/services/storageService';
import trackPlayerService, {
  playTrack,
  togglePlayPause,
  skipToNext,
  skipToPrevious,
} from './src/services/trackPlayerService';
import { scanMusicFiles } from './src/utils/musicScanner';

import SearchBar from './src/components/SearchBar';
import SongListItem from './src/components/SongListItem';
import MiniPlayer from './src/components/MiniPlayer';
import SongOptionsModal from './src/components/SongOptionsModal';

import FoldersScreen from './src/screens/FoldersScreen';
import ArtistsScreen from './src/screens/ArtistsScreen';
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import RecentScreen from './src/screens/RecentScreen';
import HiddenSongsScreen from './src/screens/HiddenSongsScreen';

const MENU_ITEMS = [
  { id: 'songs', title: 'Todas las Canciones', icon: '🎵' },
  { id: 'folders', title: 'Carpetas', icon: '📁' },
  { id: 'artists', title: 'Artistas', icon: '👤' },
  { id: 'playlists', title: 'Listas de Reproducción', icon: '📑' },
  { id: 'recent', title: 'Canciones Recientes', icon: '🕒' },
  { id: 'hidden', title: 'Canciones Ocultas', icon: '🚫' },
];

const App = () => {
  const [permissionState, setPermissionState] = useState({
    checked: false,
    hasAudio: false,
    hasNotification: false,
    apiLevel: 0,
  });

  const [currentScreen, setCurrentScreen] = useState('songs');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [tracks, setTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);

  const [selectedSongForOptions, setSelectedSongForOptions] = useState(null);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);

  // Escaneo de canciones locales
  const loadMusicLibrary = useCallback(async () => {
    setIsLoadingTracks(true);
    try {
      const musicList = await scanMusicFiles({ includeBlacklisted: false });
      setTracks(musicList);
    } catch (error) {
      console.warn('[App] Error al escanear canciones:', error);
    } finally {
      setIsLoadingTracks(false);
    }
  }, []);

  // Verificación de permisos y arranque
  const checkAndRequest = useCallback(async () => {
    const result = await permissionService.requestInitialPermissions();
    setPermissionState({
      checked: true,
      hasAudio: result.hasAudioAccess,
      hasNotification: result.hasNotificationAccess,
      apiLevel: result.apiLevel,
    });

    if (result.hasAudioAccess) {
      await trackPlayerService.setupPlayer();
      await loadMusicLibrary();
    }
  }, [loadMusicLibrary]);

  useEffect(() => {
    checkAndRequest();
  }, [checkAndRequest]);

  // Sincronización de eventos de TrackPlayer
  useEffect(() => {
    const stateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event) => {
        setIsPlaying(event.state === State.Playing);
      },
    );

    const trackListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (event.track) {
          setCurrentTrack(event.track);
          setTrackDuration(event.track.duration || 0);
        }
      },
    );

    const progressListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (event) => {
        setPlaybackPosition(event.position);
        if (event.duration > 0) {
          setTrackDuration(event.duration);
        }
      },
    );

    return () => {
      stateListener.remove();
      trackListener.remove();
      progressListener.remove();
    };
  }, []);

  // Filtrado de canciones por búsqueda
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.folder && t.folder.toLowerCase().includes(q)),
    );
  }, [tracks, searchQuery]);

  // Manejo de reproducción
  const handleSelectSong = async (track, queue = null) => {
    setCurrentTrack(track);
    setTrackDuration(track.duration || 0);
    setPlaybackPosition(0);
    setIsPlaying(true);
    await playTrack(track, queue || filteredTracks);
  };

  const handleTogglePlayPause = async () => {
    if (!currentTrack && tracks.length > 0) {
      await handleSelectSong(tracks[0], tracks);
      return;
    }
    await togglePlayPause();
    setIsPlaying(!isPlaying);
  };

  const handleNext = async () => {
    await skipToNext();
  };

  const handlePrevious = async () => {
    await skipToPrevious();
  };

  // Ocultar canción (Blacklist)
  const handleHideSong = (song) => {
    addToBlacklist(song.id);
    loadMusicLibrary();
    Alert.alert(
      'Canción Ocultada',
      `"${song.title}" ha sido oculta. Puedes restaurarla cuando quieras desde el menú "Canciones Ocultas".`,
    );
  };

  // Agregar canción a Playlist
  const handleOpenPlaylistPicker = (song) => {
    setSelectedSongForOptions(song);
    setPlaylistPickerVisible(true);
  };

  const handleAddSongToPlaylist = (playlist) => {
    if (!selectedSongForOptions) return;

    const playlists = getStoredItem(StorageKeys.PLAYLISTS, []);
    const target = playlists.find((p) => p.id === playlist.id);

    if (!target) return;

    // Evitar duplicados en la misma playlist
    const alreadyExists = target.tracks?.some(
      (t) => String(t.id) === String(selectedSongForOptions.id),
    );

    if (alreadyExists) {
      Alert.alert('Información', 'Esta canción ya se encuentra en la lista seleccionada.');
      setPlaylistPickerVisible(false);
      return;
    }

    const updatedTracks = [...(target.tracks || []), selectedSongForOptions];
    const updatedPlaylists = playlists.map((p) =>
      p.id === playlist.id ? { ...p, tracks: updatedTracks } : p,
    );

    setStoredItem(StorageKeys.PLAYLISTS, updatedPlaylists);
    setPlaylistPickerVisible(false);
    Alert.alert('Listo', `"${selectedSongForOptions.title}" se agregó a "${playlist.name}".`);
  };

  // Título del header dinámico
  const currentMenuTitle = useMemo(() => {
    const item = MENU_ITEMS.find((m) => m.id === currentScreen);
    return item ? item.title : 'MP3DAD';
  }, [currentScreen]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1329" />

      {/* Cabecera Principal con Menú Hamburguesa y Ajuste de Batería */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsDrawerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú de navegación"
            accessibilityHint="Muestra las secciones: Canciones, Carpetas, Artistas, Listas, Recientes y Ocultas">
            <Text style={styles.menuButtonIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.appTitle}>MP3DAD</Text>
            <Text style={styles.screenSubtitle} numberOfLines={1}>
              {currentMenuTitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.batteryButton}
          onPress={() => permissionService.openBatteryOptimizationSettings()}
          accessibilityRole="button"
          accessibilityLabel="Ajuste de batería"
          accessibilityHint="Abre ajustes para evitar que la música se detenga al apagar la pantalla">
          <Text style={styles.batteryButtonIcon}>⚡</Text>
          <Text style={styles.batteryButtonText}>Batería</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda (visible en pantalla de canciones) */}
      {currentScreen === 'songs' && permissionState.hasAudio && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      )}

      {/* Contenido Principal según el estado de permisos y pantalla activa */}
      <View style={styles.content}>
        {!permissionState.hasAudio && permissionState.checked ? (
          <View style={styles.permissionCard}>
            <Text style={styles.cardTitle}>Permiso Requerido</Text>
            <Text style={styles.cardText}>
              Para poder leer tus canciones guardadas en el teléfono, necesitamos que concedas el permiso de almacenamiento/audio.
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={checkAndRequest}>
              <Text style={styles.actionButtonText}>Otorgar Permiso</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pantalla 1: Todas las canciones */}
            {currentScreen === 'songs' && (
              <View style={styles.songsContainer}>
                <View style={styles.songsHeaderRow}>
                  <Text style={styles.songsCountText}>
                    {filteredTracks.length} {filteredTracks.length === 1 ? 'canción' : 'canciones'}
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={loadMusicLibrary}
                    disabled={isLoadingTracks}
                    accessibilityRole="button"
                    accessibilityLabel="Actualizar biblioteca de música">
                    <Text style={styles.refreshButtonText}>
                      {isLoadingTracks ? 'Buscando...' : '🔄 Actualizar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingTracks ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#38BDF8" />
                    <Text style={styles.loadingText}>Buscando música en el dispositivo...</Text>
                  </View>
                ) : filteredTracks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🎵</Text>
                    <Text style={styles.emptyTitle}>
                      {searchQuery ? 'No se encontraron resultados' : 'No se encontraron canciones'}
                    </Text>
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? 'Intenta con otro término de búsqueda.'
                        : 'Asegúrate de tener archivos MP3 o audios guardados en tu teléfono.'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredTracks}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <SongListItem
                        title={item.title}
                        artist={item.artist}
                        duration={item.duration}
                        isPlaying={currentTrack && String(currentTrack.id) === String(item.id)}
                        onPress={() => handleSelectSong(item, filteredTracks)}
                        onOptionsPress={() => setSelectedSongForOptions(item)}
                      />
                    )}
                    contentContainerStyle={styles.listContent}
                  />
                )}
              </View>
            )}

            {/* Pantalla 2: Carpetas */}
            {currentScreen === 'folders' && (
              <FoldersScreen
                tracks={tracks}
                currentTrack={currentTrack}
                onSelectSong={handleSelectSong}
                onOptionsPress={(song) => setSelectedSongForOptions(song)}
              />
            )}

            {/* Pantalla 3: Artistas */}
            {currentScreen === 'artists' && (
              <ArtistsScreen
                tracks={tracks}
                currentTrack={currentTrack}
                onSelectSong={handleSelectSong}
                onOptionsPress={(song) => setSelectedSongForOptions(song)}
              />
            )}

            {/* Pantalla 4: Listas de Reproducción */}
            {currentScreen === 'playlists' && (
              <PlaylistsScreen
                currentTrack={currentTrack}
                onSelectSong={handleSelectSong}
                onOptionsPress={(song) => setSelectedSongForOptions(song)}
              />
            )}

            {/* Pantalla 5: Canciones Recientes */}
            {currentScreen === 'recent' && (
              <RecentScreen
                currentTrack={currentTrack}
                onSelectSong={handleSelectSong}
                onOptionsPress={(song) => setSelectedSongForOptions(song)}
              />
            )}

            {/* Pantalla 6: Canciones Ocultas */}
            {currentScreen === 'hidden' && (
              <HiddenSongsScreen
                allTracks={tracks}
                onRestore={loadMusicLibrary}
              />
            )}
          </>
        )}
      </View>

      {/* Mini Player Fijo en la parte inferior */}
      <MiniPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        position={playbackPosition}
        duration={trackDuration}
        onPlayPause={handleTogglePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onPress={() => {
          if (!currentTrack && tracks.length > 0) {
            handleSelectSong(tracks[0], tracks);
          }
        }}
      />

      {/* Modal Lateral / Menú Hamburguesa */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={() => setIsDrawerOpen(false)}>
          <View
            style={styles.drawerContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>MP3DAD</Text>
              <Text style={styles.drawerSubtitle}>Menú Principal</Text>
            </View>

            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => {
                      setCurrentScreen(item.id);
                      setIsDrawerOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}>
                    <Text style={styles.menuItemIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.menuItemText,
                        isActive && styles.menuItemTextActive,
                      ]}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.drawerCloseButton}
              onPress={() => setIsDrawerOpen(false)}>
              <Text style={styles.drawerCloseText}>Cerrar Menú</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Opciones de Canción */}
      <SongOptionsModal
        visible={!!selectedSongForOptions && !playlistPickerVisible}
        song={selectedSongForOptions}
        onClose={() => setSelectedSongForOptions(null)}
        onHideSong={handleHideSong}
        onAddToPlaylist={handleOpenPlaylistPicker}
      />

      {/* Modal Selector de Playlist para Agregar Canción */}
      <Modal
        visible={playlistPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerDialog}>
            <Text style={styles.pickerTitle}>Agregar a Lista</Text>
            <Text style={styles.pickerSubtitle} numberOfLines={1}>
              {selectedSongForOptions?.title}
            </Text>

            {(() => {
              const playlists = getStoredItem(StorageKeys.PLAYLISTS, []);
              if (!playlists || playlists.length === 0) {
                return (
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>
                      No tienes listas creadas aún. Puedes crear una desde la sección "Listas de Reproducción".
                    </Text>
                  </View>
                );
              }
              return (
                <FlatList
                  data={playlists}
                  keyExtractor={(p) => p.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => handleAddSongToPlaylist(item)}>
                      <Text style={styles.pickerItemIcon}>📑</Text>
                      <Text style={styles.pickerItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.pickerList}
                />
              );
            })()}

            <TouchableOpacity
              style={styles.pickerCancelButton}
              onPress={() => setPlaylistPickerVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1329',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuButtonIcon: {
    fontSize: 24,
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  batteryButton: {
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  batteryButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  batteryButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  songsContainer: {
    flex: 1,
  },
  songsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  songsCountText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  permissionCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    margin: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FCA5A5',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 20,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
  },
  drawerContent: {
    width: '80%',
    height: '100%',
    backgroundColor: '#0F172A',
    padding: 24,
    borderRightWidth: 2,
    borderRightColor: '#38BDF8',
  },
  drawerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 16,
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38BDF8',
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  menuItemActive: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  menuItemIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  menuItemTextActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  drawerCloseButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawerCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerDialog: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  pickerEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  pickerEmptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerItemName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerCancelButton: {
    marginTop: 16,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerList: {
    maxHeight: 240,
  },
});

export default App;
