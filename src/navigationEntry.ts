// http://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigation/type
const getDeprecatedNavigationType = (): NavigationTimingType => {
  const type = window.performance.navigation.type;
  return type === 2 ? 'back_forward' : type === 1 ? 'reload' : 'navigate';
};

export const getNavigationType = (): NavigationTimingType => {
  return (
    window.performance.getEntriesByType('navigation')[0]?.type || getDeprecatedNavigationType()
  );
};

export const getActivationStart = (): number => {
  return window.performance.getEntriesByType('navigation')[0]?.activationStart || 0;
};
