import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { seoulToday } from '../services/tripRules';
export function useTripToday() {
  const [today, setToday] = useState(seoulToday);
  useFocusEffect(useCallback(() => {
    const refresh = () => setToday(seoulToday());
    refresh();
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  return today;
}
