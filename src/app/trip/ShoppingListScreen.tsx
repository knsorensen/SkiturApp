import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useShopping } from '../../hooks/useShopping';
import { isAdminEmail } from '../../services/auth';
import {
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItemText,
  removeShoppingItem,
} from '../../services/shopping';
import { ShoppingItem } from '../../types';

interface Props {
  tripId: string;
}

export default function ShoppingListScreen({ tripId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const { items, loading } = useShopping(tripId);
  const [newItem, setNewItem] = useState('');
  const canEdit = isAdminEmail(user?.email);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (item: ShoppingItem) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await updateShoppingItemText(tripId, editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleAdd = async () => {
    if (!user || !newItem.trim() || !canEdit) return;
    const text = newItem.trim();
    setNewItem('');
    await addShoppingItem(tripId, text, user.uid);
  };

  const handleToggle = async (item: ShoppingItem) => {
    if (!canEdit) return;
    await toggleShoppingItem(tripId, item.id, !item.checked);
  };

  const handleRemove = (item: ShoppingItem) => {
    if (!canEdit) return;
    const doRemove = () => removeShoppingItem(tripId, item.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Fjerne "${item.text}"?`)) doRemove();
    } else {
      Alert.alert('Fjern', `Fjerne "${item.text}"?`, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Fjern', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggle(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkboxInner,
                  { borderColor: item.checked ? colors.success : colors.border },
                  item.checked && { backgroundColor: colors.success },
                ]}
              >
                {item.checked && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
            </TouchableOpacity>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.primary, color: colors.text }]}
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={handleSaveEdit}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveEdit}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.itemTextWrapper}
                onPress={() => handleStartEdit(item)}
                disabled={!canEdit}
              >
                <Text
                  style={[
                    styles.itemText,
                    { color: item.checked ? colors.textSecondary : colors.text },
                    item.checked && styles.itemTextChecked,
                  ]}
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            )}
            {canEdit && editingId !== item.id && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCenter}>
            <Ionicons name="cart-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Handlelisten er tom</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Legg til ting dere trenger til turen
            </Text>
          </View>
        }
      />

      {canEdit ? (
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Legg til vare..."
            placeholderTextColor={colors.textSecondary}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }, !newItem.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newItem.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.readOnlyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
            Kun turleder og admin kan redigere
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
      default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    }),
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrapper: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
  },
  readOnlyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
