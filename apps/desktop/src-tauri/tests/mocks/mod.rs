use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use mockall::predicate::*;
use mockall::*;

#[automock]
pub trait FileSystemOperations {
    async fn copy_file(&self, from: &Path, to: &Path) -> Result<u64, std::io::Error>;
    async fn create_dir_all(&self, path: &Path) -> Result<(), std::io::Error>;
    async fn remove_file(&self, path: &Path) -> Result<(), std::io::Error>;
    async fn metadata(&self, path: &Path) -> Result<std::fs::Metadata, std::io::Error>;
    fn exists(&self, path: &Path) -> bool;
}

#[automock]
pub trait ClipboardOperations {
    async fn set_text(&self, text: String) -> Result<(), String>;
    async fn set_files(&self, files: Vec<String>) -> Result<(), String>;
    async fn set_image(&self, image_data: Vec<u8>) -> Result<(), String>;
    async fn get_text(&self) -> Result<String, String>;
}

#[automock] 
pub trait RecordingOperations {
    async fn start_recording(&self, target: String, mode: String) -> Result<String, String>;
    async fn stop_recording(&self, recording_id: String) -> Result<PathBuf, String>;
    async fn pause_recording(&self, recording_id: String) -> Result<(), String>;
    async fn resume_recording(&self, recording_id: String) -> Result<(), String>;
}

#[automock]
pub trait VideoOperations {
    async fn export_video(&self, project_path: PathBuf, settings: String) -> Result<PathBuf, String>;
    async fn get_video_metadata(&self, path: PathBuf) -> Result<VideoMetadata, String>;
    async fn create_thumbnail(&self, input: PathBuf, output: PathBuf, size: (u32, u32)) -> Result<(), String>;
}

#[derive(Debug, Clone)]
pub struct VideoMetadata {
    pub duration: f64,
    pub size: f64,
}

#[automock]
pub trait NotificationOperations {
    fn send_notification(&self, notification_type: String);
}

/// Test state manager to track state changes during tests
#[derive(Debug, Clone)]
pub struct TestState {
    pub recordings: Arc<Mutex<Vec<String>>>,
    pub exported_files: Arc<Mutex<Vec<PathBuf>>>,
    pub clipboard_content: Arc<Mutex<Option<String>>>,
    pub notifications_sent: Arc<Mutex<Vec<String>>>,
}

impl Default for TestState {
    fn default() -> Self {
        Self {
            recordings: Arc::new(Mutex::new(Vec::new())),
            exported_files: Arc::new(Mutex::new(Vec::new())),
            clipboard_content: Arc::new(Mutex::new(None)),
            notifications_sent: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

impl TestState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_recording(&self, recording_id: String) {
        self.recordings.lock().unwrap().push(recording_id);
    }

    pub fn remove_recording(&self, recording_id: &str) {
        self.recordings.lock().unwrap().retain(|id| id != recording_id);
    }

    pub fn add_exported_file(&self, path: PathBuf) {
        self.exported_files.lock().unwrap().push(path);
    }

    pub fn set_clipboard_content(&self, content: String) {
        *self.clipboard_content.lock().unwrap() = Some(content);
    }

    pub fn add_notification(&self, notification: String) {
        self.notifications_sent.lock().unwrap().push(notification);
    }

    pub fn get_recordings(&self) -> Vec<String> {
        self.recordings.lock().unwrap().clone()
    }

    pub fn get_exported_files(&self) -> Vec<PathBuf> {
        self.exported_files.lock().unwrap().clone()
    }

    pub fn get_clipboard_content(&self) -> Option<String> {
        self.clipboard_content.lock().unwrap().clone()
    }

    pub fn get_notifications(&self) -> Vec<String> {
        self.notifications_sent.lock().unwrap().clone()
    }

    pub fn reset(&self) {
        self.recordings.lock().unwrap().clear();
        self.exported_files.lock().unwrap().clear();
        *self.clipboard_content.lock().unwrap() = None;
        self.notifications_sent.lock().unwrap().clear();
    }
}

/// Create a basic filesystem mock that simulates successful operations
pub fn create_filesystem_mock() -> MockFileSystemOperations {
    let mut mock = MockFileSystemOperations::new();
    
    mock.expect_copy_file()
        .returning(|_, _| Ok(1024)); // Simulate copying 1KB
    
    mock.expect_create_dir_all()
        .returning(|_| Ok(()));
    
    mock.expect_remove_file()
        .returning(|_| Ok(()));
    
    mock.expect_exists()
        .returning(|_| true);
    
    mock
}

/// Create a basic clipboard mock
pub fn create_clipboard_mock() -> MockClipboardOperations {
    let mut mock = MockClipboardOperations::new();
    
    mock.expect_set_text()
        .returning(|_| Ok(()));
    
    mock.expect_set_files()
        .returning(|_| Ok(()));
    
    mock.expect_set_image()
        .returning(|_| Ok(()));
    
    mock.expect_get_text()
        .returning(|| Ok("test content".to_string()));
    
    mock
}

/// Create a basic recording mock
pub fn create_recording_mock() -> MockRecordingOperations {
    let mut mock = MockRecordingOperations::new();
    
    mock.expect_start_recording()
        .returning(|_, _| Ok("test_recording_id".to_string()));
    
    mock.expect_stop_recording()
        .returning(|_| Ok(PathBuf::from("/tmp/test_recording.mp4")));
    
    mock.expect_pause_recording()
        .returning(|_| Ok(()));
    
    mock.expect_resume_recording()
        .returning(|_| Ok(()));
    
    mock
}

/// Create a basic video operations mock
pub fn create_video_mock() -> MockVideoOperations {
    let mut mock = MockVideoOperations::new();
    
    mock.expect_export_video()
        .returning(|_, _| Ok(PathBuf::from("/tmp/exported_video.mp4")));
    
    mock.expect_get_video_metadata()
        .returning(|_| Ok(VideoMetadata {
            duration: 5.0,
            size: 10.5,
        }));
    
    mock
}

/// Create a basic notification mock
pub fn create_notification_mock() -> MockNotificationOperations {
    let mut mock = MockNotificationOperations::new();
    
    mock.expect_send_notification()
        .returning(|_| {});
    
    mock
}