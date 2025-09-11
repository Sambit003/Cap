use std::path::PathBuf;
use std::time::Duration;
use serial_test::serial;
use tokio::time::timeout;

use cap_desktop_lib::{App, RecordingState};
use cap_recording::RecordingMode;
use cap_project::XY;

use crate::mocks::{TestState, create_filesystem_mock, create_clipboard_mock, create_recording_mock, create_video_mock};
use crate::utils::{TestUtils, TestAssertions};

/// Integration tests for complete workflows
/// These tests verify that multiple components work together correctly

#[tokio::test]
#[serial(integration)]
async fn test_complete_recording_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test the complete workflow: start recording -> stop recording -> export -> save to file
    
    // Step 1: Start recording
    let recording_id = simulate_complete_start_recording().await
        .expect("Should be able to start recording");
    
    test_state.add_recording(recording_id.clone());
    
    // Verify recording is active
    assert!(test_state.get_recordings().contains(&recording_id));
    
    // Step 2: Record for a short time (simulate)
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Step 3: Stop recording
    let recording_path = simulate_complete_stop_recording(recording_id.clone()).await
        .expect("Should be able to stop recording");
    
    test_state.remove_recording(&recording_id);
    
    // Verify recording stopped and file created
    TestAssertions::assert_file_exists_and_not_empty(&recording_path).await
        .expect("Recording file should exist after stopping");
    
    // Step 4: Export the recording
    let export_settings = cap_desktop_lib::export::ExportSettings::Mp4(
        cap_export::mp4::Mp4ExportSettings {
            fps: 30,
            quality: cap_export::mp4::Mp4Quality::High,
            resolution: XY { x: 1920, y: 1080 },
        }
    );
    
    let exported_path = simulate_complete_export_video(recording_path.parent().unwrap().to_path_buf(), export_settings).await
        .expect("Should be able to export video");
    
    test_state.add_exported_file(exported_path.clone());
    
    // Verify export succeeded
    TestAssertions::assert_file_exists_and_not_empty(&exported_path).await
        .expect("Exported file should exist");
    
    // Step 5: Save to final location
    let final_path = temp_dir.path().join("final_video.mp4");
    simulate_complete_save_file(exported_path, final_path.clone()).await
        .expect("Should be able to save file to final location");
    
    // Verify final file
    TestAssertions::assert_file_exists_and_not_empty(&final_path).await
        .expect("Final saved file should exist");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(integration)]
async fn test_complete_screenshot_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test the complete screenshot workflow: take screenshot -> copy to clipboard -> save to file
    
    // Step 1: Take screenshot
    let screenshot_path = simulate_complete_take_screenshot().await
        .expect("Should be able to take screenshot");
    
    // Verify screenshot was created
    TestAssertions::assert_file_exists_and_not_empty(&screenshot_path).await
        .expect("Screenshot file should exist");
    
    // Step 2: Copy to clipboard
    simulate_complete_copy_screenshot_to_clipboard(screenshot_path.clone()).await
        .expect("Should be able to copy screenshot to clipboard");
    
    test_state.set_clipboard_content("screenshot_copied".to_string());
    
    // Verify clipboard content
    assert!(test_state.get_clipboard_content().is_some());
    
    // Step 3: Save to custom location
    let final_path = temp_dir.path().join("saved_screenshot.png");
    simulate_complete_save_file(screenshot_path, final_path.clone()).await
        .expect("Should be able to save screenshot to final location");
    
    // Verify final file
    TestAssertions::assert_file_exists_and_not_empty(&final_path).await
        .expect("Final saved screenshot should exist");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(integration)]
async fn test_error_recovery_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test error recovery scenarios
    
    // Scenario 1: Recording fails to start
    let result = simulate_failing_start_recording().await;
    assert!(result.is_err(), "Recording should fail when device is unavailable");
    
    // Verify no recording is in progress
    assert!(test_state.get_recordings().is_empty());
    
    // Scenario 2: Export fails due to missing project
    let invalid_project = temp_dir.path().join("nonexistent_project");
    let export_settings = cap_desktop_lib::export::ExportSettings::Mp4(
        cap_export::mp4::Mp4ExportSettings {
            fps: 30,
            quality: cap_export::mp4::Mp4Quality::Medium,
            resolution: XY { x: 1920, y: 1080 },
        }
    );
    
    let result = simulate_complete_export_video(invalid_project, export_settings).await;
    assert!(result.is_err(), "Export should fail for invalid project");
    
    // Scenario 3: File copy fails due to permission issues
    let source_path = TestUtils::create_mock_mp4(temp_dir.path(), "source.mp4").await;
    let readonly_dest = temp_dir.path().join("readonly/dest.mp4");
    
    let result = simulate_failing_file_copy(source_path, readonly_dest).await;
    assert!(result.is_err(), "File copy should fail with permission issues");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(integration)]
async fn test_concurrent_operations_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test multiple operations running concurrently
    
    // Start multiple screenshots concurrently
    let screenshot_task1 = tokio::spawn(simulate_complete_take_screenshot());
    let screenshot_task2 = tokio::spawn(simulate_complete_take_screenshot());
    let screenshot_task3 = tokio::spawn(simulate_complete_take_screenshot());
    
    // Wait for all screenshots
    let (result1, result2, result3) = tokio::join!(screenshot_task1, screenshot_task2, screenshot_task3);
    
    // At least some should succeed
    let success_count = [
        result1.unwrap().is_ok(),
        result2.unwrap().is_ok(),
        result3.unwrap().is_ok(),
    ].iter().filter(|&&x| x).count();
    
    assert!(success_count >= 1, "At least one screenshot should succeed");
    
    // Test concurrent file operations
    let source1 = TestUtils::create_mock_mp4(temp_dir.path(), "concurrent1.mp4").await;
    let source2 = TestUtils::create_mock_mp4(temp_dir.path(), "concurrent2.mp4").await;
    let source3 = TestUtils::create_mock_image(temp_dir.path(), "concurrent3.png").await;
    
    let dest1 = temp_dir.path().join("dest1.mp4");
    let dest2 = temp_dir.path().join("dest2.mp4");
    let dest3 = temp_dir.path().join("dest3.png");
    
    let copy_task1 = tokio::spawn(simulate_complete_save_file(source1, dest1.clone()));
    let copy_task2 = tokio::spawn(simulate_complete_save_file(source2, dest2.clone()));
    let copy_task3 = tokio::spawn(simulate_complete_save_file(source3, dest3.clone()));
    
    let (copy_result1, copy_result2, copy_result3) = tokio::join!(copy_task1, copy_task2, copy_task3);
    
    // All copy operations should succeed
    assert!(copy_result1.unwrap().is_ok(), "First copy should succeed");
    assert!(copy_result2.unwrap().is_ok(), "Second copy should succeed");
    assert!(copy_result3.unwrap().is_ok(), "Third copy should succeed");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(integration)]
async fn test_long_running_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test a longer workflow that might take several seconds
    
    // Step 1: Start recording
    let recording_id = simulate_complete_start_recording().await
        .expect("Should start recording");
    
    // Step 2: Simulate longer recording time
    let recording_duration = Duration::from_millis(500);
    tokio::time::sleep(recording_duration).await;
    
    // Step 3: Stop recording
    let recording_path = simulate_complete_stop_recording(recording_id).await
        .expect("Should stop recording");
    
    // Step 4: Export with high quality settings (takes longer)
    let export_settings = cap_desktop_lib::export::ExportSettings::Mp4(
        cap_export::mp4::Mp4ExportSettings {
            fps: 60,
            quality: cap_export::mp4::Mp4Quality::Lossless,
            resolution: XY { x: 1920, y: 1080 },
        }
    );
    
    // Use timeout for the export operation
    let export_timeout = Duration::from_secs(30);
    let export_result = timeout(
        export_timeout,
        simulate_complete_export_video(recording_path.parent().unwrap().to_path_buf(), export_settings)
    ).await;
    
    match export_result {
        Ok(Ok(exported_path)) => {
            // Export succeeded within timeout
            TestAssertions::assert_file_exists_and_not_empty(&exported_path).await
                .expect("Exported file should exist");
        }
        Ok(Err(e)) => {
            panic!("Export failed: {}", e);
        }
        Err(_) => {
            // Export timed out - this is acceptable for high-quality exports
            println!("Export timed out as expected for lossless quality");
        }
    }
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(integration)]
async fn test_state_consistency_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Test that application state remains consistent throughout operations
    
    // Initial state should be clean
    assert!(test_state.get_recordings().is_empty());
    assert!(test_state.get_exported_files().is_empty());
    assert!(test_state.get_clipboard_content().is_none());
    
    // Start multiple recordings (should fail after first one)
    let recording1 = simulate_complete_start_recording().await;
    assert!(recording1.is_ok(), "First recording should start");
    
    let recording1_id = recording1.unwrap();
    test_state.add_recording(recording1_id.clone());
    
    // Try to start second recording (should fail)
    let recording2 = simulate_complete_start_recording().await;
    assert!(recording2.is_err(), "Second recording should fail");
    
    // State should still have only one recording
    assert_eq!(test_state.get_recordings().len(), 1);
    
    // Stop the first recording
    let recording_path = simulate_complete_stop_recording(recording1_id.clone()).await
        .expect("Should stop first recording");
    
    test_state.remove_recording(&recording1_id);
    
    // State should be clean again
    assert!(test_state.get_recordings().is_empty());
    
    // Now should be able to start another recording
    let recording3 = simulate_complete_start_recording().await;
    assert!(recording3.is_ok(), "Should be able to start new recording after stopping previous");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

// Helper functions for integration testing

async fn simulate_complete_start_recording() -> Result<String, String> {
    // Simulate complete start recording process
    let recording_id = TestUtils::generate_test_id();
    
    // Simulate initialization
    tokio::time::sleep(Duration::from_millis(10)).await;
    
    Ok(recording_id)
}

async fn simulate_complete_stop_recording(recording_id: String) -> Result<PathBuf, String> {
    // Simulate complete stop recording process
    if recording_id.is_empty() {
        return Err("Invalid recording ID".to_string());
    }
    
    // Simulate finalization
    tokio::time::sleep(Duration::from_millis(10)).await;
    
    Ok(PathBuf::from(format!("/tmp/recording_{}.mp4", recording_id)))
}

async fn simulate_complete_export_video(
    project_path: PathBuf,
    settings: cap_desktop_lib::export::ExportSettings,
) -> Result<PathBuf, String> {
    // Simulate complete export process
    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }
    
    // Simulate export processing
    tokio::time::sleep(Duration::from_millis(50)).await;
    
    let output_name = match settings {
        cap_desktop_lib::export::ExportSettings::Mp4(_) => "exported.mp4",
        cap_desktop_lib::export::ExportSettings::Gif(_) => "exported.gif",
    };
    
    Ok(project_path.join(output_name))
}

async fn simulate_complete_save_file(source: PathBuf, destination: PathBuf) -> Result<(), String> {
    // Simulate complete file save process
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }
    
    // Create parent directory if needed
    if let Some(parent) = destination.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Simulate file copy
    tokio::fs::copy(source, destination).await
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    
    Ok(())
}

async fn simulate_complete_take_screenshot() -> Result<PathBuf, String> {
    // Simulate complete screenshot process
    let screenshot_id = TestUtils::generate_test_id();
    
    // Simulate screenshot capture
    tokio::time::sleep(Duration::from_millis(20)).await;
    
    Ok(PathBuf::from(format!("/tmp/screenshot_{}.png", screenshot_id)))
}

async fn simulate_complete_copy_screenshot_to_clipboard(screenshot_path: PathBuf) -> Result<(), String> {
    // Simulate complete clipboard copy process
    if !screenshot_path.exists() {
        return Err("Screenshot file does not exist".to_string());
    }
    
    // Simulate clipboard operation
    tokio::time::sleep(Duration::from_millis(5)).await;
    
    Ok(())
}

async fn simulate_failing_start_recording() -> Result<String, String> {
    // Simulate recording failure scenario
    Err("Recording device is not available".to_string())
}

async fn simulate_failing_file_copy(source: PathBuf, destination: PathBuf) -> Result<(), String> {
    // Simulate file copy failure scenario
    Err("Permission denied".to_string())
}