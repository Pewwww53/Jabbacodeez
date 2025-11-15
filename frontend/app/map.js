import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import evacuation_centers from "./evacuation_centers";
import { getDistanceFromLatLonInKm } from "./utils/distance";
import { clearWaypointCache, getCachedData } from "./utils/cache";
import NavigationSteps from "./components/NavigationSteps";
import SearchBar from "./components/SearchBar";
import { getBearing } from "./utils/bearing";
import { locationCache } from "./utils/locationCache";
import AddLocationModal from "./components/AddLocationModal";
import { auth } from "./firebase";
import { saveLocation as saveLocationToFirebase } from "./services/locations";
import L from "leaflet";
const DEFAULT_POSITION = [14.5995, 120.9842];

const iconPerson = new L.Icon({
  iconUrl: "/person-icon-blue-13.png", // Place your icon in public folder
  iconSize: [16, 32], // Adjust size as needed
  iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
  popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
});
const pointIcon = new L.Icon({
  iconUrl: "/flag.png", // Place your icon in public folder
  iconSize: [16, 32], // Adjust size as needed
  iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
  popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
});
export default function Map({ isMobile }) {
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

  const debounceTimeout = useRef();

  // Fetch suggestions from Geoapify
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

  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => setLocation(null)
    );
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
    if (window.confirm(`Go to Location:\n${formatted}?`)) {
      setSearch(formatted);
      setSearchResult(locationData);
      setPreviewResult(null);
      setSuggestions([]);
      setSearchFocused(false);
    } else {
      setPreviewResult(null);
    }
  };

  const loadCachedLocations = async () => {
    const cachedLocations = await locationCache.getCachedLocations();
    return cachedLocations;
  };

  const region = useMemo(() => {
    const target = previewResult || searchResult || location;
    if (target) return [target.latitude, target.longitude];
    return DEFAULT_POSITION;
  }, [previewResult, searchResult, location]);

  useEffect(() => {
    if (!searchResult || !location) return;

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
        console.log(data.result);
        
        setWaypointData(data.result);
        setSelectedRoute(data.result.best_route_index ?? 0);
        // You may want to use localStorage for web
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setWaypointData(null);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [searchResult, location]);

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

      window.alert("Location added successfully");
    } catch (err) {
      console.warn("save location error", err);
      window.alert("Failed to add location");
    }
  };

  // Polyline coordinates for leaflet
  const getPolylineCoords = () => {
    if (!waypointData?.routes?.[selectedRoute]?.coordinates) return [];
    return waypointData.routes[selectedRoute].coordinates.map((coord) => [
      coord[0],
      coord[1],
    ]);
  };

  // Flood level colors
  const getPolylineColors = () => {
    const levels = waypointData?.routes?.[selectedRoute]?.flood_levels || [];
    return levels.map((floodLevel) =>
      floodLevel === 1
        ? "#ffff00"
        : floodLevel === 2
        ? "#ffa500"
        : floodLevel === 3
        ? "#ff0000"
        : "blue"
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        flex: 1,
      }}
    >
      {/* Map Section */}
      <div
        style={{
          flex: 2,
          minWidth: isMobile ? "100%" : 0,
          height: isMobile ? "400px" : "100%",
          maxHeight: "100%",
          background: "#F7F7F7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MapContainer
          center={region}
          zoom={13}
          style={{
            width: isMobile ? "100%" : "100%",
            height: isMobile ? "400px" : "100%",
            minHeight: "400px",
            maxWidth: "100%",
            margin: "0 auto",
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {location && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={iconPerson}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}
          {(searchResult || previewResult) && (
            <Marker
              position={[
                (previewResult || searchResult).latitude,
                (previewResult || searchResult).longitude,
              ]}
              icon={pointIcon}
            >
              <Popup>{previewResult ? "Preview" : "Destination"}</Popup>
            </Marker>
          )}
          {/* Polyline for route */}
          {waypointData?.routes?.[selectedRoute]?.coordinates && (
            <Polyline
              positions={getPolylineCoords()}
              pathOptions={{
                color: getPolylineColors()[0] || "blue",
                weight: 4,
                opacity: 0.7,
              }}
            />
          )}
        </MapContainer>
      </div>
      {/* Sidebar/Controls Section */}
      <div
        style={{
          flex: 1,
          minWidth: isMobile ? "100%" : "350px",
          maxWidth: isMobile ? "100%" : "400px",
          height: isMobile ? "auto" : "100%",
          background: "#fff",
          padding: 24,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        {/* Logo and SearchBar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              marginRight: 8,
            }}
          />
          <span style={{ fontSize: 20, fontWeight: "bold", color: "#1A73E8" }}>
            Maps
          </span>
        </div>
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
        {/* Route and Navigation UI */}
        {!searchFocused && waypointData?.routes && (
          <div
            style={{
              maxHeight: 350,
              padding: 16,
              background: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
              margin: "16px 0",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginTop: 12,
                marginBottom: 4,
                color: "#222",
              }}
            >
              {search}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 4,
                color: "#222",
              }}
            >
              Suggested Routes
            </div>
            {!navigating ? (
              <>
                <button
                  style={{
                    display: "block",
                    width: "100%",
                    background: "#00C8F8",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#fff",
                    marginBottom: 8,
                    border: "none",
                  }}
                  onClick={handleGoNow}
                >
                  GO NOW
                </button>
                <button
                  style={{
                    display: "block",
                    width: "100%",
                    border: "2px solid #00C8F8",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#00C8F8",
                    marginBottom: 8,
                    background: "#fff",
                  }}
                  onClick={handleCancelWaypoint}
                >
                  CANCEL
                </button>
                <div>
                  {waypointData.routes.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedRoute(index)}
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 8,
                        border: `1px solid ${
                          selectedRoute === index ? "#00C8F8" : "#e0e0e0"
                        }`,
                        background:
                          index === waypointData.best_route_index
                            ? "#e0f7fa"
                            : "#f9f9f9",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          marginBottom: 4,
                          color:
                            index === waypointData.best_route_index
                              ? "#00C8F8"
                              : "#333",
                        }}
                      >
                        Route {index + 1}
                        {index === waypointData.best_route_index &&
                          " (Best Route)"}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#555", marginBottom: 2 }}
                      >
                        Distance: {item.distance.toFixed(2)} km
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#555", marginBottom: 2 }}
                      >
                        Estimated Time: {Math.ceil(item.duration)} mins
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#555", marginBottom: 2 }}
                      >
                        Flood Levels:{" "}
                        {item.flood_levels?.includes(5)
                          ? "Severe"
                          : item.flood_levels?.includes(3)
                          ? "Moderate"
                          : item.flood_levels?.includes(2)
                          ? "Mild"
                          : "None"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <NavigationSteps
                route={waypointData.routes[selectedRoute]}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                setNavigating={setNavigating}
              />
            )}
          </div>
        )}

        {isLoading && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              background: "#fff",
              color: "#1A73E8",
              fontWeight: 900,
              fontSize: 16,
              margin: "16px 0",
              borderRadius: 8,
            }}
          >
            Loading routes...
          </div>
        )}

        {location && (
          <button
            style={{
              position: "fixed",
              right: 16,
              bottom: 16,
              background: "#00C8F8",
              padding: 12,
              borderRadius: 25,
              color: "white",
              fontWeight: "bold",
              border: "none",
              zIndex: 10,
            }}
            onClick={() => setIsAddLocationVisible(true)}
          >
            + Add Location
          </button>
        )}

        {location && (
          <AddLocationModal
            visible={isAddLocationVisible}
            onClose={() => setIsAddLocationVisible(false)}
            onAdd={handleAddLocation}
            initialLocation={location}
          />
        )}
      </div>
    </div>
  );
}
