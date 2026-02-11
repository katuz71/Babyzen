import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
    children: React.ReactNode;
    onClose: () => void;
};

export function BottomSheetOverlay({ children, onClose }: Props) {
    return (
        <View style={styles.overlay} pointerEvents="auto">
            {/* Tap outside to close */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.sheet} pointerEvents="box-none">
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
        zIndex: 9999,
        elevation: 9999, // Android
    },
    sheet: {
        width: '100%',
    },
});
