import { createContext, useContext, type ReactNode } from 'react';
const FontPreviewContext = createContext(1);
export function FontPreviewProvider({ scale, children }: { scale: number; children: ReactNode }) {
  return <FontPreviewContext.Provider value={__DEV__ ? scale : 1}>{children}</FontPreviewContext.Provider>;
}
export function useFontPreview() { return useContext(FontPreviewContext); }
