import React from "react";

export default function Contacts() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(90deg, #2a5fa1 0%, #4e8edc 100%)",
        fontFamily: "Segoe UI, Arial, sans-serif",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginTop: 80, marginBottom: 32 }}>
        Contact Us
      </h1>
      <form
        style={{
          background: "transparent",
          width: "100%",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>First name</label>
            <input
              type="text"
              placeholder="Juan"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                fontSize: "1rem",
                color: "#222",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Last name</label>
            <input
              type="text"
              placeholder="Dela Cruz"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                fontSize: "1rem",
                color: "#222",
              }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Email address</label>
          <input
            type="email"
            placeholder="mjdelacruz@tip.edu.ph"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              fontSize: "1rem",
              color: "#222",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Your message</label>
          <textarea
            placeholder="Enter your question or message"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "none",
              fontSize: "1rem",
              color: "#222",
              minHeight: 120,
              resize: "vertical",
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            background: "#001a4d",
            color: "#fff",
            padding: "14px 0",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "1.2rem",
            border: "none",
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
}