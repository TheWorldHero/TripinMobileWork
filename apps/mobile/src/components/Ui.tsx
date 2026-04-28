import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      style={[
        styles.buttonBase,
        variant === 'primary'
          ? styles.buttonPrimary
          : variant === 'secondary'
            ? styles.buttonSecondary
            : styles.buttonGhost,
      ]}
      onPress={() => {
        void onPress();
      }}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'ghost' ? styles.buttonGhostLabel : styles.buttonFilledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonLabel, active && styles.tabButtonLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.metaText}>{subtitle}</Text>
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function HeroCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroEyebrow}>Local full-stack prototype</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.metaText}>{description}</Text>
    </View>
  );
}

export function Banner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Pressable style={styles.banner} onPress={onClose}>
      <Text style={styles.bannerText}>{text}</Text>
      <Text style={styles.bannerDismiss}>点按关闭</Text>
    </Pressable>
  );
}

export function BusyRow({ label }: { label: string }) {
  return (
    <View style={styles.busyRow}>
      <ActivityIndicator color="#f6f0e8" />
      <Text style={styles.busyLabel}>{label}</Text>
    </View>
  );
}

export function StatusPill({ ok }: { ok: boolean | null }) {
  const label = ok === null ? '连接中' : ok ? 'API 正常' : 'API 断开';
  return (
    <View
      style={[
        styles.statusPill,
        ok === null ? styles.statusPending : ok ? styles.statusSuccess : styles.statusError,
      ]}
    >
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  textInput: {
    minHeight: 44,
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd2c1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#203734',
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  cardTitle: {
    color: '#173430',
    fontSize: 20,
    fontWeight: '800',
  },
  cardBodyText: {
    color: '#445653',
    lineHeight: 21,
  },
  metaText: {
    color: '#64716d',
    lineHeight: 19,
    fontSize: 13,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#143f3a',
  },
  buttonSecondary: {
    backgroundColor: '#d9b67d',
  },
  buttonGhost: {
    backgroundColor: '#ede4d7',
    borderWidth: 1,
    borderColor: '#d8cbbb',
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
  buttonFilledLabel: {
    color: '#fef8ef',
  },
  buttonGhostLabel: {
    color: '#36524f',
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#f3eadf',
  },
  tabButtonLabel: {
    color: '#c6d2cf',
    fontWeight: '700',
  },
  tabButtonLabelActive: {
    color: '#173430',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ece4d8',
  },
  badgeText: {
    color: '#324845',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#f8f2e9',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e6ddd0',
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: '#183531',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionBody: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#f1e7d5',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2d3bc',
  },
  heroEyebrow: {
    color: '#7c5c32',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 10,
    color: '#19302d',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#4a5a58',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    paddingVertical: 8,
    gap: 8,
  },
  cardTitle: {
    color: '#173430',
    fontSize: 20,
    fontWeight: '800',
  },
  metaText: {
    color: '#64716d',
    lineHeight: 19,
    fontSize: 13,
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f1e2c7',
    borderWidth: 1,
    borderColor: '#ead1a9',
  },
  bannerText: {
    color: '#4b3522',
    fontWeight: '700',
  },
  bannerDismiss: {
    marginTop: 4,
    color: '#7a624a',
    fontSize: 12,
  },
  busyRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#21403d',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  busyLabel: {
    color: '#f6f0e8',
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: '#6f7c79',
  },
  statusSuccess: {
    backgroundColor: '#1f6159',
  },
  statusError: {
    backgroundColor: '#8b4a40',
  },
  statusPillText: {
    color: '#fffaf2',
    fontWeight: '700',
    fontSize: 12,
  },
});
