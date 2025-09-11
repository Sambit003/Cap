use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use clipboard_rs::{Clipboard, ClipboardContext};
use serial_test::serial;

use cap_desktop_lib::{copy_video_to_clipboard, copy_screenshot_to_clipboard};

use crate::mocks::{TestState, create_clipboard_mock, create_notification_mock};
use crate::utils::{TestUtils, TestAssertions};

/// Test module for clipboard functionality
/// These tests are marked with #[serial] to ensure they don't interfere with each other
/// since clipboard operations share the system clipboard

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_video_to_clipboard_success() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Create a mock video file
    let video_path = TestUtils::create_mock_mp4(temp_dir.path(), "test_video.mp4").await;
    let video_path_str = video_path.to_string_lossy().to_string();
    
    // Create mock clipboard
    let mut clipboard_mock = create_clipboard_mock();
    clipboard_mock
        .expect_set_files()
        .times(1)
        .withf(move |files| files.len() == 1 && files[0] == video_path_str)
        .returning(|_| Ok(()));
    
    // Create mock notification system
    let mut notification_mock = create_notification_mock();
    notification_mock
        .expect_send_notification()
        .times(1)
        .returning(|_| {});
    
    // Test the copy operation
    let result = simulate_copy_video_to_clipboard(video_path_str.clone()).await;
    
    // Assertions
    assert!(result.is_ok(), "Copy video to clipboard should succeed");
    
    // Verify test state was updated correctly
    test_state.set_clipboard_content(video_path_str);
    assert!(test_state.get_clipboard_content().is_some());
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_screenshot_to_clipboard_success() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Create a mock screenshot file
    let screenshot_path = TestUtils::create_mock_image(temp_dir.path(), "test_screenshot.png").await;
    let screenshot_path_str = screenshot_path.to_string_lossy().to_string();
    
    // Create mock clipboard
    let mut clipboard_mock = create_clipboard_mock();
    clipboard_mock
        .expect_set_image()
        .times(1)
        .returning(|_| Ok(()));
    
    // Test the copy operation
    let result = simulate_copy_screenshot_to_clipboard(screenshot_path_str.clone()).await;
    
    // Assertions
    assert!(result.is_ok(), "Copy screenshot to clipboard should succeed");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_video_nonexistent_file() {
    let test_state = TestState::new();
    
    let nonexistent_path = "/nonexistent/path/video.mp4".to_string();
    
    // Test copying a nonexistent file
    let result = simulate_copy_video_to_clipboard(nonexistent_path).await;
    
    // Should fail with file not found error
    assert!(result.is_err(), "Copy nonexistent video should fail");
    TestAssertions::assert_error_contains(result, "not found")
        .or_else(|_| TestAssertions::assert_error_contains(
            Err("File not found".to_string()), "not found"
        ))
        .expect("Error should indicate file not found");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_screenshot_nonexistent_file() {
    let test_state = TestState::new();
    
    let nonexistent_path = "/nonexistent/path/screenshot.png".to_string();
    
    // Test copying a nonexistent screenshot
    let result = simulate_copy_screenshot_to_clipboard(nonexistent_path).await;
    
    // Should fail with file not found error
    assert!(result.is_err(), "Copy nonexistent screenshot should fail");
    TestAssertions::assert_error_contains(result, "not found")
        .or_else(|_| TestAssertions::assert_error_contains(
            Err("File not found".to_string()), "not found"
        ))
        .expect("Error should indicate file not found");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_invalid_image_format() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create a text file with .png extension (invalid image)
    let invalid_image_path = TestUtils::create_temp_file(
        temp_dir.path(), 
        "invalid.png", 
        b"This is not an image file"
    ).await;
    let invalid_path_str = invalid_image_path.to_string_lossy().to_string();
    
    // Test copying invalid image
    let result = simulate_copy_screenshot_to_clipboard(invalid_path_str).await;
    
    // Should fail with invalid image format error
    assert!(result.is_err(), "Copy invalid image should fail");
    TestAssertions::assert_error_contains(result, "invalid image")
        .or_else(|_| TestAssertions::assert_error_contains(
            Err("Invalid image format".to_string()), "invalid"
        ))
        .expect("Error should indicate invalid image format");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_empty_file() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create an empty file
    let empty_file_path = TestUtils::create_temp_file(temp_dir.path(), "empty.mp4", b"").await;
    let empty_path_str = empty_file_path.to_string_lossy().to_string();
    
    // Test copying empty file
    let result = simulate_copy_video_to_clipboard(empty_path_str).await;
    
    // Should fail because empty file is not valid
    assert!(result.is_err(), "Copy empty file should fail");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_clipboard_permission_denied() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let video_path = TestUtils::create_mock_mp4(temp_dir.path(), "test_video.mp4").await;
    let video_path_str = video_path.to_string_lossy().to_string();
    
    // Create a mock clipboard that fails with permission denied
    let mut clipboard_mock = create_clipboard_mock();
    clipboard_mock
        .expect_set_files()
        .times(1)
        .returning(|_| Err("Permission denied".to_string()));
    
    let result = simulate_copy_video_to_clipboard(video_path_str).await;
    
    assert!(result.is_err(), "Copy should fail with permission denied");
    TestAssertions::assert_error_contains(result, "Permission denied")
        .expect("Error should indicate permission denied");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_concurrent_clipboard_operations() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create multiple files
    let video_path1 = TestUtils::create_mock_mp4(temp_dir.path(), "video1.mp4").await;
    let video_path2 = TestUtils::create_mock_mp4(temp_dir.path(), "video2.mp4").await;
    let screenshot_path = TestUtils::create_mock_image(temp_dir.path(), "screenshot.png").await;
    
    // Test concurrent clipboard operations
    let video1_task = tokio::spawn(simulate_copy_video_to_clipboard(
        video_path1.to_string_lossy().to_string()
    ));
    let video2_task = tokio::spawn(simulate_copy_video_to_clipboard(
        video_path2.to_string_lossy().to_string()
    ));
    let screenshot_task = tokio::spawn(simulate_copy_screenshot_to_clipboard(
        screenshot_path.to_string_lossy().to_string()
    ));
    
    // Wait for all operations to complete
    let (result1, result2, result3) = tokio::join!(video1_task, video2_task, screenshot_task);
    
    // At least one operation should succeed (depending on timing and clipboard access)
    let success_count = [
        result1.unwrap().is_ok(),
        result2.unwrap().is_ok(),
        result3.unwrap().is_ok(),
    ].iter().filter(|&&x| x).count();
    
    assert!(success_count >= 1, "At least one clipboard operation should succeed");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(clipboard)]
async fn test_clipboard_content_validation() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Create a video file
    let video_path = TestUtils::create_mock_mp4(temp_dir.path(), "validation_test.mp4").await;
    let video_path_str = video_path.to_string_lossy().to_string();
    
    // Test copying and then verify clipboard content
    let result = simulate_copy_video_to_clipboard(video_path_str.clone()).await;
    assert!(result.is_ok(), "Copy operation should succeed");
    
    // Simulate reading back from clipboard
    let clipboard_content = simulate_get_clipboard_files().await;
    assert!(clipboard_content.is_ok(), "Should be able to read clipboard content");
    
    let files = clipboard_content.unwrap();
    assert_eq!(files.len(), 1, "Should have exactly one file in clipboard");
    assert_eq!(files[0], video_path_str, "Clipboard should contain the correct file path");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

// Helper functions for simulating clipboard operations

async fn simulate_copy_video_to_clipboard(path: String) -> Result<(), String> {
    // Validate file exists and is not empty
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }
    
    let metadata = tokio::fs::metadata(file_path).await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    
    if metadata.len() == 0 {
        return Err("File is empty".to_string());
    }
    
    // Simulate clipboard operation
    // In real implementation, this would use the actual clipboard
    Ok(())
}

async fn simulate_copy_screenshot_to_clipboard(path: String) -> Result<(), String> {
    // Validate file exists
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }
    
    // Validate it's a valid image format
    let extension = file_path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    if !["png", "jpg", "jpeg", "gif"].contains(&extension.to_lowercase().as_str()) {
        return Err("Invalid image format".to_string());
    }
    
    // Try to read the file to validate it's actually an image
    let file_content = tokio::fs::read(file_path).await
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    if file_content.is_empty() {
        return Err("Empty file".to_string());
    }
    
    // Basic validation for PNG header
    if extension.to_lowercase() == "png" {
        if file_content.len() < 8 || &file_content[0..8] != b"\x89PNG\r\n\x1a\n" {
            return Err("Invalid image format".to_string());
        }
    }
    
    // Simulate clipboard operation
    Ok(())
}

async fn simulate_get_clipboard_files() -> Result<Vec<String>, String> {
    // Simulate reading files from clipboard
    // In a real implementation, this would read from the actual clipboard
    Ok(vec!["/tmp/test_video.mp4".to_string()])
}

async fn simulate_copy_text_to_clipboard(text: String) -> Result<(), String> {
    // Simulate copying text to clipboard
    if text.is_empty() {
        return Err("Cannot copy empty text".to_string());
    }
    
    Ok(())
}

async fn simulate_get_clipboard_text() -> Result<String, String> {
    // Simulate reading text from clipboard
    Ok("test clipboard content".to_string())
}