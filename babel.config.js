module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource должен быть именно таким для v4
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin", // Всегда в самом конце!
    ],
  };
};