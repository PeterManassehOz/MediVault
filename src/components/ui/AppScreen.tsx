
import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = Omit<
  ViewProps,
  'children' | 'style'
> & {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
  scrollViewProps?: Omit<
    ScrollViewProps,
    'children' | 'contentContainerClassName'
  >;
};

export function AppScreen({
  children,
  scrollable = false,
  className,
  contentContainerClassName,
  scrollViewProps,
  ...props
}: AppScreenProps) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className={`flex-1 bg-[#F8FAFC] ${className ?? ''}`}
    >
      {scrollable ? (
        <ScrollView
          {...scrollViewProps}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName={`pb-8 ${
            contentContainerClassName ?? ''
          }`}
        >
          {children}
        </ScrollView>
      ) : (
        <View {...props} className="flex-1">
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
