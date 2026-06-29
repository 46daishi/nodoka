mod discord_rpc;

use discord_rpc::DiscordState;

use tauri::Manager;

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
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            window.set_decorations(true)?;

            #[cfg(not(target_os = "windows"))]
            window.set_decorations(false)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
