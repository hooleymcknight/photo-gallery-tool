const path = require('path');
const fs = require('node:fs');
const sharp = require('sharp');
const webp = require('webp-converter');

const PHOTOS_DIRECTORY = 'K:/Coding/hollyngrade.com/dogs/';

const args = process.argv.slice(2); // this should be the subfolder we are going to work with.

const allImageTypes = [
  'aces', 'apng', 'avci', 'avcs', 'avif', 'bmp', 'cgm', 'dicom-rle', 'dpx', 'emf', 'example', 'fits', 'g3fax', 'gif', 'heic', 'heic-sequence', 'heif', 'heif-sequence', 'hej2k', 'ief', 'j2c', 'jaii', 'jais', 'jls', 'jp2', 'jpeg', 'jph', 'jphc', 'jpm', 'jpx', 'jxl', 'jxr', 'jxrA', 'jxrS', 'jxs', 'jxsc', 'jxsi', 'jxss', 'ktx', 'ktx2', 'naplps', 'png', 'prs.btif', 'prs.pti', 'pwg-raster', 'svg+xml', 't38', 'tiff', 'tiff-fx', 'vnd.adobe.photoshop', 'vnd.airzip.accelerator.azv', 'vnd.blockfact.facti', 'vnd.clip', 'vnd.cns.inf2', 'vnd.dece.graphic', 'vnd.djvu', 'vnd.dwg', 'vnd.dxf', 'vnd.dvb.subtitle', 'vnd.fastbidsheet', 'vnd.fpx', 'vnd.fst', 'vnd.fujixerox.edmics-mmr', 'vnd.fujixerox.edmics-rlc', 'vnd.globalgraphics.pgb', 'vnd.microsoft.icon', 'vnd.mix', 'vnd.ms-modi', 'vnd.mozilla.apng', 'vnd.net-fpx', 'vnd.pco.b16', 'vnd.radiance', 'vnd.sealed.png', 'vnd.sealedmedia.softseal.gif', 'vnd.sld', 'vnd.sealedmedia.softseal.jpg', 'vnd.svf', 'vnd.tencent.tap', 'vnd.valve.source.texture', 'vnd.wap.wbmp', 'vnd.xiff', 'vnd.zbrush.pcx', 'webp', 'wmf'
]

const getFP = (input) => {
    return path.resolve(PHOTOS_DIRECTORY, args[0]) + '/' + input;
}

const resizeTo1920 = async (filePath) => {
    if (!filePath) {
        console.error('resize to 1920: missing path');
        return;
    }

    try {
        let resizeOptions = { fit: 'contain' };
        let metadata = await sharp(filePath).metadata();
        if (metadata.width <= 1920 && metadata.height <= 1920) return; // doesn't need resized, silently move on.
        metadata.width > metadata.height ? resizeOptions.width = 1920 : resizeOptions.height = 1920;

        const ext = path.extname(filePath);
        const newFilePathName = filePath.replace(/_uiu(.+)\./g, '.').replace(ext, `_hg-resized${ext}`);
        await sharp(filePath).resize(resizeOptions).toFile(newFilePathName); // this keeps file type.
        console.log(newFilePathName)
        return newFilePathName;
    }
    catch (err) {
        console.error(err);
    }
}

const convertToWebp = (filePath, fileName) => {
    const result = webp.cwebp(filePath, `${fileName}.webp`, "-q 80", logging="-v");
    result.then((response) => {
        console.log(response);
    });
}

const firstRoundPrepImages = async () => {
    const images = path.resolve(PHOTOS_DIRECTORY, args[0]);
    const files = fs.readdirSync(images);

    for (const file of files) {
        if (!file.includes('_poster') && !file.includes('_x') && !file.includes('.json') && !file.includes('.mp4')) {
            console.log('filepath:', file)
            const filePath = getFP(file);
            // console.log(images); console.log(file);
            // for (const size of sizes) {
            //     const exists = fs.existsSync(filePath.replace('.webp', `_x${size}.webp`));
            //     if (!exists) {
            //         await resizeImage(filePath, size);
            //     }
            // }
            const resizedImageName = filePath.includes('hg-resized') ? filePath : await resizeTo1920(getFP(file));
            console.log('resized:', resizedImageName)
            convertToWebp(resizedImageName, resizedImageName.replace(path.extname(resizedImageName), ''));
        }
    }
}

firstRoundPrepImages();