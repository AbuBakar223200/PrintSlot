// Native Expo modules have no JS implementation under the node test environment.
// Mock the ones the design system pulls in (gradient surfaces + frosted heroes)
// with lightweight pass-through Views so primitives render in tests.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

const { act } = require('@testing-library/react-native');
const { notifyManager } = require('@tanstack/query-core');

notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

notifyManager.setBatchNotifyFunction((callback) => {
  act(callback);
});

notifyManager.setScheduler((callback) => {
  callback();
});
