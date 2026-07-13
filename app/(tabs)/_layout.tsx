import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const INACTIVE = '#94A3B8';
const CIRCLE_BORDER = '#E2E8F0';

function TabContent({
  icon, iconFocused, label, focused,
}: {
  icon: IconName; iconFocused: IconName; label: string; focused: boolean;
}) {
  if (focused) {
    return (
      <View style={styles.pill}>
        <Ionicons name={iconFocused} size={20} color={COLORS.primary} />
        <Text style={styles.pillLabel} numberOfLines={1}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.circle}>
      <Ionicons name={icon} size={20} color={INACTIVE} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: { ...styles.bar, position: 'absolute', bottom: 24, left: 16, right: 16 },
          android: { ...styles.bar, position: 'absolute', bottom: 16, left: 16, right: 16 },
          web: { ...styles.bar },
        }),
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.iconStyle,
      }}
    >
      <Tabs.Screen
        name="library/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="bookmark-outline" iconFocused="bookmark" label="Library" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="search-outline" iconFocused="search" label="Search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="add-circle-outline" iconFocused="add-circle" label="Add" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabContent icon="person-outline" iconFocused="person" label="Profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="library/[categoryId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    borderRadius: 26,
    shadowColor: '#1E293B',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    paddingHorizontal: 8,
  },
  tabItem: {
    height: 72,
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

  // Active tab — expanding pill with icon + label
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.1,
  },

  // Inactive tab — outlined circle, icon only
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: CIRCLE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
