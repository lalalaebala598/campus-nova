const CACHE_NAME='nova-push-shell-v1';

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener('push',event=>{
  const fallback={
    title:'Campus Nova',
    body:'Новое событие в Campus Nova.',
    url:'/notifications',
    tag:`nova-${Date.now()}`,
    badgeCount:1
  };

  let data=fallback;

  try{
    data=event.data?.json()||fallback;
  }catch{
    try{
      data={
        ...fallback,
        body:event.data?.text()||fallback.body
      };
    }catch{}
  }

  event.waitUntil(
    (async()=>{
      await self.registration.showNotification(
        data.title||fallback.title,
        {
          body:data.body||fallback.body,
          icon:data.icon||'/icon-192.png',
          badge:data.badge||'/icon-192.png',
          tag:data.tag||fallback.tag,
          renotify:Boolean(data.renotify),
          data:{
            url:data.url||'/notifications'
          }
        }
      );

      try{
        if('setAppBadge' in self.registration){
          await self.registration.setAppBadge(
            Math.max(
              1,
              Number(data.badgeCount||1)
            )
          );
        }
      }catch{}
    })()
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();

  event.waitUntil(
    (async()=>{
      try{
        await self.registration.clearAppBadge?.();
      }catch{}

      const target=
        event.notification?.data?.url||
        '/notifications';

      const clientsList=
        await self.clients.matchAll({
          type:'window',
          includeUncontrolled:true
        });

      for(const client of clientsList){
        try{
          await client.focus();
          if('navigate' in client){
            await client.navigate(target);
          }
          return;
        }catch{}
      }

      await self.clients.openWindow(target);
    })()
  );
});
