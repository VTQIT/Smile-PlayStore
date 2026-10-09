import { AppItem } from '../types';

export const INITIAL_APPS: AppItem[] = [
  {
    id: 'app-smile-player',
    packageName: 'com.smile.player',
    name: 'Smile Player HD',
    slug: 'smile-player-hd',
    developer: {
      id: 'dev-smile-labs',
      name: 'Smile Media Labs',
      verified: true,
      email: 'support@smilelabs.org',
      website: 'https://smilelabs.org'
    },
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop&crop=faces&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=500&fit=crop&q=80',
    category: 'Media & Video',
    type: 'APP',
    shortDescription: 'Ultra low-latency video and lossless audio player with hardware acceleration.',
    description: `Smile Player HD is an independent, open-architecture media powerhouse designed for Android 8.0 through Android 15.

Key Features:
• Hardware-accelerated 4K/8K 60fps playback (AV1, VP9, HEVC, H.264)
• Built-in 10-band audio equalizer with bass booster and 3D spatializer
• PiP (Picture-in-Picture) background playback with audio-only mode
• Gesture volume, brightness, and seek controls
• Multi-track audio and subtitle support (SRT, ASS, VTT)
• Privacy-first: Zero telemetry, offline playback, no account required.`,
    rating: 4.8,
    ratingCount: 14200,
    downloadCount: 485000,
    downloadCountFormatted: '485K+',
    featured: true,
    trending: true,
    topFree: 1,
    screenshots: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=1400&fit=crop&q=80'
    ],
    permissions: [
      'android.permission.INTERNET',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.FOREGROUND_SERVICE'
    ],
    status: 'PUBLISHED',
    latestVersion: {
      id: 'ver-sp-14',
      versionName: '1.4.0',
      versionCode: 14,
      fileSize: 40265318,
      fileSizeFormatted: '38.4 MB',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      minAndroid: 'Android 8.0 (API 26)',
      targetAndroid: 'Android 15 (API 35)',
      releaseNotes: 'Added AV1 hardware decoding support and dark mode UI overhaul. Reduced memory footprint by 22%.',
      releaseDate: '2 days ago'
    },
    allVersions: [
      {
        id: 'ver-sp-14',
        versionName: '1.4.0',
        versionCode: 14,
        fileSize: 40265318,
        fileSizeFormatted: '38.4 MB',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        minAndroid: 'Android 8.0 (API 26)',
        targetAndroid: 'Android 15 (API 35)',
        releaseNotes: 'Added AV1 hardware decoding and PiP improvements.',
        releaseDate: '2 days ago'
      },
      {
        id: 'ver-sp-13',
        versionName: '1.3.2',
        versionCode: 13,
        fileSize: 39512399,
        fileSizeFormatted: '37.7 MB',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        minAndroid: 'Android 8.0 (API 26)',
        targetAndroid: 'Android 14 (API 34)',
        releaseNotes: 'Audio glitch fix for Bluetooth earphones.',
        releaseDate: '1 month ago'
      }
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Alex Rivers',
        rating: 5,
        date: 'Oct 3, 2026',
        versionCode: 14,
        comment: 'Best alternative media player! No ads, smooth 4K playback, and the sound equalizer is crisp.',
        developerReply: {
          date: 'Oct 4, 2026',
          text: 'Thank you Alex! AV1 decoding was our top priority this release.'
        }
      },
      {
        id: 'rev-2',
        userName: 'Elena Rostova',
        rating: 5,
        date: 'Sep 28, 2026',
        versionCode: 13,
        comment: 'Super fast. The background playback with screen locked works like a charm.'
      }
    ],
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z'
  },
  {
    id: 'app-pixel-chronicles',
    packageName: 'com.smile.pixelchronicles',
    name: 'Pixel Chronicles: Odyssey',
    slug: 'pixel-chronicles-odyssey',
    developer: {
      id: 'dev-indie-forge',
      name: 'RetroForge Studios',
      verified: true,
      email: 'contact@retroforge.dev'
    },
    iconUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=256&h=256&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1200&h=500&fit=crop&q=80',
    category: 'Role Playing',
    type: 'GAME',
    shortDescription: '16-bit handcrafted retro action RPG with dungeon crawler mechanics and epic soundtrack.',
    description: `Embark on an unforgettable turn-based tactical journey across the shattered kingdoms of Aethelgard.

Highlights:
• 40+ hours of handcrafted storyline with zero microtransactions
• Dynamic tactical combat with elemental synergies
• Physical and Bluetooth controller support out-of-the-box
• 60fps / 120fps high refresh rate rendering
• Cloud save support and local offline save capability.`,
    rating: 4.9,
    ratingCount: 28400,
    downloadCount: 720000,
    downloadCountFormatted: '720K+',
    featured: true,
    trending: true,
    topFree: 2,
    screenshots: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=1400&fit=crop&q=80'
    ],
    permissions: [
      'android.permission.INTERNET',
      'android.permission.VIBRATE'
    ],
    status: 'PUBLISHED',
    latestVersion: {
      id: 'ver-pc-21',
      versionName: '2.1.0',
      versionCode: 21,
      fileSize: 86512340,
      fileSizeFormatted: '82.5 MB',
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      minAndroid: 'Android 9.0 (API 28)',
      targetAndroid: 'Android 15 (API 35)',
      releaseNotes: 'Chapter 5 expansion unlocked! Fixed gamepad analog stick deadzone settings.',
      releaseDate: '4 days ago'
    },
    allVersions: [
      {
        id: 'ver-pc-21',
        versionName: '2.1.0',
        versionCode: 21,
        fileSize: 86512340,
        fileSizeFormatted: '82.5 MB',
        sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        minAndroid: 'Android 9.0 (API 28)',
        targetAndroid: 'Android 15 (API 35)',
        releaseNotes: 'Chapter 5 expansion unlocked!',
        releaseDate: '4 days ago'
      }
    ],
    reviews: [
      {
        id: 'rev-pc-1',
        userName: 'David Miller',
        rating: 5,
        date: 'Oct 5, 2026',
        versionCode: 21,
        comment: 'Reminds me of Chrono Trigger in all the best ways. Zero ads, pure fun.'
      }
    ],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z'
  },
  {
    id: 'app-secure-vault',
    packageName: 'com.smile.vault',
    name: 'SecureNotes Vault',
    slug: 'securenotes-vault',
    developer: {
      id: 'dev-crypt-core',
      name: 'CryptCore Security',
      verified: true,
      email: 'security@cryptcore.org'
    },
    iconUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=256&h=256&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=500&fit=crop&q=80',
    category: 'Productivity',
    type: 'APP',
    shortDescription: 'Zero-knowledge end-to-end encrypted notepad and password organizer.',
    description: `Your thoughts, passwords, and sensitive notes protected with AES-256-GCM client-side encryption.

Key Features:
• Hardware Keystore backed key generation (StrongBox support)
• Biometric unlock (Fingerprint / Face Unlock)
• Markdown editor with live preview and syntax highlighting
• Encrypted offline exports and auto-backup to WebDAV / Nextcloud
• Self-destructing notes with screenshot prevention.`,
    rating: 4.9,
    ratingCount: 8900,
    downloadCount: 310000,
    downloadCountFormatted: '310K+',
    featured: false,
    trending: true,
    topFree: 3,
    screenshots: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=1400&fit=crop&q=80'
    ],
    permissions: [
      'android.permission.USE_BIOMETRIC'
    ],
    status: 'PUBLISHED',
    latestVersion: {
      id: 'ver-sv-8',
      versionName: '3.0.2',
      versionCode: 8,
      fileSize: 14889779,
      fileSizeFormatted: '14.2 MB',
      sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      minAndroid: 'Android 8.1 (API 27)',
      targetAndroid: 'Android 15 (API 35)',
      releaseNotes: 'Enhanced biometric fallback and added Dark Obsidian theme.',
      releaseDate: '1 week ago'
    },
    allVersions: [
      {
        id: 'ver-sv-8',
        versionName: '3.0.2',
        versionCode: 8,
        fileSize: 14889779,
        fileSizeFormatted: '14.2 MB',
        sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        minAndroid: 'Android 8.1 (API 27)',
        targetAndroid: 'Android 15 (API 35)',
        releaseNotes: 'Enhanced biometric fallback and added Dark Obsidian theme.',
        releaseDate: '1 week ago'
      }
    ],
    reviews: [
      {
        id: 'rev-sv-1',
        userName: 'Marcus Vance',
        rating: 5,
        date: 'Sep 29, 2026',
        versionCode: 8,
        comment: 'Audited source, zero internet permission requested by default. That is true security.'
      }
    ],
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  },
  {
    id: 'app-cyber-terminal',
    packageName: 'com.smile.term',
    name: 'CyberTerminal Pro',
    slug: 'cyberterminal-pro',
    developer: {
      id: 'dev-sys-craft',
      name: 'SysCraft Tools',
      verified: true,
      email: 'dev@syscraft.io'
    },
    iconUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=256&h=256&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=500&fit=crop&q=80',
    category: 'Tools',
    type: 'APP',
    shortDescription: 'Full Linux terminal emulator, SSH client, and package manager for power users.',
    description: `Harness the full power of the Linux command line on Android without rooting your device.

Features:
• Complete bash/zsh shell with zstandard compression
• Built-in package manager with Python, Node.js, Git, Rust, and Clang
• High-performance SSH client with ed25519 key generator
• Custom hardware keyboard shortcuts and extra key row
• Solarized, Dracula, and Matrix color themes.`,
    rating: 4.7,
    ratingCount: 19800,
    downloadCount: 540000,
    downloadCountFormatted: '540K+',
    featured: false,
    trending: false,
    topFree: 4,
    screenshots: [
      'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=1400&fit=crop&q=80'
    ],
    permissions: [
      'android.permission.INTERNET',
      'android.permission.FOREGROUND_SERVICE'
    ],
    status: 'PUBLISHED',
    latestVersion: {
      id: 'ver-ct-19',
      versionName: '2.5.4',
      versionCode: 19,
      fileSize: 25165824,
      fileSizeFormatted: '24.0 MB',
      sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      minAndroid: 'Android 8.0 (API 26)',
      targetAndroid: 'Android 15 (API 35)',
      releaseNotes: 'Updated terminal font engine with Nerd Fonts glyph support.',
      releaseDate: '3 weeks ago'
    },
    allVersions: [
      {
        id: 'ver-ct-19',
        versionName: '2.5.4',
        versionCode: 19,
        fileSize: 25165824,
        fileSizeFormatted: '24.0 MB',
        sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        minAndroid: 'Android 8.0 (API 26)',
        targetAndroid: 'Android 15 (API 35)',
        releaseNotes: 'Updated terminal font engine with Nerd Fonts glyph support.',
        releaseDate: '3 weeks ago'
      }
    ],
    reviews: [
      {
        id: 'rev-ct-1',
        userName: 'Zack Chen',
        rating: 5,
        date: 'Oct 1, 2026',
        versionCode: 19,
        comment: 'Essential tool for any remote DevOps engineer. Running git and ssh effortlessly.'
      }
    ],
    createdAt: '2026-02-18T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z'
  },
  {
    id: 'app-fit-pulse',
    packageName: 'com.smile.fitpulse',
    name: 'FitPulse Tracker',
    slug: 'fitpulse-tracker',
    developer: {
      id: 'dev-vital-motion',
      name: 'VitalMotion Health',
      verified: true,
      email: 'support@vitalmotion.com'
    },
    iconUrl: 'https://images.unsplash.com/photo-1510519138161-58446232938f?w=256&h=256&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&h=500&fit=crop&q=80',
    category: 'Health & Fitness',
    type: 'APP',
    shortDescription: 'Local-first activity tracker, GPS route mapper, and heart rate interval logger.',
    description: `Track your runs, rides, and strength workouts with zero cloud lock-in.

Features:
• Offline GPS route mapping with elevation profile and split pacing
• Bluetooth Low Energy (BLE) heart rate monitor and cadence pairing
• Privacy guarantee: Your biometric data never leaves your smartphone
• Export workouts to standard GPX, TCX, and CSV formats
• Customizable audio cues during interval training.`,
    rating: 4.8,
    ratingCount: 11400,
    downloadCount: 290000,
    downloadCountFormatted: '290K+',
    featured: false,
    trending: true,
    topFree: 5,
    screenshots: [
      'https://images.unsplash.com/photo-1510519138161-58446232938f?w=800&h=1400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=1400&fit=crop&q=80'
    ],
    permissions: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BODY_SENSORS'
    ],
    status: 'PUBLISHED',
    latestVersion: {
      id: 'ver-fp-7',
      versionName: '1.2.8',
      versionCode: 7,
      fileSize: 18874368,
      fileSizeFormatted: '18.0 MB',
      sha256: '2c624232cdd221771294dfbb310aca000a0df6ac9b66bed789f75ec56ac80f9f',
      minAndroid: 'Android 8.0 (API 26)',
      targetAndroid: 'Android 15 (API 35)',
      releaseNotes: 'Improved GPS smoothing filter for urban high-rise running.',
      releaseDate: '1 week ago'
    },
    allVersions: [
      {
        id: 'ver-fp-7',
        versionName: '1.2.8',
        versionCode: 7,
        fileSize: 18874368,
        fileSizeFormatted: '18.0 MB',
        sha256: '2c624232cdd221771294dfbb310aca000a0df6ac9b66bed789f75ec56ac80f9f',
        minAndroid: 'Android 8.0 (API 26)',
        targetAndroid: 'Android 15 (API 35)',
        releaseNotes: 'Improved GPS smoothing filter for urban high-rise running.',
        releaseDate: '1 week ago'
      }
    ],
    reviews: [
      {
        id: 'rev-fp-1',
        userName: 'Sarah Jenkins',
        rating: 5,
        date: 'Oct 2, 2026',
        versionCode: 7,
        comment: 'Finally a fitness app that respects privacy and does not try to sell me a subscription!'
      }
    ],
    createdAt: '2026-04-12T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z'
  }
];

export const CATEGORIES = [
  'All',
  'For You',
  'Top Charts',
  'Games',
  'Media & Video',
  'Productivity',
  'Tools',
  'Health & Fitness',
  'Role Playing'
];
