const fs = require('node:fs');
const { readdir } = require('node:fs/promises');

// images
const { imageSizeFromFile } = require('image-size/fromFile');
const exifr = require('exifr');
const sharp = require('sharp');
const exif = require('exif-reader');

// videos
const ffprobe = require('ffprobe')
const ffprobeStatic = require('ffprobe-static');
const exiftool = require('exiftool-vendored').exiftool;
const videoFormats = ['mp4', 'mov', 'avi', '3gp'];
const extractFrame = require('ffmpeg-extract-frame')

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('C:/Users/Hooley/node-packages_hollyn/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe');

// general data
const dataFile = './photos.json';
const photosData = require(dataFile);
const photosDir = '../../../../dogs/'; // fix how this plays out down below. it won't work right now, it is looking for a relative path.
const absPhotoDir = 'K:/Coding/hollyngrade.com/dogs/';

// user input args
const args = process.argv.slice(2);

const getWebPMetadata = async (imagePath) => {
    try {
        const metadata = await sharp(imagePath).metadata();
        const parsedExif = exif(metadata.exif);
        const creationDate = parsedExif.Photo.DateTimeOriginal || parsedExif.Photo.DateTimeDigitized;
        return {
            width: metadata.width,
            height: metadata.height,
            DateTimeOriginal: creationDate,
        };
        // Access specific fields: metadata.width, metadata.format, metadata.exif
    } catch (error) {
        console.error('Error reading metadata:', error);
    }
}

const updatePhotosData = async () => {
    let mapped = photosData.map(x => x.src || x.sources.src);
    const files = await readdir(photosDir, { withFileTypes: true });

    let missingData = [];
    let directories = [];
    let mediaWithoutDate = [];
    let posters = [];

    for (const file of files) {
        if (file.isFile() && !mapped.includes(file)) {
            console.log('This file is missing, and loose:', file);
            console.log('Please move this file!!')
        }
        if (file.isDirectory()) {
            directories.push(file.name);
        }
    }

    for (const dir of directories) {
        console.log(`Searching directory "${dir}"...`);
        const dirFiles = await readdir(`${photosDir}${dir}/`, { withFileTypes: true });

        for (const dirFile of dirFiles) {
            let filePath = dirFile.parentPath + dirFile.name;
            let lightboxPath = `https://hollyngrade.com/dogs${dirFile.parentPath.split('dogs')[1]}${dirFile.name}`;
            console.log('lb,', lightboxPath)
            let needsMoreInfo = false;

            // if we hit a directory
            if (dirFile.isDirectory()) {
                // add the nested directory to the directories array
                directories.push(filePath.split(photosDir)[1]);
            }
            // for all actual files:
            else if (dirFile.isFile() && !mapped.includes(lightboxPath)) {
                let dim = '';
                let date;
                let fileType = 'image';

                // images
                /**
                 * SKIP IF IT HAS "_POSTER" IN THE NAME -----------!!!!!!!!!!!!!!!
                 */
                if (!videoFormats.includes(dirFile.name.split('.')[1]) && !dirFile.name.includes('_poster.webp')) {
                    const metadata = filePath.includes('.webp') ? await getWebPMetadata(filePath) : await exifr.parse(filePath);
                    if (!metadata || (!metadata.DateTimeOriginal && !metadata['Creation Time'])) {
                        mediaWithoutDate.push(filePath);
                        needsMoreInfo = true;
                    }
                    else {
                        dim = await imageSizeFromFile(filePath);
                        date = metadata.DateTimeOriginal || metadata['Creation Time'] || '';
                    }
                }
                // videos
                else if (videoFormats.includes(dirFile.name.split('.')[1])) {
                    fileType = 'video';
                    const fileMetaData = await ffprobe(filePath, {path: ffprobeStatic.path})
                    const tags = await exiftool.read(filePath);
                    if (!tags || !tags.CreateDate || !tags.CreateDate.rawValue) {
                        mediaWithoutDate.push(filePath);
                        needsMoreInfo = true;
                    }
                    else {
                        dim = { height: fileMetaData.height, width: fileMetaData.width };
                        date = tags?.CreateDate?.rawValue || '';
                    }
                }

                // if the date needs reformatted:
                if (typeof(date) === 'string' && date.includes(' ')) {
                    let dateStr = date.split(' ')[0];
                    let timeStr = date.split(' ')[1];
                    dateStr = dateStr.replace(/:/g, '-');
                    date = new Date(`${dateStr}, ${timeStr}`);
                }

                // if it doesn't need more info, add it to the array we will generate data for
                if (!needsMoreInfo) {
                    let fileData = {
                        "src": lightboxPath,
                        "alt": "",
                        "width": dim.width,
                        "height": dim.height,
                        "title": "",
                        "description": "",
                        "data-tags": "",
                        "date": date,
                        "category": dir,
                        "active": true,
                    }

                    if (fileType == 'video') {
                        fileData = {
                            "type": "video",
                            "poster": `${lightboxPath.replace('.mp4', '')}_poster.webp`,
                            "sources": {
                                "src": lightboxPath,
                                "type": "video/mp4",
                            },
                            "alt": "",
                            "width": dim.width,
                            "height": dim.height,
                            "autoplay": true,
                            "controls": true,
                            "playsInline": true,
                            "title": "",
                            "description": "",
                            "data-tags": "",
                            "date": date,
                            "category": dir,
                            "active": true,
                        }
                        posters.push(`${filePath.replace('.mp4', '').replace('.mov', '')}_poster.webp`);
                    }

                    if (!lightboxPath.includes('_poster.webp')) {
                        missingData.push(fileData);
                    }
                }
            }
        }
    }

    // for (const poster of posters) {
    //     const allFiles = fs.readdirSync(photosDir);
    //     const found = allFiles.find(file => file === poster.replace(photosDir, ''));
    //     if (!found) {
    //         console.log('Creating poster file for ', poster.replace(photosDir, ''));
    //         probeVideo(poster);
    //     }
    // }

    if (!missingData.length) {
        console.log('No files are missing from the data.')

        if (mediaWithoutDate.length) {
            console.log(`\n\nDate information needed for the following media files: \n-`, mediaWithoutDate.map(x => x.split('/dogs')[1]).join('\n- '));
        }

        return;
    }
    
    // add the missing data info the json file
    console.log(`\n\n${missingData.length + mediaWithoutDate.length} files are missing from the json data.`);

    console.log(`\n\nAdding data for ${missingData.length} media files now...`);

    /**
     * adding data to the json
     */
    const combinedData = [...photosData];
    console.log(combinedData.length)
    combinedData.push(...missingData)
    console.log(combinedData.length)
    fs.writeFileSync(dataFile, JSON.stringify(combinedData));

    console.log(`\n\nDate information needed for the following media files: \n-`, mediaWithoutDate.map(x => x.split('/public')[1]).join('\n- '));

}



const addActiveProperty = async () => {
    let newData = [...photosData];
    let directories = [];
    const files = await readdir(photosDir, { withFileTypes: true });

    let allFileNames = [];

    for (const file of files) {
        if (file.isFile() && !mapped.includes(file)) {
            console.log('This file is missing, and loose:', file);
            console.log('Please move this file!!')
        }
        if (file.isDirectory()) {
            directories.push(file.name);
        }
    }

    for (const dir of directories) {
        console.log(`Searching directory "${dir}"...`);
        const dirFiles = await readdir(`${photosDir}${dir}/`, { withFileTypes: true });

        for (const dirFile of dirFiles) {
            let filePath = dirFile.parentPath + dirFile.name;

            if (dirFile.isDirectory()) {
                // add the nested directory to the directories array
                directories.push(filePath.split(photosDir)[1]);
            }
            else {
                const serverFile = 'https://hollyngrade.com/dogs' + dirFile.parentPath.split('/dogs')[1] + dirFile.name;
                allFileNames.push(serverFile);
            }
        }
    }

    for (const item of newData) {
        item.active = allFileNames.includes(item.src || item.sources.src) ? true : false;
    }

    fs.writeFileSync(dataFile, JSON.stringify(newData));
}



const probeVideo = async (args) => {
    const filePath = absPhotoDir + args[0];
    // const fileMetaData = await ffprobe(filePath, {path: ffprobeStatic.path});
    // console.log(fileMetaData.streams[0])
    await extractFrame({
        input: filePath,
        output: `${filePath.replace('.mp4', '')}_poster.webp`,
        offset: args[1] ? args[1] : 0,
    });
}



const updateVideoData = async () => {
    let newData = [...photosData];
    let mapped = photosData.map(x => x.src);
    const files = await readdir(photosDir, { withFileTypes: true });

    let directories = [];
    let mediaWithoutDate = [];
    let posters = [];

    for (const file of files) {
        if (file.isFile() && !mapped.includes(file)) {
            console.log('This file is missing, and loose:', file);
            console.log('Please move this file!!')
        }
        if (file.isDirectory()) {
            directories.push(file.name);
        }
    }

    for (const dir of directories) {
        console.log(`Searching directory "${dir}" for videos...`);
        const dirFiles = await readdir(`${photosDir}${dir}/`, { withFileTypes: true });

        for (const dirFile of dirFiles) {
            let filePath = dirFile.parentPath + dirFile.name;
            let lightboxPath = `https://hollyngrade.com/dogs${dirFile.parentPath.split('dogs')[1]}${dirFile.name}`;
            let needsMoreInfo = false;

            // if we hit a directory
            if (dirFile.isDirectory()) {
                // add the nested directory to the directories array
                directories.push(filePath.split(photosDir)[1]);
            }
            // for all actual files:
            else if (dirFile.isFile() && !mapped.includes(lightboxPath) && ['mp4'].includes(dirFile.name.split('.')[1])) {
                let dim = '';
                let date;
                
                const fileMetaData = await ffprobe(filePath, {path: ffprobeStatic.path})
                const tags = await exiftool.read(filePath);
                if (!tags || !tags.CreateDate || !tags.CreateDate.rawValue) {
                    mediaWithoutDate.push(filePath);
                    needsMoreInfo = true;
                }
                else {
                    dim = { height: fileMetaData.height, width: fileMetaData.width };
                    date = tags?.CreateDate?.rawValue || '';
                }

                let fileData = {
                    "type": "video",
                    "poster": `${lightboxPath.replace('.mp4', '')}_poster.webp`,
                    "sources": {
                        "src": lightboxPath,
                        "type": "video/mp4",
                    },
                    "alt": "",
                    "width": dim.width,
                    "height": dim.height,
                    "autoplay": true,
                    "controls": true,
                    "playsInline": true,
                    "title": "",
                    "description": "",
                    "data-tags": "",
                    "date": date,
                    "category": dir,
                }

                console.log(lightboxPath)
                const thisData = newData.filter(x => x.sources && x.sources.src === lightboxPath)?.[0] || false;
                console.log(thisData)
                if (thisData) {
                    newData[newData.indexOf(thisData)] = fileData;
                    posters.push(filePath);
                }

            }
        }
    }

    // search for the posters.

    console.log(posters)

    for (const poster of posters) {
        const allFiles = fs.readdirSync(photosDir);
        const webpName = poster.replace(photosDir, '').replace('.mp4', '').replace('.mov', '') + '_poster.webp';
        const found = allFiles.find(file => file === webpName);
        if (!found) {
            console.log('Creating poster file for ', poster);
            probeVideo(poster.replace(photosDir, ''));
        }
    }
}

const removePostersFromJson = async () => {
    let newData = [...photosData];
    // const files = await readdir(photosDir, { withFileTypes: true });

    let posters = [];
    let entriesToKeep = [];

    for (const item of photosData) {
        console.log(item);
        let source = item.src || item.sources.src;
        if (!source.includes('_poster.webp')) {
            entriesToKeep.push(item);
        }
        else {
            posters.push(item);
        }
    }

    // console.log(entriesToKeep)

    // fs.writeFileSync('./photos.json', JSON.stringify(entriesToKeep))
}

let genFileData = {
    "src": "",
    "type": "", // video or image
    "alt": "",
    "width": "",
    "height": "",
    "title": "",
    "description": "",
    "data-tags": "",
    "date": "",
    "category": "",
    "active": 1,
    "poster": "", // ends with _poster.webp
}

const generateFolderJson = async (args) => {
    let newData = [];
    let mediaWithoutDate = [];
    let category = args[0];
    const files = await readdir(absPhotoDir + category, { withFileTypes: true });

    for (const file of files) {
        // skip posters and resizes
        if (file.name.includes('_poster') || file.name.includes('_x')) continue;

        let localPath = `${absPhotoDir}${category}/${file.name}`;
        let dim, date, fileType;
        
        // images first:
        if (!videoFormats.includes(file.name.split('.')[1])) {
            const metadata = file.name.includes('.webp') ?
                await getWebPMetadata(localPath) :
                await exifr.parse(localPath);
            if (!metadata || (!metadata.DateTimeOriginal && !metadata['Creation Time'])) {
                mediaWithoutDate.push(localPath);
            }
            else {
                dim = await imageSizeFromFile(localPath);
                date = metadata.DateTimeOriginal || metadata['Creation Time'] || '';
            }
        }
        // videos
        else if (videoFormats.includes(file.name.split('.')[1])) {
            fileType = 'video';
            const fileMetaData = await ffprobe(localPath, {path: ffprobeStatic.path})
            const tags = await exiftool.read(localPath);
            if (!tags || !tags.CreateDate || !tags.CreateDate.rawValue) {
                mediaWithoutDate.push(localPath);
            }
            else {
                dim = { height: fileMetaData.height, width: fileMetaData.width };
                date = tags?.CreateDate?.rawValue || '';
            }
        }

        // if the date needs reformatted:
        if (typeof(date) === 'string' && date.includes(' ')) {
            let dateStr = date.split(' ')[0];
            let timeStr = date.split(' ')[1];
            dateStr = dateStr.replace(/:/g, '-');
            date = new Date(`${dateStr}, ${timeStr}`);
        }

        let fileData = {...genFileData};
        fileData.src = `https://hollyngrade.com/dogs/${category}/${file.name}`;
        fileData.type = fileType;
        fileData.width = dim.width;
        fileData.height = dim.height;
        fileData.date = date;
        fileData.category = category;
        if (fileType === 'video') {
            fileData.poster = fileData.src.replace('.mp4', '_poster.webp');
        }

        newData.push(fileData);
    }

    try {
        fs.writeFileSync(`${absPhotoDir}${category}/photoData.json`, JSON.stringify(newData));
        console.log('File write successful.')
        console.log('The following files are missing date info:\n- ', mediaWithoutDate.join('\n- '));
    }
    catch (err) {
        console.error('oh noooo', err);
    }
}


/**
 * run a function
 */

// updatePhotosData();
// addActiveProperty();
// probeVideo(args); // test with:  node updatePhotos.js 2024/20240112_161657.mp4
// updateVideoData();
// removePostersFromJson();
generateFolderJson(args);