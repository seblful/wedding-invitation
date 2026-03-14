module.exports = {
  port: 3000,
  baseUrl: 'https://attach-filename-clips-bag.trycloudflare.com',
  themeColor: '#fdf4e3',
  openGraph: {
    title: "Вяселле Аляксея і Дар'і",
    description:
      'Запрашаем вас падзяліць з намі наш асаблівы дзень! 2 жніўня 2026 года будзем рады бачыць вас на нашым вяселлі ў River Hall, Гродна.',
    image: 'images/preview.png',
  },
  weddingDate: new Date('2026-08-02T00:00:00'),
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
  form: {
    deadline: '30 чэрвеня 2026 года',
    formspreeEndpoint: 'https://formspree.io/f/xykdrgnb',
  },
  api: {
    configEndpoint: '/api/config',
    submitFormEndpoint: '/api/submit-form',
  },
};
