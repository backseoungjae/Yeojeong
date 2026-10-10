// 새 영역이나 복귀 동작이 요청되면 이전 영역의 지연된 초기 포커스는 폐기한다.
export function createFocusScheduler(request: (callback: () => void) => number, cancel: (frame: number) => void) {
  let pending: { frame: number; active: boolean } | undefined;
  function cancelPending() {
    if (!pending) return;
    pending.active = false;
    cancel(pending.frame);
    pending = undefined;
  }
  return {
    schedule(focus: () => void) {
      cancelPending();
      const task = { frame: 0, active: true };
      task.frame = request(() => {
        if (!task.active) return;
        task.active = false;
        if (pending === task) pending = undefined;
        focus();
      });
      pending = task;
      return () => {
        task.active = false;
        cancel(task.frame);
        if (pending === task) pending = undefined;
      };
    },
    restore(focus: () => void) {
      cancelPending();
      focus();
    },
  };
}
