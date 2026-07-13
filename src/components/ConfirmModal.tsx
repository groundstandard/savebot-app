import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '../constants';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger, onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, danger ? styles.dangerBtn : styles.confirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(18,13,66,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, ...SHADOW.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  message: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  btn: { flex: 1, paddingVertical: 13, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.surfaceAlt },
  cancelText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: { backgroundColor: COLORS.primary },
  dangerBtn: { backgroundColor: COLORS.danger },
  confirmText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#fff' },
});
