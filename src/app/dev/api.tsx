import { Redirect } from 'expo-router';
import Screen from '@/features/api-diagnostics/screens/TourDiagnosticsScreen';
export default function DevScreen() { return __DEV__ ? <Screen /> : <Redirect href="/" />; }
