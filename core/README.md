# vuepress-plugin-imagemin

> This repo is forked and modified from [vite-plugin-imagemin](https://github.com/vbenjs/vite-plugin-imagemin).

A VuePress plugin for compressing image assets

## Install

```bash
npm i vuepress-plugin-imagemin -D
```

## Usage

Configuration plugin in vite.config.ts

```ts
import { defineUserConfig } from 'vuepress';
import Imagemin from 'vuepress-plugin-imagemin'

export default defineUserConfig({
  plugins: [
    Imagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 20,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
          },
          {
            name: 'removeEmptyAttrs',
            active: false,
          },
        ],
      },
    }),
  ],
});
```

### Options

| params   | type                                  | default | default                                                      |
| -------- | ------------------------------------- | ------- | ------------------------------------------------------------ |
| verbose  | `boolean`                             | `true`  | Whether to output the compressed result in the console       |
| filter   | `RegExp or (file: string) => boolean` | -       | Specify which resources are not compressed                   |
| disable  | `boolean`                             | `false` | Whether to disable                                           |
| svgo     | `object` or `false`                   | -       | See [Options](https://github.com/svg/svgo/#what-it-can-do)   |
| gifsicle | `object` or `false`                   | -       | See [Options](https://github.com/imagemin/imagemin-gifsicle) |
| mozjpeg  | `object` or `false`                   | -       | See [Options](https://github.com/imagemin/imagemin-mozjpeg)  |
| optipng  | `object` or `false`                   | -       | See [Options](https://github.com/imagemin/imagemin-optipng)  |
| pngquant | `object` or `false`                   | -       | See [Options](https://github.com/imagemin/imagemin-pngquant) |
| webp     | `object` or `false`                   | -       | See [Options](https://github.com/imagemin/imagemin-webp)     |

## Inspiration

+ [vite-plugin-compress](https://github.com/alloc/vite-plugin-compress)
+ [vite-plugin-imagemin](https://github.com/vbenjs/vite-plugin-imagemin)

## License

MIT
