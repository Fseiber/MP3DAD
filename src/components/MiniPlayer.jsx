import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { isLongAudio } from '../services/historyService';

/**
 * Formatea segundos a MM:SS o HH:MM:SS para audios largos.
 * @param {number} seconds
 * @returns {string}
 */
const formatTime = (seconds) => {
  if (!seconds || typeof seconds !== 'number' || seconds < 0) {
    return '0:00';
  }
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const MiniPlayer = ({
  currentTrack,
  isPlaying = false,
  position = 0,
  duration = 0,
  onPlayPause,
  onNext,
  onPrevious,
  onPress,
}) => {
  const trackDuration = duration || (currentTrack ? currentTrack.duration : 0) || 0;
  const isEnganchado = isLongAudio(trackDuration);

  // Calcular porcentaje de progreso para la barra superior
  const progressPercent =
    trackDuration > 0 ? Math.min(100, Math.max(0, (position / trackDuration) * 100)) : 0;

  return (
    <View style={styles.container}>
      {/* Barra de Progreso Superior Integrada */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.contentRow}
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          currentTrack
            ? `Reproduciendo ${currentTrack.title} de ${currentTrack.artist}. Toca para abrir pantalla completa.`
            : 'Sin reproducción activa'
        }>
        {/* Información del Tema */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            {isEnganchado && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>ENGANCHADO</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack ? currentTrack.title : 'Sin reproducción'}
            </Text>
          </View>

          <View style={styles.subtitleRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack ? currentTrack.artist : 'Selecciona una canción para escuchar'}
            </Text>
            {trackDuration > 0 && (
              <Text style={styles.timeText}>
                {formatTime(position)} / {formatTime(trackDuration)}
              </Text>
            )}
          </View>
        </View>

        {/* Controles Táctiles Accesibles */}
        <View style={styles.controlsContainer}>
          {/* Botón Anterior */}
          <TouchableOpacity
            style={styles.navButton}
            onPress={onPrevious}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Canción anterior"
            accessibilityHint="Vuelve a la canción anterior o al inicio">
            <Text style={styles.navButtonIcon}>⏮</Text>
          </TouchableOpacity>

          {/* Botón Principal Play / Pausa */}
          <TouchableOpacity
            style={[styles.playButton, isPlaying ? styles.pauseButtonActive : null]}
            onPress={onPlayPause}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pausar música' : 'Reproducir música'}
            accessibilityHint="Presiona para pausar o continuar la música">
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          {/* Botón Siguiente */}
          <TouchableOpacity
            style={styles.navButton}
            onPress={onNext}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Siguiente canción"
            accessibilityHint="Pasa a la siguiente canción de la lista">
            <Text style={styles.navButtonIcon}>⏭</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#1E293B',
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#38BDF8',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 76,
  },
  infoContainer: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeContainer: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artist: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 3,
  },
  navButtonIcon: {
    fontSize: 18,
    color: '#F1F5F9',
  },
  playButton: {
    backgroundColor: '#38BDF8',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 4,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  pauseButtonActive: {
    backgroundColor: '#0284C7',
  },
  playIcon: {
    fontSize: 24,
    color: '#0F172A',
    fontWeight: 'bold',
  },
});

export default MiniPlayer;
