import fs from 'fs/promises';
import path from 'path';
import { PipelineItem, MediaGeneration, PodcastEpisode } from './pipeline-data';

// File-based persistence for N8N state
const DATA_DIR = path.join(process.cwd(), 'data');
const PIPELINE_FILE = path.join(DATA_DIR, 'pipeline-state.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

interface PipelineState {
    pipelineItems: PipelineItem[];
    mediaGenerations: MediaGeneration[];
    podcastEpisodes: PodcastEpisode[];
    lastUpdated: string;
}

const INITIAL_STATE: PipelineState = {
    pipelineItems: [],
    mediaGenerations: [],
    podcastEpisodes: [],
    lastUpdated: new Date().toISOString()
};

// In-memory fallback for environments where file system is read-only (e.g., Vercel)
let memoryState: PipelineState | null = null;

export async function getN8nState(): Promise<PipelineState> {
    try {
        await ensureDataDir();
        const data = await fs.readFile(PIPELINE_FILE, 'utf-8');
        const state = JSON.parse(data);
        memoryState = state;
        return state;
    } catch (error) {
        // If file doesn't exist or error (like read-only FS), return memory state or initial state
        if (memoryState) return memoryState;
        return INITIAL_STATE;
    }
}

export async function updateN8nState(partialState: Partial<PipelineState>): Promise<PipelineState> {
    const currentState = await getN8nState();

    const newState = {
        ...currentState,
        ...partialState,
        lastUpdated: new Date().toISOString()
    };

    memoryState = newState;

    try {
        await ensureDataDir();
        await fs.writeFile(PIPELINE_FILE, JSON.stringify(newState, null, 2));
    } catch (error) {
        console.warn("n8n-bridge: Failed to persist state to disk, using memory fallback.", error);
    }

    return newState;
}

export async function updatePipelineItem(item: PipelineItem) {
    const state = await getN8nState();
    const existingIndex = state.pipelineItems.findIndex(i => i.id === item.id);

    let newItems = [...state.pipelineItems];
    if (existingIndex >= 0) {
        newItems[existingIndex] = item;
    } else {
        newItems.push(item);
    }

    return updateN8nState({ pipelineItems: newItems });
}
