module.exports = {
  weddingDate: new Date(process.env.WEDDING_DATE || '2026-08-02T00:00:00'),
  timezone: process.env.TIMEZONE || 'Europe/Minsk',
  location: {
    name: process.env.VENUE_NAME || 'River Hall',
    address: process.env.VENUE_ADDRESS || 'вул. Падольная, д. 23, г. Гродно',
    yandexMapUrl: process.env.YANDEX_MAP_URL || 'https://yandex.ru/map-widget/v1/?ll=23.833062,53.671368&z=15&pt=23.833062,53.671368,pm2rdm',
    yandexDirectUrl: process.env.YANDEX_DIRECT_URL || 'https://yandex.com/maps/-/CPqGnRmu'
  },
  form: {
    formspreeEndpoint: process.env.FORMSPREE_ENDPOINT || 'https://formspree.io/f/xykdrgnb'
  }
};
