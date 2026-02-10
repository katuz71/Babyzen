import { Text as RNText, TextProps } from 'react-native';

// Добавляем поддержку className для TypeScript
interface StyledTextProps extends TextProps {
    className?: string;
}

export function Text({ className, style, children, ...props }: StyledTextProps & { [key: string]: any }) {
    return (
        <RNText
            className={`text-[#E0E0E0] ${className}`} // Vampire Mode Default
            style={style}
            {...props}
        >
            {children}
        </RNText>
    );
}