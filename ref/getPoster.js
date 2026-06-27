const fs = require('node:fs');
const { readdir } = require('node:fs/promises');

// videos
const ffprobe = require('ffprobe')
const ffprobeStatic = require('ffprobe-static');
const videoFormats = ['mp4', 'mov', 'avi', '3gp'];
const extractFrame = require('ffmpeg-extract-frame')

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('C:/Users/Hooley/node-packages_hollyn/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe');

const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// general data
const dataFile = './photos.json';
const photosData = require(dataFile);
const photosDir = '../../../../dogs/'; // fix how this plays out down below. it won't work right now, it is looking for a relative path.
const absPhotoDir = 'K:/Coding/hollyngrade.com/dogs/';

// user input args
const args = process.argv.slice(2);

const probeVideo = async (args) => {
    const filePath = absPhotoDir + args[0];
    // const fileMetaData = await ffprobe(filePath, {path: ffprobeStatic.path});
    // console.log(fileMetaData.streams[0])
    await extractFrame({
        input: filePath,
        output: `${filePath.replace('.mp4', '')}_poster.webp`,
        offset: args[1] ? Number(args[1]) : 0,
    });
}


/**
 * run a function
 */

probeVideo(args); // test with:  node updatePhotos.js 2024/20240112_161657.mp4