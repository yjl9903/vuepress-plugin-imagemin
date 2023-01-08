import type { Plugin, App } from 'vuepress'
import type { FilterType, VuePressPluginImageminOption } from './types'

import * as path from 'pathe'
import fs from 'fs-extra'
import chalk from 'chalk'
import Debug from 'debug'

import imagemin from 'imagemin'
import imageminGif from 'imagemin-gifsicle'
import imageminPng from 'imagemin-pngquant'
import imageminOptPng from 'imagemin-optipng'
import imageminJpeg from 'imagemin-mozjpeg'
import imageminSvgo from 'imagemin-svgo'
import imageminWebp from 'imagemin-webp'
import imageminJpegTran from 'imagemin-jpegtran'

import {
  isNotFalse,
  isBoolean,
  isRegExp,
  isFunction,
  readAllFiles,
} from './utils'

const debug = Debug.debug('imagemin')

const extRE = /\.(png|jpeg|jpg|gif|bmp|svg|webp)$/i

export default function (options: VuePressPluginImageminOption = {}): Plugin {
  let outputPath: string
  let publicDir: string
  // let config: ResolvedConfig

  const { disable = false, include, exclude, verbose = true } = options

  if (disable) {
    return { name: 'vuepress-plugin-imagemin' }
  }

  function filterFile(filename: string) {
    if (extRE.test(filename)) {
      const test = (cond: FilterType) => {
        if (typeof cond === 'string') {
          return filename === cond
        } else if (isRegExp(cond)) {
          return cond.test(filename)
        } else if (Array.isArray(cond)) {
          for (const c of cond) {
            if (typeof c === 'string') {
              if (filename === c) return true
            } else if (isRegExp(c)) {
              if (c.test(filename)) return true
            }
          }
          return false
        } else if (isFunction(cond)) {
          return cond(filename)
        } else {
          return false
        }
      }

      if (!exclude || !test(exclude)) {
        return !include || test(include)
      } else {
        return false
      }
    } else {
      return false
    }
  }

  debug('plugin options:', options)

  const mtimeCache = new Map<string, number>()
  const tinyMap = new Map<
    string,
    { size: number; oldSize: number; ratio: number }
  >()

  async function processFile(filePath: string, buffer: Buffer) {
    let content: Buffer

    try {
      content = await imagemin.buffer(buffer, {
        plugins: getImageminPlugins(options),
      })

      const size = content.byteLength,
        oldSize = buffer.byteLength

      tinyMap.set(filePath, {
        size: size / 1024,
        oldSize: oldSize / 1024,
        ratio: size / oldSize - 1,
      })

      return content
    } catch (error) {
      debug('imagemin error:' + filePath)
      // config.logger.error('imagemin error:' + filePath)
    }
  }

  return <Plugin>{
    name: 'vuepress-plugin-imagemin',
    apply: 'build',
    enforce: 'post',
    onPrepared(app: App) {
      outputPath = app.dir.dest()
      publicDir = app.dir.public()
      debug({ outputPath, publicDir })
    },
    // async generateBundle(_, bundler) {
    //   tinyMap.clear()
    //   const files: string[] = []

    //   Object.keys(bundler).forEach((key) => {
    //     filterFile(path.resolve(outputPath, key), filter) && files.push(key)
    //   })

    //   debug('files:', files)

    //   if (!files.length) {
    //     return
    //   }

    //   const handles = files.map(async (filePath: string) => {
    //     const source = (bundler[filePath] as any).source
    //     const content = await processFile(filePath, source)
    //     if (content) {
    //       ;(bundler[filePath] as any).source = content
    //     }
    //   })

    //   await Promise.all(handles)
    // },
    async onGenerated() {
      debug('onGenerated')

      if (publicDir) {
        const files: string[] = []

        // try to find any static images in original static folder
        readAllFiles(publicDir).forEach((file) => {
          filterFile(file) && files.push(file)
        })

        debug({ files })

        if (files.length) {
          const handles = files.map(async (publicFilePath: string) => {
            // now convert the path to the output folder
            const filePath = path.relative(publicDir, publicFilePath)
            const fullFilePath = path.join(outputPath, filePath)

            debug({ filePath, fullFilePath })

            if (fs.existsSync(fullFilePath) === false) {
              return
            }

            const { mtimeMs } = await fs.stat(fullFilePath)
            if (mtimeMs <= (mtimeCache.get(filePath) || 0)) {
              return
            }

            const buffer = await fs.readFile(fullFilePath)
            const content = await processFile(filePath, buffer)

            if (content) {
              await fs.writeFile(fullFilePath, content)
              mtimeCache.set(filePath, Date.now())
            }
          })

          await Promise.all(handles)
        }
      }

      if (verbose) {
        handleOutputLogger(tinyMap)
      }
    },
  }
}

// Packed output logic
function handleOutputLogger(
  recordMap: Map<string, { size: number; oldSize: number; ratio: number }>,
) {
  const info = (...args: any[]) => console.log(...args)

  info(
    `\n${chalk.cyan('✨ [vuepress-plugin-imagemin]')}` +
      '- compressed image resource successfully: ',
  )

  const keyLengths = Array.from(recordMap.keys(), (name) => name.length)
  const valueLengths = Array.from(
    recordMap.values(),
    (value) => `${Math.floor(100 * value.ratio)}`.length,
  )

  const maxKeyLength = Math.max(...keyLengths)
  const valueKeyLength = Math.max(...valueLengths)
  recordMap.forEach((value, name) => {
    let { ratio } = value
    const { size, oldSize } = value
    ratio = Math.floor(100 * ratio)
    const fr = `${ratio}`

    const denseRatio =
      ratio > 0 ? chalk.red(`+${fr}%`) : ratio <= 0 ? chalk.green(`${fr}%`) : ''

    const sizeStr = `${oldSize.toFixed(2)}kb / tiny: ${size.toFixed(2)}kb`

    info(
      '/' +
        chalk.blueBright(name) +
        ' '.repeat(2 + maxKeyLength - name.length) +
        chalk.gray(`${denseRatio} ${' '.repeat(valueKeyLength - fr.length)}`) +
        ' ' +
        chalk.dim(sizeStr),
    )
  })
  info('')
}

// imagemin compression plugin configuration
function getImageminPlugins(
  options: VuePressPluginImageminOption = {},
): imagemin.Plugin[] {
  const {
    gifsicle = true,
    webp = true,
    mozjpeg = false,
    pngquant = false,
    optipng = true,
    svgo = true,
    jpegTran = true,
  } = options

  const plugins: imagemin.Plugin[] = []

  if (isNotFalse(gifsicle)) {
    debug('gifsicle:', true)
    const opt = isBoolean(gifsicle) ? undefined : gifsicle
    plugins.push(imageminGif(opt))
  }

  if (isNotFalse(mozjpeg)) {
    debug('mozjpeg:', true)
    const opt = isBoolean(mozjpeg) ? undefined : mozjpeg
    plugins.push(imageminJpeg(opt))
  }

  if (isNotFalse(pngquant)) {
    debug('pngquant:', true)
    const opt = isBoolean(pngquant) ? undefined : pngquant
    plugins.push(imageminPng(opt))
  }

  if (isNotFalse(optipng)) {
    debug('optipng:', true)
    const opt = isBoolean(optipng) ? undefined : optipng
    plugins.push(imageminOptPng(opt))
  }

  if (isNotFalse(svgo)) {
    debug('svgo:', true)
    const opt = isBoolean(svgo) ? undefined : svgo

    // if (opt !== null && isObject(opt) && Reflect.has(opt, 'plugins')) {
    //   (opt as any).plugins.push({
    //     name: 'preset-default',
    //   });
    // }
    plugins.push(imageminSvgo(opt))
  }

  if (isNotFalse(webp)) {
    debug('webp:', true)
    const opt = isBoolean(webp) ? undefined : webp
    plugins.push(imageminWebp(opt))
  }

  if (isNotFalse(jpegTran)) {
    debug('webp:', true)
    const opt = isBoolean(jpegTran) ? undefined : jpegTran
    plugins.push(imageminJpegTran(opt))
  }
  return plugins
}
