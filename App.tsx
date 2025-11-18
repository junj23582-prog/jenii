import React, { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import type { User, Project, PlayerState, ChatMessage } from './types';
import { View } from './types';
import { MOCK_USER, ALL_MOCK_USERS, MOCK_PROJECT } from './constants';
import { SplashScreen, AuthScreen, DashboardScreen, StudioScreen, EffectsScreen, CollaborationScreen, LearningCenterScreen, UpgradeScreen, PaymentScreen } from './components/Screens';

// --- I1N/LOCALE SETUP ---

const translations = {
    en: {
        // General
        professionalDAW: "Professional Mobile DAW",
        upgrade: "Upgrade",
        understand: "Got it",
        premium: "PREMIUM",
        basic: "Basic",
        pro: "Pro",
        delete: "Delete",
        rename: "Rename",
        duplicate: "Duplicate",
        changeColor: "Change Color",
        createGroup: "Create Group from Track",
        freeze: "Freeze",
        enableMultitrack: "Enable Multitrack Recording",
        moveUp: "Move Up",
        moveDown: "Move Down",
        importFromDisk: "Import from Disk",
        exportAsAudio: "Export as Audio",
        gain: "Gain",
        // Toasts
        switchedTo: "Switched to {{name}}",
        deviceConnected: "External audio device connected.",
        deviceDisconnected: "External audio device disconnected.",
        redirectingPayment: "Redirecting to secure payment...",
        projectSaved: "Project saved!",
        projectPublished: "Project published!",
        copied: "Copied to clipboard!",
        new_message_from: "New message from {{name}}",
        // Account Modal
        switchAccount: "Switch Account",
        addAnotherAccount: "Add Another Account",
        logOutOfAll: "Log Out of All Accounts",
        // Nav
        home: "Home",
        studio: "Studio",
        effects: "Effects",
        collaboration: "Collaboration",
        learning: "Learning",
        // Auth
        loginTitle: "Login to VibeStudio",
        loginSubtitle: "Log in to your VibeStudio account",
        registerTitle: "Create New Account",
        registerSubtitle: "Start your musical journey",
        fullName: "Full Name",
        email: "Email",
        password: "Password",
        login: "Log In",
        register: "Register Now",
        noAccount: "Don't have an account? Register now",
        hasAccount: "Already have an account? Log in here",
        loginFailedGmail: "Login failed. Please use a verified Gmail account to continue.",
        passwordMinLength: "Password must be at least 13 characters long.",
        passwordComplexity: "Password must include uppercase, lowercase, numbers, and symbols.",
        // Dashboard
        welcomeMessage: "Welcome, {{name}}!",
        letsCreate: "Let's start creating.",
        startFirstRecording: "Start Your First Recording",
        startFirstRecordingDesc: "Create a new project and record your ideas.",
        connectedDevices: "Connected Devices",
        deviceIsConnected: "{{deviceName}} Connected",
        deviceConnectedTitle: "Device Connected",
        deviceConnectedDesc: "Ready to record!",
        noDeviceTitle: "No Device Connected",
        noDeviceDesc: "Connect your audio interface.",
        howToConnect: "How to Connect",
        recentProjects: "Recent Projects",
        highQuality: "High Quality Lossless",
        connectExternalDeviceTitle: "Connecting External Devices",
        connectExternalDeviceDesc: "VibeStudio supports various external audio interfaces like iRig, sound cards, and more for high-quality recording.",
        connectStepsTitle: "General Steps:",
        connectStep1: "Use a compatible data cable (USB-C, Lightning) to connect your device to the audio interface.",
        connectStep2: "Ensure your audio interface has power (if required).",
        connectStep3: "VibeStudio will automatically detect the audio input once connected.",
        connectStep4: "Select the external input in your track settings to start recording.",
        // Studio
        addInstrument: "+ Add Virtual Instrument",
        instrumentNotPlayable: "Instrument '{{instrument}}' is not playable.",
        selectTrackToPlay: "Select a track to play an instrument.",
        instrumentLibrary: "Virtual Instrument Library",
        preset: "Preset",
        createWithAI: "Create with AI",
        describeSound: "Describe the sound you want (e.g., 'a dreamy synth pad for lo-fi beats').",
        generateInstrument: "Generate Instrument",
        generating: "Generating...",
        aiResult: "AI Result:",
        addThisAIInstrument: "Add this AI Instrument",
        recording: "Recording...",
        recordingComplete: "Recording complete. Ready to play or save.",
        recordingFailed: "Could not start recording. Please ensure microphone permissions are granted.",
        recordingTooShort: "Recording was too short to save.",
        playbackFailed: "Could not play recording. The file might be corrupted.",
        record: "Record",
        stop: "Stop",
        play: "Play",
        save: "Save",
        publish: "Publish",
        reviewRecording: "Review Recording",
        previewTake: "Preview your latest take.",
        discard: "Discard",
        // Effects
        effectsRack: "Audio Effects Rack",
        selectTrack: "Select Track",
        noEffectsOnTrack: "No effects on this track.",
        selectTrackToSeeEffects: "Select a track to see effects.",
        aiToolsAudioRec: "AI Tools: AI Music Analyzer",
        aiToolsAudioRecDesc: "Import an audio file (mp3, wav) for a full analysis: key, tempo, chord progression, and synchronized lyrics.",
        importAndAnalyzeAudio: "Import & Analyze File",
        analyzing: "Analyzing...",
        chordAnalysisResult: "Analysis Result:",
        key: "Key",
        tempo: "Tempo",
        chordProgression: "Chord Progression",
        timeSignature: "Time Signature",
        progressionType: "Progression Type",
        copyToClipboard: "Copy to Clipboard",
        exportAsTxt: "Export as TXT",
        addCompressor: "Add Compressor",
        addReverb: "Add Reverb",
        addDelay: "Add Delay",
        addEQ: "Add EQ",
        // Collaboration
        collabStudio: "Collaboration Studio",
        collaborators: "Collaborators",
        chat: "Chat",
        liveActivity: "Live Activity",
        chatPlaceholder: "Your project team chat will appear here.",
        activity1: "<0>{{name}}</0> added a new 'Lead Vocal' track.",
        activity2: "<0>{{name}}</0> changed the project BPM to 125.",
        activity3: "<0>{{name}}</0> left a comment on the 'Bass Line' track.",
        activity4: "<0>{{name}}</0> shared the latest version of the project.",
        typeYourMessage: "Type your message...",
        // Learning
        learningCenter: "Learning Center",
        haveAQuestion: "Have a Question?",
        askAITutor: "Ask our AI Tutor or search for tutorials.",
        searchExample: "Example: How do I export a song?",
        aiTutorThinking: "AI Tutor is thinking...",
        aiTutorAnswer: "AI Tutor's Answer",
        clear: "Clear",
        allTutorials: "All Tutorials",
        searchResultsFor: "Results for \"{{query}}\"",
        level: "Level",
        duration: "Duration",
        min: "min",
        startTutorial: "Start Tutorial",
        noTutorialsFound: "No tutorials found. Try asking the AI Tutor!",
        // Upgrade
        membershipTitle: "VibeStudio Membership – {{plan}}",
        membershipSubtitle: "All the tools you need to succeed in music.",
        emailAddress: "Email address",
        emailRequired: "Email is required.",
        emailInvalid: "Email is invalid.",
        country: "Country",
        countryRequired: "Country is required.",
        offersOptIn: "VibeStudio Singapore Pte Ltd may send me product updates and offers via email. It is possible to opt out at any time.",
        annualPlan: "Annual Plan",
        monthlyPlan: "Monthly Plan",
        basicPlan: "Basic Plan",
        proPlan: "Pro Plan",
        billedAnnually: "(billed annually)",
        billedMonthly: "(billed monthly)",
        save15: "Save 15%",
        mostPopular: "Most Popular",
        tryFree3Days: "Try Free for 3 Days",
        continue: "Continue »",
        termsAndPolicy: "By continuing, you agree to our <0>Terms of Use</0> and have read our <1>Privacy Policy</1>.",
        helpAndFAQ: "Help & FAQ",
        // Payment
        secureCheckout: "Secure Checkout",
        orderSummary: "Order Summary",
        plan: "Plan",
        price: "Price",
        selectPaymentMethod: "Select Payment Method",
        creditCard: "Credit Card",
        bankTransfer: "Bank Transfer",
        eWallet: "E-Wallet",
        cardNumber: "Card Number",
        expiryDate: "Expiry Date (MM/YY)",
        cvc: "CVC",
        cardHolderName: "Cardholder Name",
        payNow: "Pay {{price}}",
        processingPayment: "Processing Payment...",
        paymentSuccessful: "Payment Successful!",
        welcomeToPremium: "Welcome to VibeStudio Premium! All features are now unlocked.",
        backToDashboard: "Back to Dashboard",
        // Lyrics
        lyricsNotes: "Lyrics/Notes",
        lyricsEditorTitle: "Lyrics & Notes Editor",
        lyricsPlaceholder: "Type or paste your lyrics here...",
        lyricsSavedToast: "Lyrics saved!",
        lyricsDisplayActiveToast: "Lyrics display mode active.",
    },
    id: {
        // General
        professionalDAW: "Professional Mobile DAW",
        upgrade: "Tingkatkan",
        understand: "Mengerti",
        premium: "PREMIUM",
        basic: "Dasar",
        pro: "Pro",
        delete: "Hapus",
        rename: "Ganti Nama",
        duplicate: "Duplikat",
        changeColor: "Ubah Warna",
        createGroup: "Buat Grup dari Track",
        freeze: "Bekukan",
        enableMultitrack: "Aktifkan Perekaman Multitrack",
        moveUp: "Pindah ke Atas",
        moveDown: "Pindah ke Bawah",
        importFromDisk: "Impor dari Disk",
        exportAsAudio: "Ekspor sebagai Audio",
        gain: "Gain",
        // Toasts
        switchedTo: "Beralih ke {{name}}",
        deviceConnected: "Perangkat audio eksternal terhubung.",
        deviceDisconnected: "Perangkat audio eksternal terputus.",
        redirectingPayment: "Mengarahkan ke pembayaran aman...",
        projectSaved: "Proyek disimpan!",
        projectPublished: "Proyek diterbitkan!",
        copied: "Disalin ke papan klip!",
        new_message_from: "Pesan baru dari {{name}}",
        // Account Modal
        switchAccount: "Beralih Akun",
        addAnotherAccount: "Tambah Akun Lain",
        logOutOfAll: "Keluar dari Semua Akun",
        // Nav
        home: "Beranda",
        studio: "Studio",
        effects: "Efek",
        collaboration: "Kolaborasi",
        learning: "Belajar",
        // Auth
        loginTitle: "Login VibeStudio",
        loginSubtitle: "Masuk ke akun VibeStudio Anda",
        registerTitle: "Daftar Akun Baru",
        registerSubtitle: "Mulai perjalanan musik Anda",
        fullName: "Nama Lengkap",
        email: "Email",
        password: "Password",
        login: "Masuk",
        register: "Daftar Sekarang",
        noAccount: "Belum punya akun? Daftar sekarang",
        hasAccount: "Sudah punya akun? Masuk di sini",
        loginFailedGmail: "Login gagal. Silakan gunakan akun Gmail yang terverifikasi untuk melanjutkan.",
        passwordMinLength: "Kata sandi harus memiliki panjang minimal 13 karakter.",
        passwordComplexity: "Kata sandi harus menyertakan huruf besar, huruf kecil, angka, dan simbol.",
        // Dashboard
        welcomeMessage: "Selamat Datang, {{name}}!",
        letsCreate: "Mari mulai berkreasi.",
        startFirstRecording: "Mulai Rekaman Pertama",
        startFirstRecordingDesc: "Buat proyek baru dan rekam ide Anda.",
        connectedDevices: "Perangkat Terhubung",
        deviceIsConnected: "{{deviceName}} Terhubung",
        deviceConnectedTitle: "Perangkat Terhubung",
        deviceConnectedDesc: "Terdeteksi saat kabel terhubung ke perangkat Anda.",
        noDeviceTitle: "Tidak Ada Perangkat",
        noDeviceDesc: "Hubungkan audio interface Anda.",
        howToConnect: "Cara Menghubungkan",
        recentProjects: "Proyek Terakhir",
        highQuality: "High Quality Lossless",
        connectExternalDeviceTitle: "Menghubungkan Perangkat Eksternal",
        connectExternalDeviceDesc: "VibeStudio mendukung berbagai audio interface eksternal seperti iRig, sound card, dan lainnya untuk rekaman kualitas tinggi.",
        connectStepsTitle: "Langkah-langkah umum:",
        connectStep1: "Siapkan peralatan Anda: kabel iRig, 7.1 Channel Sound, atau set Mic Condenser BM 800.",
        connectStep2: "Hubungkan peralatan ke port yang sesuai di ponsel atau laptop Anda menggunakan kabel sambungannya.",
        connectStep3: "VibeStudio akan secara otomatis mendeteksi perangkat setelah terhubung.",
        connectStep4: "Buka pengaturan trek dan pilih perangkat Anda sebagai input untuk mulai merekam.",
        // Studio
        addInstrument: "+ Tambah Instrumen Virtual",
        instrumentNotPlayable: "Instrumen '{{instrument}}' tidak dapat dimainkan.",
        selectTrackToPlay: "Pilih trek untuk memainkan instrumen.",
        instrumentLibrary: "Perpustakaan Instrumen Virtual",
        preset: "Preset",
        createWithAI: "Buat dengan AI",
        describeSound: "Jelaskan suara yang Anda inginkan (contoh: 'a dreamy synth pad for lo-fi beats').",
        generateInstrument: "Hasilkan Instrumen",
        generating: "Menghasilkan...",
        aiResult: "Hasil AI:",
        addThisAIInstrument: "Tambah Instrumen AI ini",
        recording: "Merekam...",
        recordingComplete: "Rekaman selesai. Siap diputar atau disimpan.",
        recordingFailed: "Tidak dapat memulai rekaman. Pastikan izin mikrofon diberikan.",
        recordingTooShort: "Rekaman terlalu pendek untuk disimpan.",
        playbackFailed: "Tidak dapat memutar rekaman. File mungkin rusak.",
        record: "Rekam",
        stop: "Berhenti",
        play: "Putar",
        save: "Simpan",
        publish: "Publikasikan",
        reviewRecording: "Tinjau Rekaman",
        previewTake: "Pratinjau rekaman terakhir Anda.",
        discard: "Buang",
        // Effects
        effectsRack: "Rak Efek Audio",
        selectTrack: "Pilih Track",
        noEffectsOnTrack: "Tidak ada efek pada track ini.",
        selectTrackToSeeEffects: "Pilih sebuah track untuk melihat efek.",
        aiToolsAudioRec: "Alat AI: Penganalisis Musik AI",
        aiToolsAudioRecDesc: "Impor file audio (mp3, wav) untuk analisis lengkap: kunci nada, tempo, progresi akor, dan lirik yang disinkronkan.",
        importAndAnalyzeAudio: "Impor & Analisis File",
        analyzing: "Menganalisis...",
        chordAnalysisResult: "Hasil Analisis:",
        key: "Kunci Nada",
        tempo: "Tempo",
        chordProgression: "Progresi Akor",
        timeSignature: "Tanda Birama",
        progressionType: "Jenis Progresi",
        copyToClipboard: "Salin ke Papan Klip",
        exportAsTxt: "Ekspor sebagai TXT",
        addCompressor: "Tambah Kompresor",
        addReverb: "Tambah Reverb",
        addDelay: "Tambah Delay",
        addEQ: "Tambah EQ",
        // Collaboration
        collabStudio: "Studio Kolaborasi",
        collaborators: "Kolaborator",
        chat: "Obrolan",
        liveActivity: "Aktivitas Langsung",
        chatPlaceholder: "Obrolan tim proyek Anda akan muncul di sini.",
        activity1: "<0>{{name}}</0> menambahkan track baru 'Lead Vocal'.",
        activity2: "<0>{{name}}</0> mengubah BPM proyek menjadi 125.",
        activity3: "<0>{{name}}</0> meninggalkan komentar di track 'Bass Line'.",
        activity4: "<0>{{name}}</0> membagikan versi terbaru dari proyek.",
        typeYourMessage: "Ketik pesan Anda...",
        // Learning
        learningCenter: "Pusat Pembelajaran",
        haveAQuestion: "Punya Pertanyaan?",
        askAITutor: "Tanyakan pada AI Tutor kami atau cari tutorial.",
        searchExample: "Contoh: Bagaimana cara mengekspor lagu?",
        aiTutorThinking: "AI Tutor sedang berpikir...",
        aiTutorAnswer: "Jawaban AI Tutor",
        clear: "Bersihkan",
        allTutorials: "Semua Tutorial",
        searchResultsFor: "Hasil untuk \"{{query}}\"",
        level: "Level",
        duration: "Durasi",
        min: "mnt",
        startTutorial: "Mulai Tutorial",
        noTutorialsFound: "Tidak ada tutorial yang ditemukan. Coba tanyakan pada AI Tutor!",
        // Upgrade
        membershipTitle: "Keanggotaan VibeStudio – {{plan}}",
        membershipSubtitle: "Semua alat yang Anda butuhkan untuk sukses dalam musik.",
        emailAddress: "Alamat email",
        emailRequired: "Email wajib diisi.",
        emailInvalid: "Email tidak valid.",
        country: "Negara",
        countryRequired: "Negara wajib diisi.",
        offersOptIn: "VibeStudio Singapore Pte Ltd dapat mengirimi saya pembaruan produk dan penawaran melalui email. Anda dapat memilih untuk tidak ikut kapan saja.",
        annualPlan: "Paket Tahunan",
        monthlyPlan: "Paket Bulanan",
        basicPlan: "Paket Dasar",
        proPlan: "Paket Pro",
        billedAnnually: "(ditagih per tahun)",
        billedMonthly: "(ditagih per bulan)",
        save15: "Hemat 15%",
        mostPopular: "Paling Populer",
        tryFree3Days: "Coba Gratis selama 3 Hari",
        continue: "Lanjutkan »",
        termsAndPolicy: "Dengan melanjutkan, Anda menyetujui <0>Ketentuan Penggunaan</0> kami dan telah membaca <1>Kebijakan Privasi</1> kami.",
        helpAndFAQ: "Bantuan & FAQ",
        // Payment
        secureCheckout: "Checkout Aman",
        orderSummary: "Ringkasan Pesanan",
        plan: "Paket",
        price: "Harga",
        selectPaymentMethod: "Pilih Metode Pembayaran",
        creditCard: "Kartu Kredit",
        bankTransfer: "Transfer Bank",
        eWallet: "E-Wallet",
        cardNumber: "Nomor Kartu",
        expiryDate: "Tanggal Kedaluwarsa (BB/TT)",
        cvc: "CVC",
        cardHolderName: "Nama Pemegang Kartu",
        payNow: "Bayar {{price}}",
        processingPayment: "Memproses Pembayaran...",
        paymentSuccessful: "Pembayaran Berhasil!",
        welcomeToPremium: "Selamat datang di VibeStudio Premium! Semua fitur telah terbuka.",
        backToDashboard: "Kembali ke Dasbor",
        // Lyrics
        lyricsNotes: "Lirik/Catatan",
        lyricsEditorTitle: "Editor Lirik & Catatan",
        lyricsPlaceholder: "Ketik atau tempel lirik Anda di sini...",
        lyricsSavedToast: "Lirik tersimpan.",
        lyricsDisplayActiveToast: "Mode tampilan lirik aktif.",
    }
};

type Locale = 'en' | 'id';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);
const useLocale = () => {
    const context = useContext(LocaleContext);
    if (!context) throw new Error("useLocale must be used within a LocaleProvider");
    return context;
};

// New type for Toasts
interface Toast {
    id: number;
    message: string;
}

// App Context
interface AppContextType {
    activeUser: User | null;
    accounts: User[];
    project: Project;
    playerState: PlayerState;
    view: View;
    purchasingPlan: { plan: string; price: string; } | null;
    audioDevices: MediaDeviceInfo[];
    selectedDeviceId: string | null;
    setSelectedDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
    addUser: (user: User) => void;
    switchAccount: (userId: string) => void;
    logout: () => void;
    updateProject: (updater: (p: Project) => Project) => void;
    setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
    setView: (view: View) => void;
    addToast: (messageKey: string, replacements?: Record<string, string | number>) => void;
    addChatMessage: (content: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    setPurchasingPlan: (plan: { plan: string; price: string; } | null) => void;
    upgradeToPremium: () => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
    locale: Locale;
    setLocale: (locale: Locale) => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

const ToastComponent: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg animate-fade-in-out text-sm text-center">
        {message}
    </div>
);

const AppContent: React.FC = () => {
    const [accounts, setAccounts] = useState<User[]>([]);
    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [history, setHistory] = useState<Project[]>([MOCK_PROJECT]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [purchasingPlan, setPurchasingPlan] = useState<{ plan: string, price: string } | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    const { locale, setLocale, t } = useLocale();

    const project = history[historyIndex];
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const [playerState, setPlayerState] = useState<PlayerState>({
        isPlaying: false,
        isRecording: false,
        currentTime: 0,
        duration: 2 * 60 + 12, // 2:12
    });
    const [view, setView] = useState<View>(View.Splash);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((messageKey: string, replacements?: Record<string, string | number>) => {
        const message = t(messageKey, replacements);
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, [t]);

    // Global Device Management Effect
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            console.warn('MediaDevices API not available.');
            return;
        }

        const updateDeviceList = async () => {
            try {
                // Ensure permissions are granted before enumerating, as labels can be empty otherwise.
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
                
                setAudioDevices(prevDevices => {
                    const findExternalDevice = (dvs: MediaDeviceInfo[]): MediaDeviceInfo | null => {
                        if (!dvs || dvs.length === 0) return null;
                        
                        const externalKeywords = ['irig', 'bm 800', 'headset', 'usb', 'external', 'interface', 'scarlett', 'focusrite', 'codec'];
                        const internalKeywords = ['internal', 'built-in', 'internal microphone', 'mikrofon internal'];

                        // Priority 1: Direct keyword match for an external device.
                        const keywordMatch = dvs.find(d => externalKeywords.some(kw => d.label.toLowerCase().includes(kw)));
                        if (keywordMatch) return keywordMatch;

                        // Priority 2: If there's more than one device, find one that ISN'T clearly internal.
                        if (dvs.length > 1) {
                            const presumedExternal = dvs.find(d => !internalKeywords.some(kw => d.label.toLowerCase().includes(kw)));
                            if (presumedExternal) return presumedExternal;
                        }

                        return null; // No identifiable external device found.
                    };

                    const oldExternal = findExternalDevice(prevDevices);
                    const newExternal = findExternalDevice(audioInputDevices);

                    if (newExternal && (!oldExternal || newExternal.deviceId !== oldExternal.deviceId)) {
                        addToast('deviceConnected');
                        setSelectedDeviceId(newExternal.deviceId);
                    } else if (!newExternal && oldExternal) {
                        addToast('deviceDisconnected');
                        // Fallback to the first available device when the external one is disconnected
                        setSelectedDeviceId(audioInputDevices[0]?.deviceId || null);
                    } else if (!selectedDeviceId && audioInputDevices.length > 0) {
                         // Set initial device (prefer external if available)
                        setSelectedDeviceId(newExternal?.deviceId || audioInputDevices[0].deviceId);
                    }
                    
                    return audioInputDevices;
                });

            } catch (err) {
                console.error("Error checking audio devices:", err);
            }
        };

        updateDeviceList();
        navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);

        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', updateDeviceList);
        };
    }, [addToast]);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('vibeStudio-activeUser');
            const savedAccounts = localStorage.getItem('vibeStudio-accounts');
            if (savedUser && savedAccounts) {
                const user: User = JSON.parse(savedUser);
                const allAccounts: User[] = JSON.parse(savedAccounts);
                setActiveUser(user);
                setAccounts(allAccounts);
                setView(View.Dashboard);
            } else {
                 setView(View.Auth);
            }
        } catch (e) {
            console.error("Failed to load user from localStorage", e);
            localStorage.removeItem('vibeStudio-activeUser');
            localStorage.removeItem('vibeStudio-accounts');
            setView(View.Auth);
        } finally {
            setIsInitialLoad(false);
        }
    }, []);

    useEffect(() => {
        if (isInitialLoad) return;

        const timer = setTimeout(() => {
            if (view === View.Splash) {
                // If there's a user, go to dashboard, otherwise auth
                setView(activeUser ? View.Dashboard : View.Auth);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [view, activeUser, isInitialLoad]);

    const updateProject = (updater: (p: Project) => Project) => {
        const currentProject = history[historyIndex];
        const newProject = updater(currentProject);

        if (JSON.stringify(currentProject) === JSON.stringify(newProject)) {
            return; // No change, do nothing
        }

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newProject);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (canUndo) {
            setHistoryIndex(prev => prev - 1);
        }
    };

    const redo = () => {
        if (canRedo) {
            setHistoryIndex(prev => prev + 1);
        }
    };
    
    const addUser = (userData: User) => {
        const newAccounts = [...accounts];
        const existingAccountIndex = newAccounts.findIndex(acc => acc.id === userData.id);

        if (existingAccountIndex > -1) {
            newAccounts[existingAccountIndex] = userData;
        } else {
            newAccounts.push(userData);
        }

        setAccounts(newAccounts);
        setActiveUser(userData);
        setView(View.Dashboard);
        localStorage.setItem('vibeStudio-activeUser', JSON.stringify(userData));
        localStorage.setItem('vibeStudio-accounts', JSON.stringify(newAccounts));
    };

    const switchAccount = (userId: string) => {
        const accountToSwitch = accounts.find(acc => acc.id === userId);
        if (accountToSwitch) {
            setActiveUser(accountToSwitch);
            addToast('switchedTo', { name: accountToSwitch.name });
            localStorage.setItem('vibeStudio-activeUser', JSON.stringify(accountToSwitch));
        }
    };

    const logout = () => {
        setActiveUser(null);
        setAccounts([]);
        setView(View.Auth);
        localStorage.removeItem('vibeStudio-activeUser');
        localStorage.removeItem('vibeStudio-accounts');
    };

    const upgradeToPremium = () => {
        if (!activeUser) return;
        const updatedUser = { ...activeUser, isPremium: true };
        const updatedAccounts = accounts.map(acc => acc.id === activeUser.id ? updatedUser : acc);
        setActiveUser(updatedUser);
        setAccounts(updatedAccounts);
        localStorage.setItem('vibeStudio-activeUser', JSON.stringify(updatedUser));
        localStorage.setItem('vibeStudio-accounts', JSON.stringify(updatedAccounts));
    };

    const addChatMessage = (content: string) => {
        if (!activeUser) return;
        const newMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            senderId: activeUser.id,
            senderName: activeUser.name,
            content: content,
            timestamp: Date.now(),
        };
        updateProject(p => ({
            ...p,
            chatHistory: [...(p.chatHistory || []), newMessage],
        }));
    };

    const contextValue: AppContextType = {
        activeUser,
        accounts,
        project,
        playerState,
        view,
        purchasingPlan,
        audioDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        addUser,
        switchAccount,
        logout,
        updateProject,
        setPlayerState,
        setView,
        addToast,
        addChatMessage,
        undo,
        redo,
        canUndo,
        canRedo,
        setPurchasingPlan,
        upgradeToPremium,
        t,
        locale,
        setLocale,
    };
    
    const renderContent = () => {
        if (isInitialLoad) {
            return <SplashScreen />;
        }
        // The StudioScreen has its own layout and does not use MainLayout
        if (view === View.Studio) {
            return <StudioScreen />;
        }

        switch (view) {
            case View.Splash:
                return <SplashScreen />;
            case View.Auth:
                return <AuthScreen onLogin={addUser} />;
            case View.Dashboard:
                return <DashboardScreen />;
            case View.Effects:
                return <EffectsScreen />;
            case View.Collaboration:
                 return <CollaborationScreen />;
            case View.Learning:
                 return <LearningCenterScreen />;
            case View.Upgrade:
                return <UpgradeScreen />;
            case View.Payment:
                return <PaymentScreen />;
            default:
                return <DashboardScreen />;
        }
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="h-screen w-screen max-w-md mx-auto bg-black font-sans flex flex-col overflow-hidden relative">
                 <div className="absolute top-5 right-0 left-0 mx-auto w-11/12 z-50 space-y-2 flex flex-col items-center pointer-events-none">
                    {toasts.map(toast => (
                        <ToastComponent key={toast.id} message={toast.message} />
                    ))}
                </div>
                {renderContent()}
            </div>
        </AppContext.Provider>
    );
};

const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>(() => {
        try {
            const savedLocale = localStorage.getItem('vibeStudio-locale');
            return (savedLocale === 'en' || savedLocale === 'id') ? savedLocale : 'id';
        } catch (e) {
            return 'id';
        }
    });

    const setLocale = (newLocale: Locale) => {
        try {
            localStorage.setItem('vibeStudio-locale', newLocale);
        } catch (e) {
            console.error("Failed to save locale to localStorage", e);
        }
        setLocaleState(newLocale);
    };

    const t = useCallback((key: string, replacements: Record<string, string | number> = {}) => {
        let str = translations[locale][key as keyof typeof translations.en] || key;
        for (const placeholder in replacements) {
            str = str.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
        }
        return str;
    }, [locale]);
    
    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
};

// Main App Component
const App: React.FC = () => {
    return (
        <LocaleProvider>
            <AppContent />
        </LocaleProvider>
    );
};

export default App;