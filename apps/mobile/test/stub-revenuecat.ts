/** react-native-purchases es un módulo nativo puro: no existe fuera del
 *  teléfono. Los tests no verifican compras, sólo que `revenuecat.ts` no
 *  explote al importarse desde `cliente.ts`. */
export enum LOG_LEVEL {
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const Purchases = {
  configure: () => {},
  setLogLevel: async () => {},
  logIn: async (appUserID: string) => ({
    customerInfo: { entitlements: { active: {} } },
    created: false,
  }),
  logOut: async () => ({ entitlements: { active: {} } }),
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
};

export default Purchases;
