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
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { useShopping } from '../../hooks/useShopping';
import { fetchUser } from '../../services/users';
import {
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItemText,
  removeShoppingItem,
} from '../../services/shopping';
import { ShoppingItem, Trip } from '../../types';
import { COLORS } from '../../constants';

interface Props {
  tripId: string;
}

export default function ShoppingListScreen({ tripId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { items, loading } = useShopping(tripId);
  const [newItem, setNewItem] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), (snap) => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() } as Trip);
    });
    return unsub;
  }, [tripId]);

  useEffect(() => {
    if (!user?.uid) return;
    fetchUser(user.uid).then((u) => {
      if (u) setIsAdmin(u.role === 'admin');
    }).catch(() => {});
  }, [user?.uid]);

  const canEdit = isAdmin || (trip && user?.uid === trip.createdBy);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <View style={styles.container}>
      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggle(item)}
            >
              <View
                style={[
                  styles.checkboxInner,
                  item.checked && styles.checkboxChecked,
                ]}
              >
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={handleSaveEdit}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                  <Text style={styles.saveBtnText}>OK</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancelEdit}>
                  <Text style={styles.cancelEditText}>×</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.itemTextWrapper}
                onPress={() => handleStartEdit(item)}
                disabled={!canEdit}
              >
                <Text
                  style={[styles.itemText, item.checked && styles.itemTextChecked]}
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
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Handlelisten er tom</Text>
            <Text style={styles.emptyText}>
              Legg til ting dere trenger til turen
            </Text>
          </View>
        }
      />

      {canEdit ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Legg til vare..."
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, !newItem.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newItem.trim()}
          >
            <Text style={styles.addBtnText}>Legg til</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>Kun turleder og admin kan redigere</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemTextWrapper: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelEditBtn: {
    paddingHorizontal: 6,
  },
  cancelEditText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  removeBtn: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 22,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  addBtn: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  readOnlyBar: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
