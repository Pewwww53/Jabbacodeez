import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function AddLocationModal({ visible, onClose, onAdd, initialLocation }) {
  const [name, setName] = useState('');
  const [marker, setMarker] = useState({
    latitude: initialLocation?.latitude || 14.5995,
    longitude: initialLocation?.longitude || 120.9842,
  });
  
  const mapRef = useRef(null);

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    onAdd({
      formatted: name,
      latitude: marker.latitude,
      longitude: marker.longitude
    });

    setName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Add New Location</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: marker.latitude,
            longitude: marker.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          onPress={(e) => setMarker(e.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)}
          />
        </MapView>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Location Name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.coordinates}>
            <Text style={styles.coordText}>
              Lat: {marker.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordText}>
              Long: {marker.longitude.toFixed(6)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAdd}
          >
            <Text style={styles.addButtonText}>Save Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666'
  },
  map: {
    height: Dimensions.get('window').height * 0.5
  },
  form: {
    padding: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16
  },
  coordinates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  coordText: {
    fontSize: 14,
    fontFamily: 'monospace'
  },
  addButton: {
    backgroundColor: '#00C8F8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});