import React from 'react';
import { Stack } from 'expo-router';

/**
 * (owner) route group — minimal scaffold added in Slice 03 to host
 * the Profile route. Slice 30 (owner-route-group-mobile) layers
 * shop/, slots/, jobs/, analytics/ routes on top.
 */
export default function OwnerLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
