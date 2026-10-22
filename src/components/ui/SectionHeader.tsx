
import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <View className={`mb-4 ${className ?? ''}`}>
      <Text className="text-xl font-bold leading-7 text-[#101828]">
        {title}
      </Text>

      {description ? (
        <Text className="mt-1 text-sm leading-5 text-[#667085]">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
