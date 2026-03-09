import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  photoURL?: string | null;
  name: string;
  size?: number;
}

export default function UserAvatar({ photoURL, name, size = 40 }: Props) {
  const borderRadius = size / 2;
  const fontSize = size * 0.4;

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius },
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize }]}>
        {(name || '?')[0].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.border,
  },
  fallback: {
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
});
