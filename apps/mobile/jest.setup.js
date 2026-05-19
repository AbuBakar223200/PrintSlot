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
