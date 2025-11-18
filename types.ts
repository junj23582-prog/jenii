export enum View {
  Splash,
  Auth,
  Dashboard,
  Studio,
  Effects,
  Collaboration,
  Learning,
  Upgrade,
  Payment
}

export interface User {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
}

// New, more flexible AudioEffect interface
export interface AudioEffect {
  id: string;
  name: 'Reverb' | 'Delay' | 'Compressor' | 'EQ' | 'Distortion';
  params: { [key: string]: number }; // e.g., { mix: 50 }, { time: 0.5, feedback: 0.5 }, { bass: 10, mid: -5, treble: 5 }
  isEnabled: boolean;
}

// New interface for recorded audio clips
export interface AudioClip {
  id: string;
  name: string;
  url: string; // Blob URL
  startTime: number; // in seconds
  duration: number; // in seconds
  gain: number; // Clip-specific gain, 1.0 is default
  effects: AudioEffect[];
}


export interface Track {
  id: number;
  name: string;
  instrument: string; // This will now be the instrument name, e.g., "Vintage Piano"
  icon: string; // e.g., 'fa-piano'
  color?: string; // e.g., '#9333ea' (purple-600)
  volume: number;
  pan: number; // -100 (L) to 100 (R)
  gain: number;
  isMuted: boolean;
  isSolo: boolean;
  effects: AudioEffect[];
  clips: AudioClip[]; // Add clips to track
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number; // using epoch time for simplicity
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  collaborators: User[];
  lyrics?: string;
  chatHistory?: ChatMessage[];
}

export interface PlayerState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
}

export interface VirtualInstrument {
    id: string;
    name: string;
    category: 'AI' | 'Preset' | 'Custom';
    description: string;
    icon: string;
}

export interface TutorialStep {
    title: string;
    content: string;
    icon: string;
}

export interface Tutorial {
    id: string;
    title: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    duration: number; // in minutes
    steps: TutorialStep[];
}