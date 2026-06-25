#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::Utc;
use printpdf::{BuiltinFont, Mm, PdfDocument};
use serde::Serialize;
use serde_json::{Map, Value};
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
struct ImportedAssetData {
    data_url: String,
    mime_type: String,
    name: String,
    size: u64,
}

fn legacy_data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    Ok(data_dir.join("oneplace-data.json"))
}

fn data_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    let root = data_dir.join("workspace");
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
            return Err("Stored path cannot contain parent or current directory segments.".to_string());
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

fn write_pretty_json(path: &Path, value: &Value) -> Result<(), String> {
    let raw = serde_json::to_vec_pretty(value).map_err(|err| err.to_string())?;
    write_bytes_atomically(path, &raw)
}

fn read_json_file(path: &Path) -> Result<Value, String> {
    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&raw).map_err(|err| err.to_string())
}

fn load_notebook_from_dir(notebook_dir: &Path) -> Result<Value, String> {
    let notebook_file = notebook_dir.join("notebook.json");
    let mut notebook = read_json_file(&notebook_file)?;

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
            *section = read_json_file(&section_path)?;
        }
    }

    Ok(notebook)
}

fn section_file_name(group_id: &str, section_id: &str) -> Result<String, String> {
    Ok(format!(
        "{}__{}.json",
        encode_path_component(group_id, "Section group ID")?,
        encode_path_component(section_id, "Section ID")?
    ))
}

fn write_notebook_contents_to_dir(notebook: &Value, notebook_dir: &Path) -> Result<(), String> {
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
            write_pretty_json(&section_path, &full_section)?;

            let section_object = as_object_mut(section)?;
            section_object.remove("pages");
            section_object.insert(
                "pagesFile".to_string(),
                Value::String(format!("sections/{filename}")),
            );
        }
    }

    let notebook_file = notebook_dir.join("notebook.json");
    write_pretty_json(&notebook_file, &notebook_metadata)?;
    Ok(())
}

fn write_notebook_to_dir(notebook: &Value, notebook_dir: &Path) -> Result<(), String> {
    create_parent_dir(notebook_dir)?;
    let temp_dir = hidden_sibling_path(notebook_dir, "tmp")?;

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|err| err.to_string())?;
    }

    fs::create_dir_all(&temp_dir).map_err(|err| err.to_string())?;

    match write_notebook_contents_to_dir(notebook, &temp_dir) {
        Ok(()) => replace_dir_with_temp(&temp_dir, notebook_dir),
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_dir);
            Err(err)
        }
    }
}

fn write_workspace_contents_to_root(raw_data: &str, data_root: &Path) -> Result<PathBuf, String> {
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
        write_notebook_to_dir(&notebook, &notebook_dir)?;

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
    write_pretty_json(&manifest_path, &app_state)?;

    Ok(manifest_path)
}

fn save_workspace_to_root(raw_data: &str, data_root: &Path) -> Result<PathBuf, String> {
    create_parent_dir(data_root)?;
    let temp_root = hidden_sibling_path(data_root, "tmp")?;

    if temp_root.exists() {
        fs::remove_dir_all(&temp_root).map_err(|err| err.to_string())?;
    }

    fs::create_dir_all(&temp_root).map_err(|err| err.to_string())?;

    match write_workspace_contents_to_root(raw_data, &temp_root) {
        Ok(_) => {
            replace_dir_with_temp(&temp_root, data_root)?;
            Ok(workspace_manifest_path_for_root(data_root))
        }
        Err(err) => {
            let _ = fs::remove_dir_all(&temp_root);
            Err(err)
        }
    }
}

fn save_workspace(raw_data: &str, app: &AppHandle) -> Result<PathBuf, String> {
    let data_root = data_root_dir(app)?;
    save_workspace_to_root(raw_data, &data_root)
}

fn load_workspace_from_root(data_root: &Path, legacy_path: Option<&Path>) -> Result<Option<String>, String> {
    let manifest_path = workspace_manifest_path_for_root(data_root);
    match fs::read_to_string(&manifest_path) {
        Ok(raw_manifest) => {
            let mut manifest: Value =
                serde_json::from_str(&raw_manifest).map_err(|err| err.to_string())?;
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
                notebooks.push(load_notebook_from_dir(notebook_dir)?);
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
    load_workspace_from_root(&data_root, Some(&legacy_path))
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<String>, String> {
    load_workspace(&app)
}

#[tauri::command]
fn save_data(app: AppHandle, raw_data: String) -> Result<SaveResult, String> {
    let manifest_path = save_workspace(&raw_data, &app)?;

    Ok(SaveResult {
        path: manifest_path.display().to_string(),
        saved_at: Utc::now().to_rfc3339(),
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
            open_notebook_dir,
            import_onenote_export_dir,
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
        assert!(!root.join("notebook").join("escaped__section-1.json").exists());
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

        save_workspace_to_root(&serde_json::to_string(&first).unwrap(), &root).expect("initial save");
        let failed = save_workspace_to_root(&serde_json::to_string(&bad).unwrap(), &root);

        assert!(failed.is_err());
        let loaded = load_workspace_from_root(&root, None)
            .expect("load after failed save")
            .expect("workspace should remain");
        assert!(loaded.contains("notebook-1"));
        assert!(!loaded.contains("bad-notebook"));
        fs::remove_dir_all(root).expect("cleanup temp test dir");
    }
}
