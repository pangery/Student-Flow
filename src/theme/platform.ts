import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const platformInfo = {
  os: Platform.OS,
  version: isIOS ? 'iOS 27' : 'Android (Material 3)',
  designSystem: isIOS ? 'Apple Human Interface (iOS 27 Glass)' : 'Material You / Material 3',
};
