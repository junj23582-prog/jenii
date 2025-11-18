import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
    // Initialize the Gemini AI client if an API key is available in the environment.
    // The API key MUST be provided via the process.env.API_KEY environment variable.
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
} catch (e) {
    console.warn("Gemini API key not found or failed to initialize. Using mocked service.", e);
}

const mockResponses: { [key:string]: string[] } = {
  audioChord: [
    `Key: G Major
Tempo: 128 BPM
Time Signature: 4/4
Progression Type: I-V-vi-IV
---
[Intro]
G D Em C (x2)

[Verse 1]
G                 D
 Another day in this small town
Em                     C
 Starin' at the walls, paint is peelin' down
G                D                     Em    C
 And I'm just dreamin' of gettin' out

[Chorus]
G                     D
 'Cause we're just kids in a runaway car
Em                    C
 Chasin' the sunset, wishin' on a star
G                D                     Em     C
 Don't know where we're goin', but we'll go far

[Instrumental]
G D Em C

[Verse 2]
G                  D
 Radio's playin' our favorite song
Em                       C
 Singing at the top of our lungs all night long
G                 D                     Em    C
 We know this is right where we belong

[Chorus]
G                     D
 'Cause we're just kids in a runaway car
Em                    C
 Chasin' the sunset, wishin' on a star
G                D                     Em     C
 Don't know where we're goin', but we'll go far

[Outro]
G D Em C
(Go far...)
G D Em C
(Yeah, a runaway car...)`
  ],
  assistant: [
    "To get a warmer vocal sound, try applying a high-pass filter around 80Hz to remove rumble and then add a slight boost with a parametric EQ around 200-300Hz.",
    "For punchier drums, use a compressor with a slow attack and fast release on the drum bus. This will help the transients cut through the mix.",
    "To make your synth pad sound wider, you can use a stereo imaging plugin or simply duplicate the track, pan one hard left and the other hard right, and apply a very slight delay (10-20ms) to one of them.",
  ],
  mastering: [
    "The mix sounds solid! For mastering, I'd suggest a final EQ to gently scoop out some muddiness around 250Hz and add a touch of 'air' above 12kHz. Then, use a limiter to bring the overall loudness up to a competitive level without clipping.",
    "This track has great dynamic range. I would apply some multi-band compression to control the low end and de-ess the vocals slightly before the final limiting stage.",
  ],
  instrument: [
      "I've designed a 'Celestial Pad'. It has a shimmering, ethereal quality with a slow attack and long, modulated release, perfect for ambient soundscapes.",
      "How about the 'Retro Funk Bass'? It's a punchy, warm synth bass with a slight grit and a fast decay, ideal for neo-soul and funk tracks.",
      "Here's the 'Stardust Lead'. A bright, cutting synth lead with a touch of portamento and vibrato, great for 80s-inspired melodies.",
  ],
  learning: [
    "Untuk menambahkan trek baru, navigasikan ke layar 'Studio' dari bilah navigasi bawah. Kemudian, ketuk tombol '+ Tambah Instrumen Virtual' di bagian bawah. Ini akan membuka perpustakaan instrumen di mana Anda dapat memilih preset atau membuatnya dengan AI.",
    "Kompresi sidechain adalah teknik di mana volume satu trek dikurangi oleh kehadiran trek lain. Penggunaan umum adalah untuk membuat kick drum menembus bassline. Di VibeStudio, Anda akan menerapkan efek Kompresor ke trek bass dan mengkonfigurasi input sidechain-nya untuk mendengarkan trek drum.",
    "Untuk mengekspor proyek Anda, buka layar Studio dan cari ikon 'Ekspor' atau 'Bagikan' di sudut kanan atas. Anda akan dapat memilih format audio yang Anda inginkan, seperti WAV atau MP3."
  ],
  role: [
    "Based on their experience with mixing and mastering, the 'Producer' role seems like a perfect fit.",
    "This user has uploaded several guitar tracks. I'd suggest the 'Guitarist' role for them.",
  ]
};

const getRandomResponse = async (category: 'assistant' | 'mastering' | 'role' | 'instrument' | 'learning' | 'audioChord'): Promise<string> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const responses = mockResponses[category];
            const randomIndex = Math.floor(Math.random() * responses.length);
            resolve(responses[randomIndex]);
        }, 1500); // Simulate network delay
    });
};


export const getAiChordAnalysisFromAudio = async (audioPart: { inlineData: { data: string, mimeType: string } }): Promise<string> => {
    if (!ai) return getRandomResponse('audioChord');
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: `As an AI Music Analyzer, perform a comprehensive analysis of the provided audio file (mp3 or wav).

Your task is to:
1.  **Analyze Audio Properties:**
    *   Detect the main musical key (e.g., C Major, A minor).
    *   Detect the tempo in BPM.
    *   Detect the time signature (e.g., 4/4).
    *   Identify the common chord progression type (e.g., I–V–vi–IV).

2.  **Chord and Lyric Extraction:**
    *   Identify the complete chord progression throughout the song, noting changes per bar or beat.
    *   If the audio contains vocals, use speech-to-text to extract the lyrics.
    *   Synchronize each word/sentence of the lyrics with its corresponding chord(s).
    *   If the audio is instrumental, state this clearly and omit the lyrics section.

3.  **Format the Output:**
    *   Structure the output into logical song parts: [Intro], [Verse], [Chorus], [Bridge], [Outro], etc.
    *   Present the result with chords placed on the line directly above the corresponding lyrics. Ensure proper spacing for alignment. For example:
        C                 G
        Here comes the sun, doo-doo-doo-doo
    *   Begin the response with a metadata block containing Key, Tempo, Time Signature, and Progression Type. Use "---" as a separator between the metadata and the song content.
    *   The final output must be a single, clean, readable text string, ready for display in a UI. Do not include any JSON or markdown formatting like \`\`\`.

Example Output Structure:
Key: [Detected Key]
Tempo: [Detected BPM] BPM
Time Signature: [Detected Time Signature]
Progression Type: [Detected Progression Type]
---
[Intro]
C G Am F

[Verse 1]
C             G
The lyrics for the first verse...
Am            F
...go right here under the chords.

[Chorus]
C             G
And the chorus lyrics follow...
Am            F
...the same pattern.

(If instrumental)
[Verse 1]
(Instrumental)` },
                    audioPart
                ]
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for audio chord analysis:", error);
        return `Key: Error
Tempo: 0 BPM
---
Could not analyze the audio file. Please try again.`;
    }
};

export const getAiAssistantResponse = async (query: string): Promise<string> => {
    if (!ai) return getRandomResponse('assistant');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
             config: {
                systemInstruction: "You are an expert audio engineer and music producer assistant. Provide concise, helpful advice.",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for assistant response:", error);
        return "Sorry, I'm unable to help with that right now.";
    }
};

export const getAiMasteringSuggestion = async (projectInfo: string): Promise<string> => {
    if (!ai) return getRandomResponse('mastering');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on this project info, give a mastering suggestion: "${projectInfo}"`,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for mastering suggestion:", error);
        return "Failed to get mastering suggestion.";
    }
};

export const getAiGeneratedInstrument = async (prompt: string): Promise<string> => {
    if (!ai) return getRandomResponse('instrument');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user wants to create a new virtual instrument. Based on their prompt: "${prompt}", generate a creative name and a short, compelling description for the instrument.`,
            config: {
                systemInstruction: "You are a creative sound designer. You invent new and exciting virtual instruments.",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for instrument generation:", error);
        return "Could not generate an instrument at this time.";
    }
};

export const getAiLearningResponse = async (query: string): Promise<string> => {
    if (!ai) return getRandomResponse('learning');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a friendly and helpful VibeStudio expert tutor. A user is asking for help within the app's learning center. Their question is: "${query}". Provide a clear, concise, and helpful explanation or a step-by-step guide. Keep the language simple and the format mobile-friendly.`,
            config: {
                systemInstruction: "You are an expert tutor for a mobile music creation app called VibeStudio. Your goal is to help users learn how to use the app effectively.",
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for learning response:", error);
        return "Maaf, saya tidak dapat menemukan jawaban untuk itu. Silakan coba ulangi pertanyaan Anda.";
    }
};