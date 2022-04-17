import { defineUserConfig } from 'vuepress';
import Imagemin from 'vuepress-plugin-imagemin';

export default defineUserConfig({
  plugins: [
    Imagemin()
  ]
});
