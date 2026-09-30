export class ImageHeaderError extends Error {
}
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function need(bytes, length) {
    if (bytes.byteLength < length)
        throw new ImageHeaderError("Image header is truncated.");
}
function readPng(bytes) {
    // Signature, then the whole IHDR chunk: length, name, 13 data bytes and CRC.
    need(bytes, 33);
    if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR")
        throw new ImageHeaderError("PNG lacks its IHDR chunk.");
    return { mediaType: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
/** Start-of-frame markers carry the dimensions; C4, C8 and CC are not frames. */
function isStartOfFrame(marker) {
    return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}
function readJpeg(bytes) {
    let offset = 2;
    while (offset + 4 <= bytes.byteLength) {
        if (bytes[offset] !== 0xff)
            throw new ImageHeaderError("JPEG marker is misaligned.");
        const marker = bytes[offset + 1] ?? 0;
        if (marker === 0xff) {
            offset += 1;
            continue;
        }
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
            offset += 2;
            continue;
        }
        const length = bytes.readUInt16BE(offset + 2);
        if (length < 2)
            throw new ImageHeaderError("JPEG segment length is invalid.");
        if (isStartOfFrame(marker)) {
            // The whole frame segment is present: precision, height, width and components.
            if (length < 8)
                throw new ImageHeaderError("JPEG frame header is too short.");
            need(bytes, offset + 2 + length);
            return {
                mediaType: "image/jpeg",
                height: bytes.readUInt16BE(offset + 5),
                width: bytes.readUInt16BE(offset + 7),
            };
        }
        if (marker === 0xda || marker === 0xd9)
            break;
        offset += 2 + length;
    }
    throw new ImageHeaderError("JPEG has no frame header.");
}
function readWebp(bytes) {
    need(bytes, 30);
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
        return {
            mediaType: "image/webp",
            width: 1 + bytes.readUIntLE(24, 3),
            height: 1 + bytes.readUIntLE(27, 3),
        };
    }
    if (chunk === "VP8 ") {
        if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
            throw new ImageHeaderError("WebP lossy frame lacks its start code.");
        }
        return {
            mediaType: "image/webp",
            width: bytes.readUInt16LE(26) & 0x3fff,
            height: bytes.readUInt16LE(28) & 0x3fff,
        };
    }
    if (chunk === "VP8L") {
        if (bytes[20] !== 0x2f)
            throw new ImageHeaderError("WebP lossless frame lacks its signature.");
        const bits = bytes.readUInt32LE(21);
        return {
            mediaType: "image/webp",
            width: 1 + (bits & 0x3fff),
            height: 1 + ((bits >>> 14) & 0x3fff),
        };
    }
    throw new ImageHeaderError("WebP has no known frame chunk.");
}
/** Read type and dimensions from an image header without decoding pixels. */
export function readImageHeader(input) {
    const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    need(bytes, 12);
    let header;
    if (bytes.subarray(0, 8).equals(PNG_SIGNATURE))
        header = readPng(bytes);
    else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        header = readJpeg(bytes);
    else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
        header = readWebp(bytes);
    }
    else
        throw new ImageHeaderError("Bytes are not a PNG, JPEG or WebP image.");
    if (header.width < 1 || header.height < 1)
        throw new ImageHeaderError("Image has no pixels.");
    return header;
}
//# sourceMappingURL=index.js.map