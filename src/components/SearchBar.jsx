import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

const SearchBar = ({
  value = '',
  onChangeText,
  onClear,
  placeholder = 'Buscar canciones, artistas...',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel="Buscar canciones o artistas"
        accessibilityHint="Escribe el nombre de la canción o artista para filtrar la lista"
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear || (() => onChangeText?.(''))}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          accessibilityHint="Limpia el texto de búsqueda ingresado">
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    height: 52,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SearchBar;
