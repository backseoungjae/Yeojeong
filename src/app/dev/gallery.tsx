import { Redirect } from 'expo-router';
import Screen from '@/features/component-gallery/screens/ComponentGalleryScreen';
export default function DevScreen() { return __DEV__ ? <Screen /> : <Redirect href="/" />; }
