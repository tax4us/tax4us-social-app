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

export async function getN8nState(): Promise<PipelineState> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(PIPELINE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or error, return initial state (or maybe mocks if we want fallback)
        return INITIAL_STATE;
    }
}

export async function updateN8nState(partialState: Partial<PipelineState>): Promise<PipelineState> {
    await ensureDataDir();
    const currentState = await getN8nState();

    const newState = {
        ...currentState,
        ...partialState,
        lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(PIPELINE_FILE, JSON.stringify(newState, null, 2));
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
