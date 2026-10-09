import { useLocalSearchParams } from 'expo-router';
import { TripEditor } from '../components/TripEditor';
export default function TripCreateScreen() {
  const { returnPlaceId, returnFlowId } = useLocalSearchParams<{ returnPlaceId?: string; returnFlowId?: string }>();
  return <TripEditor returnPlaceId={typeof returnPlaceId === 'string' ? returnPlaceId : undefined} returnFlowId={typeof returnFlowId === 'string' ? returnFlowId : undefined} />;
}
