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
  getPlaybackHistory,
  clearPlaybackHistory,
} from '../services/historyService';
import SongListItem from '../components/SongListItem';

const RecentScreen = ({ currentTrack, onSelectSong, onOptionsPress }) => {
  const [history, setHistory] = useState([]);

  const loadHistory = () => {
    const list = getPlaybackHistory();
    setHistory(list);
  };

  useEffect(() => {
    loadHistory();
  }, [currentTrack]);

  const handleClearHistory = () => {
    if (history.length === 0) return;

    Alert.alert(
      'Borrar Historial',
      '¿Deseas vaciar la lista de canciones reproducidas recientemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            clearPlaybackHistory();
            setHistory([]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Canciones Recientes</Text>
          <Text style={styles.headerSubtitle}>
            {history.length} {history.length === 1 ? 'canción' : 'canciones'} escuchadas
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            accessibilityRole="button"
            accessibilityLabel="Borrar historial reciente">
            <Text style={styles.clearButtonText}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🕒</Text>
          <Text style={styles.emptyTitle}>Sin reproducciones recientes</Text>
          <Text style={styles.emptyText}>
            Las canciones que escuches se guardarán automáticamente aquí para que puedas retomarlas fácilmente.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SongListItem
              title={item.title}
              artist={item.artist}
              duration={item.duration}
              isPlaying={currentTrack && String(currentTrack.id) === String(item.id)}
              onPress={() => onSelectSong?.(item, history)}
              onOptionsPress={() => onOptionsPress?.(item)}
            />
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
  headerRow: {
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
  clearButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
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

export default RecentScreen;
