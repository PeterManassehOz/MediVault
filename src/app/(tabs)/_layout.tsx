import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type FloatingTabBarProps = React.ComponentProps<
  typeof Tabs
> extends { tabBar?: (props: infer Props) => React.ReactNode }
  ? Props
  : never;

const TAB_ITEMS = {
  index: {
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  records: {
    label: 'Records',
    icon: 'folder-open-outline',
    activeIcon: 'folder-open',
  },
} as const;

function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 12) + 8,
      }}
    >
      <View
        className="flex-row items-center rounded-[26px] border border-[#E5E7EB] bg-white"
        style={{
          minHeight: 70,
          paddingHorizontal: 8,
          paddingVertical: 7,
          shadowColor: '#101828',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.10,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {state.routes.map(
          (
            route: (typeof state.routes)[number],
            index: number,
          ) => {
          const item =
            TAB_ITEMS[route.name as keyof typeof TAB_ITEMS];

          if (!item) {
            return null;
          }

          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const color = isFocused ? '#047857' : '#667085';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? item.label
              }
              onPress={onPress}
              onLongPress={onLongPress}
              className="flex-1 items-center justify-center rounded-[20px]"
              style={{
                minHeight: 54,
                backgroundColor: isFocused ? '#ECFDF5' : 'transparent',
              }}
            >
              <Ionicons
                name={isFocused ? item.activeIcon : item.icon}
                size={23}
                color={color}
              />

              <Text
                style={{
                  color,
                  fontSize: 11,
                  fontWeight: isFocused ? '700' : '500',
                  marginTop: 3,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#F8FAFC',
        },
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarAccessibilityLabel: 'Records tab',
        }}
      />
    </Tabs>
  );
}