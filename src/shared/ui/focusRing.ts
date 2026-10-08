import { Platform } from 'react-native';
interface FocusRingStyle {
  outlineColor?: string;
  outlineStyle?: 'solid';
  outlineWidth?: number;
  outlineOffset?: number;
}
export function focusRing(focused: boolean, color: string, width: number): FocusRingStyle {
  // 웹의 키보드 포커스는 컨트롤 경계 밖에 표시해 선택 상태와 구분한다.
  return Platform.OS === 'web' ? { outlineColor: color, outlineStyle: 'solid', outlineWidth: focused ? width : 0, outlineOffset: width } : {};
}
