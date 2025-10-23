import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearWaypointCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const waypointKeys = keys.filter((key) => key.startsWith("waypoint-"));
    await AsyncStorage.multiRemove(waypointKeys);
  } catch (error) {
    console.error("Error clearing waypoint cache:", error);
  }
};

export const getCachedData = async (cacheKey) => {
  try {
    const cachedResult = await AsyncStorage.getItem(cacheKey);
    return cachedResult ? JSON.parse(cachedResult) : null;
  } catch {
    return null;
  }
};

export const setCachedData = async (cacheKey, data) => {
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error("Error setting cached data:", error);
  }
};