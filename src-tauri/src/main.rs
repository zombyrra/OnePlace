#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::Utc;
use printpdf::{BuiltinFont, Mm, PdfDocument};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::io::{BufWriter, ErrorKind};
use std::path::{Component, Path, PathBuf};
use std::process;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    cloud_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cloud_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cloud_saved_at: Option<String>,
    path: String,
    saved_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    data_path: String,
    name: String,
    version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedOneNoteFile {
    absolute_path: String,
    contents: String,
    extension: String,
    modified_at: String,
    name: String,
    relative_dir: String,
    relative_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedOneNoteDirectory {
    files: Vec<ImportedOneNoteFile>,
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedFolderFile {
    absolute_path: String,
    data_url: String,
    extension: String,
    kind: String,
    mime_type: String,
    modified_at: String,
    name: String,
    relative_dir: String,
    relative_path: String,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedFolderTreeDirectory {
    directories: Vec<String>,
    files: Vec<ImportedFolderFile>,
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedAssetData {
    data_url: String,
    mime_type: String,
    name: String,
    size: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BackupSnapshot {
    created_at: String,
    id: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestoredWorkspace {
    path: String,
    raw_data: String,
    restored_at: String,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CloudSyncConfig {
    enabled: bool,
    last_error: Option<String>,
    last_synced_at: Option<String>,
    path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CloudSyncStatus {
    enabled: bool,
    last_error: Option<String>,
    last_synced_at: Option<String>,
    path: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedJsonEnvelope {
    algorithm: String,
    ciphertext: String,
    format: String,
    nonce: String,
}

const CLOUD_PACKAGE_DIR_NAME: &str = "oneplace-cloud-save";
const CLOUD_SYNC_CONFIG_FILE: &str = "cloud-sync.json";
const ENCRYPTED_JSON_ALGORITHM: &str = "AES-256-GCM";
const ENCRYPTED_JSON_FORMAT: &str = "oneplace.encrypted-json.v1";
const LOCAL_STORAGE_KEY_FILE: &str = "workspace-key.dpapi";
const NONCE_BYTES: usize = 12;
const ROLLING_BACKUP_LIMIT: usize = 10;
const STORAGE_KEY_BYTES: usize = 32;

#[derive(Clone)]
struct StorageCipher {
    key: [u8; STORAGE_KEY_BYTES],
}

impl StorageCipher {
    fn new(key: [u8; STORAGE_KEY_BYTES]) -> Self {
        Self { key }
    }

    fn from_slice(key: &[u8]) -> Result<Self, String> {
        if key.len() != STORAGE_KEY_BYTES {
            return Err("Workspace key has an invalid length.".to_string());
        }

        let mut normalized = [0; STORAGE_KEY_BYTES];
        normalized.copy_from_slice(key);
        Ok(Self::new(normalized))
    }

    fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| "Could not initialize workspace encryption.".to_string())?;
        let mut nonce = [0; NONCE_BYTES];
        OsRng.fill_bytes(&mut nonce);
        let ciphertext = cipher
            .encrypt(Nonce::from_slice(&nonce), plaintext)
            .map_err(|_| "Could not encrypt workspace data.".to_string())?;
        let envelope = EncryptedJsonEnvelope {
            algorithm: ENCRYPTED_JSON_ALGORITHM.to_string(),
            ciphertext: BASE64_STANDARD.encode(ciphertext),
            format: ENCRYPTED_JSON_FORMAT.to_string(),
            nonce: BASE64_STANDARD.encode(nonce),
        };

        serde_json::to_vec_pretty(&envelope).map_err(|err| err.to_string())
    }

    fn decrypt(&self, envelope: &EncryptedJsonEnvelope) -> Result<Vec<u8>, String> {
        if envelope.format != ENCRYPTED_JSON_FORMAT
            || envelope.algorithm != ENCRYPTED_JSON_ALGORITHM
        {
            return Err("Unsupported encrypted workspace format.".to_string());
        }

        let nonce = BASE64_STANDARD
            .decode(&envelope.nonce)
            .map_err(|_| "Workspace encrypted nonce is invalid.".to_string())?;
        if nonce.len() != NONCE_BYTES {
            return Err("Workspace encrypted nonce has an invalid length.".to_string());
        }
        let ciphertext = BASE64_STANDARD
            .decode(&envelope.ciphertext)
            .map_err(|_| "Workspace encrypted payload is invalid.".to_string())?;
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| "Could not initialize workspace decryption.".to_string())?;

        cipher
            .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
            .map_err(|_| "Could not decrypt workspace data.".to_string())
    }
}

#[cfg(target_os = "windows")]
fn protect_storage_key(raw_key: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input = CRYPT_INTEGER_BLOB {
        cbData: raw_key.len() as u32,
        pbData: raw_key.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let result = unsafe {
        CryptProtectData(
            &input,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if result == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }

    let protected =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData as *mut core::ffi::c_void);
    }
    Ok(protected)
}

#[cfg(target_os = "windows")]
fn unprotect_storage_key(protected_key: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input = CRYPT_INTEGER_BLOB {
        cbData: protected_key.len() as u32,
        pbData: protected_key.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let result = unsafe {
        CryptUnprotectData(
            &input,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if result == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }

    let raw_key =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData as *mut core::ffi::c_void);
    }
    Ok(raw_key)
}

#[cfg(not(target_os = "windows"))]
fn protect_storage_key(raw_key: &[u8]) -> Result<Vec<u8>, String> {
    Ok(raw_key.to_vec())
}

#[cfg(not(target_os = "windows"))]
fn unprotect_storage_key(protected_key: &[u8]) -> Result<Vec<u8>, String> {
    Ok(protected_key.to_vec())
}

fn storage_key_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    Ok(data_dir.join(LOCAL_STORAGE_KEY_FILE))
}

fn storage_cipher(app: &AppHandle) -> Result<StorageCipher, String> {
    let key_path = storage_key_path(app)?;
    if key_path.exists() {
        let protected_key = fs::read(&key_path).map_err(|err| err.to_string())?;
        return StorageCipher::from_slice(&unprotect_storage_key(&protected_key)?);
    }

    let mut raw_key = [0; STORAGE_KEY_BYTES];
    OsRng.fill_bytes(&mut raw_key);
    let protected_key = protect_storage_key(&raw_key)?;
    write_bytes_atomically(&key_path, &protected_key)?;
    StorageCipher::from_slice(&raw_key)
}

fn legacy_data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    Ok(data_dir.join("oneplace-data.json"))
}

fn data_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    let root = data_dir.join("workspace");
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    recover_workspace_dir(&root)?;
    fs::create_dir_all(&root).map_err(|err| err.to_string())?;
    Ok(root)
}

fn workspace_manifest_path_for_root(data_root: &Path) -> PathBuf {
    data_root.join("workspace.json")
}

fn notebooks_root_dir_for_root(data_root: &Path) -> Result<PathBuf, String> {
    let root = data_root.join("notebooks");
    fs::create_dir_all(&root).map_err(|err| err.to_string())?;
    Ok(root)
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;

    for ch in value.chars() {
        let normalized = ch.to_ascii_lowercase();
        if normalized.is_ascii_alphanumeric() {
            slug.push(normalized);
            last_was_dash = false;
        } else if !last_was_dash {
            slug.push('-');
            last_was_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn as_object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, String> {
    value
        .as_object_mut()
        .ok_or_else(|| "Expected JSON object.".to_string())
}

fn get_str<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("Missing string field: {key}"))
}

fn get_id<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    let id = get_str(value, key)?;
    if id.is_empty() {
        return Err(format!("Missing string field: {key}"));
    }
    Ok(id)
}

fn create_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

fn unique_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("{}-{nanos}", process::id())
}

fn hidden_sibling_path(path: &Path, marker: &str) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Path has no parent: {}", path.display()))?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("oneplace");
    Ok(parent.join(format!(".{name}.{marker}.{}", unique_suffix())))
}

fn is_loadable_workspace_dir_with_cipher(data_root: &Path, cipher: Option<&StorageCipher>) -> bool {
    matches!(
        load_workspace_from_root_with_cipher(data_root, None, cipher),
        Ok(Some(_))
    )
}

fn workspace_recovery_candidates(data_root: &Path) -> Result<Vec<PathBuf>, String> {
    let parent = data_root
        .parent()
        .ok_or_else(|| format!("Path has no parent: {}", data_root.display()))?;
    if !parent.exists() {
        return Ok(Vec::new());
    }

    let name = data_root
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("workspace");
    let backup_prefix = format!(".{name}.backup.");
    let temp_prefix = format!(".{name}.tmp.");
    let mut candidates = Vec::new();

    for entry in fs::read_dir(parent).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if !(file_name.starts_with(&backup_prefix) || file_name.starts_with(&temp_prefix)) {
            continue;
        }

        let modified = entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .unwrap_or(UNIX_EPOCH);
        candidates.push((modified, path));
    }

    candidates.sort_by(|left, right| right.0.cmp(&left.0));
    Ok(candidates.into_iter().map(|(_, path)| path).collect())
}

fn recover_workspace_dir_with_cipher(
    data_root: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<(), String> {
    if is_loadable_workspace_dir_with_cipher(data_root, cipher) {
        return Ok(());
    }

    let recovery_path = workspace_recovery_candidates(data_root)?
        .into_iter()
        .find(|candidate| is_loadable_workspace_dir_with_cipher(candidate, cipher));
    let Some(recovery_path) = recovery_path else {
        return Ok(());
    };

    let displaced_path = if data_root.exists() {
        let corrupt_path = hidden_sibling_path(data_root, "corrupt")?;
        fs::rename(data_root, &corrupt_path).map_err(|err| err.to_string())?;
        Some(corrupt_path)
    } else {
        None
    };

    match fs::rename(&recovery_path, data_root) {
        Ok(()) => Ok(()),
        Err(err) => {
            if let Some(displaced_path) = displaced_path {
                let _ = fs::rename(displaced_path, data_root);
            }
            Err(err.to_string())
        }
    }
}

fn recover_workspace_dir(data_root: &Path) -> Result<(), String> {
    recover_workspace_dir_with_cipher(data_root, None)
}

fn encode_path_component(value: &str, label: &str) -> Result<String, String> {
    if value.is_empty() {
        return Err(format!("{label} cannot be empty."));
    }

    let mut encoded = String::new();
    for byte in value.bytes() {
        let ch = byte as char;
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            encoded.push(ch);
        } else {
            encoded.push_str(&format!("~{byte:02X}"));
        }
    }

    Ok(encoded)
}

fn safe_join_relative(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute() {
        return Err("Stored path must be relative.".to_string());
    }

    for component in relative_path.components() {
        if !matches!(component, Component::Normal(_)) {
            return Err(
                "Stored path cannot contain parent or current directory segments.".to_string(),
            );
        }
    }

    Ok(base.join(relative_path))
}

fn safe_join_existing(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let target = safe_join_relative(base, relative)?;
    let canonical_base = base.canonicalize().map_err(|err| err.to_string())?;
    let canonical_target = target.canonicalize().map_err(|err| err.to_string())?;

    if !canonical_target.starts_with(&canonical_base) {
        return Err("Stored path resolves outside the expected folder.".to_string());
    }

    Ok(canonical_target)
}

fn replace_file_with_temp(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    if target_path.exists() {
        if target_path.is_dir() {
            return Err(format!(
                "Cannot replace directory with file: {}",
                target_path.display()
            ));
        }

        let backup_path = hidden_sibling_path(target_path, "backup")?;
        fs::rename(target_path, &backup_path).map_err(|err| err.to_string())?;

        match fs::rename(temp_path, target_path) {
            Ok(()) => {
                let _ = fs::remove_file(&backup_path);
                Ok(())
            }
            Err(err) => {
                let restore_result = fs::rename(&backup_path, target_path);
                let _ = fs::remove_file(temp_path);
                match restore_result {
                    Ok(()) => Err(err.to_string()),
                    Err(restore_err) => Err(format!(
                        "{}; also failed to restore {}: {}",
                        err,
                        target_path.display(),
                        restore_err
                    )),
                }
            }
        }
    } else {
        fs::rename(temp_path, target_path).map_err(|err| err.to_string())
    }
}

fn write_bytes_atomically(path: &Path, bytes: &[u8]) -> Result<(), String> {
    create_parent_dir(path)?;
    let temp_path = hidden_sibling_path(path, "tmp")?;
    fs::write(&temp_path, bytes).map_err(|err| err.to_string())?;
    replace_file_with_temp(&temp_path, path)
}

fn replace_dir_with_temp(temp_dir: &Path, target_dir: &Path) -> Result<(), String> {
    create_parent_dir(target_dir)?;

    if target_dir.exists() {
        if !target_dir.is_dir() {
            return Err(format!(
                "Cannot replace file with notebook folder: {}",
                target_dir.display()
            ));
        }

        let backup_dir = hidden_sibling_path(target_dir, "backup")?;
        fs::rename(target_dir, &backup_dir).map_err(|err| err.to_string())?;

        match fs::rename(temp_dir, target_dir) {
            Ok(()) => {
                let _ = fs::remove_dir_all(&backup_dir);
                Ok(())
            }
            Err(err) => {
                let restore_result = fs::rename(&backup_dir, target_dir);
                let _ = fs::remove_dir_all(temp_dir);
                match restore_result {
                    Ok(()) => Err(err.to_string()),
                    Err(restore_err) => Err(format!(
                        "{}; also failed to restore {}: {}",
                        err,
                        target_dir.display(),
                        restore_err
                    )),
                }
            }
        }
    } else {
        fs::rename(temp_dir, target_dir).map_err(|err| err.to_string())
    }
}

fn write_pretty_json_with_cipher(
    path: &Path,
    value: &Value,
    cipher: Option<&StorageCipher>,
) -> Result<(), String> {
    let raw = serde_json::to_vec_pretty(value).map_err(|err| err.to_string())?;
    let bytes = if let Some(cipher) = cipher {
        cipher.encrypt(&raw)?
    } else {
        raw
    };
    write_bytes_atomically(path, &bytes)
}

fn write_pretty_json(path: &Path, value: &Value) -> Result<(), String> {
    write_pretty_json_with_cipher(path, value, None)
}

fn parse_json_bytes_with_cipher(
    bytes: &[u8],
    cipher: Option<&StorageCipher>,
) -> Result<Value, String> {
    if let Ok(envelope) = serde_json::from_slice::<EncryptedJsonEnvelope>(bytes) {
        if envelope.format == ENCRYPTED_JSON_FORMAT {
            let cipher = cipher.ok_or_else(|| {
                "Workspace data is encrypted, but no workspace key is available.".to_string()
            })?;
            let plaintext = cipher.decrypt(&envelope)?;
            return serde_json::from_slice(&plaintext).map_err(|err| err.to_string());
        }
    }

    serde_json::from_slice(bytes).map_err(|err| err.to_string())
}

fn read_json_file_with_cipher(
    path: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<Value, String> {
    let raw = fs::read(path).map_err(|err| err.to_string())?;
    parse_json_bytes_with_cipher(&raw, cipher)
}

fn load_notebook_from_dir_with_cipher(
    notebook_dir: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<Value, String> {
    let notebook_file = notebook_dir.join("notebook.json");
    let mut notebook = read_json_file_with_cipher(&notebook_file, cipher)?;

    let groups = as_object_mut(&mut notebook)?
        .get_mut("sectionGroups")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "Notebook metadata is missing section groups.".to_string())?;

    for group in groups {
        let sections = as_object_mut(group)?
            .get_mut("sections")
            .and_then(Value::as_array_mut)
            .ok_or_else(|| "Notebook metadata is missing sections.".to_string())?;

        for section in sections.iter_mut() {
            let pages_file = section
                .get("pagesFile")
                .and_then(Value::as_str)
                .ok_or_else(|| "Section metadata is missing pagesFile.".to_string())?;
            let section_path = safe_join_existing(notebook_dir, pages_file)?;
            *section = read_json_file_with_cipher(&section_path, cipher)?;
        }
    }

    Ok(notebook)
}

fn load_notebook_from_dir(notebook_dir: &Path) -> Result<Value, String> {
    load_notebook_from_dir_with_cipher(notebook_dir, None)
}

fn section_file_name(group_id: &str, section_id: &str) -> Result<String, String> {
    Ok(format!(
        "{}__{}.json",
        encode_path_component(group_id, "Section group ID")?,
        encode_path_component(section_id, "Section ID")?
    ))
}

fn write_notebook_contents_to_dir_with_cipher(
    notebook: &Value,
    notebook_dir: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<(), String> {
    let notebook_id = get_id(notebook, "id")?;

    let sections_dir = notebook_dir.join("sections");
    fs::create_dir_all(&sections_dir).map_err(|err| err.to_string())?;

    let mut notebook_metadata = notebook.clone();
    let notebook_object = as_object_mut(&mut notebook_metadata)?;
    let section_groups = notebook_object
        .get_mut("sectionGroups")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| format!("Notebook {notebook_id} is missing section groups."))?;

    for group in section_groups {
        let group_id = get_id(group, "id")?.to_string();
        let group_sections = as_object_mut(group)?
            .get_mut("sections")
            .and_then(Value::as_array_mut)
            .ok_or_else(|| format!("Section group {group_id} is missing sections."))?;

        for section in group_sections.iter_mut() {
            let full_section = section.clone();
            let section_id = get_id(&full_section, "id")?.to_string();
            full_section
                .get("pages")
                .and_then(Value::as_array)
                .ok_or_else(|| format!("Section {section_id} is missing pages."))?;
            let filename = section_file_name(&group_id, &section_id)?;
            let section_path = sections_dir.join(&filename);
            write_pretty_json_with_cipher(&section_path, &full_section, cipher)?;

            let section_object = as_object_mut(section)?;
            section_object.remove("pages");
            section_object.insert(
                "pagesFile".to_string(),
                Value::String(format!("sections/{filename}")),
            );
        }
    }

    let notebook_file = notebook_dir.join("notebook.json");
    write_pretty_json_with_cipher(&notebook_file, &notebook_metadata, cipher)?;
    Ok(())
}

fn write_notebook_contents_to_dir(notebook: &Value, notebook_dir: &Path) -> Result<(), String> {
    write_notebook_contents_to_dir_with_cipher(notebook, notebook_dir, None)
}

fn write_notebook_to_dir_with_cipher(
    notebook: &Value,
    notebook_dir: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<(), String> {
    create_parent_dir(notebook_dir)?;
    let temp_dir = hidden_sibling_path(notebook_dir, "tmp")?;

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|err| err.to_string())?;
    }

    fs::create_dir_all(&temp_dir).map_err(|err| err.to_string())?;

    match write_notebook_contents_to_dir_with_cipher(notebook, &temp_dir, cipher) {
        Ok(()) => replace_dir_with_temp(&temp_dir, notebook_dir),
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_dir);
            Err(err)
        }
    }
}

fn write_notebook_to_dir(notebook: &Value, notebook_dir: &Path) -> Result<(), String> {
    write_notebook_to_dir_with_cipher(notebook, notebook_dir, None)
}

fn write_workspace_contents_to_root_with_cipher(
    raw_data: &str,
    data_root: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<PathBuf, String> {
    let mut app_state: Value = serde_json::from_str(raw_data).map_err(|err| err.to_string())?;
    let notebooks = app_state
        .get("notebooks")
        .and_then(Value::as_array)
        .cloned()
        .ok_or_else(|| "App state is missing notebooks.".to_string())?;

    let manifest_path = workspace_manifest_path_for_root(data_root);
    let notebooks_root = notebooks_root_dir_for_root(data_root)?;
    let mut notebook_refs = Vec::with_capacity(notebooks.len());

    for notebook in notebooks {
        let notebook_id = get_id(&notebook, "id")?;
        let notebook_name = get_str(&notebook, "name")?;
        let safe_notebook_id = encode_path_component(notebook_id, "Notebook ID")?;
        let slug = slugify(notebook_name);
        let folder_name = if slug.is_empty() {
            format!("notebook-{safe_notebook_id}")
        } else {
            format!("{slug}-{safe_notebook_id}")
        };
        let notebook_dir = notebooks_root.join(&folder_name);
        write_notebook_to_dir_with_cipher(&notebook, &notebook_dir, cipher)?;

        notebook_refs.push(Value::Object(Map::from_iter([
            ("id".to_string(), Value::String(notebook_id.to_string())),
            (
                "path".to_string(),
                Value::String(format!(
                    "notebooks/{}/notebook.json",
                    notebook_dir
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or_default()
                )),
            ),
        ])));
    }

    let manifest_object = as_object_mut(&mut app_state)?;
    manifest_object.insert("notebooks".to_string(), Value::Array(notebook_refs));
    write_pretty_json_with_cipher(&manifest_path, &app_state, cipher)?;

    Ok(manifest_path)
}

fn save_workspace_to_root_with_cipher_and_backup(
    raw_data: &str,
    data_root: &Path,
    cipher: Option<&StorageCipher>,
    create_backup: bool,
) -> Result<PathBuf, String> {
    create_parent_dir(data_root)?;
    if create_backup {
        let _ = create_rolling_backup_for_root(data_root, cipher);
    }

    let temp_root = hidden_sibling_path(data_root, "tmp")?;

    if temp_root.exists() {
        fs::remove_dir_all(&temp_root).map_err(|err| err.to_string())?;
    }

    fs::create_dir_all(&temp_root).map_err(|err| err.to_string())?;

    match write_workspace_contents_to_root_with_cipher(raw_data, &temp_root, cipher) {
        Ok(_) => {
            replace_dir_with_temp(&temp_root, data_root)?;
            if create_backup {
                prune_workspace_backups_for_root(data_root, ROLLING_BACKUP_LIMIT)?;
            }
            Ok(workspace_manifest_path_for_root(data_root))
        }
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_root);
            Err(err)
        }
    }
}

fn save_workspace_to_root_with_cipher(
    raw_data: &str,
    data_root: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<PathBuf, String> {
    save_workspace_to_root_with_cipher_and_backup(raw_data, data_root, cipher, true)
}

fn save_workspace_to_root(raw_data: &str, data_root: &Path) -> Result<PathBuf, String> {
    save_workspace_to_root_with_cipher(raw_data, data_root, None)
}

fn rolling_backups_dir_for_root(data_root: &Path) -> Result<PathBuf, String> {
    let parent = data_root
        .parent()
        .ok_or_else(|| format!("Path has no parent: {}", data_root.display()))?;
    Ok(parent.join("workspace-backups"))
}

fn backup_id() -> String {
    format!(
        "{}-{}",
        Utc::now().format("%Y%m%dT%H%M%SZ"),
        unique_suffix()
    )
}

fn modified_at_rfc3339(path: &Path) -> String {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .map(chrono::DateTime::<Utc>::from)
        .map(|time| time.to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}

fn list_workspace_backups_for_root(data_root: &Path) -> Result<Vec<BackupSnapshot>, String> {
    let backups_dir = rolling_backups_dir_for_root(data_root)?;
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();
    for entry in fs::read_dir(&backups_dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let id = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string();
        if id.is_empty() || id.starts_with('.') {
            continue;
        }

        backups.push(BackupSnapshot {
            created_at: modified_at_rfc3339(&path),
            id,
            path: path.display().to_string(),
        });
    }

    backups.sort_by(|left, right| {
        right
            .created_at
            .cmp(&left.created_at)
            .then_with(|| right.id.cmp(&left.id))
    });
    Ok(backups)
}

fn prune_workspace_backups_for_root(data_root: &Path, limit: usize) -> Result<(), String> {
    let backups = list_workspace_backups_for_root(data_root)?;
    for backup in backups.into_iter().skip(limit) {
        let path = PathBuf::from(backup.path);
        if path.exists() {
            fs::remove_dir_all(path).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

fn create_rolling_backup_for_root(
    data_root: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<Option<BackupSnapshot>, String> {
    if !data_root.exists() {
        return Ok(None);
    }

    let raw_data = match load_workspace_from_root_with_cipher(data_root, None, cipher) {
        Ok(Some(raw_data)) => raw_data,
        Ok(None) => return Ok(None),
        Err(_) => return Ok(None),
    };

    let backups_dir = rolling_backups_dir_for_root(data_root)?;
    fs::create_dir_all(&backups_dir).map_err(|err| err.to_string())?;
    let target_dir = backups_dir.join(backup_id());
    let temp_dir = hidden_sibling_path(&target_dir, "tmp")?;

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|err| err.to_string())?;
    }
    fs::create_dir_all(&temp_dir).map_err(|err| err.to_string())?;

    match write_workspace_contents_to_root_with_cipher(&raw_data, &temp_dir, cipher) {
        Ok(_) => {
            fs::rename(&temp_dir, &target_dir).map_err(|err| err.to_string())?;
            Ok(Some(BackupSnapshot {
                created_at: modified_at_rfc3339(&target_dir),
                id: target_dir
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default()
                    .to_string(),
                path: target_dir.display().to_string(),
            }))
        }
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_dir);
            Err(err)
        }
    }
}

fn restore_workspace_backup_from_root(
    data_root: &Path,
    backup_id: &str,
    cipher: Option<&StorageCipher>,
) -> Result<RestoredWorkspace, String> {
    let backups_dir = rolling_backups_dir_for_root(data_root)?;
    let backup_dir = safe_join_relative(&backups_dir, backup_id)?;
    if !backup_dir.is_dir() {
        return Err("Backup snapshot was not found.".to_string());
    }

    let raw_data = load_workspace_from_root_with_cipher(&backup_dir, None, cipher)?
        .ok_or_else(|| "Backup snapshot is empty.".to_string())?;
    let _ = create_rolling_backup_for_root(data_root, cipher);
    let restored_path =
        save_workspace_to_root_with_cipher_and_backup(&raw_data, data_root, cipher, false)?;

    Ok(RestoredWorkspace {
        path: restored_path.display().to_string(),
        raw_data,
        restored_at: Utc::now().to_rfc3339(),
    })
}

fn cloud_package_root_for_target(target: &Path) -> PathBuf {
    target.join(CLOUD_PACKAGE_DIR_NAME)
}

fn cloud_workspace_root_for_target(target: &Path) -> PathBuf {
    cloud_package_root_for_target(target).join("workspace")
}

fn sync_workspace_to_cloud_target(
    data_root: &Path,
    cloud_target: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<CloudSyncStatus, String> {
    if !cloud_target.exists() {
        return Err("Cloud save folder does not exist.".to_string());
    }
    if !cloud_target.is_dir() {
        return Err("Cloud save target must be a folder.".to_string());
    }

    let raw_data = load_workspace_from_root_with_cipher(data_root, None, cipher)?
        .ok_or_else(|| "There is no local workspace to sync yet.".to_string())?;
    let package_root = cloud_package_root_for_target(cloud_target);
    fs::create_dir_all(&package_root).map_err(|err| err.to_string())?;
    let workspace_root = cloud_workspace_root_for_target(cloud_target);
    let temp_root = hidden_sibling_path(&workspace_root, "tmp")?;

    if temp_root.exists() {
        fs::remove_dir_all(&temp_root).map_err(|err| err.to_string())?;
    }
    fs::create_dir_all(&temp_root).map_err(|err| err.to_string())?;

    match write_workspace_contents_to_root_with_cipher(&raw_data, &temp_root, cipher) {
        Ok(_) => replace_dir_with_temp(&temp_root, &workspace_root)?,
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_root);
            return Err(err);
        }
    }

    let synced_at = Utc::now().to_rfc3339();
    write_pretty_json(
        &package_root.join("cloud-save.json"),
        &json!({
            "format": "oneplace.cloud-save.v1",
            "savedAt": synced_at,
            "workspacePath": "workspace/workspace.json",
        }),
    )?;

    Ok(CloudSyncStatus {
        enabled: true,
        last_error: None,
        last_synced_at: Some(synced_at),
        path: Some(cloud_target.display().to_string()),
    })
}

fn restore_cloud_workspace_from_target(
    data_root: &Path,
    cloud_target: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<RestoredWorkspace, String> {
    let cloud_workspace = cloud_workspace_root_for_target(cloud_target);
    let raw_data = load_workspace_from_root_with_cipher(&cloud_workspace, None, cipher)?
        .ok_or_else(|| "Cloud save does not contain a workspace.".to_string())?;
    let _ = create_rolling_backup_for_root(data_root, cipher);
    let restored_path =
        save_workspace_to_root_with_cipher_and_backup(&raw_data, data_root, cipher, false)?;

    Ok(RestoredWorkspace {
        path: restored_path.display().to_string(),
        raw_data,
        restored_at: Utc::now().to_rfc3339(),
    })
}

fn cloud_sync_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    Ok(data_dir.join(CLOUD_SYNC_CONFIG_FILE))
}

fn load_cloud_sync_config(app: &AppHandle) -> Result<Option<CloudSyncConfig>, String> {
    let config_path = cloud_sync_config_path(app)?;
    match fs::read_to_string(config_path) {
        Ok(raw) => serde_json::from_str(&raw)
            .map(Some)
            .map_err(|err| err.to_string()),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

fn save_cloud_sync_config(app: &AppHandle, config: &CloudSyncConfig) -> Result<(), String> {
    let raw = serde_json::to_vec_pretty(config).map_err(|err| err.to_string())?;
    write_bytes_atomically(&cloud_sync_config_path(app)?, &raw)
}

fn disabled_cloud_sync_status() -> CloudSyncStatus {
    CloudSyncStatus {
        enabled: false,
        last_error: None,
        last_synced_at: None,
        path: None,
    }
}

fn cloud_status_from_config(config: &CloudSyncConfig) -> CloudSyncStatus {
    CloudSyncStatus {
        enabled: config.enabled,
        last_error: config.last_error.clone(),
        last_synced_at: config.last_synced_at.clone(),
        path: Some(config.path.clone()),
    }
}

fn sync_configured_cloud_workspace(
    app: &AppHandle,
    data_root: &Path,
    cipher: Option<&StorageCipher>,
) -> Result<Option<CloudSyncStatus>, String> {
    let Some(mut config) = load_cloud_sync_config(app)? else {
        return Ok(None);
    };

    if !config.enabled {
        return Ok(Some(cloud_status_from_config(&config)));
    }

    match sync_workspace_to_cloud_target(data_root, Path::new(&config.path), cipher) {
        Ok(status) => {
            config.last_error = None;
            config.last_synced_at = status.last_synced_at.clone();
            save_cloud_sync_config(app, &config)?;
            Ok(Some(status))
        }
        Err(err) => {
            config.last_error = Some(err.clone());
            save_cloud_sync_config(app, &config)?;
            Ok(Some(CloudSyncStatus {
                enabled: true,
                last_error: Some(err),
                last_synced_at: config.last_synced_at,
                path: Some(config.path),
            }))
        }
    }
}

fn save_workspace(
    raw_data: &str,
    app: &AppHandle,
) -> Result<(PathBuf, Option<CloudSyncStatus>), String> {
    let data_root = data_root_dir(app)?;
    let cipher = storage_cipher(app)?;
    let manifest_path = save_workspace_to_root_with_cipher(raw_data, &data_root, Some(&cipher))?;
    let cloud_status = sync_configured_cloud_workspace(app, &data_root, Some(&cipher))?;
    Ok((manifest_path, cloud_status))
}

fn load_workspace_from_root(
    data_root: &Path,
    legacy_path: Option<&Path>,
) -> Result<Option<String>, String> {
    load_workspace_from_root_with_cipher(data_root, legacy_path, None)
}

fn load_workspace_from_root_with_cipher(
    data_root: &Path,
    legacy_path: Option<&Path>,
    cipher: Option<&StorageCipher>,
) -> Result<Option<String>, String> {
    let manifest_path = workspace_manifest_path_for_root(data_root);
    match fs::read(&manifest_path) {
        Ok(raw_manifest) => {
            let mut manifest = parse_json_bytes_with_cipher(&raw_manifest, cipher)?;
            let notebook_refs = manifest
                .get("notebooks")
                .and_then(Value::as_array)
                .cloned()
                .ok_or_else(|| "Workspace manifest is missing notebook references.".to_string())?;
            let mut notebooks = Vec::with_capacity(notebook_refs.len());

            for notebook_ref in notebook_refs {
                let notebook_path = get_str(&notebook_ref, "path")?;
                let absolute_notebook_path = safe_join_existing(data_root, notebook_path)?;
                let notebook_dir = absolute_notebook_path
                    .parent()
                    .ok_or_else(|| "Notebook path is invalid.".to_string())?;
                notebooks.push(load_notebook_from_dir_with_cipher(notebook_dir, cipher)?);
            }

            as_object_mut(&mut manifest)?.insert("notebooks".to_string(), Value::Array(notebooks));
            let raw = serde_json::to_string(&manifest).map_err(|err| err.to_string())?;
            Ok(Some(raw))
        }
        Err(err) if err.kind() == ErrorKind::NotFound => {
            if let Some(legacy_path) = legacy_path {
                match fs::read_to_string(legacy_path) {
                    Ok(raw) => Ok(Some(raw)),
                    Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
                    Err(err) => Err(err.to_string()),
                }
            } else {
                Ok(None)
            }
        }
        Err(err) => Err(err.to_string()),
    }
}

fn load_workspace(app: &AppHandle) -> Result<Option<String>, String> {
    let data_root = data_root_dir(app)?;
    let legacy_path = legacy_data_file_path(app)?;
    let cipher = storage_cipher(app)?;
    recover_workspace_dir_with_cipher(&data_root, Some(&cipher))?;
    load_workspace_from_root_with_cipher(&data_root, Some(&legacy_path), Some(&cipher))
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<String>, String> {
    load_workspace(&app)
}

#[tauri::command]
fn save_data(app: AppHandle, raw_data: String) -> Result<SaveResult, String> {
    let (manifest_path, cloud_status) = save_workspace(&raw_data, &app)?;
    let saved_at = Utc::now().to_rfc3339();

    Ok(SaveResult {
        cloud_error: cloud_status
            .as_ref()
            .and_then(|status| status.last_error.clone()),
        cloud_path: cloud_status.as_ref().and_then(|status| status.path.clone()),
        cloud_saved_at: cloud_status
            .as_ref()
            .and_then(|status| status.last_synced_at.clone()),
        path: manifest_path.display().to_string(),
        saved_at,
    })
}

#[tauri::command]
fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    let data_path = data_root_dir(&app)?;
    let package_info = app.package_info();

    Ok(AppInfo {
        data_path: data_path.display().to_string(),
        name: package_info.name.clone(),
        version: package_info.version.to_string(),
    })
}

#[tauri::command]
fn list_workspace_backups(app: AppHandle) -> Result<Vec<BackupSnapshot>, String> {
    let data_root = data_root_dir(&app)?;
    list_workspace_backups_for_root(&data_root)
}

#[tauri::command]
fn restore_workspace_backup(
    app: AppHandle,
    backup_id: String,
) -> Result<RestoredWorkspace, String> {
    let data_root = data_root_dir(&app)?;
    let cipher = storage_cipher(&app)?;
    restore_workspace_backup_from_root(&data_root, &backup_id, Some(&cipher))
}

#[tauri::command]
fn get_cloud_sync_status(app: AppHandle) -> Result<CloudSyncStatus, String> {
    let Some(config) = load_cloud_sync_config(&app)? else {
        return Ok(disabled_cloud_sync_status());
    };
    Ok(cloud_status_from_config(&config))
}

#[tauri::command]
fn configure_cloud_sync(app: AppHandle, path: String) -> Result<CloudSyncStatus, String> {
    let cloud_target = PathBuf::from(&path);
    if !cloud_target.exists() {
        return Err("Cloud save folder does not exist.".to_string());
    }
    if !cloud_target.is_dir() {
        return Err("Cloud save target must be a folder.".to_string());
    }

    let config = CloudSyncConfig {
        enabled: true,
        last_error: None,
        last_synced_at: None,
        path: cloud_target.display().to_string(),
    };
    save_cloud_sync_config(&app, &config)?;

    let data_root = data_root_dir(&app)?;
    let cipher = storage_cipher(&app)?;
    Ok(
        sync_configured_cloud_workspace(&app, &data_root, Some(&cipher))?
            .unwrap_or_else(|| cloud_status_from_config(&config)),
    )
}

#[tauri::command]
fn clear_cloud_sync(app: AppHandle) -> Result<CloudSyncStatus, String> {
    if let Some(mut config) = load_cloud_sync_config(&app)? {
        config.enabled = false;
        config.last_error = None;
        save_cloud_sync_config(&app, &config)?;
    }

    Ok(disabled_cloud_sync_status())
}

#[tauri::command]
fn sync_cloud_workspace(app: AppHandle) -> Result<CloudSyncStatus, String> {
    let data_root = data_root_dir(&app)?;
    let cipher = storage_cipher(&app)?;
    sync_configured_cloud_workspace(&app, &data_root, Some(&cipher))?
        .ok_or_else(|| "Choose a cloud save folder first.".to_string())
}

#[tauri::command]
fn restore_cloud_workspace(app: AppHandle) -> Result<RestoredWorkspace, String> {
    let config = load_cloud_sync_config(&app)?
        .filter(|config| config.enabled)
        .ok_or_else(|| "Choose a cloud save folder first.".to_string())?;
    let data_root = data_root_dir(&app)?;
    let cipher = storage_cipher(&app)?;
    restore_cloud_workspace_from_target(&data_root, Path::new(&config.path), Some(&cipher))
}

#[tauri::command]
fn open_notebook_dir(path: String) -> Result<String, String> {
    let notebook = load_notebook_from_dir(Path::new(&path))?;
    serde_json::to_string(&notebook).map_err(|err| err.to_string())
}

#[tauri::command]
fn export_notebook_dir(path: String, notebook: String) -> Result<SaveResult, String> {
    let notebook_value: Value = serde_json::from_str(&notebook).map_err(|err| err.to_string())?;
    let notebook_name = get_str(&notebook_value, "name")?;
    let folder_name = slugify(notebook_name);
    let target_dir = if folder_name.is_empty() {
        Path::new(&path).join("notebook-export")
    } else {
        Path::new(&path).join(folder_name)
    };

    write_notebook_to_dir(&notebook_value, &target_dir)?;

    Ok(SaveResult {
        cloud_error: None,
        cloud_path: None,
        cloud_saved_at: None,
        path: target_dir.display().to_string(),
        saved_at: Utc::now().to_rfc3339(),
    })
}

fn export_pdf_file(
    file_path: &Path,
    title: &str,
    created_at: &str,
    text_contents: &str,
) -> Result<(), String> {
    create_parent_dir(file_path)?;
    let temp_path = hidden_sibling_path(file_path, "tmp")?;
    let (doc, page1, layer1) = PdfDocument::new(title, Mm(210.0), Mm(297.0), "Layer 1");
    let layer = doc.get_page(page1).get_layer(layer1);
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|err| err.to_string())?;
    let title_font = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|err| err.to_string())?;

    layer.use_text(title, 20.0, Mm(20.0), Mm(277.0), &title_font);
    layer.use_text(
        format!("Created {created_at}"),
        10.0,
        Mm(20.0),
        Mm(268.0),
        &font,
    );

    let mut y = 255.0;
    for raw_line in text_contents.lines() {
        let line = raw_line.trim_end();
        if line.is_empty() {
            y -= 6.0;
        } else {
            layer.use_text(line, 11.0, Mm(20.0), Mm(y), &font);
            y -= 7.0;
        }

        if y < 18.0 {
            break;
        }
    }

    let save_result = (|| {
        let file = fs::File::create(&temp_path).map_err(|err| err.to_string())?;
        doc.save(&mut BufWriter::new(file))
            .map_err(|err| err.to_string())
    })();

    if let Err(err) = save_result {
        let _ = fs::remove_file(&temp_path);
        return Err(err);
    }

    replace_file_with_temp(&temp_path, file_path)
}

fn is_importable_onenote_extension(extension: &str) -> bool {
    matches!(extension, "htm" | "html" | "md" | "mht" | "mhtml" | "txt")
}

fn to_rfc3339_string(metadata: &fs::Metadata) -> String {
    metadata
        .modified()
        .ok()
        .map(chrono::DateTime::<Utc>::from)
        .map(|time| time.to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}

fn collect_onenote_export_files(
    root: &Path,
    current: &Path,
    files: &mut Vec<ImportedOneNoteFile>,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|err| err.to_string())?;

        if metadata.is_dir() {
            collect_onenote_export_files(root, &path, files)?;
            continue;
        }

        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();

        if !is_importable_onenote_extension(&extension) {
            continue;
        }

        let contents = fs::read_to_string(&path).map_err(|err| err.to_string())?;
        let relative_path = path
            .strip_prefix(root)
            .map_err(|err| err.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let relative_dir = Path::new(&relative_path)
            .parent()
            .map(|parent| parent.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        let name = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("Imported Page")
            .to_string();

        files.push(ImportedOneNoteFile {
            absolute_path: path.display().to_string(),
            contents,
            extension,
            modified_at: to_rfc3339_string(&metadata),
            name,
            relative_dir,
            relative_path,
        });
    }

    Ok(())
}

#[tauri::command]
fn import_onenote_export_dir(path: String) -> Result<ImportedOneNoteDirectory, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err("The selected folder does not exist.".to_string());
    }

    if !root.is_dir() {
        return Err("The selected OneNote export path is not a folder.".to_string());
    }

    let mut files = Vec::new();
    collect_onenote_export_files(&root, &root, &mut files)?;
    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    let name = root
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Imported OneNote Notebook")
        .to_string();

    Ok(ImportedOneNoteDirectory { files, name, path })
}

fn imported_folder_asset_kind(mime_type: &str) -> &'static str {
    let normalized = mime_type.to_ascii_lowercase();
    if normalized == "application/pdf" {
        return "printout";
    }

    if normalized.starts_with("image/") && normalized != "image/svg+xml" {
        return "image";
    }

    if normalized.starts_with("audio/") {
        return "audio";
    }

    "file"
}

fn safe_folder_data_url_mime_type(mime_type: &str, kind: &str) -> String {
    let normalized = mime_type.to_ascii_lowercase();
    if kind == "file" && (normalized == "text/html" || normalized == "image/svg+xml") {
        return "application/octet-stream".to_string();
    }

    mime_type.to_string()
}

fn relative_import_path(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map_err(|err| err.to_string())
        .map(|value| value.to_string_lossy().replace('\\', "/"))
}

fn collect_folder_tree_files(
    root: &Path,
    canonical_root: &Path,
    current: &Path,
    directories: &mut Vec<String>,
    files: &mut Vec<ImportedFolderFile>,
) -> Result<(), String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(current).map_err(|err| err.to_string())? {
        entries.push(entry.map_err(|err| err.to_string())?);
    }
    entries.sort_by(|left, right| left.file_name().cmp(&right.file_name()));

    for entry in entries {
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path).map_err(|err| err.to_string())?;
        if metadata.file_type().is_symlink() {
            continue;
        }

        if metadata.is_dir() {
            let relative_path = relative_import_path(root, &path)?;
            if !relative_path.is_empty() {
                directories.push(relative_path);
            }
            collect_folder_tree_files(root, canonical_root, &path, directories, files)?;
            continue;
        }

        if !metadata.is_file() {
            continue;
        }

        let canonical_path = path.canonicalize().map_err(|err| err.to_string())?;
        if !canonical_path.starts_with(canonical_root) {
            return Err("Folder import file resolved outside the selected folder.".to_string());
        }

        let bytes = fs::read(&canonical_path).map_err(|err| err.to_string())?;
        let mime_type = mime_guess::from_path(&canonical_path)
            .first_or_octet_stream()
            .essence_str()
            .to_string();
        let kind = imported_folder_asset_kind(&mime_type).to_string();
        let data_url_mime_type = safe_folder_data_url_mime_type(&mime_type, &kind);
        let relative_path = relative_import_path(root, &path)?;
        let relative_dir = Path::new(&relative_path)
            .parent()
            .map(|parent| parent.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Imported File")
            .to_string();
        let data_url = format!(
            "data:{};base64,{}",
            data_url_mime_type,
            BASE64_STANDARD.encode(bytes.as_slice())
        );

        files.push(ImportedFolderFile {
            absolute_path: canonical_path.display().to_string(),
            data_url,
            extension,
            kind,
            mime_type,
            modified_at: to_rfc3339_string(&metadata),
            name,
            relative_dir,
            relative_path,
            size: bytes.len() as u64,
        });
    }

    Ok(())
}

fn import_folder_tree_from_root(root: &Path) -> Result<ImportedFolderTreeDirectory, String> {
    if !root.exists() {
        return Err("The selected folder does not exist.".to_string());
    }

    if !root.is_dir() {
        return Err("The selected folder import path is not a folder.".to_string());
    }

    let canonical_root = root.canonicalize().map_err(|err| err.to_string())?;
    let mut directories = Vec::new();
    let mut files = Vec::new();
    collect_folder_tree_files(root, &canonical_root, root, &mut directories, &mut files)?;
    directories.sort();
    directories.dedup();
    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    let name = root
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Imported Folder")
        .to_string();

    Ok(ImportedFolderTreeDirectory {
        directories,
        files,
        name,
        path: root.display().to_string(),
    })
}

#[tauri::command]
fn import_folder_tree_dir(path: String) -> Result<ImportedFolderTreeDirectory, String> {
    import_folder_tree_from_root(Path::new(&path))
}

#[tauri::command]
fn read_local_asset_file(path: String, root_path: String) -> Result<ImportedAssetData, String> {
    let asset_path = PathBuf::from(&path);
    let root = PathBuf::from(&root_path);
    let canonical_root = root.canonicalize().map_err(|err| err.to_string())?;
    let canonical_asset_path = asset_path.canonicalize().map_err(|err| err.to_string())?;

    if !canonical_asset_path.starts_with(&canonical_root) {
        return Err("Referenced asset is outside the selected import folder.".to_string());
    }

    let bytes = fs::read(&canonical_asset_path).map_err(|err| err.to_string())?;
    let mime_type = mime_guess::from_path(&canonical_asset_path)
        .first_or_octet_stream()
        .essence_str()
        .to_string();
    let encoded = BASE64_STANDARD.encode(bytes.as_slice());
    let data_url = format!("data:{};base64,{}", mime_type, encoded);
    let name = canonical_asset_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("attachment")
        .to_string();

    Ok(ImportedAssetData {
        data_url,
        mime_type,
        name,
        size: bytes.len() as u64,
    })
}

#[tauri::command]
fn export_page_file(
    file_path: String,
    format: String,
    title: String,
    created_at: String,
    html_contents: String,
    text_contents: String,
) -> Result<SaveResult, String> {
    let target_path = PathBuf::from(&file_path);
    create_parent_dir(&target_path)?;

    match format.as_str() {
        "html" => write_bytes_atomically(&target_path, html_contents.as_bytes())?,
        "txt" => write_bytes_atomically(&target_path, text_contents.as_bytes())?,
        "pdf" => export_pdf_file(&target_path, &title, &created_at, &text_contents)?,
        other => return Err(format!("Unsupported export format: {other}")),
    }

    Ok(SaveResult {
        cloud_error: None,
        cloud_path: None,
        cloud_saved_at: None,
        path: target_path.display().to_string(),
        saved_at: Utc::now().to_rfc3339(),
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            get_app_info,
            list_workspace_backups,
            restore_workspace_backup,
            get_cloud_sync_status,
            configure_cloud_sync,
            clear_cloud_sync,
            sync_cloud_workspace,
            restore_cloud_workspace,
            open_notebook_dir,
            import_onenote_export_dir,
            import_folder_tree_dir,
            read_local_asset_file,
            export_notebook_dir,
            export_page_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn unique_test_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("oneplace-{name}-{}", unique_suffix()));
        fs::create_dir_all(&dir).expect("create temp test dir");
        dir
    }

    fn sample_workspace() -> Value {
        json!({
            "meta": {},
            "notebooks": [{
                "color": "#3784d6",
                "icon": "book",
                "id": "notebook-1",
                "name": "Notebook",
                "sectionGroups": [{
                    "id": "group-1",
                    "name": "Sections",
                    "sections": [{
                        "color": "#3784d6",
                        "id": "section-1",
                        "name": "Section",
                        "pages": [{
                            "accent": "#3784d6",
                            "children": [],
                            "content": "<p>safe</p>",
                            "createdAt": "2026-06-23T00:00:00.000Z",
                            "id": "page-1",
                            "inkStrokes": [],
                            "isCollapsed": false,
                            "snippet": "safe",
                            "tags": [],
                            "task": null,
                            "title": "Page",
                            "updatedAt": "2026-06-23T00:00:00.000Z"
                        }],
                        "passwordHash": null,
                        "passwordHint": ""
                    }]
                }],
                "selectedNotebookId": "notebook-1",
                "selectedSectionGroupId": "group-1",
                "selectedSectionId": "section-1",
                "selectedPageId": "page-1"
            }]
        })
    }

    fn sample_workspace_with_page_text(text: &str) -> Value {
        let mut workspace = sample_workspace();
        workspace["notebooks"][0]["sectionGroups"][0]["sections"][0]["pages"][0]["title"] =
            Value::String(text.to_string());
        workspace["notebooks"][0]["sectionGroups"][0]["sections"][0]["pages"][0]["content"] =
            Value::String(format!("<p>{text}</p>"));
        workspace["notebooks"][0]["sectionGroups"][0]["sections"][0]["pages"][0]["snippet"] =
            Value::String(text.to_string());
        workspace
    }

    fn read_tree_text(root: &Path) -> String {
        fn visit(path: &Path, output: &mut String) {
            if path.is_dir() {
                for entry in fs::read_dir(path).expect("read dir") {
                    visit(&entry.expect("dir entry").path(), output);
                }
                return;
            }

            if let Ok(contents) = fs::read_to_string(path) {
                output.push_str(&contents);
            }
        }

        let mut output = String::new();
        visit(root, &mut output);
        output
    }

    #[test]
    fn section_file_name_encodes_path_separator_ids() {
        let forward = section_file_name("../outside", "section-1").expect("encoded section file");
        let backward = section_file_name("group-1", "..\\outside").expect("encoded section file");

        assert!(!forward.contains('/'));
        assert!(!forward.contains('\\'));
        assert!(!backward.contains('/'));
        assert!(!backward.contains('\\'));
        assert!(forward.ends_with(".json"));
        assert!(backward.ends_with(".json"));
    }

    #[test]
    fn load_notebook_rejects_pages_file_outside_notebook_dir() {
        let root = unique_test_dir("load-traversal");
        let notebook_dir = root.join("notebook");
        fs::create_dir_all(&notebook_dir).expect("create notebook dir");
        write_pretty_json(
            &notebook_dir.join("notebook.json"),
            &json!({
                "id": "notebook-1",
                "name": "Notebook",
                "sectionGroups": [{
                    "id": "group-1",
                    "name": "Sections",
                    "sections": [{
                        "id": "section-1",
                        "name": "Section",
                        "pagesFile": "../outside.json"
                    }]
                }]
            }),
        )
        .expect("write notebook metadata");
        write_pretty_json(
            &root.join("outside.json"),
            &json!({"id": "section-1", "name": "Escaped", "pages": []}),
        )
        .expect("write outside section");

        let result = load_notebook_from_dir(&notebook_dir);

        assert!(result.is_err());
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }

    #[test]
    fn write_notebook_encodes_ids_that_would_escape_sections_dir() {
        let root = unique_test_dir("write-traversal");
        let notebook = json!({
            "id": "notebook-1",
            "name": "Notebook",
            "sectionGroups": [{
                "id": "../escaped",
                "name": "Sections",
                "sections": [{
                    "id": "section-1",
                    "name": "Section",
                    "pages": []
                }]
            }]
        });

        let notebook_dir = root.join("notebook");
        let result = write_notebook_contents_to_dir(&notebook, &notebook_dir);

        assert!(result.is_ok());
        assert!(!root
            .join("notebook")
            .join("escaped__section-1.json")
            .exists());
        assert_eq!(
            fs::read_dir(notebook_dir.join("sections"))
                .expect("sections dir")
                .filter_map(Result::ok)
                .count(),
            1,
        );
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }

    #[test]
    fn folder_tree_import_collects_nested_mixed_files_and_empty_dirs() {
        let root = unique_test_dir("case-folder-import");
        fs::create_dir_all(root.join("Pleadings").join("Motions")).expect("create nested folder");
        fs::create_dir_all(root.join("Empty Folder")).expect("create empty folder");
        fs::create_dir_all(root.join("Discovery")).expect("create discovery folder");
        fs::write(root.join("overview.txt"), "Case overview").expect("write text file");
        fs::write(root.join("Pleadings").join("Complaint.pdf"), b"%PDF-1.7")
            .expect("write pdf file");
        fs::write(
            root.join("Pleadings").join("Motions").join("Exhibit A.jpg"),
            [0xff, 0xd8, 0xff, 0xd9],
        )
        .expect("write image file");
        fs::write(root.join("Discovery").join("native-file.docx"), b"PK")
            .expect("write document file");

        let imported = import_folder_tree_from_root(&root).expect("import folder tree");

        assert!(imported.directories.contains(&"Empty Folder".to_string()));
        assert!(imported
            .directories
            .contains(&"Pleadings/Motions".to_string()));
        assert_eq!(imported.files.len(), 4);
        assert!(imported.files.iter().any(|file| {
            file.relative_path == "Pleadings/Complaint.pdf"
                && file.kind == "printout"
                && file.mime_type == "application/pdf"
                && file.data_url.starts_with("data:application/pdf;base64,")
        }));
        assert!(imported.files.iter().any(|file| {
            file.relative_path == "Pleadings/Motions/Exhibit A.jpg"
                && file.kind == "image"
                && file.mime_type == "image/jpeg"
        }));
        assert!(imported.files.iter().any(|file| {
            file.relative_path == "Discovery/native-file.docx" && file.kind == "file"
        }));
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }

    #[test]
    fn failed_workspace_save_keeps_previous_workspace_loadable() {
        let root = unique_test_dir("workspace-rollback");
        let first = sample_workspace();
        let bad = json!({
            "meta": {},
            "notebooks": [{
                "id": "bad-notebook",
                "name": "Broken",
                "sectionGroups": [{
                    "id": "bad-group",
                    "name": "Sections",
                    "sections": [{
                        "id": "bad-section",
                        "name": "Missing Pages"
                    }]
                }]
            }]
        });

        save_workspace_to_root(&serde_json::to_string(&first).unwrap(), &root)
            .expect("initial save");
        let failed = save_workspace_to_root(&serde_json::to_string(&bad).unwrap(), &root);

        assert!(failed.is_err());
        let loaded = load_workspace_from_root(&root, None)
            .expect("load after failed save")
            .expect("workspace should remain");
        assert!(loaded.contains("notebook-1"));
        assert!(!loaded.contains("bad-notebook"));
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }

    #[test]
    fn missing_workspace_recovers_from_orphaned_backup() {
        let base = unique_test_dir("workspace-recover-missing");
        let root = base.join("workspace");
        let first = sample_workspace();

        save_workspace_to_root(&serde_json::to_string(&first).unwrap(), &root)
            .expect("initial save");
        let backup = hidden_sibling_path(&root, "backup").expect("backup path");
        fs::rename(&root, &backup).expect("simulate crash after workspace moved to backup");

        recover_workspace_dir(&root).expect("recover workspace");

        let loaded = load_workspace_from_root(&root, None)
            .expect("load recovered workspace")
            .expect("workspace should remain");
        assert!(loaded.contains("notebook-1"));
        fs::remove_dir_all(base).expect("cleanup temp test dir");
    }

    #[test]
    fn empty_workspace_recovers_from_orphaned_backup() {
        let base = unique_test_dir("workspace-recover-empty");
        let root = base.join("workspace");
        let first = sample_workspace();

        save_workspace_to_root(&serde_json::to_string(&first).unwrap(), &root)
            .expect("initial save");
        let backup = hidden_sibling_path(&root, "backup").expect("backup path");
        fs::rename(&root, &backup).expect("simulate crash after workspace moved to backup");
        fs::create_dir_all(&root).expect("simulate later startup creating an empty workspace");

        recover_workspace_dir(&root).expect("recover workspace");

        let loaded = load_workspace_from_root(&root, None)
            .expect("load recovered workspace")
            .expect("workspace should remain");
        assert!(loaded.contains("notebook-1"));
        fs::remove_dir_all(base).expect("cleanup temp test dir");
    }

    #[test]
    fn encrypted_workspace_save_hides_note_contents_and_round_trips() {
        let root = unique_test_dir("workspace-encrypted");
        let cipher = StorageCipher::new([7; 32]);
        let workspace = sample_workspace_with_page_text("classified launch plan");

        save_workspace_to_root_with_cipher(
            &serde_json::to_string(&workspace).unwrap(),
            &root,
            Some(&cipher),
        )
        .expect("encrypted save");

        assert!(!read_tree_text(&root).contains("classified launch plan"));

        let loaded = load_workspace_from_root_with_cipher(&root, None, Some(&cipher))
            .expect("encrypted load")
            .expect("workspace should load");
        assert!(loaded.contains("classified launch plan"));
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }

    #[test]
    fn rolling_backups_are_encrypted_pruned_and_restoreable() {
        let base = unique_test_dir("workspace-rolling-backups");
        let root = base.join("workspace");
        let cipher = StorageCipher::new([9; 32]);

        for index in 0..12 {
            let workspace = sample_workspace_with_page_text(&format!("backup version {index}"));
            save_workspace_to_root_with_cipher(
                &serde_json::to_string(&workspace).unwrap(),
                &root,
                Some(&cipher),
            )
            .expect("encrypted save");
        }

        let backups = list_workspace_backups_for_root(&root).expect("list backups");
        assert_eq!(backups.len(), ROLLING_BACKUP_LIMIT);
        assert!(
            !read_tree_text(&rolling_backups_dir_for_root(&root).unwrap())
                .contains("backup version")
        );

        let restored = restore_workspace_backup_from_root(&root, &backups[0].id, Some(&cipher))
            .expect("restore backup");
        assert!(restored.raw_data.contains("backup version 10"));

        let loaded = load_workspace_from_root_with_cipher(&root, None, Some(&cipher))
            .expect("load restored workspace")
            .expect("workspace should load");
        assert!(loaded.contains("backup version 10"));
        fs::remove_dir_all(base).expect("cleanup temp test dir");
    }

    #[test]
    fn cloud_sync_writes_encrypted_package_and_restores_it() {
        let base = unique_test_dir("workspace-cloud-sync");
        let root = base.join("workspace");
        let cloud_target = base.join("cloud");
        fs::create_dir_all(&cloud_target).expect("create cloud target");
        let cipher = StorageCipher::new([11; 32]);
        let cloud_workspace = sample_workspace_with_page_text("cloud saved note");
        let local_only_workspace = sample_workspace_with_page_text("local only note");

        save_workspace_to_root_with_cipher(
            &serde_json::to_string(&cloud_workspace).unwrap(),
            &root,
            Some(&cipher),
        )
        .expect("save cloud version");
        sync_workspace_to_cloud_target(&root, &cloud_target, Some(&cipher)).expect("sync cloud");
        assert!(!read_tree_text(&cloud_target).contains("cloud saved note"));

        save_workspace_to_root_with_cipher(
            &serde_json::to_string(&local_only_workspace).unwrap(),
            &root,
            Some(&cipher),
        )
        .expect("save local only version");

        let restored = restore_cloud_workspace_from_target(&root, &cloud_target, Some(&cipher))
            .expect("restore cloud");
        assert!(restored.raw_data.contains("cloud saved note"));
        assert!(!restored.raw_data.contains("local only note"));
        fs::remove_dir_all(base).expect("cleanup temp test dir");
    }
}
