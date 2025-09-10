// Main test entry point for Cap desktop application tests
// This file sets up the test environment and includes all test modules

mod mocks;
mod utils;
mod unit;
mod integration;

// Re-export test utilities for easy access in test files
pub use mocks::*;
pub use utils::*;

use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test environment once for all tests
pub fn init_test_environment() {
    INIT.call_once(|| {
        // Set up logging for tests
        tracing_subscriber::fmt()
            .with_test_writer()
            .with_env_filter("debug")
            .init();
        
        // Set up any global test configuration here
        println!("Initializing Cap desktop test environment");
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_environment_initialization() {
        init_test_environment();
        // Test that initialization completes without panicking
        assert!(true);
    }
}