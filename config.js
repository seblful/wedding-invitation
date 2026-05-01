module.exports = {
  port: 3000,
  baseUrl: 'https://вяселле.бел',
  themeColor: '#fdf4e3',
  backgroundColor: '#b9dfc6',
  openGraph: {
    title: 'Вяселле Аляксея і Дар\'і',
    description:
      'Запрашаем вас падзяліць з намі наш асаблівы дзень! 2 жніўня 2026 года будзем рады бачыць вас на нашым вяселлі ў River Hall, Гродна.',
    image: 'images/preview.png',
  },
  weddingDate: new Date('2026-08-02T12:00:00.000Z'),
  timezone: 'Europe/Minsk',
  location: {
    name: 'River Hall',
    address: 'вул. Падольная, д. 23, г. Гродна',
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.833062,53.671368&z=16&pt=23.833062,53.671368,pm2rdm',
    yandexDirectUrl: 'https://yandex.com/maps/-/CPqGnRmu',
    mapDimensions: {
      width: 580,
      height: 346,
    },
  },
  secondDayLocation: {
    name: 'Баня LOFT',
    address: 'вул. Прыгародная, д. 26, г. Гродна',
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.846794,53.667998&z=16&pt=23.846794,53.667998,pm2rdm',
    mapDimensions: {
      width: 580,
      height: 346,
    },
  },
  form: {
    deadline: '30 чэрвеня 2026 года',
    formspreeEndpoint: 'https://formspree.io/f/xykdrgnb',
  },
  api: {
    submitFormEndpoint: '/api/submit-form',
  },
};
