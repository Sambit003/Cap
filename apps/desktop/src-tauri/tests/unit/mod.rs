// Unit tests for Cap desktop application Rust functions
// This module contains comprehensive tests for core functionality

pub mod simple_recording_tests;
pub mod simple_clipboard_tests;
pub mod simple_file_tests;
pub mod simple_video_tests;

// Re-export commonly used test utilities
pub use crate::utils::*;
pub use crate::mocks::*;