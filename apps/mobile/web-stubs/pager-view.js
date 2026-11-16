// Sólo para el web de desarrollo: react-native-pager-view es nativo y no existe en web.
// Muestra la primera página; no se usa en los builds de iOS/Android.
const React = require('react');
const { View } = require('react-native');

const PagerView = React.forwardRef(function PagerView({ children, style, initialPage = 0 }, ref) {
  React.useImperativeHandle(ref, () => ({ setPage() {}, setPageWithoutAnimation() {}, setScrollEnabled() {} }));
  const paginas = React.Children.toArray(children);
  return React.createElement(View, { style }, paginas[initialPage] ?? null);
});

module.exports = PagerView;
module.exports.default = PagerView;
