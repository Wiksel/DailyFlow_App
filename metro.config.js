// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure TTF fonts are handled as assets (workaround for rare resolver edge cases)
config.resolver = config.resolver || {};
config.resolver.assetExts = Array.from(new Set([...(config.resolver.assetExts || []), 'ttf']));

module.exports = config;