import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { phoneUrl, websiteUrl } from '@/shared/api/tour/detailAdapter';
export async function copyPlaceAddress(address: string) {
  if (!address.trim()) throw new Error('unavailable');
  const copied = await Clipboard.setStringAsync(address);
  if (!copied) throw new Error('clipboard');
}
export async function openPlaceLink(value: string, kind: 'phone' | 'website') {
  const safe = kind === 'phone' ? phoneUrl(value.replace(/^tel:/, '')) : websiteUrl(value);
  if (!safe || safe !== value) throw new Error('unavailable');
  // 공급자 URL에 접근하는 동작은 명시적인 사용자 선택 때만 실행한다.
  await Linking.openURL(safe);
}
