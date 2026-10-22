
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

type AppCardProps = Omit<ViewProps, 'children' | 'style'> & {
  children: ReactNode;
  className?: string;
};

export function AppCard({
  children,
  className,
  ...props
}: AppCardProps) {
  return (
    <View
      {...props}
      className={`rounded-2xl border border-[#E5E7EB] bg-white p-4 ${
        className ?? ''
      }`}
    >
      {children}
    </View>
  );
}
