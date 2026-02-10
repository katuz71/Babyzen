const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro"); // ИСПРАВЛЕНО: убрали /utils/

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });