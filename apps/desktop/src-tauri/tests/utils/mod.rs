use std::path::{Path, PathBuf};
use tempfile::TempDir;
use tokio::time::{timeout, Duration};

/// Test utilities for common testing scenarios
pub struct TestUtils;

impl TestUtils {
    /// Create a temporary directory for testing
    pub fn create_temp_dir() -> TempDir {
        tempfile::tempdir().expect("Failed to create temporary directory")
    }

    /// Create a temporary file with specified content
    pub async fn create_temp_file(dir: &Path, filename: &str, content: &[u8]) -> PathBuf {
        let file_path = dir.join(filename);
        tokio::fs::write(&file_path, content).await.expect("Failed to write test file");
        file_path
    }

    /// Create a mock MP4 file for testing
    pub async fn create_mock_mp4(dir: &Path, filename: &str) -> PathBuf {
        // Create a minimal valid MP4 header for testing
        let mock_mp4_data = include_bytes!("../fixtures/mock_video.mp4");
        Self::create_temp_file(dir, filename, mock_mp4_data).await
    }

    /// Create a mock image file for testing
    pub async fn create_mock_image(dir: &Path, filename: &str) -> PathBuf {
        // Create a minimal valid PNG for testing
        let mock_png_data = include_bytes!("../fixtures/mock_image.png");
        Self::create_temp_file(dir, filename, mock_png_data).await
    }

    /// Wait for a condition to be met with timeout
    pub async fn wait_for_condition<F, Fut>(
        condition: F,
        timeout_duration: Duration,
        check_interval: Duration,
    ) -> Result<(), &'static str>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = bool>,
    {
        let start = std::time::Instant::now();
        
        while start.elapsed() < timeout_duration {
            if condition().await {
                return Ok(());
            }
            tokio::time::sleep(check_interval).await;
        }
        
        Err("Timeout waiting for condition")
    }

    /// Run a test with timeout
    pub async fn with_timeout<F, T>(future: F, duration: Duration) -> Result<T, &'static str>
    where
        F: std::future::Future<Output = T>,
    {
        timeout(duration, future)
            .await
            .map_err(|_| "Test timed out")
    }

    /// Generate a unique test ID
    pub fn generate_test_id() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    /// Create a mock recording metadata structure
    pub fn create_mock_recording_meta(project_path: PathBuf) -> serde_json::Value {
        serde_json::json!({
            "projectPath": project_path,
            "prettyName": "Test Recording",
            "platform": "Test",
            "sharing": null,
            "inner": {
                "Studio": {
                    "SingleSegment": {
                        "segment": {
                            "display": {
                                "path": "content/display.mp4",
                                "fps": 30,
                                "startTime": null
                            },
                            "camera": null,
                            "audio": null,
                            "cursor": null
                        }
                    }
                }
            }
        })
    }

    /// Validate MP4 file structure (basic check)
    pub fn is_valid_mp4(path: &Path) -> bool {
        if let Ok(file) = std::fs::File::open(path) {
            let file_size = match file.metadata() {
                Ok(metadata) => metadata.len(),
                Err(_) => return false,
            };
            // Basic file size check - in real implementation would use mp4 crate
            file_size > 0 && file_size >= 8
        } else {
            false
        }
    }

    /// Create test app configuration
    pub fn create_test_app_config() -> serde_json::Value {
        serde_json::json!({
            "serverUrl": "http://localhost:3000",
            "cameraWsPort": 8080,
            "recordingState": "None"
        })
    }

    /// Setup test environment with necessary directories
    pub async fn setup_test_environment() -> TempDir {
        let temp_dir = Self::create_temp_dir();
        
        // Create subdirectories that the app expects
        let recordings_dir = temp_dir.path().join("recordings");
        let screenshots_dir = temp_dir.path().join("screenshots");
        
        tokio::fs::create_dir_all(&recordings_dir).await.expect("Failed to create recordings dir");
        tokio::fs::create_dir_all(&screenshots_dir).await.expect("Failed to create screenshots dir");
        
        temp_dir
    }

    /// Cleanup test environment
    pub async fn cleanup_test_environment(temp_dir: TempDir) {
        // Cleanup is automatic when TempDir is dropped, but we can do additional cleanup here
        drop(temp_dir);
    }
}

/// Async test helper macro
#[macro_export]
macro_rules! async_test {
    ($test:ident, $body:expr) => {
        #[tokio::test]
        async fn $test() {
            $body
        }
    };
}

/// Test assertion helpers
pub struct TestAssertions;

impl TestAssertions {
    /// Assert that a file exists and has non-zero size
    pub async fn assert_file_exists_and_not_empty(path: &Path) -> Result<(), String> {
        if !path.exists() {
            return Err(format!("File does not exist: {}", path.display()));
        }
        
        let metadata = tokio::fs::metadata(path).await
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        
        if metadata.len() == 0 {
            return Err(format!("File is empty: {}", path.display()));
        }
        
        Ok(())
    }

    /// Assert that a path doesn't exist
    pub fn assert_file_not_exists(path: &Path) -> Result<(), String> {
        if path.exists() {
            return Err(format!("File should not exist: {}", path.display()));
        }
        Ok(())
    }

    /// Assert that a string contains expected content
    pub fn assert_contains(haystack: &str, needle: &str) -> Result<(), String> {
        if !haystack.contains(needle) {
            return Err(format!("String '{}' does not contain '{}'", haystack, needle));
        }
        Ok(())
    }

    /// Assert that a result is an error with expected message
    pub fn assert_error_contains<T>(result: Result<T, String>, expected_error: &str) -> Result<(), String> {
        match result {
            Ok(_) => Err("Expected error but got success".to_string()),
            Err(err) => {
                if err.contains(expected_error) {
                    Ok(())
                } else {
                    Err(format!("Error '{}' does not contain '{}'", err, expected_error))
                }
            }
        }
    }
}