import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
} from 'react-native-track-player';
import {
  addToPlaybackHistory,
  getPlaybackPosition,
  savePlaybackPosition,
  isLongAudio,
} from './historyService';

/**
 * Servicio de reproducción en segundo plano para TrackPlayer.
 * Maneja eventos de la notificación nativa, pantalla de bloqueo y auriculares Bluetooth.
 */
export const PlaybackService = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await saveCurrentTrackProgress();
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    await skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    await skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await saveCurrentTrackProgress();
    await TrackPlayer.reset();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    if (typeof event.position === 'number') {
      await TrackPlayer.seekTo(event.position);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.paused) {
      await saveCurrentTrackProgress();
      await TrackPlayer.pause();
    } else if (event.permanent) {
      await saveCurrentTrackProgress();
      await TrackPlayer.stop();
    } else if (event.ducking) {
      await TrackPlayer.setVolume(0.5);
    } else {
      await TrackPlayer.setVolume(1.0);
      await TrackPlayer.play();
    }
  });

  // Guardar posición periódicamente al pausar o cambiar de pista
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async () => {
    // Al cambiar de pista, guardamos progreso previo si correspondía
  });
};

/**
 * Inicialización de TrackPlayer con capacidades offline y notificaciones en pantalla de bloqueo.
 */
export const setupPlayer = async () => {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrackIndex();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 2,
    });
    isSetup = true;
  }
  return isSetup;
};

/**
 * Guarda el progreso actual de la pista en reproducción (especialmente útil para enganchados >15 min).
 */
export const saveCurrentTrackProgress = async () => {
  try {
    const activeTrack = await TrackPlayer.getActiveTrack();
    if (!activeTrack) return;

    const progress = await TrackPlayer.getProgress();
    if (progress && progress.position > 0 && progress.duration > 0) {
      savePlaybackPosition(activeTrack.id, progress.position, progress.duration);
    }
  } catch (error) {
    console.warn('[TrackPlayerService] Error guardando progreso:', error);
  }
};

/**
 * Reproduce una pista específica, configurando la cola de reproducción y reanudando posición si es un audio largo (>15m).
 * @param {object} track Pista a reproducir
 * @param {Array<object>} [queue] Cola opcional de canciones
 */
export const playTrack = async (track, queue = null) => {
  if (!track) return;

  try {
    await setupPlayer();

    // Guardar progreso de la pista anterior antes de cambiar
    await saveCurrentTrackProgress();

    if (queue && Array.isArray(queue) && queue.length > 0) {
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);
      const trackIndex = queue.findIndex((t) => String(t.id) === String(track.id));
      if (trackIndex >= 0) {
        await TrackPlayer.skip(trackIndex);
      }
    } else {
      await TrackPlayer.reset();
      await TrackPlayer.add(track);
    }

    // Verificar si es un enganchado largo con posición guardada previa
    const trackDuration = track.duration || 0;
    if (isLongAudio(trackDuration)) {
      const savedPosition = getPlaybackPosition(track.id);
      if (savedPosition > 0) {
        await TrackPlayer.seekTo(savedPosition);
      }
    }

    await TrackPlayer.play();
    addToPlaybackHistory(track);
  } catch (error) {
    console.error('[TrackPlayerService] Error al reproducir pista:', error);
  }
};

/**
 * Alterna entre reproducción y pausa.
 */
export const togglePlayPause = async () => {
  try {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await saveCurrentTrackProgress();
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  } catch (error) {
    console.warn('[TrackPlayerService] Error toggle play/pause:', error);
  }
};

/**
 * Avanza a la siguiente canción de la cola.
 */
export const skipToNext = async () => {
  try {
    await saveCurrentTrackProgress();
    await TrackPlayer.skipToNext();
  } catch (error) {
    console.warn('[TrackPlayerService] No hay siguiente canción:', error);
  }
};

/**
 * Retrocede a la canción anterior o reinicia la actual si ya pasaron más de 3 segundos.
 */
export const skipToPrevious = async () => {
  try {
    const progress = await TrackPlayer.getProgress();
    if (progress && progress.position > 3) {
      await TrackPlayer.seekTo(0);
      return;
    }

    await saveCurrentTrackProgress();
    await TrackPlayer.skipToPrevious();
  } catch (error) {
    console.warn('[TrackPlayerService] No hay canción anterior:', error);
  }
};

/**
 * Salta a un segundo específico de la canción actual.
 * @param {number} positionSeconds
 */
export const seekTo = async (positionSeconds) => {
  try {
    if (typeof positionSeconds === 'number' && positionSeconds >= 0) {
      await TrackPlayer.seekTo(positionSeconds);
    }
  } catch (error) {
    console.warn('[TrackPlayerService] Error en seekTo:', error);
  }
};

export default {
  PlaybackService,
  setupPlayer,
  saveCurrentTrackProgress,
  playTrack,
  togglePlayPause,
  skipToNext,
  skipToPrevious,
  seekTo,
};
