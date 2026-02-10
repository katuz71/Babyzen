# BabyZen 👶🎵

AI-powered baby cry analyzer with soothing sounds.

## 🌟 Features

- 🎤 **Cry Analysis**: Record and analyze baby cries using AI
- 🧠 **Smart Detection**: Identifies cry types (Hunger, Sleep, Gas, Discomfort, etc.)
- 🎵 **Smart Soothe**: Automatically plays appropriate calming sounds based on cry type
- 📊 **History**: Track all cry analyses with timestamps and confidence scores
- 🌍 **Multi-language**: Full support for Russian and English with easy language switching
- 💾 **Offline Ready**: Local database for history storage

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Android/iOS device or emulator

### Installation

```bash
npm install
npx expo start
```

## 🎵 Soothing Sounds Setup

### Where to Download Sounds (MP3 format):

#### Option 1: Pixabay (Recommended)
1. Go to https://pixabay.com/sound-effects/
2. Download the following sounds:
   - **White Noise** (for sleep): search "white noise"
   - **Heartbeat** (for gas): search "heartbeat"
   - **Rain** (for discomfort): search "rain"
   - **Shush** (default): search "shush" or "wind"

#### Option 2: Freesound.org
1. Register at https://freesound.org
2. Download:
   - White Noise: https://freesound.org/people/InspectorJ/sounds/346638/
   - Heartbeat: https://freesound.org/people/Garuda1982/sounds/538915/
   - Rain: https://freesound.org/people/InspectorJ/sounds/411459/
   - Shush: https://freesound.org/people/kwahmah_02/sounds/256116/

### File Placement:

Save downloaded MP3 files to `assets/sounds/` with these names:
- `white_noise.mp3`
- `heartbeat.mp3`
- `rain.mp3`
- `shush.mp3`

**Note**: Files should be in MP3 format and under 5MB each for fast loading.

## 🌍 Language Support

The app supports **Russian**, **English**, and **Spanish** with easy switching:

1. Tap the 🌐 globe icon in the top right corner
2. Language cycles through RU → EN → ES → RU
3. Your selection is saved automatically

**Default**: App detects your device language on first launch.

For more details, see [i18n Implementation Guide](./docs/i18n-implementation.md)

## 📱 Usage

1. **Record**: Tap the microphone sphere when baby cries
2. **Analyze**: AI analyzes the cry and shows the detected type
3. **Soothe**: Tap "SOOTHE BABY" to play calming sounds
4. **History**: View past analyses in the Diary tab

## 🛠 Tech Stack

- **Framework**: React Native + Expo
- **Routing**: Expo Router
- **Database**: Supabase
- **Audio**: expo-av
- **i18n**: i18next + react-i18next
- **UI**: Custom components with Linear Gradients

## 📁 Project Structure

```
BabyZen/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Main recording screen
│   │   ├── explore.tsx    # History/Diary screen
│   │   └── _layout.tsx    # Tab navigation
├── assets/
│   ├── locales/           # Translation files (ru.json, en.json)
│   └── sounds/            # Soothing sound files
├── components/
│   ├── LanguageSwitcher.tsx
│   └── ...
├── hooks/
│   └── useAudioRecorder.ts
├── lib/
│   ├── i18n.ts           # i18next configuration
│   ├── supabase.ts
│   └── smartSoothe.ts
└── docs/
    └── i18n-implementation.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
