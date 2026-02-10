import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { changeLanguage } from '@/lib/i18n';

const LANGUAGES = ['ru', 'en', 'es'] as const;

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    const toggleLanguage = async () => {
        const currentIndex = LANGUAGES.indexOf(currentLang as any);
        const nextIndex = (currentIndex + 1) % LANGUAGES.length;
        const newLang = LANGUAGES[nextIndex];
        await changeLanguage(newLang);
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={toggleLanguage}
            activeOpacity={0.7}
        >
            <Ionicons name="globe-outline" size={20} color="#FFF" />
            <Text style={styles.text}>{currentLang.toUpperCase()}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        width: 70, // Фиксируем ширину, чтобы не прыгал заголовок
    },
    text: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
