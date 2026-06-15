import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { OrderStatus } from '@printslot/shared';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { STATUS_ICONS } from './icons';

export interface TimelineProps {
  /** Ordered statuses to render top → bottom (queue or slot sequence). */
  sequence: readonly OrderStatus[];
  /** The order's current status — highlighted node; earlier nodes mark done. */
  current: OrderStatus;
  /** Optional note rendered under the current node (e.g. collected thanks). */
  currentNote?: string;
  /** Note shown when `current` is CANCELLED (rendered as a single error node). */
  cancelledNote?: string;
}

/**
 * F5 — `Timeline` (prototype `.timeline`). Vertical status rail: done nodes are
 * filled success + check, the current node is filled indigo with a soft halo,
 * upcoming nodes are muted. CANCELLED renders as a single error node. Icons +
 * labels come from the fixed `STATUS_ICONS` map so they read identically to the
 * StatusBadge. The badge/ETA crossfade on advance is the consumer's re-render.
 */
export function Timeline({ sequence, current, currentNote, cancelledNote }: TimelineProps) {
  const { tokens } = useTheme();
  const { t } = useTranslation();

  if (current === OrderStatus.CANCELLED) {
    const meta = STATUS_ICONS[OrderStatus.CANCELLED];
    const Glyph = meta.icon;
    return (
      <View style={styles.timeline}>
        <View style={styles.node}>
          <View style={styles.rail}>
            <View style={styles.dotWrap}>
              <View style={[styles.dot, { backgroundColor: tokens.error }]}>
                <Glyph size={15} color={tokens.onPrimary} />
              </View>
            </View>
          </View>
          <View style={styles.label}>
            <Text variant="body" color="textPrimary" style={styles.title}>
              {t(meta.labelKey)}
            </Text>
            {cancelledNote ? (
              <Text variant="caption" color="textMuted">{cancelledNote}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  const currentIndex = sequence.indexOf(current);

  return (
    <View style={styles.timeline}>
      {sequence.map((status, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === sequence.length - 1;
        const meta = STATUS_ICONS[status];
        const Glyph = meta.icon;

        const dotColor = done
          ? tokens.success
          : isCurrent
            ? tokens.primary
            : tokens.border;
        const glyphColor = done || isCurrent ? tokens.onPrimary : tokens.textMuted;

        return (
          <View key={status} style={styles.node}>
            <View style={styles.rail}>
              <View style={styles.dotWrap}>
                {isCurrent ? (
                  <View style={[styles.halo, { backgroundColor: tokens.tintSoft }]} />
                ) : null}
                <View style={[styles.dot, { backgroundColor: dotColor }]}>
                  {done ? (
                    <Check size={15} color={glyphColor} />
                  ) : (
                    <Glyph size={15} color={glyphColor} />
                  )}
                </View>
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: done ? tokens.success : tokens.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.label}>
              <Text
                variant="body"
                color={done || isCurrent ? 'textPrimary' : 'textMuted'}
                style={styles.title}
              >
                {t(meta.labelKey)}
              </Text>
              {isCurrent && currentNote ? (
                <Text variant="caption" color="textMuted">{currentNote}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 28;
const HALO = 38;

const styles = StyleSheet.create({
  timeline: {
    paddingVertical: 4,
  },
  node: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    alignItems: 'center',
    width: HALO,
  },
  dotWrap: {
    alignItems: 'center',
    height: HALO,
    justifyContent: 'center',
    width: HALO,
  },
  halo: {
    borderRadius: HALO / 2,
    height: HALO,
    position: 'absolute',
    width: HALO,
  },
  dot: {
    alignItems: 'center',
    borderRadius: DOT / 2,
    height: DOT,
    justifyContent: 'center',
    width: DOT,
  },
  line: {
    flex: 1,
    minHeight: 26,
    width: 2,
  },
  label: {
    flex: 1,
    gap: 2,
    paddingBottom: 22,
    paddingTop: 4,
  },
  title: {
    fontWeight: '600',
  },
});
