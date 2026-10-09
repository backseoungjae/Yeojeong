import { Redirect } from 'expo-router';
import Screen from '@/features/error-diagnostics/screens/ErrorDiagnosticsScreen';
export default function DevScreen() { return __DEV__ ? <Screen /> : <Redirect href="/" />; }
