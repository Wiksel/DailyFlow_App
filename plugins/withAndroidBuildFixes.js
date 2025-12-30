const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidBuildFixes(config) {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents += `
// Fix for Windows sqlite-jdbc AccessDeniedException and other dependency conflicts
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'org.xerial:sqlite-jdbc:3.41.2.1'
            force 'com.google.firebase:firebase-bom:33.1.0'
            force 'com.google.guava:guava:31.1-android'
        }
    }
}

// Fix: Ensure Guava is available in all modules (fixes 'package com.google.common.collect does not exist')
// Using plugins.withId to avoid afterEvaluate lifecycle errors
subprojects {
    plugins.withId("com.android.library") {
        dependencies {
            implementation "com.google.guava:guava:31.1-android"
        }
    }
    plugins.withId("com.android.application") {
        dependencies {
            implementation "com.google.guava:guava:31.1-android"
        }
    }
}
`;
        }
        return config;
    });
};
