const opentype = require('opentype.js');
const path = require('path')
const fs = require('fs')
const { Buffer } = require("node:buffer")

const notdefGlyph = new opentype.Glyph({
  name: '.notdef',
  advanceWidth: 650,
  path: new opentype.Path()
});

module.exports = function (hexo) {
  hexo.extend.generator.register(`subfont`, locals => {
    const {
      name: fontName,
      folder: fontFolder,
      subFamily,
      targetPath
    } = hexo.theme.config.custom_font

    const folder = path.resolve(__dirname, "../../", fontFolder)
    const text = getSubText(hexo)
    console.log("Extract subfont: ", text)

    return subFamily.map(font => {
      const source = path.resolve(folder, font)
      return {
        path: path.join(targetPath, fontName, font),
        data: compress(text, { source, name: fontName, style: font })
      }
    })
  })
}


function compress(text, params) {
  const { source, name, style } = params
  let data = fs.readFileSync(source)
  data = new Uint8Array(data).buffer
  const font = opentype.parse(data)
  glyphs = [notdefGlyph].concat(font.stringToGlyphs(text))

  const sub_font = new opentype.Font({
    ...font,
    familyName: name,
    styleName: style,
    glyphs: glyphs
  });
  const res = sub_font.toArrayBuffer()
  return Buffer.from(res)
}

function getSubText(hexo) {
  const config = hexo.theme.config
  let text = [config.slogan]
    .concat(config.subpage.pages.map(p => p.description))
    .concat(hexo.locals.get('tags').map(tag => tag.name))
    .concat(config.index.about.text)
    .concat(config.index.poem)
    .concat(config.foot.title)
    .join("").split("")
  text = handleAscii(Array.from(new Set(text)))
  text.push(" ")

  // .filter(rune => /[\u4e00-\u9fa5]/.test(rune))
  // must be sorted and .notdef at first position. see: https://github.com/opentypejs/opentype.js/issues/94
  return text.sort().join("")
}

function handleAscii(text) {
  const ascii = text.filter(w => 0x21 <= w.charCodeAt() && w.charCodeAt() <= 0x7E)
  const capital = ascii.filter(w => 0x41 <= w.charCodeAt() && w.charCodeAt() <= 0x5A)
  const lowcase = ascii.filter(w => 0x61 <= w.charCodeAt() && w.charCodeAt() <= 0x7A)
  const res = text
    .concat(ascii.map(w => String.fromCharCode(w.charCodeAt() + 0xFEE0)))
    .concat(capital.map(w => String.fromCharCode(w.charCodeAt() + 0x20)))
    .concat(lowcase.map(w => String.fromCharCode(w.charCodeAt() - 0x20)))
  return Array.from(new Set(res))
}