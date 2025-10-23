import React from "react";
import {
  StyleSheet,
  TextInput,
  Pressable,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { getDistanceFromLatLonInKm, kmToMiles } from "../utils/distance";
import { useEffect } from "react";
import { locationCache } from "../utils/locationCache";

const SearchBar = ({
  search,
  setSearch,
  fetchSuggestions,
  setSearchFocused,
  searchFocused,
  nearestEvacCenters,
  handleSelectSuggestion,
  suggestions,
  location,
  setSuggestions,
}) => {
  useEffect(() => {
    const loadHistory = async () => {
      if (!search.trim() && searchFocused) {
        const cachedLocations = await locationCache.getCachedLocations();
        
        // Add unique keys to cached locations
        setSuggestions(cachedLocations.map((loc, index) => ({
          properties: {
            formatted: loc.formatted,
            lat: loc.latitude,
            lon: loc.longitude,
            // Add a unique key using timestamp or index
            place_id: loc.timestamp || `cached-${index}`
          }
        })));
      }
    };

    loadHistory();
  }, [search, searchFocused]);

  return (
    <View>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Search"
          placeholderTextColor="#A0A0A0"
          value={search}
          autoFocus={searchFocused}
          onChangeText={(text) => {
            setSearch(text);
            fetchSuggestions(text);
          }}
          onFocus={() => setSearchFocused(true)}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => {
            setSuggestions([]);
            setSearchFocused(false);
            Keyboard.dismiss();
          }}
        >
          <FontAwesome5 name="times" size={20} color="#A0A0A0" />
        </Pressable>
      </View>
      {searchFocused && (
        <Text style={styles.sectionTitle}>Nearest Evacuation Centers</Text>
      )}
      {searchFocused && (
        <FlatList
          data={nearestEvacCenters}
          keyExtractor={(item) => item.address}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                handleSelectSuggestion(item);
                Keyboard.dismiss();
              }}
            >
              <FontAwesome5
                name="home"
                size={24}
                color="#1A73E8"
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={styles.dropdownText}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyboardShouldPersistTaps="handled"
          style={{ marginBottom: 16, maxHeight: 100 }}
        />
      )}
      {searchFocused && suggestions != null && suggestions.length > 0 && (
        <Text style={styles.sectionTitle}>Search Location</Text>
      )}
      {searchFocused && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => 
            item.properties.place_id || 
            `${item.properties.lat}-${item.properties.lon}`
          }
          renderItem={({ item }) => {
            let distanceText = "";
            if (location) {
              const lat = Number(item.properties.lat);
              const lon = Number(item.properties.lon);
              const km = getDistanceFromLatLonInKm(
                location.latitude,
                location.longitude,
                lat,
                lon
              );
              const miles = kmToMiles(km);
              distanceText = `${km.toFixed(2)} km / ${miles.toFixed(2)} mi `;
            }
            return (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <FontAwesome5
                  name="map-marked-alt"
                  size={24}
                  color="#1A73E8"
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={styles.dropdownText}>
                    {item.properties.address_line1 || item.properties.formatted}
                  </Text>
                  <Text style={styles.dropdownSubText}>
                    {item.properties.address_line2}
                  </Text>
                  {location && (
                    <Text style={styles.dropdownSubText}>{distanceText}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 500 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F8",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    color: "#555",
    fontWeight: "900",
    fontSize: 20,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#b6b6b6ff",
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#222",
  },
  dropdownSubText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
});

export default SearchBar;
