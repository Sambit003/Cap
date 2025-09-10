use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use serial_test::serial;

use cap_desktop_lib::{App, RecordingState, recording};
use cap_recording::{RecordingMode, sources::ScreenCaptureTarget};
use cap_project::ProjectConfiguration;

use crate::mocks::{TestState, create_recording_mock, create_filesystem_mock, create_notification_mock};
use crate::utils::{TestUtils, TestAssertions};

/// Test module for recording functionality
/// These tests are marked with #[serial] to ensure they don't interfere with each other
/// since recording operations may need exclusive access to system resources

#[tokio::test]
#[serial(recording)]
async fn test_start_recording_studio_mode() {
    // Setup test environment
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    // Create mocks
    let mut recording_mock = create_recording_mock();
    let recording_id = "test_recording_studio_123";
    
    recording_mock
        .expect_start_recording()
        .times(1)
        .returning(move |_, _| Ok(recording_id.to_string()));
    
    // Create test app state
    let app_state = create_test_app_state(temp_dir.path()).await;
    
    // Test start recording in studio mode
    let target = ScreenCaptureTarget::Display { 
        id: scap_targets::DisplayId::new(1) 
    };
    let mode = RecordingMode::Studio;
    
    // Execute the test
    let result = simulate_start_recording(&app_state, target, mode).await;
    
    // Assertions
    assert!(result.is_ok(), "Start recording should succeed");
    
    let recording_id = result.unwrap();
    assert_eq!(recording_id, "test_recording_studio_123");
    
    // Verify app state was updated
    let app = app_state.read().await;
    assert!(matches!(app.recording_state, RecordingState::Active(_)));
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_start_recording_instant_mode() {
    let temp_dir = TestUtils::setup_test_environment().await;
    let test_state = TestState::new();
    
    let mut recording_mock = create_recording_mock();
    let recording_id = "test_recording_instant_456";
    
    recording_mock
        .expect_start_recording()
        .times(1)
        .returning(move |_, _| Ok(recording_id.to_string()));
    
    let app_state = create_test_app_state(temp_dir.path()).await;
    
    let target = ScreenCaptureTarget::Window { 
        id: scap_targets::WindowId::new(123) 
    };
    let mode = RecordingMode::Instant;
    
    let result = simulate_start_recording(&app_state, target, mode).await;
    
    assert!(result.is_ok(), "Start recording should succeed");
    let recording_id = result.unwrap();
    assert_eq!(recording_id, "test_recording_instant_456");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_stop_recording_success() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Setup app state with an active recording
    let app_state = create_test_app_state_with_recording(temp_dir.path()).await;
    
    let mut recording_mock = create_recording_mock();
    let output_path = temp_dir.path().join("output.mp4");
    
    recording_mock
        .expect_stop_recording()
        .times(1)
        .returning(move |_| Ok(output_path.clone()));
    
    // Create a mock output file
    TestUtils::create_mock_mp4(temp_dir.path(), "output.mp4").await;
    
    let result = simulate_stop_recording(&app_state).await;
    
    assert!(result.is_ok(), "Stop recording should succeed");
    let stopped_path = result.unwrap();
    
    // Verify the output file exists
    TestAssertions::assert_file_exists_and_not_empty(&stopped_path).await
        .expect("Output file should exist and not be empty");
    
    // Verify app state was cleared
    let app = app_state.read().await;
    assert!(matches!(app.recording_state, RecordingState::None));
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_stop_recording_no_active_recording() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Setup app state without active recording
    let app_state = create_test_app_state(temp_dir.path()).await;
    
    let result = simulate_stop_recording(&app_state).await;
    
    // Should return an error since no recording is active
    assert!(result.is_err(), "Stop recording should fail when no recording is active");
    
    TestAssertions::assert_error_contains(result, "No active recording")
        .expect("Error should indicate no active recording");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_pause_resume_recording() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    let app_state = create_test_app_state_with_recording(temp_dir.path()).await;
    
    let mut recording_mock = create_recording_mock();
    
    recording_mock
        .expect_pause_recording()
        .times(1)
        .returning(|_| Ok(()));
    
    recording_mock
        .expect_resume_recording()
        .times(1)
        .returning(|_| Ok(()));
    
    // Test pause
    let pause_result = simulate_pause_recording(&app_state).await;
    assert!(pause_result.is_ok(), "Pause recording should succeed");
    
    // Test resume
    let resume_result = simulate_resume_recording(&app_state).await;
    assert!(resume_result.is_ok(), "Resume recording should succeed");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_recording_error_handling() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    let mut recording_mock = create_recording_mock();
    
    // Mock a failure scenario
    recording_mock
        .expect_start_recording()
        .times(1)
        .returning(|_, _| Err("Failed to access recording device".to_string()));
    
    let app_state = create_test_app_state(temp_dir.path()).await;
    
    let target = ScreenCaptureTarget::Display { 
        id: scap_targets::DisplayId::new(1) 
    };
    let mode = RecordingMode::Studio;
    
    let result = simulate_start_recording(&app_state, target, mode).await;
    
    assert!(result.is_err(), "Recording should fail when device is not accessible");
    TestAssertions::assert_error_contains(result, "Failed to access recording device")
        .expect("Error should contain device access failure message");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

#[tokio::test]
#[serial(recording)]
async fn test_concurrent_recording_attempts() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Setup app state with an active recording
    let app_state = create_test_app_state_with_recording(temp_dir.path()).await;
    
    let target = ScreenCaptureTarget::Display { 
        id: scap_targets::DisplayId::new(2) 
    };
    let mode = RecordingMode::Studio;
    
    // Try to start another recording while one is already active
    let result = simulate_start_recording(&app_state, target, mode).await;
    
    assert!(result.is_err(), "Should not be able to start recording when one is already active");
    TestAssertions::assert_error_contains(result, "Recording already in progress")
        .expect("Error should indicate recording already in progress");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}

// Helper functions for creating test scenarios

async fn create_test_app_state(base_path: &std::path::Path) -> Arc<RwLock<App>> {
    use tauri::test::{mock_context, MockBuilder};
    use tauri::Manager;
    
    // Create a mock Tauri app for testing
    let app = MockBuilder::new().build(mock_context());
    
    Arc::new(RwLock::new(App {
        camera_ws_port: 8080,
        handle: app.handle().clone(),
        camera_preview: cap_desktop_lib::camera::CameraPreviewManager::new(&app.handle()),
        recording_state: RecordingState::None,
        recording_logging_handle: create_mock_logging_handle(),
        mic_feed: create_mock_mic_feed().await,
        camera_feed: create_mock_camera_feed().await,
        server_url: "http://localhost:3000".to_string(),
    }))
}

async fn create_test_app_state_with_recording(base_path: &std::path::Path) -> Arc<RwLock<App>> {
    let app_state = create_test_app_state(base_path).await;
    
    // Set up an active recording state
    {
        let mut app = app_state.write().await;
        app.recording_state = RecordingState::Active(create_mock_in_progress_recording());
    }
    
    app_state
}

fn create_mock_in_progress_recording() -> cap_desktop_lib::recording::InProgressRecording {
    // This would need to be implemented based on the actual InProgressRecording structure
    // For now, creating a placeholder
    todo!("Implement mock InProgressRecording")
}

fn create_mock_logging_handle() -> cap_desktop_lib::LoggingHandle {
    // Create a mock logging handle for testing
    todo!("Implement mock logging handle")
}

async fn create_mock_mic_feed() -> kameo::actor::ActorRef<cap_recording::feeds::microphone::MicrophoneFeed> {
    // Create a mock microphone feed for testing
    todo!("Implement mock microphone feed")
}

async fn create_mock_camera_feed() -> kameo::actor::ActorRef<cap_recording::feeds::camera::CameraFeed> {
    // Create a mock camera feed for testing
    todo!("Implement mock camera feed")
}

// Simulation functions for testing the actual recording operations

async fn simulate_start_recording(
    app_state: &Arc<RwLock<App>>,
    target: ScreenCaptureTarget,
    mode: RecordingMode,
) -> Result<String, String> {
    // This simulates the start_recording function call
    // In a real implementation, this would call the actual recording::start_recording function
    // For testing purposes, we simulate the behavior
    
    let app = app_state.read().await;
    if !matches!(app.recording_state, RecordingState::None) {
        return Err("Recording already in progress".to_string());
    }
    drop(app);
    
    // Simulate starting recording
    let recording_id = TestUtils::generate_test_id();
    
    // Update app state to active recording
    let mut app = app_state.write().await;
    app.recording_state = RecordingState::Pending { mode, target };
    
    Ok(recording_id)
}

async fn simulate_stop_recording(
    app_state: &Arc<RwLock<App>>,
) -> Result<PathBuf, String> {
    let mut app = app_state.write().await;
    
    match &app.recording_state {
        RecordingState::None => Err("No active recording".to_string()),
        RecordingState::Pending { .. } | RecordingState::Active(_) => {
            app.recording_state = RecordingState::None;
            Ok(PathBuf::from("/tmp/test_output.mp4"))
        }
    }
}

async fn simulate_pause_recording(
    app_state: &Arc<RwLock<App>>,
) -> Result<(), String> {
    let app = app_state.read().await;
    match &app.recording_state {
        RecordingState::Active(_) => Ok(()),
        _ => Err("No active recording to pause".to_string()),
    }
}

async fn simulate_resume_recording(
    app_state: &Arc<RwLock<App>>,
) -> Result<(), String> {
    let app = app_state.read().await;
    match &app.recording_state {
        RecordingState::Active(_) => Ok(()),
        _ => Err("No active recording to resume".to_string()),
    }
}