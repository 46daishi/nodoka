mod discord_rpc;

use discord_rpc::DiscordState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(DiscordState::new())
        .invoke_handler(tauri::generate_handler![
            discord_rpc::connect_discord,
            discord_rpc::update_discord_presence,
            discord_rpc::disconnect_discord,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
