self.addEventListener('push', function (event) {
  const data = JSON.parse(event.data.text() || '{}');
  event.waitUntil(
    self.registration.showNotification(data.title || 'Thông báo mới', {
      body: data.body || 'Bạn có nhiệm vụ mới tại trạm.',
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.url || '/pwr/station',
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data);
    })
  );
});
