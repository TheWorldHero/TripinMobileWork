import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const PRIMARY = '#1F4FE0';
const ITEM_HEIGHT = 38;
const VISIBLE_ROWS = 5;

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function pad2(value: number) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatIso(parts: Parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function nowParts(): Parts {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

function parseValue(value: string | null | undefined): Parts {
  if (!value) return nowParts();
  const match = value.trim().match(/(\d{4})-(\d{1,2})-(\d{1,2})[T\s]?(\d{1,2})?:?(\d{1,2})?/);
  if (!match) return nowParts();
  const fallback = nowParts();
  return {
    year: Number(match[1]) || fallback.year,
    month: Number(match[2]) || fallback.month,
    day: Number(match[3]) || fallback.day,
    hour: match[4] !== undefined ? Number(match[4]) : 0,
    minute: match[5] !== undefined ? Number(match[5]) : 0,
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function range(start: number, endInclusive: number) {
  const out: number[] = [];
  for (let i = start; i <= endInclusive; i += 1) out.push(i);
  return out;
}

type WheelProps = {
  values: number[];
  selectedValue: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  width: number;
};

function Wheel({ values, selectedValue, onChange, formatter, width }: WheelProps) {
  const ref = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, values.indexOf(selectedValue));

  // Reposition the wheel whenever the selected value or the list of values
  // changes. requestAnimationFrame avoids racing against the ScrollView's
  // initial layout pass on Android, which sometimes ignores contentOffset.
  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx < 0) return;
    const handle = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    });
    return () => cancelAnimationFrame(handle);
  }, [selectedValue, values]);

  function commitFromOffset(offsetY: number) {
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    const next = values[clamped];
    if (next !== undefined && next !== selectedValue) {
      onChange(next);
    }
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    commitFromOffset(event.nativeEvent.contentOffset.y);
  }

  // onMomentumScrollEnd doesn't fire when the user drags slowly and releases
  // (no fling). Cover that case here so the picker always commits the value.
  function handleDragEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    commitFromOffset(event.nativeEvent.contentOffset.y);
  }

  function handleItemPress(value: number) {
    if (value === selectedValue) return;
    onChange(value);
  }

  const padRows = Math.floor(VISIBLE_ROWS / 2);

  return (
    <View style={[styles.wheelColumn, { width, height: ITEM_HEIGHT * VISIBLE_ROWS }]}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleDragEnd}
        nestedScrollEnabled
      >
        <View style={{ height: ITEM_HEIGHT * padRows }} />
        {values.map((value) => (
          <Pressable
            key={value}
            style={styles.wheelItem}
            onPress={() => handleItemPress(value)}
          >
            <Text style={value === selectedValue ? styles.wheelItemTextActive : styles.wheelItemText}>
              {formatter ? formatter(value) : value}
            </Text>
          </Pressable>
        ))}
        <View style={{ height: ITEM_HEIGHT * padRows }} />
      </ScrollView>
      <View style={styles.wheelHighlight} pointerEvents="none" />
    </View>
  );
}

export type DateTimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function DateTimePickerField({ label, value, onChange, placeholder = '选择时间' }: DateTimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Parts>(() => parseValue(value));

  useEffect(() => {
    if (open) setDraft(parseValue(value));
  }, [open, value]);

  const yearValues = useMemo(() => {
    const current = new Date().getFullYear();
    return range(current - 5, current + 5);
  }, []);
  const monthValues = useMemo(() => range(1, 12), []);
  const dayValues = useMemo(() => range(1, daysInMonth(draft.year, draft.month)), [draft.year, draft.month]);
  const hourValues = useMemo(() => range(0, 23), []);
  const minuteValues = useMemo(() => range(0, 59), []);

  function setPart<K extends keyof Parts>(key: K, val: Parts[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: val };
      const max = daysInMonth(next.year, next.month);
      if (next.day > max) next.day = max;
      return next;
    });
  }

  function handleConfirm() {
    onChange(formatIso(draft));
    setOpen(false);
  }

  function handleNow() {
    setDraft(nowParts());
  }

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.inputButton} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={16} color="#475467" />
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>{value || placeholder}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable hitSlop={10} onPress={handleNow}>
                <Text style={styles.sheetNow}>现在</Text>
              </Pressable>
            </View>
            <View style={styles.wheelRow}>
              <Wheel values={yearValues} selectedValue={draft.year} onChange={(v) => setPart('year', v)} width={70} />
              <Wheel values={monthValues} selectedValue={draft.month} onChange={(v) => setPart('month', v)} formatter={pad2} width={48} />
              <Wheel values={dayValues} selectedValue={draft.day} onChange={(v) => setPart('day', v)} formatter={pad2} width={48} />
              <View style={styles.wheelGap} />
              <Wheel values={hourValues} selectedValue={draft.hour} onChange={(v) => setPart('hour', v)} formatter={pad2} width={48} />
              <Text style={styles.colon}>:</Text>
              <Wheel values={minuteValues} selectedValue={draft.minute} onChange={(v) => setPart('minute', v)} formatter={pad2} width={48} />
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { flex: 1, gap: 6 },
  label: { color: '#475467', fontSize: 12, fontWeight: '700' },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9dee7',
    backgroundColor: '#fff',
  },
  inputText: { color: '#101828', fontSize: 14, fontWeight: '600' },
  inputPlaceholder: { color: '#98a2b3', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#101828' },
  sheetNow: { color: PRIMARY, fontSize: 14, fontWeight: '800' },
  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  wheelGap: { width: 12 },
  colon: { color: '#101828', fontSize: 18, fontWeight: '800', marginHorizontal: 2 },
  wheelColumn: { position: 'relative', overflow: 'hidden' },
  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { color: '#98a2b3', fontSize: 16, fontWeight: '600' },
  wheelItemTextActive: { color: '#101828', fontSize: 17, fontWeight: '900' },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e6e9ee',
    backgroundColor: 'rgba(31, 79, 224, 0.06)',
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f2f4f7' },
  cancelText: { color: '#475467', fontSize: 15, fontWeight: '800' },
  confirmButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: PRIMARY },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
