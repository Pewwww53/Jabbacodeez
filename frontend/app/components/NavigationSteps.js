import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function NavigationSteps({
  route,
  currentStep,
  setCurrentStep,
  setNavigating,
}) {
  if (!route) return null;

  const steps =
    Array.isArray(route.instructions) && route.instructions.length > 0
      ? route.instructions.map((instr, idx) => ({
          instruction: instr.message || `Step ${idx + 1}`,
          street: instr.street,
          maneuver: instr.maneuver,
          point: instr.point,
        }))
      : route.coordinates
          .map((coord, idx) => {
            if (idx === route.coordinates.length - 1) return null;
            const next = route.coordinates[idx + 1];
            return {
              instruction: `Go to (${next[0].toFixed(5)}, ${next[1].toFixed(
                5
              )})`,
            };
          })
          .filter(Boolean);

  if (steps.length === 0) return null;

  return (
    <View>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>
        {steps[currentStep].instruction}
        {steps[currentStep].street ? ` on ${steps[currentStep].street}` : ""}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity
          onPress={() => setNavigating(false)}
          style={{
            alignItems: "center",
            marginBottom: 8,
            width: "100%",
            backgroundColor: "#00C8F8",
            borderRadius: 8,
            padding: 10,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
              color: "#fff",
            }}
          >
            Finish
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
