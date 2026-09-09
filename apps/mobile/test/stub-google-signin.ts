/** @react-native-google-signin/google-signin es un módulo nativo puro: no
 *  existe fuera del teléfono. Los tests no verifican el login real, sólo que
 *  `google-signin.ts` no explote al importarse. */
export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => ({ type: 'success', data: { idToken: 'stub-id-token' } }),
  signOut: async () => {},
};
