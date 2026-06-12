import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, Store } from 'lucide-react-native';
import type { Shop } from '@printslot/shared';
import { ShopCard } from '@/components/shared/ShopCard';
import {
  Button,
  ButtonText,
  Card,
  EmptyState,
  Input,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { useShops } from '@/features/shops/hooks/useShops';
import { useDebounce } from '@/hooks/useDebounce';

const EMPTY_SHOPS: Shop[] = [];
const SKELETON_ROWS = ['s1', 's2', 's3', 's4'];

function getInitialSearch(search?: string | string[]) {
  return typeof search === 'string' ? search : '';
}

function SkeletonRow() {
  return (
    <Card style={styles.skelRow} pad={16}>
      <Skeleton width={52} height={52} radius={14} />
      <View style={styles.skelText}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="80%" height={12} />
      </View>
    </Card>
  );
}

export default function CustomerShopListScreen() {
  const tokens = useThemeTokens();
  const params = useLocalSearchParams<{ search?: string | string[] }>();
  const [search, setSearch] = useState(() => getInitialSearch(params.search));
  const debouncedSearch = useDebounce(search, 300);
  const { data, isError, isLoading, isRefetching, refetch } = useShops(debouncedSearch);
  const shops = data ?? EMPTY_SHOPS;

  const openShop = useCallback((id: string) => {
    router.push(`/(customer)/shops/${id}` as never);
  }, []);

  const renderShop = useCallback(({ item }: { item: Shop }) => (
    <ShopCard id={item.id} name={item.name} address={item.address} onPress={openShop} />
  ), [openShop]);

  const keyExtractor = useCallback((item: Shop) => item.id, []);
  const retry = useCallback(() => { void refetch(); }, [refetch]);

  const header = (
    <View style={styles.header}>
      <Text variant="h1" color="textPrimary">Shops</Text>
      <Text variant="body" color="textSecondary">Find an active print shop near you.</Text>
      <Input
        accessibilityLabel="Search shops"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setSearch}
        placeholder="Search by shop name"
        returnKeyType="search"
        leftIcon={<Search size={18} color={tokens.textMuted} />}
        testID="shops-search-input"
        value={search}
      />
    </View>
  );

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.padded}>
        {header}
        <View style={styles.list}>
          {SKELETON_ROWS.map((id) => <SkeletonRow key={id} />)}
        </View>
      </Screen>
    );
  }

  if (isError && shops.length === 0) {
    return (
      <Screen contentContainerStyle={styles.padded}>
        {header}
        <Card style={styles.errorCard}>
          <Text variant="h3" color="textPrimary" align="center">Could not load shops</Text>
          <Text variant="bodySm" color="textSecondary" align="center">
            Please try again in a moment.
          </Text>
          <Button onPress={retry} size="md" style={styles.retry} testID="shops-retry-button">
            <ButtonText>Retry</ButtonText>
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={shops}
        estimatedItemSize={104}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={(
          <EmptyState
            icon={Store}
            title={debouncedSearch ? 'No matching shops' : 'No shops yet'}
            body={
              debouncedSearch
                ? `No shops match "${debouncedSearch}". Try another name.`
                : 'Check back later for active print shops.'
            }
          />
        )}
        ListHeaderComponent={header}
        onRefresh={retry}
        refreshing={isRefetching && !isLoading}
        renderItem={renderShop}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  padded: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skelText: {
    flex: 1,
    gap: spacing.sm,
  },
  errorCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
});
