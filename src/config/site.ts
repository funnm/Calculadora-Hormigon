export const APP_NAME = 'Calculadora de Hormigón';
export const APP_SHORT_NAME = 'Hormigón';
export const SUITE_NAME = 'Engineering Suite Pro';
export const APP_VERSION = '2.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const SITE_AUTHOR = 'Paul R';
export const SITE_LOCATION = 'Ecuador';
export const SUPPORT_EMAIL = 'elzucoing2002@gmail.com';
export const CANONICAL_URL = 'https://concrete.tecnohubec.com/';

export interface SuiteAppInfo {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  url: string;
  current?: boolean;
}

export const SUITE_APPS: SuiteAppInfo[] = [
  {
    id: 'calculadora-hormigon',
    name: 'Calculadora de Hormigón',
    tagline: 'Dosificación rápida en obra (Holcim H-140 a H-350), diseño técnico ACI 211/318, granulometría, regresión y control estadístico.',
    badge: 'Aplicación activa',
    url: 'https://concrete.tecnohubec.com/',
    current: true,
  },
  {
    id: 'analisis-estructural',
    name: 'Análisis Estructural',
    tagline: 'Vigas continuas, pórticos planos 2D, armaduras, método de Cross, rigidez matricial y pandeo.',
    badge: 'Engineering Suite Pro',
    url: 'https://structure.tecnohubec.com/',
  },
  {
    id: 'calculadora-grafica',
    name: 'Calculadora Gráfica',
    tagline: 'Graficación 2D de precisión, cálculo visual, derivadas, integrales, cinemática y análisis de datos.',
    badge: 'Engineering Suite Pro',
    url: 'https://engineering-graph-pro.vercel.app/',
  },
  {
    id: 'sistemas-hidraulicos',
    name: 'Sistemas Hidráulicos',
    tagline: 'Modelado 2D de redes de tuberías y bombeo, pérdidas Darcy-Weisbach, líneas de energía (EGL/HGL), HMT y reportes técnicos.',
    badge: 'Engineering Suite Pro',
    url: 'https://hydraulic.tecnohubec.com/',
  },
];

export const LEGAL_LINKS = [
  { label: 'Términos de Uso', href: '/terminos.html' },
  { label: 'Política de Privacidad', href: '/privacidad.html' },
  { label: 'Política de Cookies', href: '/cookies.html' },
  { label: 'Contacto y Soporte', href: '/contacto.html' },
];
