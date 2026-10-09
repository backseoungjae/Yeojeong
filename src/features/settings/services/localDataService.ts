import { Image } from 'expo-image';
import { Platform } from 'react-native';
// 브라우저의 HTTP 캐시는 웹 앱이 삭제할 수 없어 삭제 범위에서 명시적으로 제외한다.
export async function clearPhotoCache() {
  if (Platform.OS === 'web') return;
  const memory = await Image.clearMemoryCache();
  const disk = await Image.clearDiskCache();
  if (!memory || !disk) throw new Error('Image cache clearing failed');
}
