use cap_desktop_tests::*;
use serial_test::serial;
use std::time::Duration;

/// Comprehensive tests for Cap desktop recording functionality

#[tokio::test]
#[serial(recording)]
async fn test_start_recording_studio_mode() {
    let _temp_dir = TestUtils::setup_test_environment().await;
    
    // Test starting a recording in studio mode
    let result = recording::simulate_start_recording("studio").await;
    
    assert!(result.is_ok(), "Start recording should succeed");
    
    let recording_id = result.unwrap();
    assert!(!recording_id.is_empty(), "Recording ID should not be empty");
    assert!(recording_id.len() > 10, "Recording ID should be reasonable length");
    
    println!("✓ Started studio recording with ID: {}", recording_id);
}

#[tokio::test] 
#[serial(recording)]
async fn test_start_recording_instant_mode() {
    let _temp_dir = TestUtils::setup_test_environment().await;
    
    // Test starting a recording in instant mode
    let result = recording::simulate_start_recording("instant").await;
    
    assert!(result.is_ok(), "Start instant recording should succeed");
    
    let recording_id = result.unwrap();
    assert!(!recording_id.is_empty(), "Recording ID should not be empty");
    
    println!("✓ Started instant recording with ID: {}", recording_id);
}

#[tokio::test]
#[serial(recording)]
async fn test_start_recording_invalid_mode() {
    let _temp_dir = TestUtils::setup_test_environment().await;
    
    // Test starting a recording with invalid mode
    let result = recording::simulate_start_recording("invalid_mode").await;
    
    assert!(result.is_err(), "Invalid recording mode should fail");
    TestAssertions::assert_error_contains(result, "Invalid recording mode")
        .expect("Error should indicate invalid mode");
    
    println!("✓ Invalid recording mode properly rejected");
}

#[tokio::test]
#[serial(recording)]
async fn test_stop_recording_success() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Start a recording first
    let recording_id = recording::simulate_start_recording("studio").await
        .expect("Should start recording");
    
    // Create a mock output file
    let output_path = TestUtils::create_temp_file(temp_dir.path(), "output.mp4", b"mock_video_data").await;
    
    // Stop the recording
    let result = recording::simulate_stop_recording(recording_id.clone(), output_path.clone()).await;
    
    assert!(result.is_ok(), "Stop recording should succeed");
    
    let stopped_path = result.unwrap();
    assert_eq!(stopped_path, output_path, "Should return the correct output path");
    
    // Verify the output file exists and has content
    TestAssertions::assert_file_exists_and_not_empty(&stopped_path).await
        .expect("Output file should exist and not be empty");
    
    println!("✓ Successfully stopped recording and created output file");
}

#[tokio::test]
#[serial(recording)]
async fn test_stop_recording_invalid_id() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    let output_path = TestUtils::create_temp_file(temp_dir.path(), "output.mp4", b"mock_video_data").await;
    
    // Try to stop recording with empty ID
    let result = recording::simulate_stop_recording("".to_string(), output_path).await;
    
    assert!(result.is_err(), "Stop recording should fail with invalid ID");
    TestAssertions::assert_error_contains(result, "Invalid recording ID")
        .expect("Error should indicate invalid recording ID");
    
    println!("✓ Stop recording properly rejects invalid recording ID");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_video_to_clipboard() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create a mock video file
    let video_path = TestUtils::create_temp_file(temp_dir.path(), "test_video.mp4", b"mock_video_content").await;
    let video_path_str = video_path.to_string_lossy().to_string();
    
    // Test copying video to clipboard
    let result = clipboard::simulate_copy_video_to_clipboard(&video_path_str).await;
    
    assert!(result.is_ok(), "Copy video to clipboard should succeed");
    
    println!("✓ Successfully copied video to clipboard");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_nonexistent_video() {
    // Test copying a nonexistent video file
    let result = clipboard::simulate_copy_video_to_clipboard("/nonexistent/video.mp4").await;
    
    assert!(result.is_err(), "Copy nonexistent video should fail");
    TestAssertions::assert_error_contains(result, "does not exist")
        .expect("Error should indicate file doesn't exist");
    
    println!("✓ Properly rejected copying nonexistent video");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_empty_video() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create an empty video file
    let empty_video_path = TestUtils::create_temp_file(temp_dir.path(), "empty.mp4", b"").await;
    let empty_path_str = empty_video_path.to_string_lossy().to_string();
    
    // Test copying empty video
    let result = clipboard::simulate_copy_video_to_clipboard(&empty_path_str).await;
    
    assert!(result.is_err(), "Copy empty video should fail");
    TestAssertions::assert_error_contains(result, "empty")
        .expect("Error should indicate file is empty");
    
    println!("✓ Properly rejected copying empty video file");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_text_to_clipboard() {
    let test_text = "https://cap.so/video/abc123";
    
    // Test copying text to clipboard
    let result = clipboard::simulate_copy_text_to_clipboard(test_text).await;
    
    assert!(result.is_ok(), "Copy text to clipboard should succeed");
    
    println!("✓ Successfully copied text to clipboard");
}

#[tokio::test]
#[serial(clipboard)]
async fn test_copy_empty_text() {
    // Test copying empty text
    let result = clipboard::simulate_copy_text_to_clipboard("").await;
    
    assert!(result.is_err(), "Copy empty text should fail");
    TestAssertions::assert_error_contains(result, "empty")
        .expect("Error should indicate empty text");
    
    println!("✓ Properly rejected copying empty text");
}

#[tokio::test]
#[serial(filesystem)]
async fn test_copy_file_to_path() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create source file
    let source_path = TestUtils::create_temp_file(temp_dir.path(), "source.mp4", b"mock_video_data").await;
    let destination_path = temp_dir.path().join("destination.mp4");
    
    let source_str = source_path.to_string_lossy().to_string();
    let dest_str = destination_path.to_string_lossy().to_string();
    
    // Test file copy
    let result = file_operations::simulate_copy_file_to_path(&source_str, &dest_str).await;
    
    assert!(result.is_ok(), "File copy should succeed");
    
    // Verify destination file exists
    TestAssertions::assert_file_exists_and_not_empty(&destination_path).await
        .expect("Destination file should exist and not be empty");
    
    // Verify source file still exists
    TestAssertions::assert_file_exists_and_not_empty(&source_path).await
        .expect("Source file should still exist after copy");
    
    println!("✓ Successfully copied file to new location");
}

#[tokio::test]
#[serial(filesystem)]
async fn test_copy_file_create_directories() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create source file
    let source_path = TestUtils::create_temp_file(temp_dir.path(), "source.mp4", b"mock_video_data").await;
    
    // Create destination in nested directory that doesn't exist
    let destination_path = temp_dir.path().join("nested/deep/directory/destination.mp4");
    
    let source_str = source_path.to_string_lossy().to_string();
    let dest_str = destination_path.to_string_lossy().to_string();
    
    // Test file copy with directory creation
    let result = file_operations::simulate_copy_file_to_path(&source_str, &dest_str).await;
    
    assert!(result.is_ok(), "File copy should succeed and create directories");
    
    // Verify destination file exists
    TestAssertions::assert_file_exists_and_not_empty(&destination_path).await
        .expect("Destination file should exist in created directory");
    
    // Verify directory structure was created
    assert!(destination_path.parent().unwrap().exists(), 
           "Parent directory should be created");
    
    println!("✓ Successfully copied file and created necessary directories");
}

#[tokio::test]
#[serial(filesystem)]
async fn test_save_file_dialog_recording() {
    // Test save file dialog for recording
    let result = file_operations::simulate_save_file_dialog("test_recording.cap", "recording").await;
    
    assert!(result.is_ok(), "Save file dialog should succeed");
    
    let saved_path = result.unwrap();
    assert!(saved_path.is_some(), "Should return a file path");
    
    let path_str = saved_path.unwrap();
    assert!(path_str.ends_with(".mp4"), "Should have .mp4 extension");
    assert!(!path_str.contains(".cap"), "Should remove .cap extension");
    
    println!("✓ Save file dialog for recording works correctly");
}

#[tokio::test]
#[serial(filesystem)]
async fn test_save_file_dialog_screenshot() {
    // Test save file dialog for screenshot
    let result = file_operations::simulate_save_file_dialog("test_screenshot.cap", "screenshot").await;
    
    assert!(result.is_ok(), "Save file dialog should succeed");
    
    let saved_path = result.unwrap();
    assert!(saved_path.is_some(), "Should return a file path");
    
    let path_str = saved_path.unwrap();
    assert!(path_str.ends_with(".png"), "Should have .png extension");
    
    println!("✓ Save file dialog for screenshot works correctly");
}

#[tokio::test]
#[serial(filesystem)]
async fn test_save_file_dialog_invalid_type() {
    // Test save file dialog with invalid type
    let result = file_operations::simulate_save_file_dialog("test_file.cap", "invalid_type").await;
    
    assert!(result.is_err(), "Save file dialog should fail for invalid type");
    TestAssertions::assert_error_contains(result, "Invalid file type")
        .expect("Error should indicate invalid file type");
    
    println!("✓ Save file dialog properly rejects invalid file type");
}

#[tokio::test]
#[serial(rendering)]
async fn test_export_video_mp4() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create a test project
    let project_path = temp_dir.path().join("test_project.cap");
    tokio::fs::create_dir_all(&project_path).await.expect("Failed to create project directory");
    
    // Test MP4 export
    let result = video_export::simulate_export_video(project_path.clone(), "mp4", 30, 1920, 1080).await;
    
    assert!(result.is_ok(), "MP4 export should succeed");
    
    let output_path = result.unwrap();
    TestAssertions::assert_file_exists_and_not_empty(&output_path).await
        .expect("Exported MP4 should exist and not be empty");
    
    // Verify file extension
    assert!(output_path.extension().and_then(|s| s.to_str()) == Some("mp4"), 
           "Output should have .mp4 extension");
    
    println!("✓ Successfully exported video as MP4");
}

#[tokio::test]
#[serial(rendering)]
async fn test_export_video_gif() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create a test project
    let project_path = temp_dir.path().join("gif_project.cap");
    tokio::fs::create_dir_all(&project_path).await.expect("Failed to create project directory");
    
    // Test GIF export
    let result = video_export::simulate_export_video(project_path.clone(), "gif", 15, 720, 480).await;
    
    assert!(result.is_ok(), "GIF export should succeed");
    
    let output_path = result.unwrap();
    TestAssertions::assert_file_exists_and_not_empty(&output_path).await
        .expect("Exported GIF should exist and not be empty");
    
    // Verify file extension
    assert!(output_path.extension().and_then(|s| s.to_str()) == Some("gif"), 
           "Output should have .gif extension");
    
    println!("✓ Successfully exported video as GIF");
}

#[tokio::test]
#[serial(rendering)]
async fn test_export_video_invalid_project() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Use a nonexistent project path
    let invalid_project_path = temp_dir.path().join("nonexistent_project");
    
    // Test export with invalid project
    let result = video_export::simulate_export_video(invalid_project_path, "mp4", 30, 1920, 1080).await;
    
    assert!(result.is_err(), "Export should fail for invalid project");
    TestAssertions::assert_error_contains(result, "not exist")
        .expect("Error should indicate project not found");
    
    println!("✓ Export properly rejects invalid project path");
}

#[tokio::test]
#[serial(rendering)]
async fn test_export_video_unsupported_format() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Create a test project
    let project_path = temp_dir.path().join("test_project.cap");
    tokio::fs::create_dir_all(&project_path).await.expect("Failed to create project directory");
    
    // Test export with unsupported format
    let result = video_export::simulate_export_video(project_path, "avi", 30, 1920, 1080).await;
    
    assert!(result.is_err(), "Export should fail for unsupported format");
    TestAssertions::assert_error_contains(result, "Unsupported format")
        .expect("Error should indicate unsupported format");
    
    println!("✓ Export properly rejects unsupported format");
}

#[tokio::test]
#[serial(integration)]
async fn test_complete_workflow_recording_to_export() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    println!("🎬 Starting complete workflow test: recording → stop → export");
    
    // Step 1: Start recording
    let recording_id = recording::simulate_start_recording("studio").await
        .expect("Should start recording");
    println!("  ✓ Started recording with ID: {}", recording_id);
    
    // Step 2: Simulate recording time
    tokio::time::sleep(Duration::from_millis(100)).await;
    println!("  ✓ Recording in progress...");
    
    // Step 3: Stop recording
    let output_path = TestUtils::create_temp_file(temp_dir.path(), "recording_output.mp4", b"recorded_content").await;
    let stopped_path = recording::simulate_stop_recording(recording_id, output_path.clone()).await
        .expect("Should stop recording");
    println!("  ✓ Recording stopped, output: {}", stopped_path.display());
    
    // Step 4: Export the recording
    let project_path = temp_dir.path().join("export_project.cap");
    tokio::fs::create_dir_all(&project_path).await.expect("Failed to create project directory");
    
    let exported_path = video_export::simulate_export_video(project_path, "mp4", 30, 1920, 1080).await
        .expect("Should export video");
    println!("  ✓ Video exported: {}", exported_path.display());
    
    // Step 5: Copy to clipboard
    let _copy_result = clipboard::simulate_copy_video_to_clipboard(&exported_path.to_string_lossy()).await
        .expect("Should copy to clipboard");
    println!("  ✓ Video copied to clipboard");
    
    // Verify all files exist
    TestAssertions::assert_file_exists_and_not_empty(&stopped_path).await
        .expect("Recording output should exist");
    TestAssertions::assert_file_exists_and_not_empty(&exported_path).await
        .expect("Exported video should exist");
    
    println!("🎉 Complete workflow test passed!");
}

#[tokio::test]
#[serial(performance)]
async fn test_concurrent_operations() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let temp_dir_path = temp_dir.path().to_path_buf();
    
    println!("⚡ Testing concurrent operations");
    
    // Start multiple operations concurrently
    let recording_task = tokio::spawn(recording::simulate_start_recording("studio"));
    
    let clipboard_task = tokio::spawn({
        let temp_dir_path = temp_dir_path.clone();
        async move {
            let file_path = TestUtils::create_temp_file(&temp_dir_path, "concurrent_video.mp4", b"video_data").await;
            clipboard::simulate_copy_video_to_clipboard(&file_path.to_string_lossy()).await
        }
    });
    
    let file_task = tokio::spawn({
        let temp_dir_path = temp_dir_path.clone();
        async move {
            let source = TestUtils::create_temp_file(&temp_dir_path, "source.mp4", b"source_data").await;
            let dest = temp_dir_path.join("concurrent_dest.mp4");
            file_operations::simulate_copy_file_to_path(
                &source.to_string_lossy(),
                &dest.to_string_lossy()
            ).await
        }
    });
    
    // Wait for all operations
    let (recording_result, clipboard_result, file_result) = tokio::join!(recording_task, clipboard_task, file_task);
    
    // Check results
    assert!(recording_result.unwrap().is_ok(), "Concurrent recording should succeed");
    assert!(clipboard_result.unwrap().is_ok(), "Concurrent clipboard should succeed");
    assert!(file_result.unwrap().is_ok(), "Concurrent file operation should succeed");
    
    println!("✓ All concurrent operations completed successfully");
}

#[tokio::test]
#[serial(error_handling)]
async fn test_error_recovery() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    println!("🔄 Testing error recovery scenarios");
    
    // Test 1: Recording fails, then succeeds
    let fail_result = recording::simulate_start_recording("invalid_mode").await;
    assert!(fail_result.is_err(), "Invalid mode should fail");
    
    let success_result = recording::simulate_start_recording("studio").await;
    assert!(success_result.is_ok(), "Valid mode should succeed after failure");
    println!("  ✓ Recording recovered from invalid mode error");
    
    // Test 2: File operation fails, then succeeds
    let fail_copy = file_operations::simulate_copy_file_to_path("/nonexistent/source.mp4", "/tmp/dest.mp4").await;
    assert!(fail_copy.is_err(), "Nonexistent source should fail");
    
    let source_path = TestUtils::create_temp_file(temp_dir.path(), "recovery_source.mp4", b"data").await;
    let dest_path = temp_dir.path().join("recovery_dest.mp4");
    let success_copy = file_operations::simulate_copy_file_to_path(
        &source_path.to_string_lossy(),
        &dest_path.to_string_lossy()
    ).await;
    assert!(success_copy.is_ok(), "Valid file copy should succeed after failure");
    println!("  ✓ File operations recovered from missing source error");
    
    // Test 3: Clipboard operation fails, then succeeds
    let fail_clipboard = clipboard::simulate_copy_video_to_clipboard("/nonexistent/video.mp4").await;
    assert!(fail_clipboard.is_err(), "Nonexistent file should fail");
    
    let video_path = TestUtils::create_temp_file(temp_dir.path(), "recovery_video.mp4", b"video_data").await;
    let success_clipboard = clipboard::simulate_copy_video_to_clipboard(&video_path.to_string_lossy()).await;
    assert!(success_clipboard.is_ok(), "Valid video copy should succeed after failure");
    println!("  ✓ Clipboard operations recovered from missing file error");
    
    println!("✅ Error recovery tests completed successfully");
}

// Test timeout scenarios
#[tokio::test]
async fn test_operation_timeouts() {
    println!("⏱️  Testing operation timeouts");
    
    // Test that operations complete within reasonable time
    let recording_result = TestUtils::with_timeout(
        recording::simulate_start_recording("studio"),
        Duration::from_secs(5)
    ).await;
    assert!(recording_result.is_ok(), "Recording should complete within timeout");
    
    let clipboard_result = TestUtils::with_timeout(
        clipboard::simulate_copy_text_to_clipboard("test"),
        Duration::from_secs(1)
    ).await;
    assert!(clipboard_result.is_ok(), "Clipboard operation should complete within timeout");
    
    println!("✓ All operations completed within expected timeouts");
}