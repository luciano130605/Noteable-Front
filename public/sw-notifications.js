// public/sw-notifications.js
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {}
    event.waitUntil(
        self.registration.showNotification(data.title ?? 'Recordatorio de examen', {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: data.tag,
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(clients.openWindow('/'))
})