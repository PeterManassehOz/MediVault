
import {
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  title,
  variant = 'primary',
  disabled,
  className,
  ...props
}: AppButtonProps) {
  const primary = variant === 'primary';

  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      className={`min-h-12 items-center justify-center rounded-xl px-4 py-2 ${
        primary
          ? 'bg-emerald-600'
          : 'border border-[#E5E7EB] bg-white'
      } ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <Text
        className={`text-[15px] font-bold ${
          primary ? 'text-white' : 'text-[#101828]'
        }`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
