import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';

export default function TestSound() {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    async function playSound() {
        try {
            console.log('Загружаем звук...');

            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                require('@/assets/sounds/heartbeat.mp3'),
                { shouldPlay: true, isLooping: true }
            );

            setSound(newSound);
            setIsPlaying(true);
            console.log('Звук играет!');
            Alert.alert('Успех!', 'Звук должен играть');
        } catch (error) {
            console.error('Ошибка:', error);
            Alert.alert('Ошибка', String(error));
        }
    }

    async function stopSound() {
        try {
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
                setIsPlaying(false);
                console.log('Звук остановлен');
            }
        } catch (error) {
            console.error('Ошибка остановки:', error);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ТЕСТ ЗВУКА</Text>

            <TouchableOpacity
                style={[styles.button, isPlaying && styles.buttonStop]}
                onPress={isPlaying ? stopSound : playSound}
            >
                <Text style={styles.buttonText}>
                    {isPlaying ? 'ОСТАНОВИТЬ' : 'ИГРАТЬ ЗВУК'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#00FF00',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 10,
    },
    buttonStop: {
        backgroundColor: '#FF0000',
    },
    buttonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
});
