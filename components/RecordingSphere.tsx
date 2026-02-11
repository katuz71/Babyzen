import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RecordingSphereProps {
  isRecording: boolean;
  isAnalyzing: boolean;
  onPress: () => void;
}

const SPHERE_SIZE = 190;

export const RecordingSphere = React.memo(
  ({ isRecording, isAnalyzing, onPress }: RecordingSphereProps) => {
    const ripple1 = useRef(new Animated.Value(1)).current;
    const ripple2 = useRef(new Animated.Value(1)).current;
    const ripple3 = useRef(new Animated.Value(1)).current;

    const pulseAnim = (
      val: Animated.Value,
      to: number,
      delay: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: to,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    useEffect(() => {
      let a1: Animated.CompositeAnimation | undefined;
      let a2: Animated.CompositeAnimation | undefined;
      let a3: Animated.CompositeAnimation | undefined;

      if (isRecording) {
        a1 = pulseAnim(ripple1, 1.3, 0);
        a2 = pulseAnim(ripple2, 1.6, 400);
        a3 = pulseAnim(ripple3, 1.9, 800);

        a1.start();
        a2.start();
        a3.start();
      } else {
        ripple1.setValue(1);
        ripple2.setValue(1);
        ripple3.setValue(1);
      }

      return () => {
        a1?.stop();
        a2?.stop();
        a3?.stop();
      };
    }, [isRecording]);

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.sphereContainer}
      >
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: isRecording ? "#FF453A" : "#3A3A3C",
              opacity: 0.1,
              transform: [{ scale: ripple3 }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: isRecording ? "#FF453A" : "#3A3A3C",
              opacity: 0.2,
              transform: [{ scale: ripple2 }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.sphereCore,
            {
              backgroundColor: isRecording
                ? "#FF453A"
                : isAnalyzing
                ? "#007AFF"
                : "#2C2C2E",
              transform: [{ scale: ripple1 }],
            },
          ]}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#FFF" size={32} />
          ) : (
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={65}
              color="#FFF"
            />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

RecordingSphere.displayName = "RecordingSphere";

const styles = StyleSheet.create({
  sphereContainer: {
    width: SPHERE_SIZE,
    height: SPHERE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  sphereCore: {
    width: SPHERE_SIZE,
    height: SPHERE_SIZE,
    borderRadius: SPHERE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  ripple: {
    width: SPHERE_SIZE,
    height: SPHERE_SIZE,
    borderRadius: SPHERE_SIZE / 2,
    position: "absolute",
  },
});
