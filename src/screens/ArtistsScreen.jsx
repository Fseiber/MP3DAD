import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import SongListItem from '../components/SongListItem';

const ArtistsScreen = ({
  tracks = [],
  currentTrack,
  onSelectSong,
  onOptionsPress,
}) => {
  const [selectedArtist, setSelectedArtist] = useState(null);

  const artists = useMemo(() => {
    if (!Array.isArray(tracks)) return [];

    const artistMap = new Map();

    for (const track of tracks) {
      const artistName = track.artist || 'Artista Desconocido';
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          id: artistName,
          name: artistName,
          songs: [],
        });
      }
      artistMap.get(artistName).songs.push(track);
    }

    return Array.from(artistMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [tracks]);

  // Vista de detalle de canciones del artista seleccionado
  if (selectedArtist) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedArtist(null)}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de artistas">
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>
            👤 {selectedArtist.name}
          </Text>
          <Text style={styles.detailSubtitle}>
            {selectedArtist.songs.length} {selectedArtist.songs.length === 1 ? 'canción' : 'canciones'}
          </Text>
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={() => onSelectSong?.(selectedArtist.songs[0], selectedArtist.songs)}
            accessibilityRole="button"
            accessibilityLabel="Reproducir todas las canciones de este artista">
            <Text style={styles.playAllButtonText}>▶ Reproducir Todo</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedArtist.songs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SongListItem
              title={item.title}
              artist={item.artist}
              duration={item.duration}
              isPlaying={currentTrack && String(currentTrack.id) === String(item.id)}
              onPress={() => onSelectSong?.(item, selectedArtist.songs)}
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
        <Text style={styles.headerTitle}>Artistas</Text>
        <Text style={styles.headerSubtitle}>
          {artists.length} {artists.length === 1 ? 'artista' : 'artistas'} en tu colección
        </Text>
      </View>

      {artists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No hay artistas</Text>
          <Text style={styles.emptyText}>
            Tus canciones organizadas por artistas aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.artistCard}
              onPress={() => setSelectedArtist(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Artista ${item.name}, tiene ${item.songs.length} canciones`}>
              <View style={styles.artistIconContainer}>
                <Text style={styles.artistIcon}>👤</Text>
              </View>
              <View style={styles.artistInfo}>
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.artistCount}>
                  {item.songs.length} {item.songs.length === 1 ? 'canción' : 'canciones'}
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
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  artistIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  artistIcon: {
    fontSize: 22,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  artistCount: {
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

export default ArtistsScreen;
