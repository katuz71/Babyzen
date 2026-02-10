import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    className?: string;
}

export function Button({ title, className, ...props }: ButtonProps & { [key: string]: any }) {
    return (
        <TouchableOpacity
            className={`bg-[#FF453A] p-4 rounded-2xl items-center justify-center ${className}`} // Accent color
            activeOpacity={0.8}
            {...props}
        >
            <Text className="text-white font-bold text-lg">{title}</Text>
        </TouchableOpacity>
    );
}