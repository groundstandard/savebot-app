import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const INACTIVE = '#9AA3B2';

function TabContent({
  icon, iconFocused, label, focused, compact,
}: {
  icon: IconName; iconFocused: IconName; label: string; focused: boolean; compact: boolean;
}) {
  if (focused) {
    return (
      <View style={styles.pill}>
        <Ionicons name={iconFocused} size={18} color="#fff" />
        {!compact && <Text style={styles.pillLabel} numberOfLines={1}>{label}</Text>}
      </View>
    );
  }
  return <Ionicons name={icon} size={23} color={INACTIVE} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Float the bar above the device's system nav (buttons or gesture bar).
  const barBottom = Math.max(insets.bottom, 10) + 8;
  // Responsive side margin + hide labels on very narrow phones so the pill fits.
  const sideMargin = Math.min(Math.max(width * 0.05, 16), 28);
  const compact = width < 360;

  const bar = {
    ...styles.bar,
    position: 'absolute' as const,
    bottom: barBottom,
    left: sideMargin,
    right: sideMargin,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: Platform.OS === 'web' ? styles.bar : bar,
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.iconStyle,
      }}
    >
      <Tabs.Screen
        name="library/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="bookmark-outline" iconFocused="bookmark" label="Library" focused={focused} compact={compact} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="search-outline" iconFocused="search" label="Search" focused={focused} compact={compact} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="add-circle-outline" iconFocused="add-circle" label="Add" focused={focused} compact={compact} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="person-outline" iconFocused="person" label="Profile" focused={focused} compact={compact} />
          ),
        }}
      />
      <Tabs.Screen name="library/[categoryId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    borderRadius: 22,
    shadowColor: '#1E293B',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    paddingHorizontal: 6,
  },
  tabItem: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconStyle: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Active tab — solid brand pill with icon + label
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
