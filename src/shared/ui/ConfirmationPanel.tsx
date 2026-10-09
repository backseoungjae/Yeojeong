import { Section } from './Section';
import { Text } from './Text';
import { type ReactNode, type RefObject } from 'react';
import { View } from 'react-native';
import { useFocusRegion } from '../accessibility/useFocusRegion';
export function ConfirmationPanel({ title, description, children, returnTarget }: { title: string; description: string; children: ReactNode; returnTarget?: RefObject<View | null> }) {
  const announcement = useFocusRegion(true, returnTarget);
  return <Section title={title}>
    <View ref={announcement} accessible accessibilityRole="alert" accessibilityLabel={description}><Text>{description}</Text></View>
    {children}
  </Section>;
}
