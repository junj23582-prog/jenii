import type { User, Project, VirtualInstrument, Tutorial, ChatMessage } from './types';

export const MOCK_USER: User = {
    id: 'u1',
    name: 'Jeni',
    email: 'jeni@example.com',
    isPremium: false,
};

export const MOCK_USER_2: User = {
    id: 'u2',
    name: 'Mike',
    email: 'mike@example.com',
    isPremium: true,
};

export const ALL_MOCK_USERS = [MOCK_USER, MOCK_USER_2];

const MOCK_COLLABORATORS: User[] = [
    MOCK_USER,
    MOCK_USER_2,
    { id: 'u3', name: 'Sarah', email: 'sarah@example.com', isPremium: true },
];

const MOCK_CHAT_HISTORY: ChatMessage[] = [
    {
        id: 'msg1',
        senderId: 'u2', // Mike
        senderName: 'Mike',
        content: "Hey Jeni, I've laid down the basic drum track. What do you think?",
        timestamp: Date.now() - 1000 * 60 * 5 // 5 minutes ago
    },
    {
        id: 'msg2',
        senderId: 'u1', // Jeni
        senderName: 'Jeni',
        content: "Sounds great Mike! Really punchy. I'll add a bassline to it now.",
        timestamp: Date.now() - 1000 * 60 * 3 // 3 minutes ago
    }
];

export const MOCK_PROJECT: Project = {
    id: 'p1',
    name: 'New Project',
    bpm: 120,
    tracks: [],
    collaborators: MOCK_COLLABORATORS,
    lyrics: '',
    chatHistory: MOCK_CHAT_HISTORY,
};

export const MOCK_INSTRUMENTS: VirtualInstrument[] = [
    { id: 'inst1', name: 'Grand Piano', category: 'Preset', description: 'A classic, rich-sounding grand piano.', icon: 'fa-music' },
    { id: 'inst2', name: '80s Synth Lead', category: 'Preset', description: 'Bright, cutting synth for retro melodies.', icon: 'fa-wave-square' },
    { id: 'inst3', name: 'Acoustic Drum Kit', category: 'Preset', description: 'Punchy and realistic drum sounds.', icon: 'fa-drum' },
    { id: 'inst4', name: 'Electric Bass', category: 'Preset', description: 'A warm, round bass guitar tone.', icon: 'fa-guitar' },
    { id: 'inst5', name: 'Hip Hop Drum Kit', category: 'Preset', description: 'Classic 808-style drum sounds.', icon: 'fa-drum' },
];

export const MOCK_TUTORIALS: Tutorial[] = [
    {
        id: 'tut1',
        title: 'Getting Started with VibeStudio',
        level: 'Beginner',
        duration: 10,
        steps: [
            { title: 'Welcome!', content: 'This tutorial will guide you through the basic interface of VibeStudio.', icon: 'fa-rocket' },
            { title: 'The Dashboard', content: 'This is your home screen. From here, you can start a new project or open recent ones.', icon: 'fa-house' },
            { title: 'The Studio View', content: 'Here you can add tracks, record audio, and arrange your song. Try adding a new virtual instrument!', icon: 'fa-sliders' },
            { title: 'You are ready!', content: 'You have learned the basics. Now go and create some music!', icon: 'fa-trophy' },
        ]
    },
    {
        id: 'tut2',
        title: 'Multi-Track Recording Techniques',
        level: 'Intermediate',
        duration: 20,
        steps: [
            { title: 'Introduction', content: 'Learn how to record multiple layers to build a full song.', icon: 'fa-layer-group' },
            { title: 'Setting Up', content: 'First, add a track for each instrument you want to record. Make sure your external device is connected.', icon: 'fa-plus' },
            { title: 'Recording a Take', content: 'Select a track, press the record button, and play along with the metronome.', icon: 'fa-circle-dot' },
            { title: 'Conclusion', content: 'Great job! Layering tracks is key to a professional sound.', icon: 'fa-music' },
        ]
    }
];