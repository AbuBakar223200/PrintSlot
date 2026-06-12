import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowDown, ArrowUp, Wallet } from 'lucide-react-native';
import { TransactionType, type WalletTransaction } from '@printslot/shared';
import {
  Banner,
  Card,
  EmptyState,
  FrostCard,
  MoneyText,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { CustomerTabBar, CUSTOMER_TAB_BAR_HEIGHT } from '@/components/shared/CustomerTabBar';
import { spacing, useTheme, useThemeTokens } from '@/theme';
import { formatRelative } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { useWalletBalance, useWalletTransactions } from '@/features/wallet/hooks/useWallet';

function reasonLabel(reason: WalletTransaction['reason']): string {
  if (reason === 'TOPUP_ADMIN') return 'Top-up by Admin';
  if (reason === 'TOPUP_GATEWAY') return 'Top-up';
  if (reason === 'ORDER_REFUND') return 'Order refund';
  return 'Order payment';
}

export default function CustomerWalletScreen() {
  const tokens = useThemeTokens();
  const unreadCount = useUnreadCount();
  const balance = useWalletBalance();
  const transactions = useWalletTransactions();
  const lowBalance = (balance.data?.balance ?? 0) > 0 && (balance.data?.balance ?? 0) < 50;

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="h1" color="textPrimary">Wallet</Text>
          <Text variant="body" color="textSecondary">Balance and payment activity.</Text>
        </View>

        <FrostCard pad={24} style={styles.hero}>
          <Text variant="label" style={styles.heroLabel}>Wallet balance</Text>
          {balance.isLoading ? (
            <Skeleton width="55%" height={42} />
          ) : (
            <MoneyText
              amount={balance.data?.balance ?? 0}
              color="onPrimary"
              variant="displayLg"
              decimals={0}
            />
          )}
          <Text variant="bodySm" style={styles.heroMuted}>Managed by PrintSlot ledger</Text>
        </FrostCard>

        {lowBalance ? (
          <Banner tone="warn" icon={Wallet}>Low balance may block wallet payment.</Banner>
        ) : null}

        <View style={styles.section}>
          <Text variant="h3" color="textPrimary">Transactions</Text>
          {transactions.isLoading ? (
            <Card style={styles.loadingCard}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={12} />
            </Card>
          ) : transactions.isError ? (
            <EmptyState icon={Wallet} title="Could not load transactions" body="Try again later." />
          ) : transactions.data?.data.length ? (
            <View style={styles.transactionList}>
              {transactions.data.data.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </View>
          ) : (
            <EmptyState icon={Wallet} title="No transactions" body="Wallet activity will appear here." />
          )}
        </View>
      </Screen>
      <CustomerTabBar active="wallet" unreadCount={unreadCount} />
    </View>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const { tones } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const isCredit = tx.type === TransactionType.CREDIT;
  const tone = isCredit ? tones.success : tones.error;
  const Icon = isCredit ? ArrowUp : ArrowDown;

  return (
    <Card style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: tone.bg }]}>
        <Icon size={18} color={tone.fg} />
      </View>
      <View style={styles.txText}>
        <Text variant="body" color="textPrimary" numberOfLines={1}>
          {reasonLabel(tx.reason)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatRelative(tx.createdAt, language)}
        </Text>
      </View>
      <MoneyText
        amount={Number(tx.amount)}
        color={isCredit ? 'success' : 'error'}
        sign={isCredit ? '+' : '-'}
        variant="body"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  hero: {
    backgroundColor: 'transparent',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.82)',
  },
  heroMuted: {
    color: 'rgba(255,255,255,0.78)',
  },
  section: {
    gap: spacing.md,
  },
  loadingCard: {
    gap: spacing.sm,
  },
  transactionList: {
    gap: spacing.md,
  },
  txRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  txIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  txText: {
    flex: 1,
    gap: 2,
  },
});
