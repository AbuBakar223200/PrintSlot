import React, { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  ChevronLeft,
  ClipboardList,
  Phone,
} from 'lucide-react-native';
import { PaymentMethod } from '@printslot/shared';
import {
  AmbientBackground,
  Banner,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  FrostCard,
  IconButton,
  KeyValue,
  MoneyText,
  Skeleton,
  StatusBadge,
  Text,
  toast,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { JobFileRow } from '@/features/staff/components/JobFileRow';
import { useAdvanceJobStatus, useStaffJob } from '@/features/staff/hooks/useStaffJobs';
import { advanceLabelKey, nextStatus } from '@/features/staff/statusFlow';

function getJobId(jobId?: string | string[]) {
  return typeof jobId === 'string' ? jobId : Array.isArray(jobId) ? jobId[0] ?? '' : '';
}

export default function JobDetailScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string | string[] }>();
  const jobId = getJobId(params.jobId);

  const { data: job, isLoading, isError, refetch } = useStaffJob(jobId);
  const advance = useAdvanceJobStatus();

  const goBack = useCallback(() => {
    router.back();
  }, []);

  const callCustomer = useCallback(() => {
    if (job?.customerPhone) {
      void Linking.openURL(`tel:${job.customerPhone}`);
    }
  }, [job?.customerPhone]);

  const onAdvance = useCallback(() => {
    if (!job) return;
    const next = nextStatus(job.status);
    if (!next) return;
    const current = job.status;
    advance.mutate(
      { orderId: job.id, status: next, expectedCurrentStatus: current },
      {
        onSuccess: (updated) => {
          toast(t('toast.statusAdvanced', { s: t(`status.${updated.status}`) }), {
            tone: 'success',
            icon: CheckCheck,
          });
        },
        onError: (error) => {
          if (error.statusCode === 409) {
            // Another staffer advanced it first — refetch the truth and let staff retry.
            void refetch();
            toast(t('toast.statusAdvanced', { s: t(`status.${next}`) }), { tone: 'info' });
          } else {
            toast(error.message, { tone: 'error' });
          }
        },
      },
    );
  }, [advance, job, refetch, t]);

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AmbientBackground />
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <View style={styles.topBar}>
            <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={goBack} variant="surface" />
          </View>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <FrostCard pad={20}>
              <View style={styles.heroSkel}>
                <Skeleton width="55%" height={26} />
                <Skeleton width="70%" height={14} />
              </View>
            </FrostCard>
            <Card>
              <View style={styles.heroSkel}>
                <Skeleton width="100%" height={14} />
                <Skeleton width="100%" height={14} />
              </View>
            </Card>
          </ScrollView>
        </View>
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={styles.flex}>
        <AmbientBackground />
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <View style={styles.topBar}>
            <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={goBack} variant="surface" />
          </View>
          <View style={styles.centerState}>
            <EmptyState
              icon={ClipboardList}
              title={t('staff.empty')}
              body={t('staff.emptySub')}
              cta={{ label: t('common.retry'), onPress: () => void refetch() }}
            />
          </View>
        </View>
      </View>
    );
  }

  const methodLabel = job.paymentMethod === PaymentMethod.WALLET ? t('wizard.payWallet') : t('wizard.payCash');
  const next = nextStatus(job.status);
  const advanceKey = advanceLabelKey(job.status);
  const files = job.orderFiles ?? [];

  return (
    <View style={styles.flex}>
      <AmbientBackground />
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={goBack} variant="surface" />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FrostCard pad={20}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <Text variant="h1" color="textPrimary" numberOfLines={1} style={styles.orderNumber}>
                  {job.orderNumber}
                </Text>
                <StatusBadge status={job.status} />
              </View>
              <View style={styles.customerRow}>
                <View style={styles.customerCol}>
                  {job.customerName ? (
                    <Text variant="body" color="textPrimary" style={styles.semibold} numberOfLines={1}>
                      {job.customerName}
                    </Text>
                  ) : null}
                  {job.customerPhone ? (
                    <Pressable onPress={callCustomer} hitSlop={6} style={styles.phoneRow} testID="job-detail-phone">
                      <Phone size={13} color={tokens.textMuted} />
                      <Text variant="bodySm" color="textMuted">{job.customerPhone}</Text>
                    </Pressable>
                  ) : null}
                </View>
                {job.slotTime ? (
                  <View style={[styles.pill, { backgroundColor: tokens.tintSoft }]}>
                    <CalendarClock size={12} color={tokens.textSecondary} />
                    <Text variant="label" color="textSecondary">{job.slotTime}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </FrostCard>

          <Card>
            <KeyValue label={t('order.method')} value={methodLabel} />
            <KeyValue label={t('order.total')} emphasis last>
              <MoneyText amount={Number(job.totalPrice)} variant="h3" color="primary" />
            </KeyValue>
          </Card>

          <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>{t('staff.config')}</Text>
          <View style={styles.fileList}>
            {files.map((file) => (
              <JobFileRow key={file.id} file={file} />
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {next && advanceKey ? (
            <Button onPress={onAdvance} isLoading={advance.isPending} size="lg" testID="job-detail-advance">
              <ButtonIcon><ArrowRight size={18} color={tokens.onPrimary} /></ButtonIcon>
              <ButtonText>{t(advanceKey)}</ButtonText>
            </Button>
          ) : (
            <Banner tone="success" icon={CheckCheck} testID="job-detail-collected">
              {t('order.collectedNote')}
            </Banner>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.md,
  },
  heroSkel: {
    gap: spacing.md,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  orderNumber: {
    flex: 1,
  },
  customerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  customerCol: {
    flex: 1,
    gap: 2,
  },
  semibold: { fontWeight: '700' },
  phoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  pill: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 9999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  sectionTitle: {
    marginTop: spacing.xs,
  },
  fileList: {
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
