// Per-name progress, so several friends can each play through on the same
// shared link/device and keep separate progress. Uses Supabase when
// configured (see data/supabaseConfig.js) so progress also survives
// closing the tab and coming back on a different device; always keeps a
// local cache too, so a flaky connection doesn't cost her progress and
// the game still fully works with no Supabase project at all.
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const LOCAL_PREFIX = 'akansha-quest-progress-v2-';
const DEFAULT_STATE = { unlocked: 0, bossDefeated: false };

function localKey(name) {
  return LOCAL_PREFIX + name;
}

function readLocal(name) {
  try {
    const raw = localStorage.getItem(localKey(name));
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupted storage */
  }
  return { ...DEFAULT_STATE };
}

function writeLocal(name, state) {
  try {
    localStorage.setItem(localKey(name), JSON.stringify(state));
  } catch {
    /* storage full/unavailable -- Supabase (if configured) is still tried separately */
  }
}

export async function loadProgress(name) {
  const local = readLocal(name);
  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabase.from('progress').select('unlocked, boss_defeated').eq('name', name).maybeSingle();
    if (error) throw error;

    if (!data) {
      // First time this name has played -- create the row. If she already
      // has *local* progress under this name (e.g. Supabase was only just
      // configured), carry that over instead of starting her over at zero.
      await supabase.from('progress').insert({ name, unlocked: local.unlocked, boss_defeated: local.bossDefeated });
      return local;
    }

    const remote = { unlocked: data.unlocked, bossDefeated: data.boss_defeated };
    writeLocal(name, remote);
    return remote;
  } catch {
    // Offline, RLS not set up yet, etc. -- fall back to local so play isn't blocked.
    return local;
  }
}

export async function saveProgress(name, state) {
  writeLocal(name, state);
  if (!isSupabaseConfigured) return;

  try {
    await supabase
      .from('progress')
      .upsert({ name, unlocked: state.unlocked, boss_defeated: state.bossDefeated, updated_at: new Date().toISOString() });
  } catch {
    // Local copy above already has it; she'll sync next time she's online.
  }
}
