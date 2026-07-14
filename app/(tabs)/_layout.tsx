import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const INACTIVE = '#9AA3B2';

const TABS: Record<string, { off: IconName; on: IconName; label: string }> = {
  'library/index': { off: 'bookmark-outline', on: 'bookmark', label: 'Library' },
  search: { off: 'search-outline', on: 'search', label: 'Search' },
  add: { off: 'add-circle-outline', on: 'add-circle', label: 'Add' },
  profile: { off: 'person-outline', on: 'person', label: 'Profile' },
};

// Custom tab bar — full control over spacing and press feedback (a subtle opacity
// dim on tap instead of the default dark Android ripple).
function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const bottom = Math.max(insets.bottom, 10) + 8;
  const side = Math.min(Math.max(width * 0.06, 20), 34);
  const compact = width < 360;

  const activeName = state.routes[state.index]?.name;
  const tabs = state.routes.filter((r) => TABS[r.name]);

  return (
    <View style={[styles.bar, { bottom, left: side, right: side }]}>
      {tabs.map((route) => {
        const meta = TABS[route.name];
        const focused = activeName === route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            android_ripple={null}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.55 }]}
          >
            {focused ? (
              <View style={styles.pill}>
                <Ionicons name={meta.on} size={18} color="#fff" />
                {!compact && <Text style={styles.pillLabel} numberOfLines={1}>{meta.label}</Text>}
              </View>
            ) : (
              <Ionicons name={meta.off} size={23} color={INACTIVE} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="library/index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="library/[categoryId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingHorizontal: 10,
    shadowColor: '#1E293B',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
