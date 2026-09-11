import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';

const SongOptionsModal = ({
  visible,
  song,
  onClose,
  onHideSong,
  onAddToPlaylist,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!song) return null;

  const handleHidePress = () => {
    Alert.alert(
      'Ocultar Canción',
      `¿Deseas ocultar "${song.title}"? Podrás restaurarla en cualquier momento desde el menú "Canciones Ocultas".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: () => {
            onHideSong?.(song);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {
          setShowDetails(false);
          onClose();
        }}>
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}>
          {/* Header con Título y Artista */}
          <View style={styles.header}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist}
            </Text>
          </View>

          {/* Opciones Principales */}
          {!showDetails ? (
            <View>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  onAddToPlaylist?.(song);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Agregar a lista de reproducción">
                <Text style={styles.optionIcon}>➕</Text>
                <Text style={styles.optionText}>Agregar a Lista de Reproducción</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => setShowDetails(true)}
                accessibilityRole="button"
                accessibilityLabel="Ver detalles del archivo">
                <Text style={styles.optionIcon}>ℹ️</Text>
                <Text style={styles.optionText}>Detalles del Archivo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, styles.dangerOption]}
                onPress={handleHidePress}
                accessibilityRole="button"
                accessibilityLabel="Ocultar canción">
                <Text style={styles.optionIcon}>🚫</Text>
                <Text style={[styles.optionText, styles.dangerText]}>
                  Ocultar Canción (No volver a mostrar)
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsHeading}>Información del Archivo</Text>
              <Text style={styles.detailItem}>
                <Text style={styles.detailLabel}>Carpeta: </Text>
                {song.folder || 'Desconocida'}
              </Text>
              <Text style={styles.detailItem} numberOfLines={2}>
                <Text style={styles.detailLabel}>Ubicación: </Text>
                {song.path || 'Almacenamiento local'}
              </Text>
              <Text style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duración: </Text>
                {song.duration ? `${Math.floor(song.duration / 60)}m ${song.duration % 60}s` : 'Desconocida'}
              </Text>
              <TouchableOpacity
                style={styles.backDetailsButton}
                onPress={() => setShowDetails(false)}>
                <Text style={styles.backDetailsText}>← Volver a Opciones</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Botón Cerrar */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowDetails(false);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal de opciones">
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 2,
    borderTopColor: '#38BDF8',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 14,
    marginBottom: 10,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  songArtist: {
    color: '#94A3B8',
    fontSize: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  optionText: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
  },
  dangerOption: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#F87171',
  },
  detailsContainer: {
    paddingVertical: 12,
  },
  detailsHeading: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailItem: {
    color: '#E2E8F0',
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  detailLabel: {
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  backDetailsButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backDetailsText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default SongOptionsModal;
