import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useAppContext } from '../App';
import type { Track, AudioEffect, VirtualInstrument, Tutorial, TutorialStep, User, AudioClip, ChatMessage } from '../types';
import { View } from '../types';
import { getAiAssistantResponse, getAiGeneratedInstrument, getAiLearningResponse, getAiChordAnalysisFromAudio } from '../services/geminiService';
import { masterAudioEngine } from '../services/audioService';
import { MOCK_INSTRUMENTS, MOCK_TUTORIALS, ALL_MOCK_USERS } from '../constants';

// --- Types for WaveSurfer ---
declare global {
    interface Window {
        WaveSurfer: any;
    }
}

const VibeStudioLogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex items-center space-x-2 ${className}`}>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
            <i className="fa-solid fa-wave-square text-white text-2xl"></i>
        </div>
        <h1 className="text-2xl font-bold tracking-wider">VibeStudio</h1>
    </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, size = 'sm' }) => {
    if (!isOpen) return null;
    
    const sizeClasses = {
        sm: 'max-w-sm',
        lg: 'max-w-lg',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-40" aria-modal="true" role="dialog" onClick={onClose}>
            <div className={`bg-gray-800 rounded-lg p-6 w-11/12 ${sizeClasses[size]} shadow-2xl shadow-purple-900/30 flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold truncate pr-4">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">&times;</button>
                </div>
                <div className="overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const AccountSwitcherModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { activeUser, accounts, switchAccount, addUser, logout, t, locale, setLocale } = useAppContext();
    
    const handleAddAccount = () => {
        // This is a mock implementation. A real app would open a new login flow.
        const otherUser = ALL_MOCK_USERS.find(u => !accounts.some(acc => acc.id === u.id));
        if (otherUser) {
             // Create a new user object to avoid mutation issues
            const newUserToAdd: User = { ...otherUser, id: `u_${Date.now()}` };
            addUser(newUserToAdd);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('switchAccount')}>
            <div className="space-y-3">
                {accounts.map(account => (
                     <div key={account.id} onClick={() => { switchAccount(account.id); onClose(); }}
                        className={`p-3 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors ${activeUser?.id === account.id ? 'bg-purple-600/30' : 'hover:bg-gray-700'}`}>
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
                            {account.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold">{account.name}</p>
                        </div>
                        {activeUser?.id === account.id && <i className="fa-solid fa-check text-green-400 ml-auto"></i>}
                    </div>
                ))}
                
                 <button onClick={handleAddAccount} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-plus"></i>
                    </div>
                    <p className="font-semibold">{t('addAnotherAccount')}</p>
                </button>

                 <div className="pt-3 border-t border-gray-700">
                    <div className="flex bg-gray-700 rounded-md p-1">
                        <button onClick={() => setLocale('en')} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-md transition-colors ${locale === 'en' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                            English
                        </button>
                        <button onClick={() => setLocale('id')} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-md transition-colors ${locale === 'id' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                            Bahasa Indonesia
                        </button>
                    </div>
                </div>

                 <button onClick={() => { logout(); onClose(); }} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 transition-colors mt-2 border-t border-gray-700">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </div>
                    <p className="font-semibold">{t('logOutOfAll')}</p>
                </button>
            </div>
        </Modal>
    )
};


const Header: React.FC = () => {
    const { activeUser, setView, view, undo, redo, canUndo, canRedo, t } = useAppContext();
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const showUndoRedo = view === View.Studio || view === View.Effects;

    return (
        <>
        <header className="p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
            <div>
                 <p className="text-sm text-gray-400">{t('professionalDAW')}</p>
                 <VibeStudioLogo className="text-xl"/>
            </div>
            <div className="flex items-center space-x-4">
                {showUndoRedo && (
                    <>
                        <button 
                            onClick={undo} 
                            disabled={!canUndo} 
                            className="text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed hover:text-white text-xl"
                            aria-label="Undo"
                        >
                            <i className="fa-solid fa-rotate-left"></i>
                        </button>
                        <button 
                            onClick={redo} 
                            disabled={!canRedo} 
                            className="text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed hover:text-white text-xl"
                            aria-label="Redo"
                        >
                            <i className="fa-solid fa-rotate-right"></i>
                        </button>
                    </>
                )}
                {activeUser?.isPremium ? (
                    <div className="bg-yellow-400 text-gray-900 px-3 py-1 text-sm font-bold rounded-md tracking-wider">
                        <i className="fa-solid fa-star mr-1"></i> {t('premium')}
                    </div>
                ) : (
                    <button onClick={() => setView(View.Upgrade)} className="bg-yellow-400 text-gray-900 px-3 py-1 text-sm font-semibold rounded-md hover:bg-yellow-300 transition-colors">
                        <i className="fa-solid fa-star mr-1"></i> {t('upgrade')}
                    </button>
                )}
                <button onClick={() => setIsAccountModalOpen(true)} className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-400">
                    {activeUser?.name.charAt(0)}
                </button>
            </div>
        </header>
        <AccountSwitcherModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
        </>
    );
};

const BottomNav: React.FC = () => {
    const { view, setView, t } = useAppContext();
    const navItems = [
        { id: View.Dashboard, icon: 'fa-house', labelKey: 'home' },
        { id: View.Studio, icon: 'fa-sliders', labelKey: 'studio' },
        { id: View.Effects, icon: 'fa-wand-magic-sparkles', labelKey: 'effects' },
        { id: View.Collaboration, icon: 'fa-users', labelKey: 'collaboration' },
        { id: View.Learning, icon: 'fa-book', labelKey: 'learning' },
    ];

    return (
        <nav className="flex justify-around items-center bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 p-2">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`flex flex-col items-center space-y-1 w-16 transition-colors ${view === item.id ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                >
                    <i className={`fa-solid ${item.icon} text-xl`}></i>
                    <span className="text-xs">{t(item.labelKey)}</span>
                </button>
            ))}
        </nav>
    );
};

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) {
        return '00:00.0';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <>
        <Header />
        <main className="flex-grow overflow-y-auto bg-gray-900 p-4">
            {children}
        </main>
        <BottomNav />
    </>
);

export const SplashScreen: React.FC = () => (
    <div className="h-full w-full flex flex-col justify-center items-center bg-gradient-to-br from-black via-purple-900 to-black animate-pulse">
        <VibeStudioLogo />
        <p className="text-gray-400 mt-2">AI-Powered Mobile DAW</p>
    </div>
);

export const AuthScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const { t } = useAppContext();
    const [isLogin, setIsLogin] = useState(true);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string, fullName?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string, fullName?: string } = {};

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            newErrors.email = t('loginFailedGmail');
        }

        if (password.length < 13) {
            newErrors.password = t('passwordMinLength');
        } else {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
            if (!passwordRegex.test(password)) {
                 newErrors.password = t('passwordComplexity');
            }
        }

        if (!isLogin && !fullName.trim()) {
            newErrors.fullName = "Full name is required.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const userName = isLogin 
                ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : fullName;

            const user: User = {
                id: `u_${email.toLowerCase()}`,
                name: userName,
                email: email.toLowerCase(),
                isPremium: false,
            };
            onLogin(user);
        }
    };

    return (
        <div className="h-full w-full flex flex-col justify-center items-center p-6 bg-gradient-to-br from-black via-gray-900 to-black">
            <VibeStudioLogo className="mb-8" />
            <div className="w-full max-w-sm bg-gray-800/50 p-6 rounded-lg shadow-2xl shadow-purple-900/20">
                <h2 className="text-2xl font-bold text-center mb-2">{isLogin ? t('loginTitle') : t('registerTitle')}</h2>
                <p className="text-center text-gray-400 text-sm mb-6">{isLogin ? t('loginSubtitle') : t('registerSubtitle')}</p>
                
                <form onSubmit={handleSubmit} noValidate>
                    {!isLogin && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="fullname">{t('fullName')}</label>
                            <input type="text" id="fullname" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className={`w-full bg-gray-700 border ${errors.fullName ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">{t('email')}</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@gmail.com" className={`w-full bg-gray-700 border ${errors.email ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">{t('password')}</label>
                        <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className={`w-full bg-gray-700 border ${errors.password ? 'border-red-500' : 'border-gray-600'} text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                        {errors.password ? (
                            <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                        ) : (
                            <p className="text-gray-500 text-xs mt-1">Min 13 chars, with uppercase, lowercase, number & symbol.</p>
                        )}
                    </div>
                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        {isLogin ? t('login') : t('register')}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <button onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-sm text-purple-400 hover:underline">
                        {isLogin ? t('noAccount') : t('hasAccount')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DashboardScreen: React.FC = () => {
    const { activeUser, setView, t, audioDevices } = useAppContext();
    const [isConnectivityModalOpen, setIsConnectivityModalOpen] = useState(false);

    const connectedDeviceStatus = useMemo(() => {
        const findConnectedExternalDevice = (devices: MediaDeviceInfo[]): MediaDeviceInfo | null => {
            if (!devices || devices.length === 0) return null;

            const externalKeywords = ['irig', 'bm 800', 'headset', 'usb', 'external', 'interface', 'scarlett', 'focusrite', 'codec'];
            const internalKeywords = ['internal', 'built-in', 'internal microphone', 'mikrofon internal'];

            // Priority 1: Direct keyword match for an external device.
            const keywordMatch = devices.find(d => externalKeywords.some(kw => d.label.toLowerCase().includes(kw)));
            if (keywordMatch) return keywordMatch;

            // Priority 2: If there's more than one device, find one that ISN'T clearly internal.
            if (devices.length > 1) {
                const presumedExternal = devices.find(d => !internalKeywords.some(kw => d.label.toLowerCase().includes(kw)));
                if (presumedExternal) return presumedExternal;
            }
            
            // If we are here, we couldn't find a clear external device.
            return null;
        };

        const connectedDevice = findConnectedExternalDevice(audioDevices);

        if (connectedDevice) {
            const cleanName = connectedDevice.label.split('(')[0].trim() || 'External Device';
            return {
                title: t('deviceIsConnected', { deviceName: cleanName }),
                description: t('deviceConnectedDesc'),
                isConnected: true,
            };
        }

        return {
            title: t('noDeviceTitle'),
            description: t('noDeviceDesc'),
            isConnected: false,
        };
    }, [audioDevices, t]);

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-lg">
                    <h2 className="text-3xl font-bold">{t('welcomeMessage', { name: activeUser?.name })}</h2>
                    <p className="text-purple-200">{t('letsCreate')}</p>
                </div>
                <button onClick={() => setView(View.Studio)} className="w-full text-left bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition-colors flex items-center justify-between">
                    <div>
                        <p className="font-bold text-lg">{t('startFirstRecording')}</p>
                        <p className="text-sm text-gray-400">{t('startFirstRecordingDesc')}</p>
                    </div>
                    <i className="fa-solid fa-microphone-lines text-2xl text-purple-400"></i>
                </button>

                 <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">{t('connectedDevices')}</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {connectedDeviceStatus.isConnected ? (
                                <i className="fa-solid fa-plug-circle-check text-2xl text-green-500"></i>
                            ) : (
                                <i className="fa-solid fa-plug-circle-xmark text-2xl text-red-500"></i>
                            )}
                            <div>
                                <p className="font-semibold">{connectedDeviceStatus.title}</p>
                                <p className="text-xs text-gray-400">{connectedDeviceStatus.description}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsConnectivityModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
                            {t('howToConnect')}
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-2">{t('recentProjects')}</h3>
                    <button onClick={() => setView(View.Studio)} className="w-full text-left bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-3">
                             <div className="bg-purple-500 p-3 rounded-md">
                                <i className="fa-solid fa-music text-lg"></i>
                            </div>
                            <div>
                                <p className="font-semibold">My New Project</p>
                                <p className="text-xs text-gray-400">{t('highQuality')}</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
             <Modal isOpen={isConnectivityModalOpen} onClose={() => setIsConnectivityModalOpen(false)} title={t('connectExternalDeviceTitle')}>
                 <div className="space-y-4 text-gray-300">
                    <p>{t('connectExternalDeviceDesc')}</p>
                    
                    <div>
                        <h4 className="font-bold text-white mb-2">{t('connectStepsTitle')}</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>{t('connectStep1')}</li>
                            <li>{t('connectStep2')}</li>
                            <li>{t('connectStep3')}</li>
                            <li>{t('connectStep4')}</li>
                        </ul>
                    </div>
                     <div className="flex justify-end mt-4">
                        <button onClick={() => setIsConnectivityModalOpen(false)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md">{t('understand')}</button>
                    </div>
                </div>
            </Modal>
        </MainLayout>
    );
};

// --- START: NEW STUDIO COMPONENTS ---

const StudioHeader: React.FC<{
    projectName: string,
    bpm: number,
    onBpmChange: (bpm: number) => void,
    isPlaying: boolean,
    isRecording: boolean,
    onPlayPause: () => void,
    onStop: () => void,
    onRecord: () => void,
    onSave: () => void,
    onPublish: () => void,
    currentTime: number
}> = ({ projectName, bpm, onBpmChange, isPlaying, isRecording, onPlayPause, onStop, onRecord, onSave, onPublish, currentTime }) => {
    const { setView } = useAppContext();

    const handleBpmInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newBpm = parseInt(e.target.value, 10);
        if (!isNaN(newBpm) && newBpm > 0 && newBpm <= 300) {
            onBpmChange(newBpm);
        }
    };

    return (
        <header className="bg-[#181818] border-b border-black text-white flex-shrink-0 z-30">
            {/* Top Bar */}
            <div className="flex justify-between items-center px-2 py-1 h-10">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setView(View.Dashboard)} className="p-2 hover:bg-gray-700 rounded-md w-8 h-8 flex items-center justify-center"><i className="fa-solid fa-bars"></i></button>
                    <img src="https://i.imgur.com/8QpgyV3.png" alt="BandLab Logo" className="h-5" />
                </div>
                <span className="font-semibold text-sm">{projectName}</span>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Last Saved: Never</span>
                    <button onClick={onSave} className="px-3 py-1 text-xs font-semibold bg-gray-700 hover:bg-gray-600 rounded-md flex items-center space-x-1"><i className="fa-solid fa-save"></i><span>Save</span></button>
                    <button onClick={onPublish} className="px-3 py-1 text-xs font-semibold bg-blue-500 hover:bg-blue-600 rounded-md flex items-center space-x-1"><i className="fa-solid fa-globe"></i><span>Publish</span></button>
                </div>
            </div>
            {/* Transport Bar */}
            <div className="flex justify-between items-center px-2 py-1 bg-black/20 h-12">
                <div className="flex items-center space-x-4">
                    <button className="p-2 hover:bg-gray-700 rounded-md"><i className="fa-solid fa-rotate-left"></i></button>
                    <button className="p-2 hover:bg-gray-700 rounded-md"><i className="fa-solid fa-rotate-right"></i></button>
                    <div className="flex items-center space-x-2 text-sm">
                        <label htmlFor="bpm" className="text-gray-400">BPM</label>
                        <input type="number" id="bpm" value={bpm} onChange={handleBpmInput} className="bg-gray-700 w-14 text-center rounded-md px-1 py-0.5"/>
                    </div>
                     <div className="text-sm">4 / 4</div>
                     <div className="text-sm bg-gray-700 rounded-md px-3 py-0.5">Key</div>
                </div>
                <div className="flex items-center space-x-2 text-xl">
                    <button onClick={onStop} className="p-2"><i className="fa-solid fa-backward-step"></i></button>
                    <button onClick={onPlayPause} className={`w-8 h-8 flex items-center justify-center rounded-md text-2xl`}>
                        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <button onClick={onRecord} className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'hover:bg-gray-700'}`}>
                        <i className="fa-solid fa-circle"></i>
                    </button>
                     <div className="flex items-center space-x-2">
                        {isRecording && (
                            <div className="flex items-center space-x-1 text-red-500 animate-blink">
                                <i className="fa-solid fa-circle text-xs"></i>
                                <span className="font-bold text-sm">REC</span>
                            </div>
                        )}
                        <span className="font-mono text-lg">{formatTime(currentTime)}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span>Mastering</span>
                    <i className="fa-solid fa-chevron-right"></i>
                    <i className="fa-solid fa-volume-high"></i>
                    <input type="range" className="w-24" />
                    <button className="px-3 py-1 text-sm font-semibold bg-blue-500 rounded-md">Invite</button>
                </div>
            </div>
        </header>
    );
};

const AddTrackPanel: React.FC<{ onAddTrack: (type: string, options: { name: string, icon: string }) => void, onClose: () => void }> = ({ onAddTrack, onClose }) => {
    const trackTypes = [
        { type: 'Voice/Audio', name: 'Voice/Audio', description: 'Record with AutoPitch + Fx', icon: 'fa-microphone', color: 'bg-red-500' },
        { type: 'VirtualInstrument', name: 'Virtual Instruments', description: 'Record kits, keys and more', icon: 'fa-border-all', color: 'bg-green-500' },
        { type: 'DrumMachine', name: 'Drum Machine', description: 'Create beats in seconds', icon: 'fa-table-cells', color: 'bg-yellow-500' },
        { type: 'Sampler', name: 'Sampler', description: 'Turn any sound into an instrument', icon: 'fa-wave-square', color: 'bg-purple-500' },
        { type: 'Guitar', name: 'Guitar', description: 'Jam with Amps + Fx', icon: 'fa-guitar', color: 'bg-cyan-500' },
        { type: 'Bass', name: 'Bass', description: 'Find your signature tone', icon: 'fa-water', color: 'bg-blue-500' },
    ];

    const handleSelect = (type: string, name: string, icon: string) => {
        onAddTrack(type, { name, icon });
    };

    return (
        <div className="w-1/3 max-w-[200px] bg-[#181818] border-r border-black flex-shrink-0 p-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">New Track</h3>
                 <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="space-y-2">
                {trackTypes.map(track => (
                    <button key={track.type} onClick={() => handleSelect(track.type, track.name, track.icon)} className="w-full bg-gray-800 hover:bg-gray-700 p-2 rounded-md flex items-center space-x-3 text-left transition-colors">
                        <div className={`w-8 h-8 ${track.color} rounded-md flex items-center justify-center`}>
                           <i className={`fa-solid ${track.icon}`}></i>
                        </div>
                        <div>
                             <p className="font-semibold text-sm">{track.name}</p>
                             <p className="text-xs text-gray-400">{track.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const TrackInfoPanel: React.FC<{ 
    tracks: Track[], 
    isRecording: boolean,
    onAddTrackClick: () => void,
    onUpdateTrack: (track: Track) => void,
    selectedTrackId: number | null, 
    onSelectTrack: (id: number) => void,
    armedTrackId: number | null,
    onArmTrack: (id: number) => void,
    onOpenContextMenu: (event: React.MouseEvent, trackId: number) => void,
    inputGain: number,
    onInputGainChange: (gain: number) => void,
}> = ({ tracks, isRecording, onAddTrackClick, onUpdateTrack, selectedTrackId, onSelectTrack, armedTrackId, onArmTrack, onOpenContextMenu, inputGain, onInputGainChange }) => {
    const { t } = useAppContext();
    const isAnyTrackArmed = armedTrackId !== null;

    return (
        <div className="w-1/3 max-w-[200px] bg-[#181818] border-r border-black flex-shrink-0 overflow-y-auto">
             <button onClick={onAddTrackClick} className="w-full flex items-center justify-center space-x-2 text-left py-2 px-3 border-b border-black text-sm hover:bg-gray-700">
                <i className="fa-solid fa-plus"></i>
                <span>Add Track</span>
             </button>
             {tracks.map(track => {
                const isArmed = armedTrackId === track.id;
                const isArmedAndRecording = isRecording && isArmed;
                const baseHeight = isArmed ? '124px' : '100px';

                return (
                    <div 
                        key={track.id} 
                        onClick={() => onSelectTrack(track.id)} 
                        className={`p-2 border-b border-black cursor-pointer transition-all duration-200 ease-in-out relative ${isArmedAndRecording ? 'animate-pulse-red-bg' : (track.id === selectedTrackId ? 'bg-gray-700' : 'hover:bg-gray-700/50')}`} 
                        style={{ height: baseHeight }}
                    >
                        <div className="absolute top-2 left-1 h-full w-1 rounded-full" style={{ backgroundColor: track.color ?? 'transparent' }}></div>
                        <div className="flex items-center space-x-2 mb-1">
                             <i className={`fa-solid ${track.icon} text-gray-400 text-sm`}></i>
                             <span className="text-sm font-semibold truncate flex-grow">{track.name}</span>
                             <button onClick={(e) => onOpenContextMenu(e, track.id)} className="text-gray-400 hover:text-white px-1 rounded-sm z-10">
                                <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                        </div>
                        <div className="flex items-center justify-start space-x-2 text-xs mb-1">
                            <button onClick={(e) => { e.stopPropagation(); onArmTrack(track.id); }} className={`w-6 h-6 rounded-full font-bold flex items-center justify-center border ${isArmed ? 'bg-red-500 border-red-300 text-white animate-pulse' : 'bg-gray-800 border-gray-600 hover:bg-gray-600'}`}>R</button>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateTrack({ ...track, isMuted: !track.isMuted }); }} aria-pressed={track.isMuted} className={`w-6 h-6 rounded font-bold flex items-center justify-center ${track.isMuted ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-600'}`}>M</button>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateTrack({ ...track, isSolo: !track.isSolo }); }} aria-pressed={track.isSolo} className={`w-6 h-6 rounded font-bold flex items-center justify-center ${track.isSolo ? 'bg-yellow-500 text-black' : 'bg-gray-800 hover:bg-gray-600'}`}>S</button>
                        </div>
                         <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <span className="font-bold w-4 text-center text-xs">V</span>
                            <input type="range" min="0" max="100" value={track.volume} onChange={e => onUpdateTrack({ ...track, volume: +e.target.value })} className="w-full" aria-label="Volume" />
                        </div>
                         <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <span className="font-bold w-4 text-center text-xs">P</span>
                            <input type="range" min="-100" max="100" value={track.pan} onChange={e => onUpdateTrack({ ...track, pan: +e.target.value })} className="w-full" aria-label="Pan" />
                        </div>
                        {isArmed && (
                            <div className="flex items-center space-x-1 text-xs text-red-400 mt-1 animate-slide-in-fade">
                                <span className="font-bold w-4 text-center text-xs">G</span>
                                <input 
                                    type="range" 
                                    min="0" max="2" 
                                    step="0.01" 
                                    value={inputGain} 
                                    onChange={e => onInputGainChange(+e.target.value)} 
                                    className="w-full" 
                                    aria-label={t('gain')} 
                                />
                            </div>
                        )}
                    </div>
                )}
            )}
        </div>
    );
};

const ClipComponent: React.FC<{ 
    clip: AudioClip, 
    pixelsPerSecond: number,
    isSelected: boolean,
    onSelect: (clipId: string) => void,
    onUpdate: (clip: AudioClip) => void,
    onDelete: (clipId: string) => void,
}> = memo(({ clip, pixelsPerSecond, isSelected, onSelect, onUpdate, onDelete }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{ type: 'move' | 'resize-start' | 'resize-end' | 'gain', startX: number, startY: number, originalClip: AudioClip } | null>(null);

    useEffect(() => {
        let wavesurfer: any = null;
        if (waveformRef.current && window.WaveSurfer && clip.url) {
            wavesurfer = window.WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#a78bfa',
                progressColor: '#8b5cf6',
                cursorWidth: 0,
                barWidth: 2,
                barRadius: 2,
                height: 64,
                interact: false,
            });
            wavesurfer.load(clip.url);
        }
        return () => wavesurfer?.destroy();
    }, [clip.url]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: 'move' | 'resize-start' | 'resize-end' | 'gain') => {
        e.stopPropagation();
        onSelect(clip.id);
        dragStateRef.current = { type, startX: e.clientX, startY: e.clientY, originalClip: clip };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragStateRef.current) return;
        
        const { type, startX, startY, originalClip } = dragStateRef.current;
        const deltaX = e.clientX - startX;
        const deltaTime = deltaX / pixelsPerSecond;

        let newClip = { ...originalClip };

        if (type === 'move') {
            newClip.startTime = Math.max(0, originalClip.startTime + deltaTime);
        } else if (type === 'resize-end') {
            newClip.duration = Math.max(0.1, originalClip.duration + deltaTime);
        } else if (type === 'resize-start') {
            const newStartTime = originalClip.startTime + deltaTime;
            const newDuration = originalClip.duration - deltaTime;
            if (newStartTime >= 0 && newDuration >= 0.1) {
                newClip.startTime = newStartTime;
                newClip.duration = newDuration;
            }
        } else if (type === 'gain') {
            const deltaY = startY - e.clientY; // Invert Y
            const gainChange = deltaY * 0.01;
            newClip.gain = Math.max(0, Math.min(2, (originalClip.gain ?? 1) + gainChange));
        }
        
        // Live update for visual feedback
        onUpdate(newClip);
    };

    const handleMouseUp = () => {
        // Final update happens in mouse move, here we just clean up
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const style = {
        left: `${clip.startTime * pixelsPerSecond}px`,
        width: `${clip.duration * pixelsPerSecond}px`,
    };
    
    const gainPercentage = (((clip.gain ?? 1) / 2) * 100);

    return (
        <div 
            style={style} 
            className={`absolute top-1/2 -translate-y-1/2 h-16 bg-purple-500/30 rounded-md border-l-2 border-purple-400 overflow-hidden group transition-shadow z-10 ${isSelected ? 'shadow-lg shadow-white/50 ring-2 ring-white z-20' : ''}`}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
            <div ref={waveformRef} className="w-full h-full pointer-events-none"></div>
            <span className="absolute top-1 left-2 text-xs font-semibold text-white truncate pointer-events-none">{clip.name}</span>
             {isSelected && (
                <>
                    <div className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize" onMouseDown={e => handleMouseDown(e, 'resize-start')}></div>
                    <div className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize" onMouseDown={e => handleMouseDown(e, 'resize-end')}></div>
                    <div className="absolute left-2 right-2 h-px bg-white/50 top-1/2 pointer-events-none"></div>
                    <div 
                        className="absolute h-3 w-3 bg-white rounded-full -translate-x-1/2 cursor-ns-resize" 
                        style={{ left: '50%', top: `${100 - gainPercentage}%`, transform: `translate(-50%, -50%)` }}
                        onMouseDown={e => handleMouseDown(e, 'gain')}
                    ></div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(clip.id);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-500 rounded-full text-white flex items-center justify-center z-30 transition-transform hover:scale-110"
                        aria-label="Delete clip"
                    >
                        <i className="fa-solid fa-trash fa-xs"></i>
                    </button>
                </>
            )}
        </div>
    );
});

const TimelineRuler: React.FC<{ bpm: number, pixelsPerSecond: number, totalDuration: number, scrollLeft: number }> = memo(({ bpm, pixelsPerSecond, totalDuration, scrollLeft }) => {
    const rulerRef = useRef<HTMLDivElement>(null);
    const secondsPerBar = (60 / bpm) * 4;
    const pixelsPerBar = secondsPerBar * pixelsPerSecond;
    const totalBars = Math.ceil(totalDuration / secondsPerBar);

    return (
        <div ref={rulerRef} className="relative h-full" style={{ width: `${totalDuration * pixelsPerSecond}px` }}>
            {Array.from({ length: totalBars }, (_, i) => {
                const barNumber = i + 1;
                const isMajor = barNumber % 2 !== 0; // Highlight odd numbers
                return (
                    <div key={i} style={{ left: `${i * pixelsPerBar}px` }} className={`absolute top-0 h-full w-px ${isMajor ? 'bg-gray-500' : 'bg-gray-700'}`}>
                        {isMajor && <span className={`absolute top-0 left-1 text-sm ${barNumber === 1 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{barNumber}</span>}
                    </div>
                )
            })}
        </div>
    );
});

const TimelinePanel: React.FC<{ 
    project: any, 
    isRecording: boolean,
    onUpdateClip: (clip: AudioClip) => void, 
    onDeleteClip: (clipId: string) => void,
    pixelsPerSecond: number, 
    playheadPosition: number, 
    totalDuration: number,
    selectedClipId: string | null,
    onSelectClip: (clipId: string | null) => void,
}> = ({ project, isRecording, onUpdateClip, onDeleteClip, pixelsPerSecond, playheadPosition, totalDuration, selectedClipId, onSelectClip }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    const secondsPerBar = (60 / project.bpm) * 4;
    const pixelsPerBar = secondsPerBar * pixelsPerSecond;
    
    return (
        <div 
            ref={timelineContainerRef} 
            onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)} 
            className={`flex-grow overflow-x-auto overflow-y-hidden timeline-panel relative bg-[#282828] transition-all duration-300 ${isRecording ? 'ring-2 ring-red-500 ring-inset' : ''}`} 
            onClick={() => onSelectClip(null)}
        >
            <div className="h-6 bg-[#181818] border-b border-black sticky top-0 z-20">
                <TimelineRuler bpm={project.bpm} pixelsPerSecond={pixelsPerSecond} totalDuration={totalDuration} scrollLeft={scrollLeft} />
            </div>
            {project.tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <i className="fa-solid fa-music text-3xl mb-2"></i>
                    <p>Drop a loop or an audio/MIDI/video file</p>
                </div>
            ) : (
                <div className="relative" style={{ height: `${project.tracks.length * 100}px`, width: `${totalDuration * pixelsPerSecond}px` }}>
                    <div className="timeline-grid" style={{ backgroundSize: `${pixelsPerBar}px 100%`, backgroundImage: 'linear-gradient(to right, #374151 1px, transparent 1px)' }}></div>
                    {project.tracks.map((track: Track) => (
                        <div key={track.id} className="relative border-b border-black/50" style={{ height: '100px' }}>
                            {track.clips.map(clip => (
                                <ClipComponent 
                                    key={clip.id} 
                                    clip={clip} 
                                    pixelsPerSecond={pixelsPerSecond} 
                                    isSelected={clip.id === selectedClipId}
                                    onSelect={onSelectClip}
                                    onUpdate={onUpdateClip}
                                    onDelete={onDeleteClip}
                                />
                            ))}
                        </div>
                    ))}
                    <div className="absolute top-0 w-0.5 bg-white h-full z-10 pointer-events-none" style={{ left: `${playheadPosition * pixelsPerSecond}px` }}>
                        <div className="absolute -top-4 -left-1 w-3 h-3 bg-white transform rotate-45"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StudioFooter: React.FC<{ 
    selectedTrack: Track | null, 
    selectedClip: AudioClip | null,
    onUpdateClip: (clip: AudioClip) => void,
    onDeleteClip: () => void,
    onToggleLyricsEditor: () => void,
}> = ({ selectedTrack, selectedClip, onUpdateClip, onDeleteClip, onToggleLyricsEditor }) => {
    const { t } = useAppContext();
    const [activeTab, setActiveTab] = useState('Editor');
    
    const handleAddEffectToClip = (effectName: AudioEffect['name']) => {
        if (!selectedClip) return;
        const newEffect: AudioEffect = {
            id: `e_${Date.now()}`,
            name: effectName,
            params: { mix: 50 },
            isEnabled: true,
        };
        onUpdateClip({ ...selectedClip, effects: [...selectedClip.effects, newEffect] });
    };

    if (selectedClip) {
        return (
            <div className="bg-[#181818] border-t border-black flex-shrink-0 h-16 flex items-center px-4 space-x-4">
                <span className="font-bold text-sm truncate">Clip: {selectedClip.name}</span>
                <div className="flex-grow"></div>
                <div className="flex items-center space-x-2">
                    <label className="text-xs">Gain:</label>
                    <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.01" 
                        value={selectedClip.gain ?? 1} 
                        onChange={e => onUpdateClip({...selectedClip, gain: +e.target.value})}
                        className="w-24"
                    />
                    <span className="text-xs w-10 text-right">{((selectedClip.gain ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <button onClick={() => handleAddEffectToClip('Compressor')} className="px-3 py-1 text-xs font-semibold rounded-md bg-purple-700 hover:bg-purple-600">
                    <i className="fa-solid fa-plus mr-1"></i> Add FX
                </button>
                <button onClick={onDeleteClip} className="px-3 py-1 text-xs font-semibold rounded-md bg-red-700 hover:bg-red-600 flex items-center space-x-2">
                    <i className="fa-solid fa-trash"></i>
                    <span>{t('delete')}</span>
                </button>
            </div>
        );
    }
    
    // Default footer when no clip is selected
    const tabs = ["AutoPitch™", "Fx", "Effects", "Editor"];
    return (
        <div className="bg-[#181818] border-t border-black flex-shrink-0 h-16 flex items-center px-4 space-x-4">
             {tabs.map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-sm font-semibold rounded-md ${activeTab === tab ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                     {tab}
                 </button>
             ))}
             <div className="flex-grow"></div>
             <div className="flex space-x-4 text-gray-400">
                <button onClick={onToggleLyricsEditor} className="hover:text-white">{t('lyricsNotes')}</button>
                <button className="hover:text-white">BandLab Sounds</button>
                <button className="hover:text-white">Shortcuts</button>
             </div>
        </div>
    );
};

const TrackContextMenu: React.FC<{
    x: number;
    y: number;
    track: Track;
    onClose: () => void;
    onDelete: (trackId: number) => void;
    onRename: (trackId: number, oldName: string) => void;
    onDuplicate: (trackId: number) => void;
    onSetColor: (trackId: number, color: string) => void;
    onMoveUp: (trackId: number) => void;
    onMoveDown: (trackId: number) => void;
}> = ({ x, y, track, onClose, onRename, onDuplicate, onSetColor, onDelete, onMoveUp, onMoveDown }) => {
    const { t } = useAppContext();
    const menuRef = useRef<HTMLDivElement>(null);
    const colors = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#c084fc']; // red, orange, yellow, green, teal, blue, purple

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    
    const createAction = (action: () => void, closeMenu = true) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
        if (closeMenu) {
            onClose();
        }
    };

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 bg-[#282828] rounded-md shadow-2xl p-1 w-56 text-sm text-white animate-slide-in-fade"
        >
            <button onClick={createAction(() => onRename(track.id, track.name))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('rename')}</span>
            </button>
             <button onClick={createAction(() => alert('Premium feature!'))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('createGroup')}</span>
                <i className="fa-solid fa-crown text-yellow-500"></i>
            </button>
            <button disabled className="w-full text-left px-3 py-2 rounded-md flex justify-between items-center opacity-50 cursor-not-allowed">
                <span>{t('freeze')}</span>
            </button>

            <div className="border-t border-gray-700 my-1"></div>

            <div className="w-full text-left px-3 py-2 flex justify-between items-center">
                <span>{t('changeColor')}</span>
                <div className="flex space-x-1.5">
                    {colors.map(color => (
                        <button key={color} onClick={createAction(() => onSetColor(track.id, color), false)} className="w-5 h-5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: color }}>
                             {track.color === color && <i className="fa-solid fa-check text-xs text-black/60"></i>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-700 my-1"></div>

             <button onClick={createAction(() => alert('Multitrack enabled!'))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('enableMultitrack')}</span>
            </button>
            <button onClick={createAction(() => onMoveUp(track.id))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('moveUp')}</span>
            </button>
             <button onClick={createAction(() => onMoveDown(track.id))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('moveDown')}</span>
            </button>
             <button onClick={createAction(() => alert('Opening file browser...'))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('importFromDisk')}</span>
            </button>
            <button disabled className="w-full text-left px-3 py-2 rounded-md flex justify-between items-center opacity-50 cursor-not-allowed">
                <span>{t('exportAsAudio')}</span>
            </button>
            
            <div className="border-t border-gray-700 my-1"></div>

             <button onClick={createAction(() => onDuplicate(track.id))} className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md flex justify-between items-center">
                <span>{t('duplicate')}</span>
                <span className="text-gray-400 text-xs">Shift + D</span>
            </button>
            <button onClick={createAction(() => onDelete(track.id))} className="w-full text-left px-3 py-2 hover:bg-red-800/50 rounded-md text-red-400 flex justify-between items-center">
                <span>{t('delete')}</span>
                <span className="text-red-400/70 text-xs flex items-center gap-1">
                    <span>Shift +</span>
                    <i className="fa-solid fa-delete-left"></i>
                </span>
            </button>
        </div>
    );
};

// --- New Lyrics Components ---
const LyricsEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lyrics: string;
    onLyricsChange: (lyrics: string) => void;
}> = ({ isOpen, onClose, lyrics, onLyricsChange }) => {
    const { t } = useAppContext();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('lyricsEditorTitle')} size="lg">
            <div className="flex flex-col h-[60vh]">
                <textarea
                    value={lyrics}
                    onChange={(e) => onLyricsChange(e.target.value)}
                    placeholder={t('lyricsPlaceholder')}
                    className="w-full h-full bg-gray-900 border border-gray-600 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-base leading-relaxed"
                    aria-label="Lyrics editor"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md">
                        {t('save')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const LyricsOverlay: React.FC<{ isVisible: boolean; lyrics: string; onClose: () => void }> = ({ isVisible, lyrics, onClose }) => {
    if (!isVisible) return null;

    return (
        <div className="absolute inset-x-0 top-24 bottom-16 bg-black/80 backdrop-blur-sm z-30 p-4 flex flex-col animate-slide-in-fade">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-lg text-purple-300">Lyrics</h3>
                 <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                <pre className="text-white whitespace-pre-wrap text-lg leading-relaxed font-sans">
                    {lyrics || 'No lyrics entered yet.'}
                </pre>
            </div>
        </div>
    );
};


// --- END: NEW STUDIO COMPONENTS ---

export const StudioScreen: React.FC = () => {
    const { project, updateProject, playerState, setPlayerState, selectedDeviceId, addToast, t } = useAppContext();
    const [showAddTrackPanel, setShowAddTrackPanel] = useState(project.tracks.length === 0);
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
    const [armedTrackId, setArmedTrackId] = useState<number | null>(null);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [pixelsPerSecond, setPixelsPerSecond] = useState(50); // Represents zoom level
    const [bpm, setBpm] = useState(project.bpm);
    const [pendingRecording, setPendingRecording] = useState<{ url: string, startTime: number, duration: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, trackId: number } | null>(null);
    const [inputGain, setInputGain] = useState(1); // Default gain is 1 (100%)
    const [isLyricsEditorOpen, setIsLyricsEditorOpen] = useState(false);
    const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const prevTrackIdsRef = useRef<number[]>([]);

    useEffect(() => {
        masterAudioEngine.loadProject(project);
    }, [project]);
    
    // Effect for smart track selection
    useEffect(() => {
        const currentTrackIds = project.tracks.map(t => t.id);
        const newTrackId = currentTrackIds.find(id => !prevTrackIdsRef.current.includes(id));

        if (newTrackId) {
            // A new track was added, select it
            setSelectedTrackId(newTrackId);
            setArmedTrackId(newTrackId); // Also arm it for convenience
        } else if (currentTrackIds.length > 0 && selectedTrackId && !currentTrackIds.includes(selectedTrackId)) {
            // The previously selected track was deleted, select the last one
            setSelectedTrackId(currentTrackIds[currentTrackIds.length - 1]);
        } else if (currentTrackIds.length === 0) {
            // All tracks were deleted
            setSelectedTrackId(null);
            setArmedTrackId(null);
        }

        prevTrackIdsRef.current = currentTrackIds;

    }, [project.tracks, selectedTrackId]);


    const updatePlayhead = useCallback(() => {
        const newTime = masterAudioEngine.getCurrentTime();
        setPlayerState(ps => ({...ps, currentTime: newTime }));
        if (masterAudioEngine.getIsPlaying()) {
            animationFrameRef.current = requestAnimationFrame(updatePlayhead);
        } else {
             setPlayerState(ps => ({ ...ps, isPlaying: false, isRecording: masterAudioEngine.isRecording() }));
        }
    }, [setPlayerState]);
    
    useEffect(() => {
        const engine = masterAudioEngine;
        if (playerState.isPlaying && !engine.getIsPlaying()) {
            engine.play(project, playerState.currentTime);
            animationFrameRef.current = requestAnimationFrame(updatePlayhead);
        } else if (!playerState.isPlaying && engine.getIsPlaying()) {
            engine.stop(project);
            if(animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setPlayerState(ps => ({...ps, currentTime: engine.getCurrentTime()}));
        }
        
        return () => {
            if(animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [playerState.isPlaying, project, updatePlayhead, setPlayerState]);
    
    const handleRecord = async () => {
        if (playerState.isRecording) { // Currently recording, so stop
            const blob = await masterAudioEngine.stopRecording(project);
            setPlayerState(ps => ({ ...ps, isRecording: false, isPlaying: false }));
            setShowLyricsOverlay(false);

            if (blob) {
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.onloadedmetadata = () => {
                    if (audio.duration < 0.5) {
                        addToast('recordingTooShort');
                        URL.revokeObjectURL(url);
                        return;
                    }
                    setPendingRecording({
                        url: url,
                        startTime: recordingStartTimeRef.current,
                        duration: audio.duration,
                    });
                };
                 audio.onerror = () => {
                    addToast('playbackFailed');
                    URL.revokeObjectURL(url);
                };
            }
        } else { // Not recording, so start
            if (!armedTrackId) {
                alert("Please arm a track to record.");
                return;
            }
            if (!selectedDeviceId) {
                alert("No audio input device connected.");
                return;
            }

            const success = await masterAudioEngine.startRecording(selectedDeviceId);
            if (success) {
                masterAudioEngine.setInputGain(inputGain); // Ensure gain is set before recording starts
                recordingStartTimeRef.current = playerState.currentTime;
                setPlayerState(ps => ({ ...ps, isPlaying: true, isRecording: true }));
                if (project.lyrics && project.lyrics.trim()) {
                    setShowLyricsOverlay(true);
                    addToast('lyricsDisplayActiveToast');
                }
            } else {
                addToast('recordingFailed');
            }
        }
    };
    
    const handleSaveRecording = () => {
        if (!pendingRecording || !armedTrackId) return;
        const newClip: AudioClip = {
            id: `c_${Date.now()}`,
            name: `Rec ${new Date().toLocaleTimeString()}`,
            url: pendingRecording.url,
            startTime: pendingRecording.startTime,
            duration: pendingRecording.duration,
            gain: 1,
            effects: [],
        };
        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => t.id === armedTrackId ? {...t, clips: [...t.clips, newClip]} : t)
        }));
        setPendingRecording(null);
    };

    const handleDiscardRecording = () => {
        if (!pendingRecording) return;
        URL.revokeObjectURL(pendingRecording.url);
        setPendingRecording(null);
    };

    const handlePlayPause = useCallback(async () => {
        setPlayerState(ps => ({ ...ps, isPlaying: !ps.isPlaying }));
    }, [setPlayerState]);

    const handleStop = useCallback(() => {
        masterAudioEngine.stop(project);
        setPlayerState(ps => ({ ...ps, isPlaying: false, currentTime: 0, isRecording: false }));
        setShowLyricsOverlay(false);
    }, [project, setPlayerState]);

    const updateTrack = (updatedTrack: Track) => {
        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t)
        }));
        masterAudioEngine.updateTrackVolume(updatedTrack.id, updatedTrack.volume);
        masterAudioEngine.updateTrackPan(updatedTrack.id, updatedTrack.pan);
    };
    
    const addTrack = (type: string, {name, icon}: {name: string, icon: string}) => {
        updateProject(p => {
            const newTrackId = p.tracks.length > 0 ? Math.max(...p.tracks.map(t => t.id)) + 1 : 1;
            const newTrack: Track = {
                id: newTrackId,
                name: `${name}`,
                instrument: name,
                icon: icon,
                color: '#9333ea',
                volume: 80,
                pan: 0,
                gain: 50,
                isMuted: false,
                isSolo: false,
                effects: [],
                clips: [],
            };
            return { ...p, tracks: [...p.tracks, newTrack] };
        });
        setShowAddTrackPanel(false);
    };
        
    const updateClip = useCallback((updatedClip: AudioClip) => {
         updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => ({
                ...t,
                clips: t.clips.map(c => c.id === updatedClip.id ? updatedClip : c)
            }))
        }));
    }, [updateProject]);
    
    const handleDeleteClip = (clipIdToDelete: string) => {
        if (!clipIdToDelete) return;

        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(track => ({
                ...track,
                clips: track.clips.filter(c => c.id !== clipIdToDelete)
            }))
        }));
        
        if (selectedClipId === clipIdToDelete) {
            setSelectedClipId(null);
        }
    };
    
    const handleBpmChange = (newBpm: number) => {
        setBpm(newBpm);
        updateProject(p => ({...p, bpm: newBpm}));
    };
    
    const handleInputGainChange = (gain: number) => {
        setInputGain(gain);
        masterAudioEngine.setInputGain(gain);
    };

    const handleLyricsChange = (newLyrics: string) => {
        updateProject(p => ({ ...p, lyrics: newLyrics }));
    };

    const handleCloseLyricsEditor = () => {
        setIsLyricsEditorOpen(false);
        if (project.lyrics && project.lyrics.trim().length > 0) {
            addToast('lyricsSavedToast');
        }
    };
    
    const totalDuration = useMemo(() => {
        const lastClipEnd = project.tracks.reduce((max, track) => {
            const trackMax = track.clips.reduce((clipMax, clip) => Math.max(clipMax, clip.startTime + clip.duration), 0);
            return Math.max(max, trackMax);
        }, 0);
        // Ensure timeline is at least 8 bars long
        const minDuration = (60 / bpm) * 4 * 8;
        return Math.max(lastClipEnd, minDuration);
    }, [project.tracks, bpm]);
    
    // --- Track Context Menu Handlers ---
    const handleOpenContextMenu = (event: React.MouseEvent, trackId: number) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setContextMenu({
            x: rect.right - 220, // Position menu to the left of the button
            y: rect.top,
            trackId
        });
    };

    const handleDeleteTrack = (trackId: number) => {
        updateProject(p => ({ ...p, tracks: p.tracks.filter(t => t.id !== trackId) }));
    };

    const handleRenameTrack = (trackId: number, oldName: string) => {
        const newName = prompt("Enter new track name:", oldName);
        if (newName && newName.trim() !== "") {
            updateProject(p => ({
                ...p,
                tracks: p.tracks.map(t => t.id === trackId ? { ...t, name: newName.trim() } : t)
            }));
        }
    };

    const handleDuplicateTrack = (trackId: number) => {
        const trackToDuplicate = project.tracks.find(t => t.id === trackId);
        if (!trackToDuplicate) return;
        
        updateProject(p => {
            const newTrackId = p.tracks.length > 0 ? Math.max(...p.tracks.map(t => t.id)) + 1 : 1;
            const newTrack: Track = {
                ...trackToDuplicate,
                id: newTrackId,
                name: `${trackToDuplicate.name} (Copy)`,
                // Give copied clips new unique IDs
                clips: trackToDuplicate.clips.map(c => ({...c, id: `c_${Date.now()}_${Math.random()}`}))
            };
            const originalIndex = p.tracks.findIndex(t => t.id === trackId);
            const newTracks = [...p.tracks];
            newTracks.splice(originalIndex + 1, 0, newTrack);
            return { ...p, tracks: newTracks };
        });
    };
    
    const handleSetTrackColor = (trackId: number, color: string) => {
        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => t.id === trackId ? { ...t, color } : t)
        }));
    };
    
    const handleMoveTrack = (trackId: number, direction: 'up' | 'down') => {
        updateProject(p => {
            const tracks = [...p.tracks];
            const fromIndex = tracks.findIndex(t => t.id === trackId);
            if (fromIndex === -1) return p;

            const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
            if (toIndex < 0 || toIndex >= tracks.length) return p;

            const [movedTrack] = tracks.splice(fromIndex, 1);
            tracks.splice(toIndex, 0, movedTrack);

            return { ...p, tracks };
        });
    };

    const selectedTrackForMenu = project.tracks.find(t => t.id === contextMenu?.trackId) || null;
    const selectedTrack = project.tracks.find(t => t.id === selectedTrackId) || null;
    const selectedClip = project.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId) || null;

    return (
        <div className="h-screen w-screen max-w-md mx-auto bg-black font-sans flex flex-col overflow-hidden relative">
            <StudioHeader 
                projectName={project.name}
                bpm={bpm}
                onBpmChange={handleBpmChange}
                isPlaying={playerState.isPlaying}
                isRecording={playerState.isRecording}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onRecord={handleRecord}
                onSave={() => addToast('projectSaved')}
                onPublish={() => addToast('projectPublished')}
                currentTime={playerState.currentTime}
            />
            <div className="flex-grow flex overflow-hidden">
                 { (showAddTrackPanel || project.tracks.length === 0) ? (
                    <AddTrackPanel onAddTrack={addTrack} onClose={() => setShowAddTrackPanel(false)} />
                 ) : (
                     <TrackInfoPanel 
                        tracks={project.tracks} 
                        isRecording={playerState.isRecording}
                        onAddTrackClick={() => setShowAddTrackPanel(true)}
                        onUpdateTrack={updateTrack}
                        selectedTrackId={selectedTrackId}
                        onSelectTrack={setSelectedTrackId}
                        armedTrackId={armedTrackId}
                        onArmTrack={setArmedTrackId}
                        onOpenContextMenu={handleOpenContextMenu}
                        inputGain={inputGain}
                        onInputGainChange={handleInputGainChange}
                     />
                 )}
                <TimelinePanel 
                    project={project}
                    isRecording={playerState.isRecording}
                    onUpdateClip={updateClip}
                    onDeleteClip={handleDeleteClip}
                    pixelsPerSecond={pixelsPerSecond}
                    playheadPosition={playerState.currentTime}
                    totalDuration={totalDuration}
                    selectedClipId={selectedClipId}
                    onSelectClip={setSelectedClipId}
                />
            </div>
            <StudioFooter 
                selectedTrack={selectedTrack} 
                selectedClip={selectedClip} 
                onUpdateClip={updateClip} 
                onDeleteClip={() => selectedClipId && handleDeleteClip(selectedClipId)}
                onToggleLyricsEditor={() => setIsLyricsEditorOpen(true)}
            />
             <LyricsOverlay 
                isVisible={showLyricsOverlay} 
                lyrics={project.lyrics || ''} 
                onClose={() => setShowLyricsOverlay(false)}
            />
             <LyricsEditorModal
                isOpen={isLyricsEditorOpen}
                onClose={handleCloseLyricsEditor}
                lyrics={project.lyrics || ''}
                onLyricsChange={handleLyricsChange}
            />
             <RecordingReviewModal 
                isOpen={!!pendingRecording}
                recording={pendingRecording}
                onSave={handleSaveRecording}
                onDiscard={handleDiscardRecording}
            />
            {contextMenu && selectedTrackForMenu && (
                <TrackContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    track={selectedTrackForMenu}
                    onClose={() => setContextMenu(null)}
                    onDelete={handleDeleteTrack}
                    onRename={handleRenameTrack}
                    onDuplicate={handleDuplicateTrack}
                    onSetColor={handleSetTrackColor}
                    onMoveUp={(trackId) => handleMoveTrack(trackId, 'up')}
                    onMoveDown={(trackId) => handleMoveTrack(trackId, 'down')}
                />
            )}
        </div>
    );
};

const DetailedAudioAnalysisDisplay: React.FC<{ result: string | null, fileName: string }> = ({ result, fileName }) => {
    const { t, addToast } = useAppContext();

    const { metadata, content } = useMemo(() => {
        if (!result) return { metadata: {}, content: '' };
        const parts = result.split('---');
        const metaPart = parts[0];
        const contentPart = parts.length > 1 ? parts.slice(1).join('---').trim() : '';

        const metaObject: { [key: string]: string } = {};
        metaPart.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                metaObject[key.trim()] = valueParts.join(':').trim();
            }
        });
        return { metadata: metaObject, content: contentPart };
    }, [result]);

    if (!result) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        addToast('copied');
    };

    const handleExport = () => {
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.split('.')[0]}_analysis.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const chordRegex = /(\b[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?\d{0,2}(?:\/[A-G][#b]?)?\b)/g;

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg mt-3 animate-slide-in-fade">
            <div className="flex justify-between items-center mb-3">
                 <h4 className="font-semibold text-purple-300">{t('chordAnalysisResult')}</h4>
                 <div className="flex items-center space-x-2">
                     <button onClick={handleCopy} title={t('copyToClipboard')} className="text-gray-400 hover:text-white transition-colors"><i className="fa-solid fa-copy"></i></button>
                     <button onClick={handleExport} title={t('exportAsTxt')} className="text-gray-400 hover:text-white transition-colors"><i className="fa-solid fa-file-export"></i></button>
                 </div>
            </div>
            
            <div className="bg-black/30 p-3 rounded-md mb-3 space-y-1 text-sm">
                {Object.entries(metadata).map(([key, value]) => (
                     <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-400 font-medium">{key}:</span>
                        <span className="font-bold text-white">{value}</span>
                    </div>
                ))}
            </div>

            <div className="bg-black/30 p-3 rounded-md max-h-60 overflow-y-auto">
                <pre className="text-white font-mono text-sm whitespace-pre-wrap leading-relaxed">
                     {content.split('\n').map((line, i) => (
                        <div key={i} dangerouslySetInnerHTML={{ __html: line.replace(chordRegex, '<span class="text-green-400 font-bold">$1</span>') }} />
                    ))}
                </pre>
            </div>
        </div>
    );
};


export const EffectsScreen: React.FC = () => {
    const { project, updateProject, t } = useAppContext();
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(project.tracks[0]?.id || null);
    
    // State for Audio Analyzer
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioAnalysisResult, setAudioAnalysisResult] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);
    const audioFileInputRef = useRef<HTMLInputElement>(null);


    const selectedTrack = project.tracks.find(t => t.id === selectedTrackId);
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const updateEffect = (effect: AudioEffect) => {
        if (!selectedTrack) return;
        const updatedEffects = selectedTrack.effects.map(e => e.id === effect.id ? effect : e);
        const updatedTrack = { ...selectedTrack, effects: updatedEffects };
        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t)
        }));
    };
    
    const updateEffectParam = (effectId: string, param: string, value: number) => {
        const effect = selectedTrack?.effects.find(e => e.id === effectId);
        if (effect && selectedTrack) {
            const newParams = { ...effect.params, [param]: value };
            updateEffect({ ...effect, params: newParams });
            masterAudioEngine.updateTrackEffectParam(selectedTrack.id, effectId, param, value);
        }
    };

    const handleAddEffect = (effectName: AudioEffect['name']) => {
        if (!selectedTrack) return;

        let defaultParams: { [key: string]: number } = {};
        switch (effectName) {
            case 'Compressor':
                defaultParams = { threshold: -24, ratio: 4, attack: 0.01, release: 0.2 };
                break;
            case 'Reverb':
                defaultParams = { mix: 30 };
                break;
            case 'Delay':
                defaultParams = { time: 0.5, feedback: 0.4 };
                break;
            case 'EQ':
                defaultParams = { bass: 0, mid: 0, treble: 0 };
                break;
        }

        const newEffect: AudioEffect = {
            id: `e_${Date.now()}`,
            name: effectName,
            params: defaultParams,
            isEnabled: true,
        };

        const updatedTrack = {
            ...selectedTrack,
            effects: [...selectedTrack.effects, newEffect],
        };

        updateProject(p => ({
            ...p,
            tracks: p.tracks.map(t => (t.id === updatedTrack.id ? updatedTrack : t)),
        }));
    };

    const handleAudioFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAudioFileName(file.name);
        setIsAudioLoading(true);
        setAudioAnalysisResult(null);

        const base64Data = await blobToBase64(file);
        const audioPart = {
            inlineData: {
                data: base64Data,
                mimeType: file.type,
            },
        };
        const result = await getAiChordAnalysisFromAudio(audioPart);

        setAudioAnalysisResult(result);
        setIsAudioLoading(false);
    };

     const handleImportAudioClick = () => {
        audioFileInputRef.current?.click();
    };
    
    const handleResetAudioAnalyzer = () => {
        setAudioFileName(null);
        setAudioAnalysisResult(null);
        setIsAudioLoading(false);
        if (audioFileInputRef.current) {
            audioFileInputRef.current.value = "";
        }
    };
    
    const EffectController: React.FC<{ effect: AudioEffect }> = ({ effect }) => {
        const { name, params } = effect;
        switch (name) {
            case 'EQ':
                return (
                    <div className="space-y-1 text-sm">
                        {['bass', 'mid', 'treble'].map(band => (
                             <div key={band} className="flex items-center space-x-2">
                                <span className="w-12 capitalize">{band}</span>
                                <input type="range" min="-40" max="40" value={params[band] || 0} onChange={e => updateEffectParam(effect.id, band, +e.target.value)} className="w-full" disabled={!effect.isEnabled}/>
                                <span className="w-12 text-right">{params[band] || 0} dB</span>
                            </div>
                        ))}
                    </div>
                );
            case 'Compressor':
                 return (
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Threshold</span>
                            <input type="range" min="-100" max="0" value={params.threshold || 0} onChange={e => updateEffectParam(effect.id, 'threshold', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{params.threshold || 0} dB</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Ratio</span>
                            <input type="range" min="1" max="20" value={params.ratio || 1} onChange={e => updateEffectParam(effect.id, 'ratio', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{params.ratio || 1}:1</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Attack</span>
                            <input type="range" min="0" max="1" step="0.001" value={params.attack || 0} onChange={e => updateEffectParam(effect.id, 'attack', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{((params.attack || 0) * 1000).toFixed(1)} ms</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Release</span>
                            <input type="range" min="0" max="1" step="0.01" value={params.release || 0} onChange={e => updateEffectParam(effect.id, 'release', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{((params.release || 0) * 1000).toFixed(0)} ms</span>
                        </div>
                    </div>
                );
             case 'Delay':
                return (
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Time</span>
                            <input type="range" min="0" max="2" step="0.01" value={params.time || 0} onChange={e => updateEffectParam(effect.id, 'time', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{(params.time || 0).toFixed(2)} s</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="w-16">Feedback</span>
                            <input type="range" min="0" max="0.95" step="0.01" value={params.feedback || 0} onChange={e => updateEffectParam(effect.id, 'feedback', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                            <span className="w-12 text-right">{((params.feedback || 0) * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                );
            default:
                return (
                     <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-400 w-12">Amount</label>
                        <input type="range" min="0" max="100" value={params.mix || params.amount || 0} onChange={e => updateEffectParam(effect.id, 'mix', +e.target.value)} className="w-full" disabled={!effect.isEnabled} />
                        <span className="text-sm w-8 text-right">{params.mix || params.amount || 0}%</span>
                    </div>
                );
        }
    };

    return (
        <MainLayout>
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">{t('effectsRack')}</h2>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <label htmlFor="track-select" className="block text-sm font-medium text-gray-300 mb-1">{t('selectTrack')}</label>
                    <select id="track-select" value={selectedTrackId ?? ''} onChange={e => setSelectedTrackId(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        {project.tracks.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}
                    </select>
                </div>

                {selectedTrack ? (
                    <div className="space-y-3">
                        {selectedTrack.effects.length === 0 && <p className="text-center text-gray-500 p-4">{t('noEffectsOnTrack')}</p>}
                        {selectedTrack.effects.map(effect => (
                             <div key={effect.id} className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">{effect.name}</h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={effect.isEnabled} onChange={() => updateEffect({ ...effect, isEnabled: !effect.isEnabled })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                 <div className={`transition-opacity ${!effect.isEnabled && 'opacity-50'}`}>
                                    <EffectController effect={effect} />
                                </div>
                            </div>
                        ))}
                         <div className="pt-2 grid grid-cols-2 gap-2 text-sm">
                             <button
                                onClick={() => handleAddEffect('Reverb')}
                                className="bg-indigo-600/80 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                <i className="fa-solid fa-plus mr-2"></i>
                                {t('addReverb')}
                            </button>
                             <button
                                onClick={() => handleAddEffect('Delay')}
                                className="bg-indigo-600/80 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                <i className="fa-solid fa-plus mr-2"></i>
                                {t('addDelay')}
                            </button>
                             <button
                                onClick={() => handleAddEffect('EQ')}
                                className="bg-indigo-600/80 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                <i className="fa-solid fa-plus mr-2"></i>
                                {t('addEQ')}
                            </button>
                            <button
                                onClick={() => handleAddEffect('Compressor')}
                                className="bg-indigo-600/80 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                <i className="fa-solid fa-plus mr-2"></i>
                                {t('addCompressor')}
                            </button>
                        </div>
                    </div>
                ) : <p className="text-center text-gray-500 p-4">{t('selectTrackToSeeEffects')}</p>}

                 {/* AI Tool: Audio Music Analyzer */}
                <div className="bg-gray-800 p-4 rounded-lg mt-6">
                     <h3 className="font-semibold text-lg mb-2">{t('aiToolsAudioRec')}</h3>
                     <p className="text-sm text-gray-400 mb-3">{t('aiToolsAudioRecDesc')}</p>
                     
                     <input type="file" accept="audio/mp3,audio/wav,audio/mpeg" ref={audioFileInputRef} onChange={handleAudioFileChange} className="hidden" />

                     {!audioFileName && (
                        <button onClick={handleImportAudioClick} className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded-md transition-colors">
                            <i className="fa-solid fa-file-audio mr-2"></i>{t('importAndAnalyzeAudio')}
                        </button>
                     )}

                     {audioFileName && (
                         <div className="bg-gray-700/50 p-3 rounded-lg space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-200 truncate pr-2"><i className="fa-solid fa-file-audio mr-2 text-purple-300"></i>{audioFileName}</p>
                                <button onClick={handleResetAudioAnalyzer} className="text-gray-400 hover:text-white text-xl font-bold leading-none flex-shrink-0">&times;</button>
                            </div>
                            {isAudioLoading && (
                                <div className="flex items-center justify-center space-x-2 text-purple-300 py-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                                    <span>{t('analyzing')}</span>
                                </div>
                            )}
                            {audioAnalysisResult && !isAudioLoading && (
                               <DetailedAudioAnalysisDisplay result={audioAnalysisResult} fileName={audioFileName} />
                            )}
                         </div>
                     )}
                </div>
            </div>
        </MainLayout>
    );
};

export const CollaborationScreen: React.FC = () => {
    const { project, t, activeUser, addChatMessage, updateProject, addToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'Chat' | 'Activity'>('Chat');
    const [message, setMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [project.chatHistory]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !activeUser) return;

        addChatMessage(message.trim());
        setMessage('');

        // Simulate a reply from another user for a real-time feel
        setTimeout(() => {
            const otherUser = project.collaborators.find(c => c.id !== activeUser.id);
            if (otherUser) {
                 const replies = [
                    "Sounds good, I'll check it out.", 
                    "Awesome, looking forward to hearing it!", 
                    "Perfect, let me know if you need any help with the mix.",
                    "On it!"
                ];
                const reply = replies[Math.floor(Math.random() * replies.length)];

                const replyMessage: ChatMessage = {
                    id: `msg_${Date.now()}`,
                    senderId: otherUser.id,
                    senderName: otherUser.name,
                    content: reply,
                    timestamp: Date.now(),
                };

                updateProject(p => ({
                    ...p,
                    chatHistory: [...(p.chatHistory || []), replyMessage],
                }));
                
                addToast('new_message_from', { name: otherUser.name });
            }
        }, 2500);
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <MainLayout>
            <h2 className="text-2xl font-bold mb-4">{t('collabStudio')}</h2>
            <div className="bg-gray-800 rounded-lg h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="font-semibold mb-2">{t('collaborators')} ({project.collaborators.length})</h3>
                    <div className="flex items-center -space-x-2">
                        {project.collaborators.map(c => (
                            <div key={c.id} className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-gray-800" title={c.name}>
                                {c.name.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex border-b border-gray-700">
                    <button onClick={() => setActiveTab('Chat')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'Chat' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>{t('chat')}</button>
                    <button onClick={() => setActiveTab('Activity')} className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'Activity' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>{t('liveActivity')}</button>
                </div>

                {activeTab === 'Chat' ? (
                    <>
                        <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-900">
                            {(project.chatHistory || []).map((msg) => {
                                const isSender = msg.senderId === activeUser?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isSender ? 'bg-purple-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                                            {!isSender && <p className="text-xs font-bold text-purple-300 mb-1">{msg.senderName}</p>}
                                            <p className="text-sm break-words">{msg.content}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(msg.timestamp)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-2 bg-gray-900 border-t border-gray-700 flex items-center">
                            <button type="button" className="text-gray-400 p-2 rounded-full hover:bg-gray-700 flex-shrink-0" aria-label="Attach file">
                                <i className="fa-solid fa-paperclip text-xl"></i>
                            </button>
                            <input 
                                type="text" 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('typeYourMessage')} 
                                className="flex-grow bg-gray-700 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 mx-2" 
                                aria-label="Chat message input"
                            />
                            <button type="submit" disabled={!message.trim()} className="text-purple-400 p-2 rounded-full hover:bg-gray-700 disabled:text-gray-600 disabled:cursor-not-allowed flex-shrink-0" aria-label="Send message">
                                <i className="fa-solid fa-paper-plane text-xl"></i>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-grow p-4 space-y-3 overflow-y-auto text-sm">
                        <div className="flex items-start space-x-3"><i className="fa-solid fa-microphone-lines text-gray-400 mt-1"></i><p dangerouslySetInnerHTML={{ __html: t('activity1', {name: project.collaborators[2].name}).replace(/<0>(.*?)<\/0>/g, '<span class="font-semibold text-purple-300">$1</span>')}} /></div>
                        <div className="flex items-start space-x-3"><i className="fa-solid fa-comment text-gray-400 mt-1"></i><p dangerouslySetInnerHTML={{ __html: t('activity3', {name: project.collaborators[0].name}).replace(/<0>(.*?)<\/0>/g, '<span class="font-semibold text-purple-300">$1</span>')}} /></div>
                        <div className="flex items-start space-x-3"><i className="fa-solid fa-share text-gray-400 mt-1"></i><p dangerouslySetInnerHTML={{ __html: t('activity4', {name: project.collaborators[2].name}).replace(/<0>(.*?)<\/0>/g, '<span class="font-semibold text-purple-300">$1</span>')}} /></div>
                    </div>
                )}
             </div>
        </MainLayout>
    );
};

const InteractiveTutorialModal: React.FC<{ isOpen: boolean, onClose: () => void, tutorial: Tutorial | null }> = ({ isOpen, onClose, tutorial }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    if (!tutorial) return null;

    const step = tutorial.steps[currentStep];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tutorial.title}>
            <div className="flex flex-col items-center text-center p-4">
                <div className="bg-purple-600/20 text-purple-300 p-4 rounded-full mb-4">
                    <i className={`fa-solid ${step.icon} text-4xl`}></i>
                </div>
                <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                <p className="text-gray-300 mb-6">{step.content}</p>

                <div className="w-full flex justify-between items-center mt-4">
                    <button onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 0} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Sebelumnya</button>
                    <span className="text-sm text-gray-400">Langkah {currentStep + 1} / {tutorial.steps.length}</span>
                    {currentStep < tutorial.steps.length - 1 ? (
                        <button onClick={() => setCurrentStep(s => s + 1)} className="bg-purple-600 hover:bg-purple-700 font-bold py-2 px-4 rounded-md">Berikutnya</button>
                    ) : (
                        <button onClick={onClose} className="bg-green-600 hover:bg-green-700 font-bold py-2 px-4 rounded-md">Selesai</button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export const LearningCenterScreen: React.FC = () => {
    const { t } = useAppContext();
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    const startTutorial = (tutorial: Tutorial) => {
        setSelectedTutorial(tutorial);
        setIsTutorialOpen(true);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsLoadingAi(true);
        setAiResponse(null);
        const response = await getAiLearningResponse(searchQuery);
        setAiResponse(response);
        setIsLoadingAi(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setAiResponse(null);
        setIsLoadingAi(false);
    };

    const filteredTutorials = MOCK_TUTORIALS.filter(tut =>
        !searchQuery ||
        tut.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tut.steps.some(step => step.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
    <MainLayout>
        <h2 className="text-2xl font-bold mb-4">{t('learningCenter')}</h2>

        <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-2">{t('haveAQuestion')}</h3>
            <p className="text-sm text-gray-400 mb-3">{t('askAITutor')}</p>
            <form onSubmit={handleSearch} className="flex space-x-2">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('searchExample')} 
                    className="flex-grow bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 rounded-md" aria-label="Search">
                    <i className="fa-solid fa-search"></i>
                </button>
            </form>
        </div>

        {isLoadingAi && (
            <div className="text-center p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto"></div>
                <p className="mt-3 text-gray-400">{t('aiTutorThinking')}</p>
            </div>
        )}
        
        {aiResponse && !isLoadingAi && (
            <div className="bg-gradient-to-br from-purple-900/50 to-gray-800 p-4 rounded-lg mb-4 animate-fade-in-out" style={{animationName: 'fadeIn'}}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-purple-300 flex items-center"><i className="fa-solid fa-robot mr-2"></i>{t('aiTutorAnswer')}</h3>
                    <button onClick={clearSearch} className="text-sm text-gray-400 hover:text-white">&times; {t('clear')}</button>
                </div>
                <p className="text-gray-200 whitespace-pre-wrap">{aiResponse}</p>
            </div>
        )}

        {!aiResponse && !isLoadingAi && (
            <div className="space-y-4">
                <h3 className="text-xl font-bold">{searchQuery ? t('searchResultsFor', {query: searchQuery}) : t('allTutorials')}</h3>
                {filteredTutorials.length > 0 ? filteredTutorials.map(tut => (
                     <div key={tut.id} className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-bold text-lg">{tut.title}</h3>
                        <p className="text-sm text-gray-400 mb-3">{t('level')}: {tut.level} | {t('duration')}: {tut.duration} {t('min')}</p>
                        <button onClick={() => startTutorial(tut)} className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-md">{t('startTutorial')}</button>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 p-4">{t('noTutorialsFound')}</p>
                )}
            </div>
        )}
        
        <InteractiveTutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} tutorial={selectedTutorial} />
    </MainLayout>
)};

export const UpgradeScreen: React.FC = () => {
    const { activeUser, setView, setPurchasingPlan, t } = useAppContext();
    const [selectedTier, setSelectedTier] = useState<'basic' | 'pro'>('pro');
    const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
    const [email, setEmail] = useState(activeUser?.email || '');
    const [country, setCountry] = useState('Indonesia'); // Mock auto-detection
    const [wantsOffers, setWantsOffers] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; country?: string }>({});

    const countries = [
        'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Australia', 'Austria', 'Bahamas', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Kenya', 'Malaysia', 'Mexico', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
    ];

    const proFeatures = [
        { title: 'AI Vocal Tools', description: 'Voice Cleaner and Voice Changer (10 new styles).' },
        { title: 'New Mastering Presets', description: 'Includes new presets and intensity controls.' },
        { title: '18 AutoPitch Vocal Effects', description: 'Creative vocal styles for any genre.' },
        { title: 'Advanced Audio Tools', description: 'Piano/Guitar isolation, MIDI conversion, and faster track separation.' },
        { title: 'Next-Gen Cakewalk Tools', description: 'Early access to Cakewalk Next and Sonar.' },
        { title: '100% Earnings with Global Distribution', description: 'Keep all your earnings from your music.' },
        { title: 'Career Opportunities', description: 'Get chances for record deals and partnerships.' },
        { title: 'Verification Perks', description: 'Stand out to millions with a verified profile.' },
        { title: 'Exclusive FX', description: 'Access pro effects like Visual EQ and Multi-Band Comp.' },
        { title: 'Ad-Free Experience', description: 'Create without interruptions.' },
    ];

    const basicFeatures = [
        { title: 'Standard Mastering Presets', description: 'A selection of essential mastering tools.' },
        { title: '5 AutoPitch Vocal Effects', description: 'A starter pack of popular vocal styles.' },
        { title: 'Standard Audio Tools', description: 'Basic track separation and editing tools.' },
        { title: '50% Earnings with Global Distribution', description: 'Distribute your music and keep a majority of your earnings.' },
        { title: 'Verification Perks', description: 'Stand out to millions with a verified profile.' },
        { title: 'Standard FX', description: 'Access essential effects like Reverb, Delay, and EQ.' },
        { title: 'Ad-Free Experience', description: 'Create without interruptions.' },
    ];
    
    const features = selectedTier === 'pro' ? proFeatures : basicFeatures;

    const validateForm = () => {
        const newErrors: { email?: string; country?: string } = {};
        if (!email) {
            newErrors.email = t('emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('emailInvalid');
        }
        if (!country) {
            newErrors.country = t('countryRequired');
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = () => {
        if (validateForm()) {
            const tierName = selectedTier === 'basic' ? t('basic') : t('pro');
            const planDetails = selectedPlan === 'annual'
                ? {
                    plan: `VibeStudio ${tierName} (${t('annualPlan')})`,
                    price: selectedTier === 'basic' ? 'Rp 306.000' : 'Rp 714.000'
                  }
                : {
                    plan: `VibeStudio ${tierName} (${t('monthlyPlan')})`,
                    price: selectedTier === 'basic' ? 'Rp 30.000' : 'Rp 70.000'
                  };
            setPurchasingPlan(planDetails);
            setView(View.Payment);
        }
    };

    const PlanOption: React.FC<{ plan: 'annual' | 'monthly', title: string, price: string, subtitle: string, badge?: string, trial?: boolean }> = ({ plan, title, price, subtitle, badge, trial }) => (
        <div onClick={() => setSelectedPlan(plan)} className={`relative p-4 border rounded-lg cursor-pointer transition-all duration-300 ${selectedPlan === plan ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
            {badge && <span className="absolute -top-2.5 left-4 text-xs bg-[#e63946] text-white font-bold px-2 py-0.5 rounded-full">{badge}</span>}
            <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 ${selectedPlan === plan ? 'border-purple-500 bg-purple-500' : 'border-gray-600'} flex items-center justify-center mr-3`}>
                    {selectedPlan === plan && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-sm text-gray-400">{price} <span className="text-gray-500">{subtitle}</span></p>
                    {trial && <p className="text-sm text-[#ffb800] font-semibold">{t('tryFree3Days')}</p>}
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="h-full w-full flex flex-col bg-[#0d0d0d] font-sans">
            <header className="p-4 flex items-center">
                <button onClick={() => setView(View.Dashboard)} className="text-2xl text-gray-400 hover:text-white">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
            </header>
            <main className="flex-grow overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Section - Summary */}
                    <div className="lg:border-r lg:border-gray-800 lg:pr-12">
                        <h1 className="text-2xl font-bold text-white">{t('membershipTitle', { plan: t(selectedTier) })}</h1>
                        <p className="text-gray-400 mt-2">{t('membershipSubtitle')}</p>
                        
                         <div className="flex bg-gray-800 p-1 rounded-lg my-6">
                            <button onClick={() => setSelectedTier('basic')} className={`flex-1 text-center font-semibold py-2 rounded-md transition-colors text-sm ${selectedTier === 'basic' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                {t('basic')}
                            </button>
                             <div className="relative flex-1">
                                <button onClick={() => setSelectedTier('pro')} className={`w-full text-center font-semibold py-2 rounded-md transition-colors text-sm ${selectedTier === 'pro' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    {t('pro')}
                                </button>
                                <span className="absolute -top-2.5 right-1 text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full transform rotate-6">{t('mostPopular')}</span>
                             </div>
                        </div>

                        <div className="space-y-4">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                    <i className="fa-solid fa-check text-green-500 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <h3 className="font-semibold text-white">{feature.title}</h3>
                                        <p className="text-sm text-gray-500">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Section - Checkout Form */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">{t('emailAddress')}</label>
                                <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-gray-700'} text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`} />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">{t('country')}</label>
                                <select id="country" value={country} onChange={e => setCountry(e.target.value)} className={`w-full bg-gray-800 border ${errors.country ? 'border-red-500' : 'border-gray-700'} text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500`}>
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                            </div>
                            <div className="flex items-start space-x-3">
                                <input id="offers" type="checkbox" checked={wantsOffers} onChange={e => setWantsOffers(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
                                <label htmlFor="offers" className="text-sm text-gray-400">{t('offersOptIn')}</label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {selectedTier === 'basic' ? (
                                <>
                                    <PlanOption plan="annual" title={t('annualPlan')} price="Rp 306.000/year" subtitle={t('billedAnnually')} badge={t('save15')} />
                                    <PlanOption plan="monthly" title={t('monthlyPlan')} price="Rp 30.000/month" subtitle={t('billedMonthly')} />
                                </>
                            ) : (
                                <>
                                    <PlanOption plan="annual" title={t('annualPlan')} price="Rp 714.000/year" subtitle={t('billedAnnually')} badge={t('save15')} />
                                    <PlanOption plan="monthly" title={t('monthlyPlan')} price="Rp 70.000/month" subtitle={t('billedMonthly')} trial={true}/>
                                </>
                            )}
                        </div>

                        <button onClick={handleContinue} className="w-full bg-[#ffb800] text-black font-bold text-lg py-3 rounded-lg shadow-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105">
                            {t('continue')}
                        </button>
                        
                        <div className="text-center text-xs text-gray-500">
                             <p dangerouslySetInnerHTML={{ __html: t('termsAndPolicy').replace(/<0>(.*?)<\/0>/g, '<a href="#" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-300">$1</a>').replace(/<1>(.*?)<\/1>/g, '<a href="#" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-300">$1</a>') }} />
                             <div className="mt-2 space-x-4">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">{t('helpAndFAQ')}</a>
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export const PaymentScreen: React.FC = () => {
    const { purchasingPlan, upgradeToPremium, setView, t } = useAppContext();
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ewallet'>('card');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

    const handlePayment = () => {
        setPaymentStatus('processing');
        setTimeout(() => {
            upgradeToPremium();
            setPaymentStatus('success');
            setTimeout(() => {
                setView(View.Dashboard);
            }, 3000);
        }, 2500);
    };

    if (paymentStatus === 'processing') {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center text-center p-8 bg-gray-900">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <i className="fa-solid fa-lock text-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-400"></i>
                </div>
                <h2 className="text-2xl font-bold mt-6">{t('processingPayment')}</h2>
                <p className="text-gray-400 mt-2">Your transaction is being securely processed. Please do not close this window.</p>
            </div>
        );
    }
    
    if (paymentStatus === 'success') {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center text-center p-8 bg-gray-900 animate-slide-in-fade">
                 <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                    <i className="fa-solid fa-check text-5xl text-white"></i>
                </div>
                <h2 className="text-3xl font-bold mt-6 text-green-400">{t('paymentSuccessful')}</h2>
                <p className="text-gray-300 mt-2">{t('welcomeToPremium')}</p>
            </div>
        );
    }

    if (!purchasingPlan) {
        // Should not happen, but as a fallback, go back to upgrade screen
        useEffect(() => {
            setView(View.Upgrade);
        }, [setView]);
        return null;
    }
    
    const PaymentMethodTab: React.FC<{ method: 'card' | 'bank' | 'ewallet', icon: string, label: string }> = ({ method, icon, label }) => (
        <button 
            onClick={() => setPaymentMethod(method)}
            className={`flex-1 flex flex-col items-center justify-center p-3 border-b-2 transition-colors ${paymentMethod === method ? 'border-purple-500 text-purple-400' : 'border-gray-700 text-gray-500 hover:bg-gray-800'}`}
        >
            <i className={`fa-solid ${icon} text-2xl`}></i>
            <span className="text-xs font-semibold mt-1">{label}</span>
        </button>
    );

    return (
        <div className="h-full w-full flex flex-col bg-gray-900">
            <header className="p-4 flex items-center border-b border-gray-800">
                <button onClick={() => setView(View.Upgrade)} className="text-2xl text-gray-400 hover:text-white mr-4">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h1 className="text-xl font-bold">{t('secureCheckout')}</h1>
            </header>
            <main className="flex-grow overflow-y-auto p-4 space-y-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold mb-3">{t('orderSummary')}</h2>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{t('plan')}: {purchasingPlan.plan}</span>
                        <span className="font-bold">{purchasingPlan.price}</span>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg">
                     <h2 className="text-lg font-semibold p-4">{t('selectPaymentMethod')}</h2>
                     <div className="flex border-b border-gray-700">
                        <PaymentMethodTab method="card" icon="fa-credit-card" label={t('creditCard')} />
                        <PaymentMethodTab method="bank" icon="fa-building-columns" label={t('bankTransfer')} />
                        <PaymentMethodTab method="ewallet" icon="fa-wallet" label={t('eWallet')} />
                    </div>
                    <div className="p-4 space-y-4">
                        {paymentMethod === 'card' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="cardNumber">{t('cardNumber')}</label>
                                    <input type="text" id="cardNumber" placeholder="0000 0000 0000 0000" className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <div className="flex space-x-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="expiryDate">{t('expiryDate')}</label>
                                        <input type="text" id="expiryDate" placeholder="MM/YY" className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="cvc">{t('cvc')}</label>
                                        <input type="text" id="cvc" placeholder="123" className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="cardHolderName">{t('cardHolderName')}</label>
                                    <input type="text" id="cardHolderName" placeholder="Full Name" className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                            </>
                        )}
                        {paymentMethod === 'bank' && <p className="text-center text-gray-500 text-sm py-8">Bank transfer instructions would be shown here.</p>}
                        {paymentMethod === 'ewallet' && <p className="text-center text-gray-500 text-sm py-8">E-Wallet payment options (e.g., QR Code) would be shown here.</p>}
                    </div>
                </div>
            </main>
            <footer className="p-4 border-t border-gray-800">
                <button onClick={handlePayment} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg py-3 rounded-lg shadow-lg transition-colors">
                    {t('payNow', {price: purchasingPlan.price})}
                </button>
            </footer>
        </div>
    );
};

const RecordingReviewModal: React.FC<{
    isOpen: boolean;
    recording: { url: string; duration: number } | null;
    onSave: () => void;
    onDiscard: () => void;
}> = ({ isOpen, recording, onSave, onDiscard }) => {
    const { t } = useAppContext();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        const handleEnded = () => setIsPlaying(false);
        audioElement.addEventListener('ended', handleEnded);
        return () => {
            audioElement.removeEventListener('ended', handleEnded);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isOpen, recording?.url]);

    if (!isOpen || !recording) return null;

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onDiscard} title={t('reviewRecording')}>
            <div className="p-4 flex flex-col items-center">
                <audio ref={audioRef} src={recording.url} preload="auto" className="hidden"></audio>
                <p className="text-gray-400 mb-4">{t('previewTake')}</p>
                <button 
                    onClick={togglePlayback}
                    className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-4xl mb-6 hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                    aria-label={isPlaying ? "Pause preview" : "Play preview"}
                >
                    <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                <div className="w-full flex justify-around items-center">
                    <button 
                        onClick={onDiscard} 
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-gray-700 hover:bg-red-600 transition-colors"
                    >
                        <i className="fa-solid fa-trash"></i>
                        <span className="font-semibold">{t('discard')}</span>
                    </button>
                    <button 
                        onClick={onSave}
                        className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 transition-colors"
                    >
                        <i className="fa-solid fa-check"></i>
                        <span className="font-semibold">{t('save')}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};