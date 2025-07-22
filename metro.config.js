const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// GLB ve diğer binary dosyalar için assetExts'e ekle
config.resolver.assetExts.push('glb', 'gltf', 'bin');

module.exports = config;
