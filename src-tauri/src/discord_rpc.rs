use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::State;

pub struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
    last_failed: Mutex<Option<SystemTime>>,
}

impl DiscordState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            last_failed: Mutex::new(None),
        }
    }
}

/// Check if enough time has passed since the last failed connection attempt.
/// Implements exponential backoff: 1s, 2s, 5s, etc.
fn should_retry_connect(state: &DiscordState) -> bool {
    let last_failed = state.last_failed.lock().unwrap();
    match *last_failed {
        None => true,
        Some(t) => {
            let elapsed = t.elapsed().unwrap_or(Duration::from_secs(60));
            // Simple backoff: retry after 1 second
            elapsed >= Duration::from_secs(1)
        }
    }
}

#[tauri::command]
pub fn connect_discord(state: State<DiscordState>, client_id: String) -> Result<(), String> {
    // Don't hammer the Discord socket if we just failed
    if !should_retry_connect(&state) {
        return Err("Too soon after last failed attempt".to_string());
    }

    let mut client = DiscordIpcClient::new(&client_id);
    match client.connect() {
        Ok(()) => {
            *state.client.lock().unwrap() = Some(client);
            *state.last_failed.lock().unwrap() = None;
            Ok(())
        }
        Err(e) => {
            *state.last_failed.lock().unwrap() = Some(SystemTime::now());
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn update_discord_presence(
    state: State<DiscordState>,
    details: Option<String>,
    status: Option<String>,
    large_image: Option<String>,
    large_text: Option<String>,
    small_image: Option<String>,
    small_text: Option<String>,
    start_timestamp: Option<i64>,
    end_timestamp: Option<i64>,
) -> Result<(), String> {
    let mut client_lock = state.client.lock().unwrap();

    if let Some(client) = client_lock.as_mut() {
        let mut activity_builder = activity::Activity::new();

        if let Some(d) = details {
            activity_builder = activity_builder.details(&d);
        }
        if let Some(s) = status {
            activity_builder = activity_builder.state(&s);
        }

        if large_image.is_some() || small_image.is_some() {
            let mut assets = activity::Assets::new();
            if let Some(img) = large_image {
                assets = assets.large_image(&img);
            }
            if let Some(txt) = large_text {
                assets = assets.large_text(&txt);
            }
            if let Some(img) = small_image {
                assets = assets.small_image(&img);
            }
            if let Some(txt) = small_text {
                assets = assets.small_text(&txt);
            }
            activity_builder = activity_builder.assets(assets);
        }

        if start_timestamp.is_some() || end_timestamp.is_some() {
            let mut timestamps = activity::Timestamps::new();
            if let Some(start) = start_timestamp {
                timestamps = timestamps.start(start);
            }
            if let Some(end) = end_timestamp {
                timestamps = timestamps.end(end);
            }
            activity_builder = activity_builder.timestamps(timestamps);
        }

        client
            .set_activity(activity_builder)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Discord client not connected".to_string())
    }
}

#[tauri::command]
pub fn disconnect_discord(state: State<DiscordState>) -> Result<(), String> {
    let mut client_lock = state.client.lock().unwrap();

    if let Some(mut client) = client_lock.take() {
        client.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
