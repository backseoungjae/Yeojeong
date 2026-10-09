import Constants from 'expo-constants';
import { Linking } from 'react-native';
export const appVersion = Constants.expoConfig?.version;
const informationLinks = { source: 'https://api.visitkorea.or.kr/', images: 'https://www.kogl.or.kr/info/userGuide.do' } as const;
export async function openInformation(kind: keyof typeof informationLinks) { await Linking.openURL(informationLinks[kind]); }
