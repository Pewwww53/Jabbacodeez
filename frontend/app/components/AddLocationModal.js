import React, { useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Popup,
  useMapEvents,
} from "react-leaflet";

export default function AddLocationModal({
  visible,
  onClose,
  onAdd,
  initialLocation,
}) {
  const [name, setName] = useState("");
  const [marker, setMarker] = useState({
    latitude: initialLocation?.latitude || 14.5995,
    longitude: initialLocation?.longitude || 120.9842,
  });

  // Handle map click to set marker
  function LocationSetter() {
    useMapEvents({
      click(e) {
        setMarker({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      },
    });
    return null;
  }

  const handleAdd = () => {
    if (!name.trim()) {
      window.alert("Please enter a location name");
      return;
    }
    onAdd({
      formatted: name,
      latitude: marker.latitude,
      longitude: marker.longitude,
    });
    setName("");
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.3)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          maxWidth: 500,
          width: "100%",
          boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderBottom: "1px solid #eee",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: "bold" }}>
            Add New Location
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <MapContainer
            center={[marker.latitude, marker.longitude]}
            zoom={13}
            style={{
              width: "100%",
              height: "400px",
              minHeight: "400px",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <LocationSetter />
            <Marker
              position={[marker.latitude, marker.longitude]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latlng = e.target.getLatLng();
                  setMarker({
                    latitude: latlng.lat,
                    longitude: latlng.lng,
                  });
                },
              }}
            >
              <Popup>Drag or click map to set location</Popup>
            </Marker>
          </MapContainer>
        </div>
        <div style={{ padding: 16 }}>
          <input
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 16,
            }}
            placeholder="Location Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: "#f5f5f5",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            <span>Lat: {marker.latitude.toFixed(6)}</span>
            <span>Long: {marker.longitude.toFixed(6)}</span>
          </div>
          <button
            style={{
              width: "100%",
              background: "#00C8F8",
              color: "#fff",
              fontWeight: "bold",
              fontSize: 16,
              borderRadius: 8,
              padding: 14,
              border: "none",
              cursor: "pointer",
            }}
            onClick={handleAdd}
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
}
