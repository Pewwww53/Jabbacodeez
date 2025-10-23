import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = '@location_history';
const MAX_CACHED_LOCATIONS = 20;

export const locationCache = {
  async saveLocation(location) {
    try {
      const existingData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      const locations = existingData ? JSON.parse(existingData) : [];

      const isDuplicate = locations.some(
        loc => loc.latitude === location.latitude && 
               loc.longitude === location.longitude
      );

      if (!isDuplicate) {
        locations.unshift({
          ...location,
          timestamp: new Date().toISOString()
        });

        const trimmedLocations = locations.slice(0, MAX_CACHED_LOCATIONS);

        await AsyncStorage.setItem(
          LOCATION_CACHE_KEY, 
          JSON.stringify(trimmedLocations)
        );
      }
    } catch (error) {
      console.error('Error saving location to cache:', error);
    }
  },

  async getCachedLocations() {
    try {
      const data = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached locations:', error);
      return [];
    }
  },

  async clearLocationCache() {
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing location cache:', error);
    }
  }
};