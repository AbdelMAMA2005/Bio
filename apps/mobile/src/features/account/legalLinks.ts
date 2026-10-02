import { Linking } from 'react-native';

export const LEGAL_URLS = {
  privacy: 'https://app.notion.com/p/Privacy-Policy-3ebbd12ee53a8064801cfc16ff2cad32?source=copy_link',
  terms: 'https://app.notion.com/p/Terms-Conditions-3ebbd12ee53a800988e3da51ae2c3923?source=copy_link',
} as const;

export async function openLegalLink(kind: keyof typeof LEGAL_URLS): Promise<void> {
  await Linking.openURL(LEGAL_URLS[kind]);
}
