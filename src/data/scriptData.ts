export type DeviceViewType =
  | 'overview'
  | 'side-buttons'
  | 'booting'
  | 'android-settings'
  | 'antenna-power'
  | 'inventory-ready'
  | 'scanning-active'
  | 'scanned-results'
  | 'clear-action'
  | 'summary'
  | 'led-tag'
  | 'waterproof-led'
  | 'silence-pause'
  | 'reader-settings'
  | 'led-scanning';

export interface ScriptSegment {
  id: string;
  stepNumber: number;
  title: string;
  shortSummary: string;
  text: string;
  deviceView: DeviceViewType;
  highlightButton?: 'power' | 'volume' | 'trigger' | 'antenna' | 'clear' | 'none';
  antennaDbm?: number;
  scannedTagsCount?: number;
}

export interface TimedCue {
  id: string;
  stepNumber: number;
  type: 'speech' | 'silence';
  startSec: number;
  endSec: number;
  title: string;
  text: string;
  deviceView: DeviceViewType;
}

export const LED_DEMO_CUES: TimedCue[] = [
  {
    id: 'cue-1',
    stepNumber: 1,
    type: 'speech',
    startSec: 0,
    endSec: 4,
    title: 'UHR2 Handheld Reader Intro',
    text: 'This is our UHR2 handheld RFID reader.',
    deviceView: 'overview',
  },
  {
    id: 'cue-2',
    stepNumber: 2,
    type: 'speech',
    startSec: 4,
    endSec: 10,
    title: 'Standard LED Tag Showcase',
    text: 'And this is our LED tag. It lights up every time the reader detects it.',
    deviceView: 'led-tag',
  },
  {
    id: 'cue-3',
    stepNumber: 3,
    type: 'speech',
    startSec: 10,
    endSec: 18,
    title: 'Waterproof LED Tag Showcase',
    text: 'This is our waterproof LED tag. It works the same way, and you can use it even in water or wet environments.',
    deviceView: 'waterproof-led',
  },
  {
    id: 'cue-4',
    stepNumber: 4,
    type: 'silence',
    startSec: 18,
    endSec: 20,
    title: 'Visual Transition Pause',
    text: '',
    deviceView: 'silence-pause',
  },
  {
    id: 'cue-5',
    stepNumber: 5,
    type: 'speech',
    startSec: 20,
    endSec: 21,
    title: 'Demo Cue',
    text: 'Now, the demo.',
    deviceView: 'overview',
  },
  {
    id: 'cue-6',
    stepNumber: 6,
    type: 'speech',
    startSec: 21,
    endSec: 24,
    title: 'Settings Transition',
    text: 'But first, a quick look at the settings.',
    deviceView: 'reader-settings',
  },
  {
    id: 'cue-7',
    stepNumber: 7,
    type: 'silence',
    startSec: 24,
    endSec: 26,
    title: 'Settings B-Roll Pause',
    text: '',
    deviceView: 'reader-settings',
  },
  {
    id: 'cue-8',
    stepNumber: 8,
    type: 'speech',
    startSec: 26,
    endSec: 28,
    title: 'Reader Settings Callout',
    text: 'Here are the reader settings.',
    deviceView: 'reader-settings',
  },
  {
    id: 'cue-9',
    stepNumber: 9,
    type: 'silence',
    startSec: 28,
    endSec: 30,
    title: 'Menu Open Pause',
    text: '',
    deviceView: 'inventory-ready',
  },
  {
    id: 'cue-10',
    stepNumber: 10,
    type: 'speech',
    startSec: 30,
    endSec: 42,
    title: 'Live Reading & LED Blink Demo',
    text: 'Now let’s open the menu and start reading. As you can see, the reader is picking up the tags, and the LED blinks with every read.',
    deviceView: 'led-scanning',
  },
];

export const FULL_DEFAULT_SCRIPT = `Welcome to the demonstration of the UHR2 Handheld Reader.

First, let's take a look at the physical buttons on the device. On the side, we have the power button and the volume buttons. Below, you will find the trigger button, which is used to start and stop tag scanning.

Let's press the power button to turn on the reader.

As you can see, the device has now powered on successfully. To check the operating system, let's navigate to Settings, select About Phone, and scroll down. Here, we can confirm that the UHR2 Handheld Reader is running on Android 13.

Now, let's return to the home screen and open the reader application, which we use to test the device's RFID scanning functionality.

Once the application is open, navigate to Settings and scroll down to locate the Antenna Power setting. This option allows us to adjust the antenna's power level according to our requirements.

For this demonstration, let's set the antenna power to 15 dBm.

Next, let's navigate to the Inventory section to test the reader. As you can see, we have our RFID tags ready for scanning.

Now, press the trigger button to start reading the tags.

As you can see on the screen, the reader is successfully detecting the RFID tags and displaying their corresponding EPC numbers.

To stop scanning, simply press the trigger button again. The reader will stop scanning the tags.

Next, let's click the Clear button to remove the previously scanned tag data from the screen.

Now, let's press the trigger button once again to restart the scanning process.

As you can see, the reader is once again detecting the RFID tags and displaying their EPC numbers in real time.

This concludes our demonstration of the UHR2 Handheld Reader. We have covered the device's basic controls, verified its Android operating system, configured the antenna power, and tested its RFID tag-reading functionality.

Thank you for watching. We hope you found this demonstration informative.`;

export const SCRIPT_SEGMENTS: ScriptSegment[] = [
  {
    id: 'seg-1',
    stepNumber: 1,
    title: 'Introduction to UHR2',
    shortSummary: 'Welcome and reader introduction',
    text: 'Welcome to the demonstration of the UHR2 Handheld Reader.',
    deviceView: 'overview',
    highlightButton: 'none',
  },
  {
    id: 'seg-2',
    stepNumber: 2,
    title: 'Physical Controls & Trigger',
    shortSummary: 'Power, volume, and scanning trigger buttons',
    text: "First, let's take a look at the physical buttons on the device. On the side, we have the power button and the volume buttons. Below, you will find the trigger button, which is used to start and stop tag scanning.",
    deviceView: 'side-buttons',
    highlightButton: 'trigger',
  },
  {
    id: 'seg-3',
    stepNumber: 3,
    title: 'Powering On the Device',
    shortSummary: 'Press power button to boot up',
    text: "Let's press the power button to turn on the reader.",
    deviceView: 'booting',
    highlightButton: 'power',
  },
  {
    id: 'seg-4',
    stepNumber: 4,
    title: 'Android 13 Verification',
    shortSummary: 'Checking OS in Settings > About Phone',
    text: "As you can see, the device has now powered on successfully. To check the operating system, let's navigate to Settings, select About Phone, and scroll down. Here, we can confirm that the UHR2 Handheld Reader is running on Android 13.",
    deviceView: 'android-settings',
    highlightButton: 'none',
  },
  {
    id: 'seg-5',
    stepNumber: 5,
    title: 'RFID App & Antenna Power',
    shortSummary: 'Launch app & configure 15 dBm power',
    text: "Now, let's return to the home screen and open the reader application, which we use to test the device's RFID scanning functionality. Once the application is open, navigate to Settings and scroll down to locate the Antenna Power setting. This option allows us to adjust the antenna's power level according to our requirements. For this demonstration, let's set the antenna power to 15 dBm.",
    deviceView: 'antenna-power',
    highlightButton: 'antenna',
    antennaDbm: 15,
  },
  {
    id: 'seg-6',
    stepNumber: 6,
    title: 'Inventory & Trigger Scan',
    shortSummary: 'Navigate to Inventory and pull trigger',
    text: "Next, let's navigate to the Inventory section to test the reader. As you can see, we have our RFID tags ready for scanning. Now, press the trigger button to start reading the tags.",
    deviceView: 'scanning-active',
    highlightButton: 'trigger',
    antennaDbm: 15,
    scannedTagsCount: 8,
  },
  {
    id: 'seg-7',
    stepNumber: 7,
    title: 'EPC Tag Detection & Stop',
    shortSummary: 'Viewing live EPCs and stopping scan',
    text: 'As you can see on the screen, the reader is successfully detecting the RFID tags and displaying their corresponding EPC numbers. To stop scanning, simply press the trigger button again. The reader will stop scanning the tags.',
    deviceView: 'scanned-results',
    highlightButton: 'trigger',
    scannedTagsCount: 8,
  },
  {
    id: 'seg-8',
    stepNumber: 8,
    title: 'Clear Data & Re-Scan',
    shortSummary: 'Tap Clear button and trigger re-scan',
    text: "Next, let's click the Clear button to remove the previously scanned tag data from the screen. Now, let's press the trigger button once again to restart the scanning process. As you can see, the reader is once again detecting the RFID tags and displaying their EPC numbers in real time.",
    deviceView: 'clear-action',
    highlightButton: 'clear',
    scannedTagsCount: 12,
  },
  {
    id: 'seg-9',
    stepNumber: 9,
    title: 'Conclusion & Wrap Up',
    shortSummary: 'Feature recap and thank you',
    text: 'This concludes our demonstration of the UHR2 Handheld Reader. We have covered the device\'s basic controls, verified its Android operating system, configured the antenna power, and tested its RFID tag-reading functionality. Thank you for watching. We hope you found this demonstration informative.',
    deviceView: 'summary',
    highlightButton: 'none',
  },
];

export interface VoiceOption {
  id: string;
  name: string;
  nativeName?: string;
  gender: 'Female' | 'Male';
  persona: string;
  bestFor: string;
  color: string;
  baseVoice: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';
  accent: 'Indian' | 'Global' | 'British' | 'American';
  stylePrompt: string;
  flag: string;
}

export const INDIAN_VOICES: VoiceOption[] = [
  {
    id: 'priya-in',
    name: 'Priya',
    nativeName: 'प्रिया',
    gender: 'Female',
    persona: 'Articulate Indian English corporate tech presenter',
    bestFor: 'Official hardware launches & client demonstrations',
    color: 'from-amber-500 to-orange-600',
    baseVoice: 'Kore',
    accent: 'Indian',
    stylePrompt: 'Professional Indian English female speaker with an authentic, polite Indian accent, articulate Bangalore tech delivery, and crisp pronunciation of technical hardware terms like UHR2, RFID, EPC, and Android 13.',
    flag: '🇮🇳',
  },
  {
    id: 'arjun-in',
    name: 'Arjun',
    nativeName: 'अर्जुन',
    gender: 'Male',
    persona: 'Dynamic Indian tech specialist & hardware engineer',
    bestFor: 'Product walkthroughs, exhibitions & booth showcases',
    color: 'from-sky-500 to-indigo-600',
    baseVoice: 'Puck',
    accent: 'Indian',
    stylePrompt: 'Confident Indian English male hardware engineer, authentic Indian accent, energetic and articulate product demonstration cadence with clear technical terms.',
    flag: '🇮🇳',
  },
  {
    id: 'ananya-in',
    name: 'Ananya',
    nativeName: 'अनन्या',
    gender: 'Female',
    persona: 'Warm, patient Indian corporate trainer',
    bestFor: 'Customer onboarding & instructional step-by-step videos',
    color: 'from-rose-500 to-pink-600',
    baseVoice: 'Zephyr',
    accent: 'Indian',
    stylePrompt: 'Warm, instructional Indian English female speaker, authentic Indian cadence, patient, friendly, and distinct pauses between actionable steps.',
    flag: '🇮🇳',
  },
  {
    id: 'vikram-in',
    name: 'Vikram',
    nativeName: 'विक्रम',
    gender: 'Male',
    persona: 'Authoritative Indian senior engineering lead',
    bestFor: 'Industrial specifications, enterprise overviews & webinars',
    color: 'from-emerald-500 to-teal-700',
    baseVoice: 'Fenrir',
    accent: 'Indian',
    stylePrompt: 'Authoritative, deep Indian English male voice, authentic Indian accent, steady and polished executive demonstration cadence.',
    flag: '🇮🇳',
  },
  {
    id: 'rohan-in',
    name: 'Rohan',
    nativeName: 'रोहन',
    gender: 'Male',
    persona: 'Calm, grounded Indian field application engineer',
    bestFor: 'Technical documentation & hands-on setup tutorials',
    color: 'from-purple-500 to-indigo-700',
    baseVoice: 'Charon',
    accent: 'Indian',
    stylePrompt: 'Calm, grounded Indian English male voice, authentic Indian accent, clear and precise step-by-step guidance.',
    flag: '🇮🇳',
  },
];

export const GLOBAL_VOICES: VoiceOption[] = [
  {
    id: 'kore-global',
    name: 'Kore',
    gender: 'Female',
    persona: 'Clear, studio-grade neutral tech narrator',
    bestFor: 'Official international product demos',
    color: 'from-sky-500 to-indigo-600',
    baseVoice: 'Kore',
    accent: 'Global',
    stylePrompt: 'Clear, professional product presenter with deliberate, articulate pacing and crisp pronunciation of technical RFID terms.',
    flag: '🌐',
  },
  {
    id: 'puck-global',
    name: 'Puck',
    gender: 'Male',
    persona: 'Enthusiastic, energetic international presenter',
    bestFor: 'Marketing showcases & feature reveals',
    color: 'from-amber-500 to-orange-600',
    baseVoice: 'Puck',
    accent: 'Global',
    stylePrompt: 'Energetic, confident tech presenter at an industry conference unveiling the UHR2 handheld scanner.',
    flag: '🌐',
  },
  {
    id: 'fenrir-global',
    name: 'Fenrir',
    gender: 'Male',
    persona: 'Authoritative, deep corporate voice',
    bestFor: 'Executive overviews & technical specs',
    color: 'from-emerald-500 to-teal-700',
    baseVoice: 'Fenrir',
    accent: 'Global',
    stylePrompt: 'Deep, authoritative male narrator with steady, professional delivery.',
    flag: '🌐',
  },
  {
    id: 'charon-global',
    name: 'Charon',
    gender: 'Male',
    persona: 'Steady, grounded instructional voice',
    bestFor: 'Step-by-step user manuals & tutorials',
    color: 'from-purple-500 to-indigo-700',
    baseVoice: 'Charon',
    accent: 'Global',
    stylePrompt: 'Calm, neutral, professional voiceover suitable for industrial documentation.',
    flag: '🌐',
  },
  {
    id: 'zephyr-global',
    name: 'Zephyr',
    gender: 'Female',
    persona: 'Warm, articulate, friendly guide',
    bestFor: 'Customer onboarding & video walkthroughs',
    color: 'from-rose-500 to-pink-600',
    baseVoice: 'Zephyr',
    accent: 'Global',
    stylePrompt: 'Warm, inviting, articulate female voice with clear, encouraging delivery.',
    flag: '🌐',
  },
];

export const ALL_VOICES: VoiceOption[] = [...INDIAN_VOICES, ...GLOBAL_VOICES];

// Backwards compatibility export
export const VOICES = ALL_VOICES;

export const ACCENT_PRESETS = [
  {
    id: 'indian-english',
    label: 'Indian English (Authentic Indian Accent)',
    badge: '🇮🇳 India',
    description: 'Polite, articulate Indian English pronunciation with natural South Asian cadence',
    promptModifier: 'in an authentic, professional Indian English accent with polite and clear cadence',
  },
  {
    id: 'indian-corporate',
    label: 'Indian English - Tech / Corporate (Bangalore/Mumbai)',
    badge: '🇮🇳 Tech Hub',
    description: 'Fluent, modern Indian IT executive delivery with clear technical precision',
    promptModifier: 'in a modern, fluent Indian English tech executive accent from Bangalore or Mumbai',
  },
  {
    id: 'indian-instructional',
    label: 'Indian English - Instructional Trainer',
    badge: '🇮🇳 Training',
    description: 'Patient, educational delivery with steady Indian pacing and distinct pauses',
    promptModifier: 'in a patient, clear Indian English trainer voice with distinct pauses between actions',
  },
  {
    id: 'global-neutral',
    label: 'Global Neutral English',
    badge: '🌐 Global',
    description: 'Standard international broadcast tone',
    promptModifier: 'in a clear, neutral international English accent',
  },
  {
    id: 'british-english',
    label: 'British English',
    badge: '🇬🇧 UK',
    description: 'Articulate British RP delivery with polished corporate cadence',
    promptModifier: 'in a polished, articulate British English accent',
  },
  {
    id: 'american-english',
    label: 'American English',
    badge: '🇺🇸 US',
    description: 'Dynamic, confident North American tech presenter cadence',
    promptModifier: 'in a confident, clear North American tech presenter accent',
  },
];

export const STYLE_PRESETS = [
  {
    id: 'product-demo',
    label: 'Industrial Product Showcase',
    description: 'Crisp, articulate tone with deliberate cadence on hardware terms',
    prompt: 'Clear, professional product presenter with deliberate, articulate pacing and crisp pronunciation of technical RFID terms such as UHR2, EPC, dBm, and Android 13.',
  },
  {
    id: 'training-guide',
    label: 'Instructional Step-by-Step',
    description: 'Patient, educational delivery with natural pauses after each action',
    prompt: 'Patient, instructional trainer tone with natural pacing and distinct pauses between actionable steps.',
  },
  {
    id: 'keynote-tech',
    label: 'High-Impact Hardware Launch',
    description: 'Confident, engaging, modern keynote presentation style',
    prompt: 'Energetic, confident tech presenter at an industry conference unveiling the UHR2 handheld scanner.',
  },
  {
    id: 'neutral-doc',
    label: 'Neutral Documentary / Spec Guide',
    description: 'Calm, balanced, matter-of-fact audio guide',
    prompt: 'Calm, neutral, professional voiceover suitable for industrial documentation and training videos.',
  },
];

export const HINDI_DEFAULT_SCRIPT = `UHR2 हैंडहेल्ड रीडर के प्रदर्शन में आपका स्वागत है।

सबसे पहले, आइए डिवाइस पर मौजूद फिजिकल बटन्स को देखें। साइड में हमारे पास पावर बटन और वॉल्यूम बटन हैं। नीचे, आपको ट्रिगर बटन मिलेगा, जिसका उपयोग टैग स्कैनिंग शुरू और बंद करने के लिए किया जाता है।

आइए रीडर को चालू करने के लिए पावर बटन दबाएं।

जैसा कि आप देख सकते हैं, डिवाइस अब सफलतापूर्वक चालू हो गया है। ऑपरेटिंग सिस्टम की जांच करने के लिए, आइए सेटिंग्स में जाएं, अबाउट फोन चुनें और नीचे स्क्रॉल करें। यहां, हम पुष्टि कर सकते हैं कि UHR2 हैंडहेल्ड रीडर एंड्रॉइड 13 पर चल रहा है।

अब, आइए होम स्क्रीन पर वापस आएं और रीडर एप्लिकेशन खोलें, जिसका उपयोग हम डिवाइस की आरएफआईडी स्कैनिंग कार्यक्षमता का परीक्षण करने के लिए करते हैं।

एप्लिकेशन खुलने के बाद, सेटिंग्स में जाएं और एंटीना पावर सेटिंग देखने के लिए नीचे स्क्रॉल करें। यह विकल्प हमें अपनी आवश्यकताओं के अनुसार एंटीना के पावर स्तर को समायोजित करने की अनुमति देता है।

इस प्रदर्शन के लिए, आइए एंटीना पावर को 15 dBm पर सेट करें।

इसके बाद, रीडर का परीक्षण करने के लिए आइए इन्वेंट्री सेक्शन में जाएं। जैसा कि आप देख सकते हैं, हमारे पास स्कैनिंग के लिए आरएफआईडी टैग तैयार हैं।

अब, टैग पढ़ना शुरू करने के लिए ट्रिगर बटन दबाएं।

जैसा कि आप स्क्रीन पर देख सकते हैं, रीडर सफलतापूर्वक आरएफआईडी टैग का पता लगा रहा है और उनके संबंधित ईपीसी नंबर प्रदर्शित कर रहा है।

स्कैनिंग रोकने के लिए, बस ट्रिगर बटन को फिर से दबाएं। रीडर टैग स्कैन करना बंद कर देगा।

इसके बाद, स्क्रीन से पहले से स्कैन किए गए टैग डेटा को हटाने के लिए क्लियर बटन पर क्लिक करें।

अब, स्कैनिंग प्रक्रिया को फिर से शुरू करने के लिए एक बार फिर ट्रिगर बटन दबाएं।

जैसा कि आप देख सकते हैं, रीडर एक बार फिर वास्तविक समय में आरएफआईडी टैग का पता लगा रहा है और उनके ईपीसी नंबर प्रदर्शित कर रहा है।

यह UHR2 हैंडहेल्ड रीडर का हमारा प्रदर्शन समाप्त करता है। हमने डिवाइस के बुनियादी नियंत्रणों को कवर किया है, इसके एंड्रॉइड ऑपरेटिंग सिस्टम का सत्यापन किया है, एंटीना पावर को कॉन्फ़िगर किया है, और इसकी आरएफआईडी टैग-रीडिंग कार्यक्षमता का परीक्षण किया है।

देखने के लिए धन्यवाद। हमें आशा है कि आपको यह प्रदर्शन जानकारीपूर्ण लगा होगा।`;

export interface MockEpcTag {
  epc: string;
  rssi: number;
  count: number;
  tid: string;
}

export const DEMO_EPC_TAGS: MockEpcTag[] = [
  { epc: 'E280 1160 6000 0208 4591 0001', rssi: -48, count: 34, tid: 'E2003412013' },
  { epc: 'E280 1160 6000 0208 4591 0002', rssi: -52, count: 28, tid: 'E2003412014' },
  { epc: 'E280 1160 6000 0208 4591 0003', rssi: -55, count: 41, tid: 'E2003412015' },
  { epc: 'E280 6810 0000 0000 9014 A811', rssi: -61, count: 19, tid: 'E2003412019' },
  { epc: 'E280 6810 0000 0000 9014 A812', rssi: -58, count: 22, tid: 'E2003412020' },
  { epc: 'E200 0019 7809 0132 1440 8820', rssi: -64, count: 15, tid: 'E2003412033' },
  { epc: 'E200 0019 7809 0132 1440 8821', rssi: -67, count: 12, tid: 'E2003412034' },
  { epc: '3034 0413 8810 2200 0000 0001', rssi: -46, count: 53, tid: 'E2003412040' },
  { epc: '3034 0413 8810 2200 0000 0002', rssi: -50, count: 47, tid: 'E2003412041' },
  { epc: '3034 0413 8810 2200 0000 0003', rssi: -63, count: 18, tid: 'E2003412042' },
  { epc: 'E280 1170 2000 0001 5522 9980', rssi: -59, count: 26, tid: 'E2003412055' },
  { epc: 'E280 1170 2000 0001 5522 9981', rssi: -65, count: 14, tid: 'E2003412056' },
];
