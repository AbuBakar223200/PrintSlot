import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import type { Shop } from '@printslot/shared';
import { ShopCard } from '@/components/shared/ShopCard';
import { Button, ButtonText } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/config/theme';
import { useShops } from '@/features/shops/hooks/useShops';
import { useDebounce } from '@/hooks/useDebounce';

const EMPTY_SHOPS: Shop[] = [];

function getInitialSearch(search?: string | string[]) {
  return typeof search === 'string' ? search : '';
}

export default function CustomerShopListScreen() {
  const params = useLocalSearchParams<{ search?: string | string[] }>();
  const [search, setSearch] = useState(() => getInitialSearch(params.search));
  const debouncedSearch = useDebounce(search, 300);
  const { data, isError, isLoading, isRefetching, refetch } = useShops(debouncedSearch);
  const shops = data ?? EMPTY_SHOPS;

  const openShop = useCallback((id: string) => {
    router.push(`/(customer)/shops/${id}` as never);
  }, []);

  const renderShop = useCallback(({ item }: { item: Shop }) => (
    <ShopCard
      id={item.id}
      name={item.name}
      address={item.address}
      onPress={openShop}
    />
  ), [openShop]);

  const keyExtractor = useCallback((item: Shop) => item.id, []);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Shops</Text>
      <Text style={styles.subtitle}>Find an active print shop near you.</Text>
      <Input
        accessibilityLabel="Search shops"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setSearch}
        placeholder="Search by shop name"
        returnKeyType="search"
        testID="shops-search-input"
        value={search}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading shops...</Text>
        </View>
      </View>
    );
  }

  if (isError && shops.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Could not load shops</Text>
          <Text style={styles.stateText}>Please try again in a moment.</Text>
          <Button onPress={retry} testID="shops-retry-button">
            <ButtonText>Retry</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={shops}
        estimatedItemSize={96}
        keyExtractor={keyExtractor}
        ListEmptyComponent={(
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>
              {debouncedSearch ? `No shops match "${debouncedSearch}"` : 'No shops available yet'}
            </Text>
            <Text style={styles.stateText}>Check back later for active shops.</Text>
          </View>
        )}
        ListHeaderComponent={header}
        onRefresh={refresh}
        refreshing={isRefetching && !isLoading}
        renderItem={renderShop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  centerState: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
