import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://byexample.dustincoledata.com',
  base: '/',
  output: 'static',
  trailingSlash: 'ignore',
});
