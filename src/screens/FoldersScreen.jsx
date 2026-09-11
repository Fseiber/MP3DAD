import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { groupTracksByFolder } from '../utils/folderScanner';
import SongListItem from '../components/SongListItem';

/**
 * Formatea duración en minutos/horas.
 * @param {number} totalSeconds
 * @returns {string}
 */
const formatFolderDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h} h ${m} min`;
  }
  return `${m} min`;
};

const FoldersScreen = ({
  tracks = [],
  currentTrack,
  onSelectSong,
  onOptionsPress,
}) => {
  const [selectedFolder, setSelectedFolder] = useState(null);

  const folders = useMemo(() => {
    return groupTracksByFolder(tracks);
  }, [tracks]);

  // Si hay una carpeta seleccionada, mostrar la vista de detalle de la carpeta
  if (selectedFolder) {
    return (
      <View style={styles.container}>
        {/* Cabecera de la Carpeta */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedFolder(null)}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de carpetas">
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>
            📁 {selectedFolder.name}
          </Text>
          <Text style={styles.detailSubtitle}>
            {selectedFolder.songCount} canciones • {formatFolderDuration(selectedFolder.totalDuration)}
          </Text>
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={() => onSelectSong?.(selectedFolder.songs[0], selectedFolder.songs)}
            accessibilityRole="button"
            accessibilityLabel="Reproducir todas las canciones de esta carpeta">
            <Text style={styles.playAllButtonText}>▶ Reproducir Todo</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Canciones en la Carpeta */}
        <FlatList
          data={selectedFolder.songs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SongListItem
              title={item.title}
              artist={item.artist}
              duration={item.duration}
              isPlaying={currentTrack && String(currentTrack.id) === String(item.id)}
              onPress={() => onSelectSong?.(item, selectedFolder.songs)}
              onOptionsPress={() => onOptionsPress?.(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carpetas de Música</Text>
        <Text style={styles.headerSubtitle}>
          {folders.length} {folders.length === 1 ? 'carpeta encontrada' : 'carpetas encontradas'}
        </Text>
      </View>

      {folders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyTitle}>No se encontraron carpetas</Text>
          <Text style={styles.emptyText}>
            Tus archivos de música organizados por carpetas aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.folderCard}
              onPress={() => setSelectedFolder(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Carpeta ${item.name}, contiene ${item.songCount} canciones`}>
              <View style={styles.folderIconContainer}>
                <Text style={styles.folderIcon}>📂</Text>
              </View>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.folderDetails}>
                  {item.songCount} {item.songCount === 1 ? 'canción' : 'canciones'}
                  {item.totalDuration > 0 ? ` • ${formatFolderDuration(item.totalDuration)}` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1329',
  },
  header: {
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
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  folderIcon: {
    fontSize: 24,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  folderDetails: {
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
  backButton: {
    paddingVertical: 6,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default FoldersScreen;
