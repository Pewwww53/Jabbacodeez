import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { getAsset } from "./assets_returns";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import evacuation_centers from "./evacuation_centers";
import { getDistanceFromLatLonInKm } from "./utils/distance";
import { clearWaypointCache, getCachedData } from "./utils/cache";
import NavigationSteps from "./components/NavigationSteps";
import SearchBar from "./components/SearchBar";
import { getBearing } from "./utils/bearing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { locationCache } from "./utils/locationCache";
import AddLocationModal from "./components/AddLocationModal";
import { auth } from "./firebase";
import { saveLocation as saveLocationToFirebase } from "./services/locations";

export default function Map() {
  const [location, setLocation] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const [waypointData, setWaypointData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [heading, setHeading] = useState(0);
  const [navigationRegion, setNavigationRegion] = useState(null);
  const [isAddLocationVisible, setIsAddLocationVisible] = useState(false);

  const mapRef = useRef(null);
  const debounceTimeout = useRef();

  const fetchSuggestions = useCallback((query) => {
    clearTimeout(debounceTimeout.current);
    if (!query.trim()) return setSuggestions([]);

    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
            query
          )}&lang=en&limit=8&filter=countrycode:ph&apiKey=eb7f70eaff974b3bb3a7a634ddb09e1a`
        );
        const data = await res.json();
        setSuggestions(
          data.features?.filter(
            (f) => f.properties.rank?.match_type === "full_match"
          ) || []
        );
      } catch {
        setSuggestions([]);
      }
    }, 350);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        if (active) setLocation(loc.coords);
      } catch {
        if (active) setLocation(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectSuggestion = (item) => {
    const lat = item.properties?.lat ?? item.lat;
    const lon = item.properties?.lon ?? item.lon;
    const formatted =
      item.properties?.formatted ||
      item.properties?.address_line1 ||
      item.address ||
      "";

    const locationData = {
      latitude: lat,
      longitude: lon,
      formatted,
    };

    locationCache.saveLocation(locationData);

    setPreviewResult(locationData);
    Alert.alert("Go to Location", `Do you want to go to:\n${formatted}?`, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setPreviewResult(null),
      },
      {
        text: "Yes",
        onPress: () => {
          setSearch(formatted);
          setSearchResult(locationData);
          setPreviewResult(null);
          setSuggestions([]);
          setSearchFocused(false);
        },
      },
    ]);
  };

  const loadCachedLocations = async () => {
    const cachedLocations = await locationCache.getCachedLocations();
    return cachedLocations;
  };

  const region = useMemo(() => {
    if (navigating && navigationRegion) return navigationRegion;
    const target = previewResult || searchResult || location;
    if (target)
      return {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }, [previewResult, searchResult, location, navigating, navigationRegion]);

  useEffect(() => {
    if (!searchResult || !location) return;

    // clearWaypointCache();
    setIsLoading(true);
    setWaypointData(null);

    const controller = new AbortController();
    const start = `${location.latitude},${location.longitude}`;
    const end = `${searchResult.latitude},${searchResult.longitude}`;
    const cacheKey = `waypoint-${start}-${end}`;

    (async () => {
      if (await getCachedData(cacheKey, setWaypointData, setSelectedRoute))
        return setIsLoading(false);

      try {
        const res = await fetch(
          `http://192.168.0.112:8000/api/generate-waypoint/?start=${start}&end=${end}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setWaypointData(data.result);
        setSelectedRoute(data.result.best_route_index ?? 0);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setWaypointData(null);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [searchResult]);

  const nearestEvacCenters = useMemo(() => {
    if (!location) return [];
    return evacuation_centers.filter(
      (center) =>
        getDistanceFromLatLonInKm(
          location.latitude,
          location.longitude,
          center.lat,
          center.lon
        ) <= 5
    );
  }, [location]);

  const handleGoNow = () => {
    if (!waypointData?.routes || selectedRoute == null) return;
    setNavigating(true);
    setCurrentStep(0);
  };
  const handleCancelWaypoint = () => {
    setWaypointData(null);
    setNavigating(false);
    setCurrentStep(0);
    setSearch(null);
    setSearchResult(null);
    setPreviewResult(null);
  };
  useEffect(() => {
    if (!navigating) return;

    let headingSub, locationSub;
    (async () => {
      headingSub = await Location.watchHeadingAsync((h) => {
        if (
          waypointData?.routes?.[selectedRoute]?.coordinates?.length >
            currentStep + 1 &&
          location
        ) {
          const nextPoint =
            waypointData.routes[selectedRoute].coordinates[currentStep + 1];
          const roadBearing = getBearing(
            location.latitude,
            location.longitude,
            nextPoint[0],
            nextPoint[1]
          );
          const deviceHeading = h.trueHeading || h.magHeading || 0;
          const diff = Math.abs(roadBearing - deviceHeading);
          if (diff < 30 || diff > 330) setHeading(deviceHeading);
        }
      });

      locationSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => setLocation(loc.coords)
      );
    })();

    return () => {
      headingSub?.remove();
      locationSub?.remove();
    };
  }, [navigating]);

  useEffect(() => {
    if (!navigating || !location) return;

    const route = waypointData?.routes?.[selectedRoute];
    if (!route) return;

    const stepCoord =
      route.instructions?.[currentStep]?.point ||
      route.coordinates?.[currentStep];
    if (!stepCoord) return;

    const targetLat = stepCoord[0] ?? stepCoord.latitude;
    const targetLon = stepCoord[1] ?? stepCoord.longitude;

    const navRegion = {
      latitude: targetLat,
      longitude: targetLon,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
    setNavigationRegion(navRegion);

    mapRef.current?.animateCamera(
      {
        center: { latitude: targetLat, longitude: targetLon },
        heading,
        pitch: 60,
        zoom: 19,
      },
      { duration: 600 }
    );
  }, [navigating, currentStep, location, heading, waypointData, selectedRoute]);

  const handleAddLocation = async (locationData) => {
    try {
      await locationCache.saveLocation(locationData);

      const user = auth.currentUser;
      if (user?.uid) {
        try {
          await saveLocationToFirebase(user.uid, locationData);
        } catch (err) {
          console.warn("firebase save error", err);
        }
      }

      Alert.alert("Success", "Location added successfully");
    } catch (err) {
      console.warn("save location error", err);
      Alert.alert("Error", "Failed to add location");
    }
  };

  return (
    <View style={styles.container}>
      {searchFocused && (
        <View style={styles.fullScreenSearch}>
          <SearchBar
            search={search}
            setSearch={setSearch}
            fetchSuggestions={fetchSuggestions}
            setSearchFocused={setSearchFocused}
            searchFocused={searchFocused}
            nearestEvacCenters={nearestEvacCenters}
            handleSelectSuggestion={handleSelectSuggestion}
            suggestions={suggestions}
            location={location}
            setSuggestions={setSuggestions}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Image source={getAsset("logo.png")} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <SearchBar
              search={search}
              setSearch={setSearch}
              fetchSuggestions={fetchSuggestions}
              setSearchFocused={setSearchFocused}
              searchFocused={searchFocused}
              nearestEvacCenters={nearestEvacCenters}
              handleSelectSuggestion={handleSelectSuggestion}
              suggestions={suggestions}
              location={location}
              setSuggestions={setSuggestions}
              getCachedLocations={loadCachedLocations}
            />
          </View>
          <Text style={styles.headerTitle}>Maps</Text>
        </View>

        <MapView
          mapType="terrain"
          ref={mapRef}
          style={styles.map}
          region={region}
          showsUserLocation
          showsCompass
          pitchEnabled
          rotateEnabled
          zoomEnabled
          scrollEnabled
          minZoomLevel={11}
          maxZoomLevel={21}
          loadingEnabled={true}
          loadingIndicatorColor="#00C8F8"
          loadingBackgroundColor="#ffffff"
        >
          {location && (
            <Marker
              coordinate={location}
              title="You are here"
              pinColor="blue"
            />
          )}
          {(searchResult || previewResult) && (
            <Marker
              coordinate={previewResult || searchResult}
              title={previewResult ? "Preview" : "Destination"}
              pinColor={previewResult ? "orange" : "red"}
            />
          )}

          {waypointData?.routes?.[selectedRoute]?.coordinates
            ?.slice(0, -1)
            .map((coord, i) => {
              const next =
                waypointData.routes[selectedRoute].coordinates[i + 1];
              if (!next) return null;
              const floodLevel =
                waypointData.routes[selectedRoute].flood_levels?.[i];
              const color =
                floodLevel === 1
                  ? "#ffff00"
                  : floodLevel === 2
                  ? "#ffa500"
                  : floodLevel === 3
                  ? "#ff0000"
                  : "blue";
              return (
                <Polyline
                  key={i}
                  coordinates={[
                    { latitude: coord[0], longitude: coord[1] },
                    { latitude: next[0], longitude: next[1] },
                  ]}
                  strokeColor={color}
                  strokeWidth={4}
                  opacity={0.7}
                />
              );
            })}
        </MapView>

        {!searchFocused && waypointData?.routes && (
          <View style={styles.routesContainer}>
            <Text style={styles.routeTitle}>{search}</Text>
            <Text style={styles.routeTitle}>Suggested Routes</Text>

            {!navigating ? (
              <>
                <TouchableOpacity
                  style={styles.goNowButton}
                  onPress={handleGoNow}
                >
                  <Text style={styles.goNowText}>GO NOW</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelWaypoint}
                >
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <FlatList
                  data={waypointData.routes}
                  keyExtractor={(_, idx) => idx.toString()}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => setSelectedRoute(index)}
                      style={[
                        styles.routeItem,
                        {
                          backgroundColor:
                            index === waypointData.best_route_index
                              ? "#e0f7fa"
                              : "#f9f9f9",
                          borderColor:
                            selectedRoute === index ? "#00C8F8" : "#e0e0e0",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.routeText,
                          {
                            color:
                              index === waypointData.best_route_index
                                ? "#00C8F8"
                                : "#333",
                          },
                        ]}
                      >
                        Route {index + 1}
                        {index === waypointData.best_route_index &&
                          " (Best Route)"}
                      </Text>
                      <Text style={styles.routeSubText}>
                        Distance: {item.distance.toFixed(2)} km
                      </Text>
                      <Text style={styles.routeSubText}>
                        Estimated Time: {Math.ceil(item.duration)} mins
                      </Text>
                      <Text style={styles.routeSubText}>
                        Flood Levels:{" "}
                        {item.flood_levels?.includes(5)
                          ? "Severe"
                          : item.flood_levels?.includes(3)
                          ? "Moderate"
                          : item.flood_levels?.includes(2)
                          ? "Mild"
                          : "None"}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <NavigationSteps
                route={waypointData.routes[selectedRoute]}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                setNavigating={setNavigating}
              />
            )}
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading routes...</Text>
          </View>
        )}

        {location && (
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={() => setIsAddLocationVisible(true)}
          >
            <Text style={styles.addLocationButtonText}>+ Add Location</Text>
          </TouchableOpacity>
        )}

        {location && (
          <AddLocationModal
            visible={isAddLocationVisible}
            onClose={() => setIsAddLocationVisible(false)}
            onAdd={handleAddLocation}
            initialLocation={location}
          />
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    gap: 10,
  },
  logo: { width: 40, height: 40, resizeMode: "contain" },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A73E8",
    marginLeft: 12,
  },
  map: { flex: 5, width: "100%" },
  fullScreenSearch: {
    position: "absolute",
    height: "100%",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 100,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  routesContainer: {
    maxHeight: 350,
    padding: 16,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
    color: "#222",
  },
  goNowButton: {
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
    backgroundColor: "#00C8F8",
    borderRadius: 8,
    padding: 10,
  },
  goNowText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
  },
  cancelButton: {
    alignItems: "center",
    marginBottom: 8,
    width: "100%",
    border: "solid 2px #00C8F8",
    borderRadius: 8,
    padding: 10,
  },
  cancelText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#00C8F8",
  },
  routeItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  routeText: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  routeSubText: { fontSize: 12, color: "#555", marginBottom: 2 },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { color: "#1A73E8", fontWeight: "900", fontSize: 16 },
  addLocationButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#00C8F8",
    padding: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
  },
  addLocationButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
