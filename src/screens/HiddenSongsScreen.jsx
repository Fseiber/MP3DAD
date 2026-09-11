import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  getBlacklist,
  removeFromBlacklist,
  clearBlacklist,
} from '../services/storageService';

const HiddenSongsScreen = ({ allTracks = [], onRestore }) => {
  const [blacklistIds, setBlacklistIds] = useState([]);

  const loadBlacklist = () => {
    const list = getBlacklist();
    setBlacklistIds(list);
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  // Encontrar detalles de canciones ocultas si están en allTracks
  const hiddenSongs = blacklistIds.map((id) => {
    const found = allTracks.find((t) => String(t.id) === String(id));
    return (
      found || {
        id,
        title: `Canción oculta (ID: ${id})`,
        artist: 'Artista Desconocido',
      }
    );
  });

  const handleRestoreOne = (song) => {
    removeFromBlacklist(song.id);
    loadBlacklist();
    onRestore?.();
    Alert.alert(
      'Canción Restaurada',
      `"${song.title}" volvió a estar disponible en tu biblioteca.`,
    );
  };

  const handleRestoreAll = () => {
    if (blacklistIds.length === 0) return;

    Alert.alert(
      'Restaurar Todas',
      '¿Deseas restaurar todas las canciones ocultas y mostrarlas nuevamente en tu biblioteca?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar Todas',
          onPress: () => {
            clearBlacklist();
            setBlacklistIds([]);
            onRestore?.();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Canciones Ocultas</Text>
          <Text style={styles.headerSubtitle}>
            {blacklistIds.length} {blacklistIds.length === 1 ? 'canción oculta' : 'canciones ocultas'}
          </Text>
        </View>
        {blacklistIds.length > 0 && (
          <TouchableOpacity
            style={styles.restoreAllButton}
            onPress={handleRestoreAll}
            accessibilityRole="button"
            accessibilityLabel="Restaurar todas las canciones ocultas">
            <Text style={styles.restoreAllButtonText}>Restaurar Todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {blacklistIds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>No hay canciones ocultas</Text>
          <Text style={styles.emptyText}>
            Si alguna vez ocultas una canción desde el menú de 3 puntos (⋮), podrás volver a mostrarla desde aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={hiddenSongs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => handleRestoreOne(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={`Restaurar ${item.title}`}>
                <Text style={styles.restoreButtonText}>Restaurar</Text>
              </TouchableOpacity>
            </View>
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
  restoreAllButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  restoreAllButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemArtist: {
    color: '#94A3B8',
    fontSize: 14,
  },
  restoreButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  restoreButtonText: {
    color: '#38BDF8',
    fontSize: 14,
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

export default HiddenSongsScreen;
