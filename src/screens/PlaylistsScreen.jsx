import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { StorageKeys, getStoredItem, setStoredItem } from '../services/storageService';
import SongListItem from '../components/SongListItem';

const PlaylistsScreen = ({
  currentTrack,
  onSelectSong,
  onOptionsPress,
}) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const loadPlaylists = () => {
    const list = getStoredItem(StorageKeys.PLAYLISTS, []);
    setPlaylists(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleCreatePlaylist = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para tu lista.');
      return;
    }

    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name: trimmed,
      createdAt: Date.now(),
      tracks: [],
    };

    const updated = [newPlaylist, ...playlists];
    setStoredItem(StorageKeys.PLAYLISTS, updated);
    setPlaylists(updated);
    setNewPlaylistName('');
    setCreateModalVisible(false);
  };

  const handleDeletePlaylist = (playlist) => {
    Alert.alert(
      'Eliminar Lista',
      `¿Seguro que deseas eliminar la lista "${playlist.name}"? Los archivos de audio no se borrarán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = playlists.filter((p) => p.id !== playlist.id);
            setStoredItem(StorageKeys.PLAYLISTS, updated);
            setPlaylists(updated);
            if (selectedPlaylist && selectedPlaylist.id === playlist.id) {
              setSelectedPlaylist(null);
            }
          },
        },
      ],
    );
  };

  const handleRemoveTrackFromPlaylist = (track) => {
    if (!selectedPlaylist) return;

    const updatedTracks = selectedPlaylist.tracks.filter(
      (t) => String(t.id) !== String(track.id),
    );
    const updatedPlaylist = { ...selectedPlaylist, tracks: updatedTracks };
    const updatedList = playlists.map((p) =>
      p.id === selectedPlaylist.id ? updatedPlaylist : p,
    );

    setStoredItem(StorageKeys.PLAYLISTS, updatedList);
    setPlaylists(updatedList);
    setSelectedPlaylist(updatedPlaylist);
  };

  // Vista de detalle de la lista seleccionada
  if (selectedPlaylist) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <View style={styles.detailTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                loadPlaylists();
                setSelectedPlaylist(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Volver a las listas">
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deletePlaylistButton}
              onPress={() => handleDeletePlaylist(selectedPlaylist)}
              accessibilityRole="button"
              accessibilityLabel="Eliminar esta lista">
              <Text style={styles.deletePlaylistText}>Eliminar Lista</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailTitle} numberOfLines={1}>
            📑 {selectedPlaylist.name}
          </Text>
          <Text style={styles.detailSubtitle}>
            {selectedPlaylist.tracks?.length || 0} canciones
          </Text>

          {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 && (
            <TouchableOpacity
              style={styles.playAllButton}
              onPress={() =>
                onSelectSong?.(selectedPlaylist.tracks[0], selectedPlaylist.tracks)
              }
              accessibilityRole="button"
              accessibilityLabel="Reproducir lista completa">
              <Text style={styles.playAllButtonText}>▶ Reproducir Lista</Text>
            </TouchableOpacity>
          )}
        </View>

        {(!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0) ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyTitle}>Esta lista está vacía</Text>
            <Text style={styles.emptyText}>
              Usa el botón de 3 puntos (⋮) en cualquier canción de tu biblioteca para agregarla aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedPlaylist.tracks}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <SongListItem
                title={item.title}
                artist={item.artist}
                duration={item.duration}
                isPlaying={currentTrack && String(currentTrack.id) === String(item.id)}
                onPress={() => onSelectSong?.(item, selectedPlaylist.tracks)}
                onOptionsPress={() => handleRemoveTrackFromPlaylist(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Listas de Reproducción</Text>
          <Text style={styles.headerSubtitle}>
            {playlists.length} {playlists.length === 1 ? 'lista creada' : 'listas creadas'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva lista de reproducción">
          <Text style={styles.createButtonText}>➕ Nueva Lista</Text>
        </TouchableOpacity>
      </View>

      {playlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📑</Text>
          <Text style={styles.emptyTitle}>No tienes listas aún</Text>
          <Text style={styles.emptyText}>
            Presiona el botón "➕ Nueva Lista" para armar tus recopilaciones de música favoritas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistCard}
              onPress={() => setSelectedPlaylist(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Lista ${item.name}, contiene ${item.tracks?.length || 0} canciones`}>
              <View style={styles.playlistIconContainer}>
                <Text style={styles.playlistIcon}>📑</Text>
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.playlistCount}>
                  {item.tracks?.length || 0} {item.tracks?.length === 1 ? 'canción' : 'canciones'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal para Crear Nueva Lista */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={styles.dialogTitle}>Nueva Lista de Reproducción</Text>
            <TextInput
              style={styles.dialogInput}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Ej. Mis Favoritas, Folclore, Rock 80s..."
              placeholderTextColor="#64748B"
              autoFocus
              maxLength={40}
              accessibilityLabel="Nombre de la nueva lista"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelButton}
                onPress={() => {
                  setNewPlaylistName('');
                  setCreateModalVisible(false);
                }}>
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmButton}
                onPress={handleCreatePlaylist}>
                <Text style={styles.dialogConfirmText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  createButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  playlistIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  playlistIcon: {
    fontSize: 22,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
    color: '#94A3B8',
  },
  chevron: {
    fontSize: 24,
    color: '#64748B',
    marginLeft: 8,
  },
  detailHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deletePlaylistButton: {
    paddingVertical: 6,
  },
  deletePlaylistText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 14,
  },
  playAllButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  playAllButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dialogInput: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  dialogCancelText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogConfirmButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dialogConfirmText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlaylistsScreen;
