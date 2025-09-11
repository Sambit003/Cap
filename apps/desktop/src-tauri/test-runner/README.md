# Cap Desktop Rust Testing System

This document describes the comprehensive testing system implemented for the Cap desktop application's Rust functions.

## Overview

The testing system provides comprehensive coverage for core Cap desktop functionality, with focus on:

- **Recording Operations**: Start recording, stop recording, pause/resume
- **Clipboard Operations**: Copy video/screenshot to clipboard, copy text
- **File Operations**: Save file, copy file to path, file dialog
- **Video Export/Rendering**: Export to MP4/GIF, rendering pipeline
- **Integration Workflows**: Complete end-to-end testing scenarios

## Architecture

The testing system is built using:

- **cargo-nextest**: High-performance test runner with parallel execution and better output
- **Modular Design**: Separate modules for different functionality areas
- **Mock Framework**: Comprehensive mocks for external dependencies
- **Serial Test Groups**: Proper resource management for tests that share system resources
- **Integration Tests**: Complete workflow validation

## Test Structure

```
apps/desktop/src-tauri/test-runner/
├── Cargo.toml                    # Test runner configuration
├── src/
│   └── lib.rs                   # Core test utilities and mocks
├── tests/
│   └── integration_tests.rs     # Comprehensive test suite
└── .config/
    └── nextest.toml            # Nextest configuration
```

## Test Categories

### 1. Recording Tests
- `test_start_recording_studio_mode` - Start recording in studio mode
- `test_start_recording_instant_mode` - Start recording in instant mode
- `test_start_recording_invalid_mode` - Error handling for invalid modes
- `test_stop_recording_success` - Successfully stop recording
- `test_stop_recording_invalid_id` - Error handling for invalid recording IDs

### 2. Clipboard Tests
- `test_copy_video_to_clipboard` - Copy video files to clipboard
- `test_copy_nonexistent_video` - Error handling for missing files
- `test_copy_empty_video` - Error handling for empty files
- `test_copy_text_to_clipboard` - Copy text/URLs to clipboard
- `test_copy_empty_text` - Error handling for empty text

### 3. File Operation Tests
- `test_copy_file_to_path` - Basic file copying functionality
- `test_copy_file_create_directories` - Directory creation during copy
- `test_save_file_dialog_recording` - Save dialog for MP4 files
- `test_save_file_dialog_screenshot` - Save dialog for PNG files
- `test_save_file_dialog_invalid_type` - Error handling for invalid types

### 4. Video Export Tests
- `test_export_video_mp4` - Export videos to MP4 format
- `test_export_video_gif` - Export videos to GIF format
- `test_export_video_invalid_project` - Error handling for invalid projects
- `test_export_video_unsupported_format` - Error handling for unsupported formats

### 5. Integration Tests
- `test_complete_workflow_recording_to_export` - Full recording → export → clipboard workflow
- `test_concurrent_operations` - Multiple operations running simultaneously
- `test_error_recovery` - Error recovery and resilience testing
- `test_operation_timeouts` - Performance and timeout validation

## Running Tests

### Prerequisites

1. Install cargo-nextest:
```bash
cargo install cargo-nextest --locked
```

### Running All Tests

From the root of the Cap repository:

```bash
pnpm test:desktop
```

Or directly from the test runner directory:

```bash
cd apps/desktop/src-tauri/test-runner
cargo nextest run
```

### Running Specific Test Groups

```bash
# Run only recording tests
cargo nextest run -E 'test(recording)'

# Run only clipboard tests  
cargo nextest run -E 'test(clipboard)'

# Run only filesystem tests
cargo nextest run -E 'test(filesystem)'

# Run only rendering tests
cargo nextest run -E 'test(rendering)'

# Run integration tests
cargo nextest run -E 'test(integration)'
```

### Running with Different Profiles

```bash
# Run with CI profile (stricter settings)
cargo nextest run --profile ci

# Run with verbose output
cargo nextest run --verbose
```

## Test Configuration

The test system uses nextest configuration for optimal performance:

```toml
[profile.default]
test-threads = 4
failure-output = "immediate"
retries = 1

[test-groups.clipboard]
max-threads = 1  # Serial execution for clipboard tests

[test-groups.filesystem]
max-threads = 2  # Limited concurrency for file operations

[test-groups.recording]
max-threads = 1  # Exclusive access for recording hardware
```

## Key Features

### 1. Scalable Architecture
- **Modular Design**: Easy to add new test modules for additional functionality
- **Trait-Based Mocks**: Clean abstraction for external dependencies
- **Configurable Test Groups**: Proper resource management for different test types

### 2. Comprehensive Coverage
- **Unit Tests**: Individual function validation
- **Integration Tests**: Complete workflow testing
- **Error Handling**: Comprehensive error scenario coverage
- **Performance Tests**: Timeout and concurrent operation validation

### 3. Best Practices
- **Serial Test Execution**: Prevents resource conflicts for system-dependent tests
- **Proper Cleanup**: Automatic temporary directory cleanup
- **Detailed Assertions**: Clear error messages and validation
- **Timeout Management**: Prevents hanging tests

### 4. Efficient Execution
- **Parallel Execution**: Tests run in parallel where safe
- **Fast Feedback**: Immediate failure reporting
- **Resource Grouping**: Optimal resource utilization
- **Retry Logic**: Handles transient failures

## Adding New Tests

### 1. Unit Tests for New Functions

```rust
#[tokio::test]
#[serial(function_group)]
async fn test_new_function() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Test setup
    let result = new_module::simulate_new_function("param").await;
    
    // Assertions
    assert!(result.is_ok(), "New function should succeed");
    
    TestUtils::cleanup_test_environment(temp_dir).await;
}
```

### 2. Integration Tests for Workflows

```rust
#[tokio::test]
#[serial(integration)]
async fn test_new_workflow() {
    let temp_dir = TestUtils::setup_test_environment().await;
    
    // Step 1: Setup
    // Step 2: Execute workflow
    // Step 3: Validate results
    // Step 4: Cleanup
    
    println!("✓ New workflow test completed");
}
```

### 3. Mock Implementations

```rust
pub mod new_module {
    use super::*;

    pub async fn simulate_new_function(param: &str) -> Result<String, String> {
        // Validation
        if param.is_empty() {
            return Err("Invalid parameter".to_string());
        }
        
        // Simulation
        tokio::time::sleep(Duration::from_millis(10)).await;
        
        Ok("success".to_string())
    }
}
```

## Test Output

The test system provides comprehensive output with:

- ✓ Success indicators for passing tests
- 🎬 Workflow progress indicators 
- ⚡ Performance test indicators
- 🔄 Error recovery indicators
- ⏱️ Timeout test indicators

Example output:
```
✓ Started studio recording with ID: abc123
✓ Successfully stopped recording and created output file
🎬 Starting complete workflow test: recording → stop → export
  ✓ Started recording with ID: def456
  ✓ Recording in progress...
  ✓ Recording stopped, output: /tmp/output.mp4
  ✓ Video exported: /tmp/exported.mp4
  ✓ Video copied to clipboard
🎉 Complete workflow test passed!
```

## Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**: Keep test dependencies up to date
2. **Add New Test Cases**: As new functionality is added
3. **Performance Monitoring**: Ensure tests complete within reasonable time
4. **Resource Monitoring**: Verify proper cleanup and resource management

### Troubleshooting

1. **Test Failures**: Check nextest output for detailed error information
2. **Resource Conflicts**: Ensure proper use of `#[serial]` attributes
3. **Timeout Issues**: Adjust timeout settings in nextest.toml
4. **Cleanup Issues**: Verify temporary directory cleanup

## Future Enhancements

1. **Property-Based Testing**: Add property-based tests using proptest
2. **Benchmark Integration**: Add performance benchmarks using criterion
3. **Code Coverage**: Integrate with coverage tools like tarpaulin
4. **CI Integration**: Enhanced CI/CD pipeline integration
5. **Visual Testing**: Screenshot comparison for UI-related functionality

This testing system provides a solid foundation for maintaining the quality and reliability of the Cap desktop application's Rust codebase while being easily extensible for future functionality.