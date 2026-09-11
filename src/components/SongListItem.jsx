import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { isLongAudio } from '../services/historyService';

/**
 * Formatea duración en segundos a MM:SS o HH:MM:SS.
 * @param {number} seconds
 * @returns {string}
 */
const formatDuration = (seconds) => {
  if (!seconds || typeof seconds !== 'number' || seconds <= 0) return '';
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const SongListItem = ({
  title,
  artist,
  duration,
  isPlaying = false,
  isSelected = false,
  onPress,
  onOptionsPress,
}) => {
  const isEnganchado = isLongAudio(duration);
  const formattedTime = formatDuration(duration);

  return (
    <TouchableOpacity
      style={[styles.container, (isPlaying || isSelected) && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Reproducir ${title || 'canción'}, de ${artist || 'artista desconocido'}`}
      accessibilityHint="Presiona para comenzar a reproducir esta canción">
      <View style={styles.iconContainer}>
        <Text style={styles.musicIcon}>
          {isPlaying ? '🔊' : '🎵'}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          {isEnganchado && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>ENGANCHADO</Text>
            </View>
          )}
          <Text
            style={[styles.title, (isPlaying || isSelected) && styles.activeTitle]}
            numberOfLines={1}>
            {title || 'Canción sin título'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.artist} numberOfLines={1}>
            {artist || 'Artista desconocido'}
          </Text>
          {formattedTime.length > 0 && (
            <Text style={styles.duration}>{formattedTime}</Text>
          )}
        </View>
      </View>

      {onOptionsPress && (
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={onOptionsPress}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          accessibilityRole="button"
          accessibilityLabel={`Opciones para ${title || 'la canción'}`}
          accessibilityHint="Abre opciones para agregar a lista o esconder canción">
          <Text style={styles.optionsIcon}>⋮</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: 'transparent',
  },
  activeContainer: {
    backgroundColor: '#172554',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  musicIcon: {
    fontSize: 18,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeContainer: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#E0F2FE',
    fontSize: 9,
    fontWeight: '800',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  activeTitle: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artist: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  duration: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  optionsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#1E293B',
  },
  optionsIcon: {
    color: '#E2E8F0',
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export default SongListItem;
