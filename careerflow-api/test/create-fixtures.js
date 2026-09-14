import fs from 'node:fs'
import zlib from 'node:zlib'

const escapePdfString = (s) => String(s).replace(/[\\()]/g, (m) => `\\${m}`)
const buildPdf = (text) => {
  const streamData = text ? `BT /F1 18 Tf 50 720 Td (${escapePdfString(text)}) Tj ET` : ''
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(streamData)} >>\nstream\n${streamData}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body))
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(body)
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  body += xref
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(body, 'latin1')
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (buf) => {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const u16 = (n) => Buffer.from([n & 0xff, (n >>> 8) & 0xff])
const u32 = (n) => Buffer.from([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])

const buildZip = (files) => {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8')
    const comp = zlib.deflateRawSync(data)
    const crc = crc32(data)
    localParts.push(
      Buffer.concat([
        u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0x21),
        u32(crc), u32(comp.length), u32(data.length), u16(nameBuf.length), u16(0),
        nameBuf, comp,
      ])
    )
    centralParts.push(
      Buffer.concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0x21),
        u32(crc), u32(comp.length), u32(data.length), u16(nameBuf.length), u16(0),
        u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf,
      ])
    )
    offset += localParts[localParts.length - 1].length
  }
  const cd = Buffer.concat(centralParts)
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(cd.length), u32(offset), u16(0),
  ])
  return Buffer.concat([...localParts, cd, eocd])
}

const buildDocx = (paragraphs) => {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  const paras = paragraphs
    .map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`)
    .join('')
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}</w:body></w:document>`
  return buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
  ])
}

fs.writeFileSync('sample-cv.pdf', buildPdf('Alex Johnson\nSenior Backend Engineer\nNode.js and MongoDB specialist with 5 years experience.\n2020-present\n'))
fs.writeFileSync('sample-cv.docx', buildDocx(['Alex Johnson', 'Senior Backend Engineer', 'Specialized in Node.js, Express, and distributed databases.']))
console.log('sample files written successfully')
