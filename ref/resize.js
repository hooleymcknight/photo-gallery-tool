const path = require('path');
const fs = require('node:fs');
const sharp = require('sharp');

const sizes = [1200, 800, 600, 300];
const absPhotoDir = 'K:/Coding/hollyngrade.com/dogs/';

const args = process.argv.slice(2);


const resizeImage = async (path, size) => {
    if (!path || !size) {
        console.error('Missing path or size');
        return;
    }

    try {
        let resizeOptions = { fit: 'contain' };
        let metadata = await sharp(path).metadata();
        if (metadata.width > metadata.height) {
            resizeOptions.width = size;
        }
        else {
            resizeOptions.height = size;
        }
        await sharp(path).resize(resizeOptions).toFile(path.replace('.webp', `_x${size}.webp`));
        console.log('successfully resized and saved copy of image:', path);
    }
    catch (err) {
        console.error(err);
    }
}

// args[0] is the input.
// console.log(__dirname);
const images = path.resolve(absPhotoDir, args[0]);
// console.log(images);
const files = fs.readdirSync(images);

for (const file of files) {
    if (!file.includes('_poster') && !file.includes('_x') && !file.includes('.json') && !file.includes('.mp4')) {
        const filePath = images + '/' + file;
        // console.log(images); console.log(file);
        for (const size of sizes) {
            const exists = fs.existsSync(filePath.replace('.webp', `_x${size}.webp`));
            if (!exists) resizeImage(filePath, size);
        }
    }
}
