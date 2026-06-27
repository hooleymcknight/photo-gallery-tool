const exifr = require('exifr');
const exiftool = require('exiftool-vendored').exiftool;
const videoFormats = ['mp4', 'mov', 'avi', '3gp'];

const photosDir = 'https://hollyngrade.com/dogs/';
const args = process.argv.slice(2);

const checkMetaData = async (arg) => {
    let date;
    let filePath = `${photosDir}${arg.startsWith('/') ? arg.replace('/','') : arg}`;

    // images
    if (!videoFormats.includes(filePath.split('.')[1])) {
        const metadata = await exifr.parse(filePath);
        if (!metadata || (!metadata.DateTimeOriginal && !metadata['Creation Time'])) {
            console.log(filePath)
            console.log(metadata ? metadata : `no metadata for ${filePath}`)
        }
        else {
            console.log('we have a date!', filePath)
            date = metadata.DateTimeOriginal || metadata['Creation Time'] || '';
        }
    }
    // videos
    else {
        const tags = await exiftool.read(filePath);
        if (!tags || !tags.CreateDate || !tags.CreateDate.rawValue) {
            console.log(filePath)
            console.log(metadata ? metadata : `no metadata for ${filePath}`)
        }
        else {
            date = tags?.CreateDate?.rawValue || '';
        }
    }

    console.log(date);

}

checkMetaData(args[0]);