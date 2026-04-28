import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  stretch = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  stretch?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.buttonBase,
        stretch && styles.buttonStretch,
        disabled && styles.buttonDisabled,
        variant === 'primary'
          ? styles.buttonPrimary
          : variant === 'secondary'
            ? styles.buttonSecondary
            : styles.buttonGhost,
      ]}
      disabled={disabled}
      onPress={() => {
        if (!disabled) {
          void onPress();
        }
      }}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'ghost' ? styles.buttonGhostLabel : styles.buttonFilledLabel,
          disabled && styles.buttonDisabledLabel,
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

export function Badge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'accent' | 'dark';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'accent' ? styles.badgeAccent : tone === 'dark' ? styles.badgeDark : null,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === 'accent' ? styles.badgeAccentText : tone === 'dark' ? styles.badgeDarkText : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function MetricPill({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function MonogramAvatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.avatarText}>{initials || 'T'}</Text>
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
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function HeroCard({
  title,
  subtitle,
  eyebrow = 'Map-first travel diary',
  aside,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  aside?: ReactNode;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroGlowA} />
      <View style={styles.heroGlowB} />
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>{eyebrow}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>
        </View>
        {aside ? <View style={styles.heroAside}>{aside}</View> : null}
      </View>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{description}</Text>
    </View>
  );
}

export function Banner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Pressable style={styles.banner} onPress={onClose}>
      <Text style={styles.bannerText}>{text}</Text>
      <Text style={styles.bannerDismiss}>Tap to dismiss</Text>
    </Pressable>
  );
}

export function BusyRow({ label }: { label: string }) {
  return (
    <View style={styles.busyRow}>
      <ActivityIndicator color="#fff6ea" />
      <Text style={styles.busyLabel}>{label}</Text>
    </View>
  );
}

export function StatusPill({ ok }: { ok: boolean | null }) {
  const label = ok === null ? 'Connecting' : ok ? 'Backend ready' : 'Offline';
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
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 16,
  },
  textInput: {
    minHeight: 48,
    backgroundColor: '#fffaf2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e6d8c4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#18332f',
  },
  multilineInput: {
    minHeight: 92,
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
    color: '#102d2a',
    fontSize: 19,
    fontWeight: '800',
  },
  cardBodyText: {
    color: '#4a5d59',
    lineHeight: 21,
  },
  metaText: {
    color: '#6d7c78',
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
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonStretch: {
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPrimary: {
    backgroundColor: '#143f3a',
  },
  buttonSecondary: {
    backgroundColor: '#d9b67d',
  },
  buttonGhost: {
    backgroundColor: '#f4ebde',
    borderWidth: 1,
    borderColor: '#dfcfbb',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  buttonFilledLabel: {
    color: '#fff8ee',
  },
  buttonGhostLabel: {
    color: '#294440',
  },
  buttonDisabledLabel: {
    color: '#f8f0e1',
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff7ea',
  },
  tabButtonLabel: {
    color: '#b8cac7',
    fontWeight: '800',
    fontSize: 13,
  },
  tabButtonLabelActive: {
    color: '#133430',
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#efe5d7',
  },
  badgeAccent: {
    backgroundColor: '#f4d8a9',
  },
  badgeDark: {
    backgroundColor: '#173c38',
  },
  badgeText: {
    color: '#3b4e4b',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeAccentText: {
    color: '#664115',
  },
  badgeDarkText: {
    color: '#f7f1e7',
  },
  metricPill: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f7efe3',
    borderWidth: 1,
    borderColor: '#e6d6bf',
    gap: 2,
  },
  metricValue: {
    color: '#132e2b',
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#6b7772',
    fontSize: 12,
  },
  avatar: {
    backgroundColor: '#173f39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff8ec',
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#f8f1e5',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eadfce',
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
    gap: 5,
  },
  sectionTitle: {
    color: '#13312e',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#6d7b78',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBody: {
    gap: 14,
  },
  heroCard: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#e7dcc9',
    borderWidth: 1,
    borderColor: '#e2d3bb',
    padding: 22,
  },
  heroGlowA: {
    position: 'absolute',
    right: -20,
    top: -10,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#f6d7a7',
    opacity: 0.45,
  },
  heroGlowB: {
    position: 'absolute',
    left: -16,
    bottom: -38,
    width: 150,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#c7d8cf',
    opacity: 0.45,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroText: {
    flex: 1,
  },
  heroAside: {
    justifyContent: 'flex-start',
  },
  heroEyebrow: {
    color: '#7b5b31',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 10,
    color: '#102d2a',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#485a57',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    paddingVertical: 14,
    gap: 8,
  },
  emptyTitle: {
    color: '#173430',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#63716d',
    fontSize: 14,
    lineHeight: 20,
  },
  banner: {
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f3dfbd',
    borderWidth: 1,
    borderColor: '#e2c88e',
  },
  bannerText: {
    color: '#4c351f',
    fontWeight: '700',
    lineHeight: 20,
  },
  bannerDismiss: {
    marginTop: 6,
    color: '#7a6348',
    fontSize: 12,
  },
  busyRow: {
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#1a403b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  busyLabel: {
    color: '#fff7ea',
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: '#667875',
  },
  statusSuccess: {
    backgroundColor: '#1d6057',
  },
  statusError: {
    backgroundColor: '#8d4a3f',
  },
  statusPillText: {
    color: '#fff7ee',
    fontSize: 12,
    fontWeight: '800',
  },
});
