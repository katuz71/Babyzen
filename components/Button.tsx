import { TouchableOpacity, Text, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/lib/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    className?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export function Button({ title, className, style, textStyle, icon, ...props }: ButtonProps) {
    const { theme } = useAppTheme();
    
    return (
        <TouchableOpacity
            style={[
                {
                    backgroundColor: theme.accent,
                    padding: theme.spacing.md, // Используем токен spacing
                    borderRadius: theme.radius.md, // Используем токен radius
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                style
            ]}
            className={className}
            activeOpacity={0.8}
            {...props}
        >
            {icon || <Text style={[{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }, textStyle]}>{title}</Text>}
        </TouchableOpacity>
    );
}