import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { createFocusScheduler } from './focusScheduler';
const scheduler = createFocusScheduler(callback => requestAnimationFrame(callback), frame => cancelAnimationFrame(frame));
function focus(target: View | null | undefined) {
  if (!target) return;
  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) { target.tabIndex = target.tabIndex < 0 ? -1 : target.tabIndex; target.focus(); }
  else AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}
function restoreTarget(target: RefObject<View | null>) { focus(target.current); }
export function useFocusRegion(open = true, returnTarget?: RefObject<View | null>) {
  const target = useRef<View>(null);
  useEffect(() => {
    if (!open) return;
    const previous = typeof document !== 'undefined' ? document.activeElement : null;
    const cancelFocus = scheduler.schedule(() => focus(target.current));
    return () => {
      cancelFocus();
      scheduler.restore(() => {
        if (returnTarget) restoreTarget(returnTarget);
        else if (typeof HTMLElement !== 'undefined' && previous instanceof HTMLElement && document.contains(previous)) previous.focus();
      });
    };
  }, [open, returnTarget]);
  return target;
}
