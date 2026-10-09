import { useLocalSearchParams } from 'expo-router';
import { TripEditor } from '../components/TripEditor';
export default function TripEditScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  return <TripEditor tripId={typeof tripId === 'string' ? tripId : ''} />;
}
