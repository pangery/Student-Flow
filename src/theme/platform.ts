import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';
export const isDesktop = isWeb;

export const platformInfo = {
  os: Platform.OS,
  version: isIOS ? 'iOS 27' : isAndroid ? 'Android (Material 3)' : 'Desktop (macOS / Windows / Linux)',
  designSystem: isIOS
    ? 'Apple Human Interface (iOS 27 Glass)'
    : isAndroid
    ? 'Material You / Material 3'
    : 'Universal Desktop Floating Dock',
};
